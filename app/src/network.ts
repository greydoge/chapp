export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [];
const LEGACY_DEFAULT_ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export function formatIceServers(servers: RTCIceServer[]) {
  return JSON.stringify(servers, null, 2);
}

export function migrateIceServersText(input: string | undefined) {
  if (!input) return formatIceServers(DEFAULT_ICE_SERVERS);
  try {
    const parsed = parseIceServers(input);
    const normalized = formatIceServers(parsed);
    const legacy = formatIceServers(LEGACY_DEFAULT_ICE_SERVERS);
    return normalized === legacy ? formatIceServers(DEFAULT_ICE_SERVERS) : normalized;
  } catch {
    return formatIceServers(DEFAULT_ICE_SERVERS);
  }
}

export function parseIceServers(input: string): RTCIceServer[] {
  const parsed = JSON.parse(input) as unknown;
  if (!Array.isArray(parsed)) throw new Error("ICE server config must be a JSON array.");

  const servers = parsed.map((server) => {
    if (!server || typeof server !== "object") throw new Error("Each ICE server must be an object.");
    const candidate = server as Partial<RTCIceServer>;
    const urls = candidate.urls;
    const validUrls =
      typeof urls === "string" || (Array.isArray(urls) && urls.length > 0 && urls.every((url) => typeof url === "string"));

    if (!validUrls) throw new Error("Each ICE server needs a string urls field or non-empty urls array.");

    return {
      urls,
      username: typeof candidate.username === "string" ? candidate.username : undefined,
      credential: typeof candidate.credential === "string" ? candidate.credential : undefined,
    } satisfies RTCIceServer;
  });

  return servers;
}
