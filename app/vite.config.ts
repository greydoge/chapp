import { defineConfig, type Plugin, type PreviewServer } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import ffmpegPath from "ffmpeg-static";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ServerOptions as HttpsServerOptions } from "node:https";

const MAX_MEDIA_CACHE_ENTRIES = 8;

function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  return !["0", "false", "off", "no"].includes(value.toLowerCase());
}

function loadHttpsOptions(): HttpsServerOptions | undefined {
  if (!isTruthyEnv(process.env.HTTPS ?? process.env.VITE_HTTPS)) {
    return undefined;
  }

  const certFile = process.env.HTTPS_CERT_FILE ?? process.env.VITE_HTTPS_CERT_FILE;
  const keyFile = process.env.HTTPS_KEY_FILE ?? process.env.VITE_HTTPS_KEY_FILE;
  const caFile = process.env.HTTPS_CA_FILE ?? process.env.VITE_HTTPS_CA_FILE;
  const passphrase = process.env.HTTPS_PASSPHRASE ?? process.env.VITE_HTTPS_PASSPHRASE;

  if (!certFile && !keyFile && !caFile && !passphrase) return undefined;

  const options: HttpsServerOptions = {};
  if (certFile) options.cert = readFileSync(certFile);
  if (keyFile) options.key = readFileSync(keyFile);
  if (caFile) options.ca = readFileSync(caFile);
  if (passphrase) options.passphrase = passphrase;
  return options;
}

function tweetMediaProxyPlugin(): Plugin {
  const mediaCache = new Map<string, Buffer>();
  const mediaInflight = new Map<string, Promise<Buffer>>();

  const rememberMedia = (key: string, body: Buffer) => {
    if (mediaCache.has(key)) {
      mediaCache.delete(key);
    }
    mediaCache.set(key, body);
    while (mediaCache.size > MAX_MEDIA_CACHE_ENTRIES) {
      const oldest = mediaCache.keys().next().value as string | undefined;
      if (!oldest) break;
      mediaCache.delete(oldest);
    }
  };

  const transcodeMedia = async (response: Response) => {
    if (!ffmpegPath) {
      return Buffer.from(await response.arrayBuffer());
    }

    const ffmpeg = spawn(
      ffmpegPath,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        "pipe:0",
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-c:v",
        "libvpx",
        "-deadline",
        "realtime",
        "-cpu-used",
        "8",
        "-b:v",
        "0",
        "-crf",
        "40",
        "-c:a",
        "libvorbis",
        "-q:a",
        "4",
        "-movflags",
        "+frag_keyframe+empty_moov+default_base_moof+faststart",
        "-f",
        "webm",
        "pipe:1",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );

    const stderrChunks: Buffer[] = [];
    const outputChunks: Buffer[] = [];
    ffmpeg.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
    ffmpeg.stdout.on("data", (chunk) => outputChunks.push(Buffer.from(chunk)));

    const stdin = pipeline(Readable.fromWeb(response.body as any), ffmpeg.stdin);
    const exit = new Promise<void>((resolve, reject) => {
      ffmpeg.on("close", (code, signal) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`ffmpeg exited with ${code ?? signal ?? "unknown"}: ${Buffer.concat(stderrChunks).toString("utf8")}`));
      });
    });

    try {
      await Promise.all([stdin, exit]);
    } catch (error) {
      ffmpeg.kill("SIGKILL");
      const code = error instanceof Error ? (error as { code?: string }).code : undefined;
      if (code !== "ERR_STREAM_PREMATURE_CLOSE" && code !== "ECONNRESET") {
        throw error;
      }
    }

    return Buffer.concat(outputChunks);
  };

  const handler = async (req: any, res: any) => {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");
    if (requestUrl.pathname !== "/tweet-media") return false;

    const primary = requestUrl.searchParams.get("src");
    const fallback = requestUrl.searchParams.get("fallback");
    const target = primary ?? fallback;
    if (!target) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Missing src parameter.");
      return true;
    }

    const range = typeof req.headers.range === "string" ? req.headers.range : undefined;
    const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : "Mozilla/5.0";

    const shouldForwardRange = !ffmpegPath;
    const fetchTarget = async (url: string) => {
      const response = await fetch(url, {
        method: req.method,
        redirect: "follow",
        headers: {
          ...(shouldForwardRange && range ? { Range: range } : {}),
          "User-Agent": userAgent,
          Accept: req.headers.accept ?? "*/*",
        },
      });

      const contentType = response.headers.get("content-type") ?? "";
      const isPlayable = response.ok && (contentType.startsWith("video/") || contentType === "application/octet-stream");
      return { response, isPlayable };
    };

    let upstream;
    try {
      upstream = await fetchTarget(primary ?? fallback!);
      if (!upstream.isPlayable && fallback && fallback !== primary) {
        upstream = await fetchTarget(fallback);
      }
    } catch {
      if (fallback && fallback !== primary) {
        try {
          upstream = await fetchTarget(fallback);
        } catch (error) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(`Unable to load tweet media: ${String(error)}`);
          return true;
        }
      } else {
        res.statusCode = 502;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Unable to load tweet media.");
        return true;
      }
    }

    const { response } = upstream!;
    res.statusCode = response.status;
    for (const header of ["content-type", "content-length", "content-range", "accept-ranges", "cache-control", "etag", "last-modified"]) {
      const value = response.headers.get(header);
      if (value) res.setHeader(header, value);
    }
    if (!response.headers.get("content-length")) {
      const contentRange = response.headers.get("content-range");
      const match = contentRange?.match(/bytes\s+(\d+)-(\d+)\/(\d+|\*)/i);
      if (match) {
        const start = Number(match[1]);
        const end = Number(match[2]);
        if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
          res.setHeader("Content-Length", String(end - start + 1));
        }
      }
    }
    if (!response.headers.get("accept-ranges") && response.headers.get("content-range")) {
      res.setHeader("Accept-Ranges", "bytes");
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (!response.body) {
      res.end();
      return true;
    }

    if (req.method === "HEAD") {
      res.end();
      return true;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.startsWith("video/")) {
      if (contentType.startsWith("video/webm")) {
        try {
          await pipeline(Readable.fromWeb(response.body as any), res);
        } catch (error) {
          const code = error instanceof Error ? (error as { code?: string }).code : undefined;
          if (code !== "ERR_STREAM_PREMATURE_CLOSE" && code !== "ECONNRESET") {
            throw error;
          }
        }
        return true;
      }

      const cacheKey = target;
      const cached = mediaCache.get(cacheKey);
      const body = cached ?? (await (async () => {
        const inflight = mediaInflight.get(cacheKey);
        if (inflight) return inflight;

        const promise = (async () => {
          const transcoded = await transcodeMedia(response.clone());
          rememberMedia(cacheKey, transcoded);
          return transcoded;
        })();
        mediaInflight.set(cacheKey, promise);
        try {
          return await promise;
        } finally {
          mediaInflight.delete(cacheKey);
        }
      })());

      const requestedRange = typeof req.headers.range === "string" ? req.headers.range : undefined;
      const rangeMatch = requestedRange?.match(/bytes=(\d+)-(\d*)/i);
      if (rangeMatch) {
        const start = Number(rangeMatch[1]);
        const end = rangeMatch[2] ? Number(rangeMatch[2]) : body.length - 1;
        if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start) {
          const clippedEnd = Math.min(end, body.length - 1);
          const chunk = body.subarray(start, clippedEnd + 1);
          res.statusCode = 206;
          res.setHeader("Content-Range", `bytes ${start}-${clippedEnd}/${body.length}`);
          res.setHeader("Content-Length", String(chunk.length));
          res.setHeader("Accept-Ranges", "bytes");
          res.setHeader("Content-Type", "video/webm");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.end(chunk);
          return true;
        }
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "video/webm");
      res.setHeader("Content-Length", String(body.length));
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.end(body);
      return true;
    }

    try {
      await pipeline(Readable.fromWeb(response.body as any), res);
    } catch (error) {
      const code = error instanceof Error ? (error as { code?: string }).code : undefined;
      if (code !== "ERR_STREAM_PREMATURE_CLOSE" && code !== "ECONNRESET") {
        throw error;
      }
    }
    return true;
  };

  return {
    name: "tweet-media-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!(await handler(req, res))) {
          next();
        }
      });
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!(await handler(req, res))) {
          next();
        }
      });
    },
  };
}

const httpsOptions = loadHttpsOptions();
const useBasicSsl = isTruthyEnv(process.env.HTTPS ?? process.env.VITE_HTTPS) && !httpsOptions;

export default defineConfig({
  resolve: {
    alias: {
      events: "events/",
    },
  },
  optimizeDeps: {
    include: ["events"],
  },
  server: {
    host: "0.0.0.0",
    https: httpsOptions,
    allowedHosts: ["doge-cube.local", "localhost", "127.0.0.1"],
  },
  preview: {
    host: "0.0.0.0",
    https: httpsOptions,
    allowedHosts: ["doge-cube.local", "localhost", "127.0.0.1"],
  },
  plugins: [tweetMediaProxyPlugin(), react(), ...(useBasicSsl ? [basicSsl()] : [])],
});
