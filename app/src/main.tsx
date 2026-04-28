import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  Circle,
  Copy,
  Film,
  Hash,
  Mic,
  MicOff,
  Paperclip,
  PhoneCall,
  Pin,
  PinOff,
  Plus,
  Radio,
  Reply,
  CheckCheck,
  Search,
  SearchX,
  ChevronDown,
  ChevronUp,
  ScreenShare,
  Send,
  Settings,
  ShieldCheck,
  Signal,
  Smile,
  MoreHorizontal,
  Star,
  Upload,
  Users,
  Volume2,
  Trash2,
  ExternalLink,
  X,
} from "lucide-react";
import {
  decryptPayload,
  deriveKey,
  deriveKeyFingerprint,
  dataUrlToObjectUrl,
  encryptPayload,
  formatBytes,
  reassembleAttachmentPayload,
  splitAttachmentPayload,
  type PlainWireAttachment,
  type PlainWireAttachmentChunk,
  type PlainWireChannelSync,
  type PlainWireDelete,
  type PlainWireEdit,
  type PlainWireMessage,
  type PlainWireNote,
  type PlainWirePayload,
  type PlainWireReceipt,
  type PlainWireReaction,
  type PlainWireProfileSync,
  type PlainWireMediaSync,
  type PlainWireReadSync,
  type PlainWireServerSync,
  type PlainWireSessionControl,
  type PlainWireTypingSync,
  type PlainWireVoiceSync,
  type PlainWireSignal,
  type WireMessage,
} from "./crypto";
import { DEFAULT_ICE_SERVERS, formatIceServers, migrateIceServersText, parseIceServers } from "./network";
import {
  DEFAULT_MESSAGES,
  decryptMessagesFromStorage,
  encryptMessagesForStorage,
  isEncryptedMessageStore,
  loadPersistedMessages,
} from "./storage";
import { isNearBottom } from "./scroll";
import { createWorkspaceBackup, parseWorkspaceBackup, type WorkspaceBackupSettings } from "./backup";
import { shouldSubmitComposerMessage } from "./composer";
import { hasOnlyLinkTokens, splitMessageText } from "./messageLinks";
import {
  extractAudioUrls,
  extractImageUrls,
  extractVideoUrls,
  isAudioMimeType,
  isImageMimeType,
  isVideoMimeType,
} from "./imageEmbeds";
import { buildYouTubeEmbedUrl, extractYouTubeUrls, getYouTubeVideoId, isYouTubeShortUrl } from "./youtubeEmbeds";
import { buildTweetMediaProxyUrl } from "./tweetMedia";
import { buildVideoEmbedSource } from "./mediaEmbeds";
import { buildFallbackTweetPreview, fetchTweetPreview, extractTweetUrls, rewriteTweetUrlToFxTwitter, splitTweetText } from "./tweetEmbeds";
import { deriveRoomFingerprint, normalizeFingerprint } from "./fingerprint";
import { shouldNotifyIncomingMessage } from "./notifications";
import {
  clearAllUnreadCounts,
  clearUnreadCount,
  getUnreadCountForChannel,
  incrementUnreadCount,
  moveUnreadCount,
  type UnreadCounts,
} from "./unread";
import {
  clearChannelDraft,
  getChannelDraft,
  moveChannelDraft,
  setChannelDraft,
  type ChannelDrafts,
} from "./channelDrafts";
import {
  clearMessageEditDraft,
  getMessageEditDraft,
  setMessageEditDraft,
  type MessageEditDrafts,
} from "./messageEdits";
import { clearReplyTarget, getReplyTarget, moveReplyTarget, setReplyTarget, type ReplyTargets } from "./replyTargets";
import { updateRecentEmojis } from "./emojiRecents";
import { DEFAULT_QUICK_REACTIONS, hasAnyReactions } from "./messageActions";
import { deleteServerEntries, renameServerEntries } from "./serverState";
import "./styles.css";

type ResolvedTweetPreview = NonNullable<Awaited<ReturnType<typeof fetchTweetPreview>>>;

const GIPHY_FREE_GIFS = [
  {
    id: "bounce",
    label: "Free",
    source: "GIPHY Studios 2021",
    url: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWx5bXBqc2cxbmxjZjB2dzg5eGxpZjAzZDY0OGcwZzd1MW5vbzlzcSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/esAM46R2vCTc28dKDI/giphy.gif",
  },
  {
    id: "motion",
    label: "Funny Every Time",
    source: "South Park",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWx5bXBqc2cxbmxjZjB2dzg5eGxpZjAzZDY0OGcwZzd1MW5vbzlzcSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/kJ9IXOmx0qj5Vz3gJN/200.gif",
  },
  {
    id: "wave",
    label: "Janice: they're gluten free",
    source: "Muppet Wiki",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWx5bXBqc2cxbmxjZjB2dzg5eGxpZjAzZDY0OGcwZzd1MW5vbzlzcSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/g8T4IGYsVIljWmjiKe/200.gif",
  },
  {
    id: "free-4",
    label: "We are free!",
    source: "Nanalan'",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWx5bXBqc2cxbmxjZjB2dzg5eGxpZjAzZDY0OGcwZzd1MW5vbzlzcSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/n6MEC1sNXtTCKG0gr5/200.gif",
  },
  {
    id: "free-5",
    label: "Fly Duckie Fly!",
    source: "DefyTV",
    url: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWx5bXBqc2cxbmxjZjB2dzg5eGxpZjAzZDY0OGcwZzd1MW5vbzlzcSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/7AkXVY4A7pM9nESEEi/200.gif",
  },
  {
    id: "free-6",
    label: "Peloton, Chelsea Jackson Roberts",
    source: "Peloton",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWx5bXBqc2cxbmxjZjB2dzg5eGxpZjAzZDY0OGcwZzd1MW5vbzlzcSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/H5YwiFYyauVuyUrSUA/200.gif",
  },
  {
    id: "free-7",
    label: "FOR FREE",
    source: "BuzzFeed",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWx5bXBqc2cxbmxjZjB2dzg5eGxpZjAzZDY0OGcwZzd1MW5vbzlzcSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/d1pItNWEYFHlVVyNqe/200.gif",
  },
  {
    id: "free-8",
    label: "Free 99",
    source: "GIPHY Studios 2021",
    url: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWx5bXBqc2cxbmxjZjB2dzg5eGxpZjAzZDY0OGcwZzd1MW5vbzlzcSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/98KyaZxbBG7rbMwDQm/200.gif",
  },
  {
    id: "trump-dance",
    label: "Trump dance",
    source: "Nexio",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDB0MTE1NzhtZmdldWt3enNuc3RjM3VqaDVwZ2dqZGl2bDd1bGw2aSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/vj6bs0Ob5E1wMDNexG/200.gif",
  },
  {
    id: "bath-time",
    label: "Bath time",
    source: "Nanalan'",
    url: "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDB0MTE1NzhtZmdldWt3enNuc3RjM3VqaDVwZ2dqZGl2bDd1bGw2aSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/uUvdLKna9Wr6PdDNCg/giphy.gif",
  },
  {
    id: "hello-money",
    label: "Hello to this Money",
    source: "GIPHY Studios 2021",
    url: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDB0MTE1NzhtZmdldWt3enNuc3RjM3VqaDVwZ2dqZGl2bDd1bGw2aSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/s6xnymHE4JdwucoCL2/200.gif",
  },
  {
    id: "free-99-alt",
    label: "Free 99",
    source: "Sealed With A GIF",
    url: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDB0MTE1NzhtZmdldWt3enNuc3RjM3VqaDVwZ2dqZGl2bDd1bGw2aSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/LAnhMr7Ot39c4rZs5G/200.gif",
  },
  {
    id: "free-bagels",
    label: "Free Bagels",
    source: "Moonfall",
    url: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDB0MTE1NzhtZmdldWt3enNuc3RjM3VqaDVwZ2dqZGl2bDd1bGw2aSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/14i7OH49EPQSvXmrN8/giphy.gif",
  },
  {
    id: "american-dream",
    label: "I Am The American Dream",
    source: "TrueReal",
    url: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDB0MTE1NzhtZmdldWt3enNuc3RjM3VqaDVwZ2dqZGl2bDd1bGw2aSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/IJoK0H8oyu5LHP6J12/giphy.gif",
  },
  {
    id: "free-breakfast",
    label: "Free Breakfast Buffet",
    source: "Parks and Recreation",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDB0MTE1NzhtZmdldWt3enNuc3RjM3VqaDVwZ2dqZGl2bDd1bGw2aSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/aPLFiY8LXeUyBOJDML/200.gif",
  },
  {
    id: "free-recording",
    label: "Free",
    source: "Recording Academy / GRAMMYs",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDB0MTE1NzhtZmdldWt3enNuc3RjM3VqaDVwZ2dqZGl2bDd1bGw2aSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/aSfo1SKAWZj9wh8mfA/giphy.gif",
  },
  {
    id: "free-1b",
    label: "Free",
    source: "GIPHY Studios 2021",
    url: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWx5bXBqc2cxbmxjZjB2dzg5eGxpZjAzZDY0OGcwZzd1MW5vbzlzcSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/esAM46R2vCTc28dKDI/200.gif",
  },
  {
    id: "free-2b",
    label: "Funny Every Time",
    source: "South Park",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWx5bXBqc2cxbmxjZjB2dzg5eGxpZjAzZDY0OGcwZzd1MW5vbzlzcSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/kJ9IXOmx0qj5Vz3gJN/giphy.gif",
  },
  {
    id: "free-3b",
    label: "Janice: they're gluten free",
    source: "Muppet Wiki",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWx5bXBqc2cxbmxjZjB2dzg5eGxpZjAzZDY0OGcwZzd1MW5vbzlzcSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/g8T4IGYsVIljWmjiKe/giphy.gif",
  },
  {
    id: "free-4b",
    label: "We are free!",
    source: "Nanalan'",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWx5bXBqc2cxbmxjZjB2dzg5eGxpZjAzZDY0OGcwZzd1MW5vbzlzcSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/n6MEC1sNXtTCKG0gr5/giphy.gif",
  },
  {
    id: "free-5b",
    label: "Fly Duckie Fly!",
    source: "DefyTV",
    url: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWx5bXBqc2cxbmxjZjB2dzg5eGxpZjAzZDY0OGcwZzd1MW5vbzlzcSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/7AkXVY4A7pM9nESEEi/giphy.gif",
  },
  {
    id: "free-6b",
    label: "Peloton, Chelsea Jackson Roberts",
    source: "Peloton",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWx5bXBqc2cxbmxjZjB2dzg5eGxpZjAzZDY0OGcwZzd1MW5vbzlzcSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/H5YwiFYyauVuyUrSUA/giphy.gif",
  },
  {
    id: "free-7b",
    label: "FOR FREE",
    source: "BuzzFeed",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWx5bXBqc2cxbmxjZjB2dzg5eGxpZjAzZDY0OGcwZzd1MW5vbzlzcSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/d1pItNWEYFHlVVyNqe/giphy.gif",
  },
  {
    id: "free-8b",
    label: "Free 99",
    source: "GIPHY Studios 2021",
    url: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNWx5bXBqc2cxbmxjZjB2dzg5eGxpZjAzZDY0OGcwZzd1MW5vbzlzcSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/98KyaZxbBG7rbMwDQm/giphy.gif",
  },
  {
    id: "free-9b",
    label: "Trump dance",
    source: "Nexio",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDB0MTE1NzhtZmdldWt3enNuc3RjM3VqaDVwZ2dqZGl2bDd1bGw2aSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/vj6bs0Ob5E1wMDNexG/giphy.gif",
  },
  {
    id: "free-10b",
    label: "Free Breakfast Buffet",
    source: "Parks and Recreation",
    url: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDB0MTE1NzhtZmdldWt3enNuc3RjM3VqaDVwZ2dqZGl2bDd1bGw2aSZlcD12MV92aWRlb3Nfc2VhcmNoJmN0PXY/aPLFiY8LXeUyBOJDML/giphy.gif",
  },
];

type RelatedTweetBlockProps = {
  label: string;
  tweet: ResolvedTweetPreview["reply"];
  kind: "reply" | "quote" | "retweet";
  onCopy: (value: string) => void;
  copiedLink: string | null;
  getProfileUrl: (handle: string) => string;
  formatRelatedDate: (value?: string) => string | null;
  renderTweetText: (value: string, prefix: string) => React.ReactNode;
  renderTweetMedia: (media: ResolvedTweetPreview["media"], prefix: string) => React.ReactNode;
};

function getAvatarFallback(name: string, handle: string) {
  const source = name.trim() || handle;
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("");
  return (initials || handle.slice(0, 2) || "??").toUpperCase();
}

function RelatedTweetBlock({
  label,
  tweet,
  kind,
  onCopy,
  copiedLink,
  getProfileUrl,
  formatRelatedDate,
  renderTweetText,
  renderTweetMedia,
}: RelatedTweetBlockProps) {
  if (!tweet) return null;

  const openLabel = `Open ${label.toLowerCase()}`;
  const copyLabel = `Copy ${label.toLowerCase()} link`;
  const className = kind === "reply" ? "tweetReply" : kind === "quote" ? "tweetQuote" : "tweetRetweet";
  const relatedDate = formatRelatedDate(tweet.createdAt);

  return (
    <div className={className}>
      <div className="tweetRelationLabel">{label}</div>
      <div className="tweetReplyHeader">
        <a className="tweetProfileLink" href={getProfileUrl(tweet.handle)} target="_blank" rel="noreferrer">
          {tweet.avatarUrl ? (
            <img className="tweetAvatar tweetAvatarSmall" src={tweet.avatarUrl} alt={tweet.authorName} />
          ) : (
            <div className="tweetAvatar tweetAvatarSmall tweetAvatarFallback" aria-hidden="true">
              {getAvatarFallback(tweet.authorName, tweet.handle)}
            </div>
          )}
          <div className="tweetMeta">
            <strong>{tweet.authorName}</strong>
            <span>@{tweet.handle}</span>
            {relatedDate && <span>{relatedDate}</span>}
          </div>
        </a>
        <a className="tweetMiniOpen" href={tweet.url} target="_blank" rel="noreferrer" aria-label={openLabel}>
          <ExternalLink size={14} />
        </a>
        <button
          className="tweetMiniOpen"
          type="button"
          onClick={() => onCopy(tweet.url)}
          aria-label={copyLabel}
          title={copiedLink === tweet.url ? "Copied" : copyLabel}
        >
          {copiedLink === tweet.url ? <CheckCheck size={14} /> : <Copy size={14} />}
        </button>
      </div>
      {tweet.text.trim() && <p>{renderTweetText(tweet.text, kind)}</p>}
      {tweet.media.length > 0 && <div className="tweetMediaGrid">{renderTweetMedia(tweet.media, kind)}</div>}
    </div>
  );
}

function TweetVideoMedia({
  item,
}: {
  item: Extract<ResolvedTweetPreview["media"][number], { type: "video" }>;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const mediaUrl = useMemo(
    () =>
      buildTweetMediaProxyUrl(window.location.origin, {
        src: item.streamUrl ?? item.url,
        poster: item.posterUrl ?? undefined,
      }),
    [item.posterUrl, item.streamUrl, item.url],
  );

  useEffect(() => {
    setLoaded(false);
  }, [mediaUrl]);

  useEffect(() => {
    let cancelled = false;

    const syncLoadedState = () => {
      const node = videoRef.current;
      if (!node || cancelled) return;

      if (node.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        setLoaded(true);
        return;
      }

      if (node.error) {
        setLoaded(false);
        return;
      }

      if (node.readyState === HTMLMediaElement.HAVE_NOTHING) {
        node.load();
      }

      if (node.paused && node.readyState >= HTMLMediaElement.HAVE_METADATA) {
        void node.play().catch(() => {
          /* ignore autoplay rejection */
        });
      }

      requestAnimationFrame(syncLoadedState);
    };

    syncLoadedState();

    return () => {
      cancelled = true;
    };
  }, [mediaUrl]);

  return (
    <div className="tweetVideoWrap">
      <video
        ref={videoRef}
        className="tweetVideo"
        key={mediaUrl}
        autoPlay
        muted
        playsInline
        loop
        controls
        preload="auto"
        poster={item.posterUrl ?? undefined}
        src={mediaUrl}
        onLoadedMetadata={() => setLoaded(true)}
        onLoadedData={() => setLoaded(true)}
        onCanPlay={() => setLoaded(true)}
        onError={() => setLoaded(false)}
      />
      {!loaded && <div className="tweetVideoLoading">Loading video...</div>}
    </div>
  );
}

function VideoEmbed({
  href,
  sourceUrl,
  sourceType,
  className,
  download,
  onClick,
}: {
  href: string;
  sourceUrl: string;
  sourceType?: string;
  className: string;
  download?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <a className={className} href={href} download={download} onClick={onClick}>
      <video autoPlay muted playsInline loop controls preload="metadata">
        <source src={sourceUrl} type={sourceType} />
      </video>
    </a>
  );
}

function renderVideoEmbed({
  baseUrl,
  key,
  href,
  url,
  className,
  sourceType,
  download,
  onClick,
}: {
  baseUrl: string;
  key: string;
  href: string;
  url: string;
  className: string;
  sourceType?: string;
  download?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  const source = buildVideoEmbedSource(baseUrl, url, sourceType);
  return (
    <VideoEmbed
      key={key}
      className={className}
      href={href}
      download={download}
      onClick={onClick}
      sourceUrl={source.sourceUrl}
      sourceType={source.sourceType}
    />
  );
}

function TweetEmbed({ url }: { url: string }) {
  const [preview, setPreview] = useState<ResolvedTweetPreview>(() => buildFallbackTweetPreview(url)!);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const copiedTimer = useRef<number | null>(null);
  const getProfileUrl = (handle: string) => `https://fxtwitter.com/${handle}`;
  const tweetDate = useMemo(() => {
    if (!preview?.createdAt) return null;
    const parsed = new Date(preview.createdAt);
    return Number.isNaN(parsed.getTime())
      ? null
      : new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(parsed);
  }, [preview?.createdAt]);
  const formatRelatedDate = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed);
  };
  const renderTweetText = (value: string, prefix: string) =>
    splitTweetText(value).map((token, index) =>
      token.type === "text" ? (
        <React.Fragment key={`${prefix}-text-${index}`}>
          {token.value.split(/\n/).map((part, partIndex, parts) => (
            <React.Fragment key={`${prefix}-text-${index}-${partIndex}`}>
              {part}
              {partIndex < parts.length - 1 && <br />}
            </React.Fragment>
          ))}
        </React.Fragment>
      ) : (
        <a key={`${prefix}-link-${token.href}-${index}`} href={rewriteTweetUrlToFxTwitter(token.href)} target="_blank" rel="noreferrer">
          {rewriteTweetUrlToFxTwitter(token.label)}
        </a>
      ),
    );
  const renderTweetMedia = (media: ResolvedTweetPreview["media"], prefix: string) =>
    media.map((item, index) =>
      item.type === "image" ? (
        <a
          key={`${prefix}-image-${item.url}-${index}`}
          className="tweetMediaLink"
          href={item.url}
          target="_blank"
          rel="noreferrer"
        >
          <img className="tweetImage" src={item.url} alt="Tweet media" loading="lazy" />
        </a>
      ) : (
        <TweetVideoMedia
          key={`${prefix}-video-${item.url}-${index}`}
          item={item}
        />
      ),
    );
  const copyLink = (value: string) => {
    void (async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = value;
          textarea.setAttribute("readonly", "true");
          textarea.style.position = "fixed";
          textarea.style.top = "-9999px";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }
        setCopiedLink(value);
        if (copiedTimer.current) {
          window.clearTimeout(copiedTimer.current);
        }
        copiedTimer.current = window.setTimeout(() => {
          setCopiedLink((current) => (current === value ? null : current));
          copiedTimer.current = null;
        }, 1200);
      } catch {
        // Ignore clipboard failures.
      }
    })();
  };

  useEffect(() => {
    let cancelled = false;
    setPreview(buildFallbackTweetPreview(url)!);
    setAvatarBroken(false);

    void fetchTweetPreview(url)
      .then((result) => {
        if (cancelled) return;
        setPreview((result ?? buildFallbackTweetPreview(url))!);
      })
      .catch(() => {
        if (cancelled) return;
        setPreview(buildFallbackTweetPreview(url)!);
      });

    return () => {
      cancelled = true;
      if (copiedTimer.current) {
        window.clearTimeout(copiedTimer.current);
      }
    };
  }, [url]);

  return (
    <article className="tweetCard">
      <header className="tweetHeader">
        <a className="tweetProfileLink" href={getProfileUrl(preview.handle)} target="_blank" rel="noreferrer">
          {preview.avatarUrl && !avatarBroken ? (
            <img
              className="tweetAvatar"
              src={preview.avatarUrl}
              alt={preview.authorName}
              onError={() => setAvatarBroken(true)}
            />
          ) : (
            <div className="tweetAvatar tweetAvatarFallback" aria-hidden="true">
              {getAvatarFallback(preview.authorName, preview.handle)}
            </div>
          )}
          <div className="tweetMeta">
            <strong>{preview.authorName}</strong>
            <span>@{preview.handle}</span>
            {tweetDate && <span>{tweetDate}</span>}
          </div>
        </a>
        <a className="tweetOpen" href={preview.url} target="_blank" rel="noreferrer" aria-label="Open tweet">
          <ExternalLink size={16} />
        </a>
        <button
          className="tweetMiniOpen"
          type="button"
          onClick={() => copyLink(preview.url)}
          aria-label="Copy tweet link"
          title={copiedLink === preview.url ? "Copied" : "Copy tweet link"}
        >
          {copiedLink === preview.url ? <CheckCheck size={14} /> : <Copy size={14} />}
        </button>
      </header>
      <RelatedTweetBlock
        label="Reply"
        tweet={preview.reply}
        kind="reply"
        onCopy={copyLink}
        copiedLink={copiedLink}
        getProfileUrl={getProfileUrl}
        formatRelatedDate={formatRelatedDate}
        renderTweetText={renderTweetText}
        renderTweetMedia={renderTweetMedia}
      />
      <RelatedTweetBlock
        label="Quoted tweet"
        tweet={preview.quote}
        kind="quote"
        onCopy={copyLink}
        copiedLink={copiedLink}
        getProfileUrl={getProfileUrl}
        formatRelatedDate={formatRelatedDate}
        renderTweetText={renderTweetText}
        renderTweetMedia={renderTweetMedia}
      />
      <RelatedTweetBlock
        label="Retweet"
        tweet={preview.retweet}
        kind="retweet"
        onCopy={copyLink}
        copiedLink={copiedLink}
        getProfileUrl={getProfileUrl}
        formatRelatedDate={formatRelatedDate}
        renderTweetText={renderTweetText}
        renderTweetMedia={renderTweetMedia}
      />
      {preview.text.trim() && (
        <div className="tweetBody">
          <p>{renderTweetText(preview.text, "tweet")}</p>
        </div>
      )}
      {preview.media.length > 0 && (
        <div className="tweetMediaGrid">{renderTweetMedia(preview.media, "tweet")}</div>
      )}
    </article>
  );
}

type ChatMessage = {
  id: string;
  author: string;
  body: string;
  channel: string;
  at: number;
  local?: boolean;
  delivered?: boolean;
  encrypted?: boolean;
  edited?: boolean;
  note?: boolean;
  pinned?: boolean;
  seen?: boolean;
  replyToId?: string;
  replyToAuthor?: string;
  replyToBody?: string;
  reactions?: Record<string, string[]>;
  attachment?: {
    fileName: string;
    mimeType: string;
    size: number;
    dataUrl?: string;
    objectUrl?: string;
  };
};

type PeerStatus = "idle" | "hosting" | "joining" | "connected" | "closed";
type Modal =
  | "server"
  | "rename-server"
  | "delete-server"
  | "channel"
  | "rename-channel"
  | "delete-channel"
  | "edit-message"
  | "delete-message"
  | "search"
  | "session"
  | "member"
  | "room"
  | "settings"
  | "attachment"
  | "clear-history"
  | null;

const DEFAULT_CHANNELS = [
  { id: "lobby", label: "lobby" },
  { id: "engineering", label: "engineering" },
  { id: "design", label: "design" },
  { id: "off-grid", label: "off-grid" },
];
const DEFAULT_SERVERS = ["Relayless", "Peer Lab", "E2E Ops"];
const DEFAULT_NAME = "LocalUser";
const DEFAULT_PRESENCE = "direct peer online";

const voiceRooms = ["war room", "release desk", "pairing"];
const baseMembers = ["You", "Ada", "Linus", "Grace", "Katherine"];
const defaultRecentEmojis = ["👍", "🔥", "😂", "❤️", "🚀", "👀", "✅", "🙌"];
const emojiGroups = [
  {
    label: "Reactions",
    items: ["😀", "😎", "🤔", "😭", "😤", "👏", "🙏", "💯"],
  },
  {
    label: "Status",
    items: ["🟢", "🟡", "🔴", "🔒", "⚡", "🧠", "🛠️", "📌"],
  },
];

type AttachmentTransfer = {
  chunks: PlainWireAttachmentChunk[];
  received: Set<number>;
  total: number;
};

type StoredSettings = {
  activeServer?: string;
  activeChannelsByServer?: Record<string, string>;
  activeVoiceRoom?: string | null;
  channels?: typeof DEFAULT_CHANNELS;
  iceServersText?: string;
  membersOpen?: boolean;
  notificationsMuted?: boolean;
  name?: string;
  presence?: string;
  recentEmojis?: string[];
  newChannelName?: string;
  newServerName?: string;
  draftByChannel?: ChannelDrafts;
  editDraftByMessage?: MessageEditDrafts;
  replyTargetByChannel?: ReplyTargets;
  signalInput?: string;
  signalOutput?: string;
  searchQuery?: string;
  searchIndex?: number;
  roomPeerFingerprint?: string;
  servers?: string[];
  unreadByChannel?: Record<string, number>;
  gifFavorites?: string[];
  mainTab?: "chat" | "session";
};

const SETTINGS_KEY = "relayless.settings.v1";
const MESSAGES_KEY = "relayless.messages.v1";

function loadSettings(): StoredSettings {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as StoredSettings;
    return {
      ...settings,
      iceServersText: migrateIceServersText(settings.iceServersText),
    };
  } catch {
    return {};
  }
}

const storedSettings = typeof localStorage === "undefined" ? {} : loadSettings();

function App() {
  const [servers, setServers] = useState(storedSettings.servers ?? DEFAULT_SERVERS);
  const [activeServer, setActiveServer] = useState(storedSettings.activeServer ?? storedSettings.servers?.[0] ?? DEFAULT_SERVERS[0]);
  const [newServerName, setNewServerName] = useState(storedSettings.newServerName ?? "");
  const [channels, setChannels] = useState(storedSettings.channels ?? DEFAULT_CHANNELS);
  const [newChannelName, setNewChannelName] = useState(storedSettings.newChannelName ?? "");
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState(storedSettings.channels?.[0]?.id ?? "lobby");
  const [activeChannelsByServer, setActiveChannelsByServer] = useState<Record<string, string>>(
    storedSettings.activeChannelsByServer ?? {
      [storedSettings.activeServer ?? storedSettings.servers?.[0] ?? "Relayless"]:
        storedSettings.channels?.[0]?.id ?? "lobby",
    },
  );
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_MESSAGES);
  const [draftByChannel, setDraftByChannel] = useState<ChannelDrafts>(storedSettings.draftByChannel ?? {});
  const [editDraftByMessage, setEditDraftByMessage] = useState<MessageEditDrafts>(storedSettings.editDraftByMessage ?? {});
  const [replyTargetByChannel, setReplyTargetByChannel] = useState<ReplyTargets>(storedSettings.replyTargetByChannel ?? {});
  const [searchQuery, setSearchQuery] = useState(storedSettings.searchQuery ?? "");
  const [searchIndex, setSearchIndex] = useState(storedSettings.searchIndex ?? 0);
  const [name, setName] = useState(storedSettings.name ?? DEFAULT_NAME);
  const [passphrase, setPassphrase] = useState("correct horse battery staple");
  const [signalInput, setSignalInput] = useState(storedSettings.signalInput ?? "");
  const [signalOutput, setSignalOutput] = useState(storedSettings.signalOutput ?? "");
  const [mainTab, setMainTab] = useState<"chat" | "session">(storedSettings.mainTab ?? "chat");
  const [status, setStatus] = useState<PeerStatus>("idle");
  const [events, setEvents] = useState<string[]>(["Ready for peer discovery."]);
  const [keyFingerprint, setKeyFingerprint] = useState("calculating...");
  const [cryptoStatus, setCryptoStatus] = useState<"checking" | "available" | "unavailable">("checking");
  const [historyUnlocked, setHistoryUnlocked] = useState(false);
  const [historyPassphrase, setHistoryPassphrase] = useState<string | null>(null);
  const [historyUnlockAttempt, setHistoryUnlockAttempt] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifTab, setGifTab] = useState<"all" | "favorites">("all");
  const [pendingGif, setPendingGif] = useState<{ url: string; label: string; source: string } | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [messageMenuMessageId, setMessageMenuMessageId] = useState<string | null>(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<{ top: number; left: number } | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{
    fileName: string;
    mimeType: string;
    size: number;
    dataUrl: string;
  } | null>(null);
  const [notificationsMuted, setNotificationsMuted] = useState(storedSettings.notificationsMuted ?? false);
  const [membersOpen, setMembersOpen] = useState(storedSettings.membersOpen ?? true);
  const [callActive, setCallActive] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [peerCallActive, setPeerCallActive] = useState(false);
  const [peerScreenSharing, setPeerScreenSharing] = useState(false);
  const [peerMicMuted, setPeerMicMuted] = useState(false);
  const [activeVoiceRoom, setActiveVoiceRoom] = useState<string | null>(storedSettings.activeVoiceRoom ?? null);
  const [presence, setPresence] = useState(storedSettings.presence ?? DEFAULT_PRESENCE);
  const [peerName, setPeerName] = useState("Peer");
  const [peerPresence, setPeerPresence] = useState("waiting for profile");
  const [peerNotificationsMuted, setPeerNotificationsMuted] = useState(false);
  const [peerMembersOpen, setPeerMembersOpen] = useState(true);
  const [peerActiveServer, setPeerActiveServer] = useState("unknown");
  const [peerActiveChannel, setPeerActiveChannel] = useState("unknown");
  const [peerTypingChannel, setPeerTypingChannel] = useState<string | null>(null);
  const [iceServersText, setIceServersText] = useState(storedSettings.iceServersText ?? formatIceServers(DEFAULT_ICE_SERVERS));
  const [remoteMediaActive, setRemoteMediaActive] = useState(false);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [followLatest, setFollowLatest] = useState(true);
  const [roomFingerprint, setRoomFingerprint] = useState("");
  const [roomPeerFingerprint, setRoomPeerFingerprint] = useState(storedSettings.roomPeerFingerprint ?? "");
  const [roomFingerprintMatch, setRoomFingerprintMatch] = useState<"idle" | "match" | "mismatch">("idle");
  const [unreadByChannel, setUnreadByChannel] = useState<UnreadCounts>(storedSettings.unreadByChannel ?? {});
  const [recentEmojis, setRecentEmojis] = useState<string[]>(storedSettings.recentEmojis ?? defaultRecentEmojis);
  const [gifFavorites, setGifFavorites] = useState<string[]>(storedSettings.gifFavorites ?? []);
  const memberRoster = useMemo(() => {
    if (!peerName.trim() || baseMembers.includes(peerName)) return baseMembers;
    return [baseMembers[0], peerName, ...baseMembers.slice(1)];
  }, [peerName]);
  const draft = getChannelDraft(draftByChannel, activeChannel);
  const replyToMessageId = getReplyTarget(replyTargetByChannel, activeChannel);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const gifPickerRef = useRef<HTMLDivElement | null>(null);
  const gifSearchRef = useRef<HTMLInputElement | null>(null);
  const reactionPickerSlotRef = useRef<HTMLDivElement | null>(null);
  const messageMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localScreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const renegotiatingRef = useRef(false);
  const attachmentTransfersRef = useRef<Map<string, AttachmentTransfer>>(new Map());
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const lastReadSyncRef = useRef<Record<string, number>>({});

  const visibleMessages = useMemo(
    () =>
      messages
        .filter((message) => message.channel === activeChannel)
        .filter((message) => {
          const query = searchQuery.trim().toLowerCase();
          if (!query) return true;
          return [message.author, message.body, message.replyToAuthor ?? "", message.replyToBody ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(query);
        })
        .sort((left, right) => Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)) || left.at - right.at),
    [activeChannel, messages, searchQuery],
  );
  const connected = status === "connected";
  const searchActive = searchQuery.trim().length > 0;

  const activeLabel = useMemo(
    () => channels.find((channel) => channel.id === activeChannel)?.label ?? activeChannel,
    [activeChannel],
  );
  const replyToMessage = messages.find((message) => message.id === replyToMessageId) ?? null;
  const searchMatches = visibleMessages;
  const emojiPickerGroups = useMemo(
    () => [
      {
        label: "Recent",
        items: recentEmojis.length > 0 ? recentEmojis : defaultRecentEmojis,
      },
      ...emojiGroups,
    ],
    [recentEmojis],
  );
  const gifSearchTerm = gifQuery.trim().toLowerCase();
  const gifMatches = useMemo(
    () =>
      GIPHY_FREE_GIFS.filter((gif) => `${gif.label} ${gif.source} ${gif.url}`.toLowerCase().includes(gifSearchTerm)).map((gif) => ({
        ...gif,
        favorite: gifFavorites.includes(gif.id),
      })),
    [gifFavorites, gifSearchTerm],
  );
  const favoriteGifs = useMemo(
    () =>
      GIPHY_FREE_GIFS.filter((gif) => gifFavorites.includes(gif.id))
        .filter((gif) => `${gif.label} ${gif.source} ${gif.url}`.toLowerCase().includes(gifSearchTerm))
        .map((gif) => ({
          ...gif,
          favorite: true,
        })),
    [gifFavorites, gifSearchTerm],
  );
  const visibleGifs = gifTab === "favorites" ? favoriteGifs : gifMatches;
  const gifColumns = useMemo(() => {
    const columns = [[], [], []] as typeof visibleGifs[];
    visibleGifs.forEach((gif, index) => {
      columns[index % columns.length].push(gif);
    });
    return columns;
  }, [visibleGifs]);
  const selectedSearchMessage = searchActive ? searchMatches[Math.min(searchIndex, Math.max(searchMatches.length - 1, 0))] ?? null : null;
  const signalStatusText =
    status === "hosting" && signalOutput
      ? "Invite ready. Share this text with the other device."
      : status === "joining" && signalOutput
        ? "Answer ready. Send it back to the host."
        : status === "connected"
          ? "Peer connected."
          : status === "closed"
            ? "Peer channel closed."
            : "Create an invite to start pairing.";
  const deletingChannel = channels.find((channel) => channel.id === deletingChannelId);
  const deleteFallbackChannel = channels.find((channel) => channel.id !== deletingChannelId) ?? channels[0];

  useEffect(() => {
    const settings: StoredSettings = {
      activeServer,
      activeChannelsByServer,
      channels,
      editDraftByMessage,
      newChannelName,
      newServerName,
      replyTargetByChannel,
      activeVoiceRoom,
      iceServersText,
      draftByChannel,
      signalInput,
      signalOutput,
      searchQuery,
      searchIndex,
      roomPeerFingerprint,
      recentEmojis,
      gifFavorites,
      mainTab,
      membersOpen,
      notificationsMuted,
      name,
      presence,
      servers,
      unreadByChannel,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [
    activeChannelsByServer,
    activeServer,
    activeVoiceRoom,
    draftByChannel,
    editDraftByMessage,
    newChannelName,
    newServerName,
    replyTargetByChannel,
    signalInput,
    signalOutput,
    searchQuery,
    searchIndex,
    roomPeerFingerprint,
    recentEmojis,
    gifFavorites,
    mainTab,
    channels,
    iceServersText,
    membersOpen,
    name,
    notificationsMuted,
    presence,
    servers,
    unreadByChannel,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      if (typeof localStorage === "undefined") {
        setHistoryUnlocked(true);
        return;
      }

      const raw = localStorage.getItem(MESSAGES_KEY);
      if (!raw) {
        setMessages(DEFAULT_MESSAGES);
        setHistoryUnlocked(true);
        setHistoryPassphrase(passphrase);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as unknown;
        const restored = isEncryptedMessageStore(parsed)
          ? await decryptMessagesFromStorage(passphrase, parsed)
          : loadPersistedMessages(localStorage, MESSAGES_KEY);

        if (cancelled) return;
        revokeAttachmentUrls();
        setMessages(hydrateAttachmentUrls(restored));
        setHistoryUnlocked(true);
        setHistoryPassphrase(passphrase);
        if (!isEncryptedMessageStore(parsed)) log("Migrated local history to encrypted storage.");
      } catch {
        if (cancelled) return;
        setHistoryUnlocked(false);
        setHistoryPassphrase(null);
        log("Could not decrypt local history with this passphrase.");
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [historyUnlockAttempt, passphrase]);

  useEffect(() => {
    if (!historyUnlocked || historyPassphrase !== passphrase || typeof localStorage === "undefined") return;

    let cancelled = false;
    async function saveHistory() {
      const envelope = await encryptMessagesForStorage(passphrase, messages);
      if (!cancelled) localStorage.setItem(MESSAGES_KEY, JSON.stringify(envelope));
    }

    void saveHistory();
    return () => {
      cancelled = true;
    };
  }, [historyPassphrase, historyUnlocked, messages, passphrase]);

  useEffect(() => {
    const list = messageListRef.current;
    if (!list || !followLatest) return;
    list.scrollTop = list.scrollHeight;
  }, [activeChannel, followLatest, visibleMessages]);

  useEffect(() => {
    const element = composerInputRef.current;
    if (!element) return;

    element.style.height = "auto";
    const computed = window.getComputedStyle(element);
    const lineHeight = Number.parseFloat(computed.lineHeight) || 20;
    const padding = Number.parseFloat(computed.paddingTop) + Number.parseFloat(computed.paddingBottom);
    const maxHeight = lineHeight * 5 + padding;
    const nextHeight = Math.min(element.scrollHeight, maxHeight);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [activeChannel, draft]);

  useEffect(() => {
    const list = messageListRef.current;
    if (!list) return;
    const listElement = list;

    function syncFollowState() {
      setFollowLatest(isNearBottom(listElement.scrollTop, listElement.clientHeight, listElement.scrollHeight));
    }

    syncFollowState();
    list.addEventListener("scroll", syncFollowState, { passive: true });
    return () => list.removeEventListener("scroll", syncFollowState);
  }, [activeChannel, searchQuery, visibleMessages.length]);

  useEffect(() => {
    setSearchIndex(0);
  }, [activeChannel, searchQuery]);

  useEffect(() => {
    setPendingGif(null);
    setGifOpen(false);
    setGifQuery("");
    setGifTab("all");
  }, [activeChannel]);

  useEffect(() => {
    if (!selectedSearchMessage) return;
    const node = messageListRef.current?.querySelector<HTMLElement>(`[data-message-id="${selectedSearchMessage.id}"]`);
    node?.scrollIntoView({ block: "center" });
  }, [selectedSearchMessage?.id]);

  useEffect(() => {
    const lastReadAt = messages.reduce((latest, message) => {
      if (message.channel !== activeChannel) return latest;
      return Math.max(latest, message.at);
    }, 0);
    if (!connected || lastReadAt === 0) return;
    if (lastReadSyncRef.current[activeChannel] === lastReadAt) return;
    lastReadSyncRef.current[activeChannel] = lastReadAt;
    void sendReadSync(activeChannel, lastReadAt);
  }, [activeChannel, messages]);

  useEffect(() => {
    if (!connected) return;
    const active = draft.trim().length > 0;
    void sendTypingSync(active);
    if (!active) return;

    const timeout = window.setTimeout(() => {
      void sendTypingSync(false);
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [connected, draft, activeChannel]);

  useEffect(() => {
    setActiveChannelsByServer((current) => {
      let changed = false;
      const fallbackChannel = channels[0]?.id ?? activeChannel;
      const next = { ...current };

      for (const [server, channelId] of Object.entries(next)) {
        if (channels.some((channel) => channel.id === channelId)) continue;
        next[server] = fallbackChannel;
        changed = true;
      }

      return changed ? next : current;
    });
  }, [activeChannel, channels]);

  useEffect(() => {
    setUnreadByChannel((current) => clearUnreadCount(current, activeChannel));
  }, [activeChannel]);

  useEffect(() => {
    if (modal !== "room") return;

    let cancelled = false;
    async function updateFingerprint() {
      const seed = JSON.stringify({
        server: activeServer,
        channel: activeChannel,
        channels,
        passphrase,
      });
      const fingerprint = await deriveRoomFingerprint(seed);
      if (!cancelled) setRoomFingerprint(fingerprint);
    }

    void updateFingerprint();
    return () => {
      cancelled = true;
    };
  }, [activeChannel, activeServer, channels, modal, passphrase]);

  useEffect(() => {
    let cancelled = false;

    async function updateKeyFingerprint() {
      setKeyFingerprint("calculating...");
      try {
        const fingerprint = await deriveKeyFingerprint(passphrase);
        if (!cancelled) setKeyFingerprint(fingerprint);
      } catch {
        if (!cancelled) setKeyFingerprint("unavailable");
      }
    }

    void updateKeyFingerprint();
    return () => {
      cancelled = true;
    };
  }, [passphrase]);

  useEffect(() => {
    let cancelled = false;

    async function probeWebCrypto() {
      setCryptoStatus("checking");
      try {
        await deriveKey(passphrase);
        if (!cancelled) setCryptoStatus("available");
      } catch {
        if (!cancelled) setCryptoStatus("unavailable");
      }
    }

    void probeWebCrypto();
    return () => {
      cancelled = true;
    };
  }, [passphrase]);

  useEffect(() => {
    if (!connected) return;

    const handle = window.setTimeout(() => {
      void sendProfileSync({
        name: name || "Anonymous",
        presence,
        notificationsMuted,
        membersOpen,
        activeServer,
        activeChannel,
      });
    }, 500);

    return () => window.clearTimeout(handle);
  }, [connected, membersOpen, name, notificationsMuted, presence]);

  useEffect(() => {
    function closeEmojiPicker(event: PointerEvent) {
      const target = event.target as Node;
      if (emojiPickerRef.current?.contains(target)) return;
      if (gifPickerRef.current?.contains(target)) return;
      if (composerInputRef.current?.contains(target)) return;
      if (reactionPickerSlotRef.current?.contains(target)) return;
      if (messageMenuRef.current?.contains(target)) return;
      setEmojiOpen(false);
      setGifOpen(false);
      setGifQuery("");
      setGifTab("all");
      setReactionPickerMessageId(null);
      setMessageMenuMessageId(null);
      setMessageMenuAnchor(null);
    }

    document.addEventListener("pointerdown", closeEmojiPicker);
    return () => document.removeEventListener("pointerdown", closeEmojiPicker);
  }, []);

  useEffect(() => {
    function closeFloatingUi(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setEmojiOpen(false);
      setGifOpen(false);
      setGifQuery("");
      setGifTab("all");
      setReactionPickerMessageId(null);
      setMessageMenuMessageId(null);
      setMessageMenuAnchor(null);
      setModal(null);
    }

    document.addEventListener("keydown", closeFloatingUi);
    return () => document.removeEventListener("keydown", closeFloatingUi);
  }, []);

  useEffect(() => {
    if (!gifOpen) return;
    requestAnimationFrame(() => gifSearchRef.current?.focus());
  }, [gifOpen]);

  useEffect(() => {
    return () => {
      stopLocalMedia();
      clearRemoteMedia();
      revokeAttachmentUrls();
      pcRef.current?.close();
      channelRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!remoteAudioRef.current) return;
    remoteAudioRef.current.srcObject = remoteStreamRef.current;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
  }, []);

  useEffect(() => {
    if (!localScreenVideoRef.current) return;
    localScreenVideoRef.current.srcObject = screenStreamRef.current;
    void localScreenVideoRef.current.play().catch(() => undefined);
  }, [screenSharing]);

  useEffect(() => {
    if (!remoteVideoRef.current) return;
    remoteVideoRef.current.srcObject = remoteStreamRef.current;
    void remoteVideoRef.current.play().catch(() => log("Remote video is ready; browser requires a click to play."));
  }, [remoteVideoActive]);

  function refreshRemoteMediaState() {
    const tracks = remoteStreamRef.current.getTracks();
    setRemoteMediaActive(tracks.some((track) => track.readyState === "live"));
    setRemoteVideoActive(remoteStreamRef.current.getVideoTracks().some((track) => track.readyState === "live"));
  }

  function log(event: string) {
    setEvents((current) => [event, ...current].slice(0, 5));
  }

  function clearEventLog() {
    setEvents([]);
  }

  function addSystemMessage(body: string, channel = activeChannel, attachment?: ChatMessage["attachment"]) {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        author: "System",
        body,
        channel,
        at: Date.now(),
        encrypted: true,
        attachment,
      },
    ]);
  }

  function togglePinMessage(messageId: string) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, pinned: !message.pinned } : message,
      ),
    );
    const message = messages.find((item) => item.id === messageId);
    log(message?.pinned ? "Message unpinned." : "Message pinned.");
  }

  function toggleMessageMenu(messageId: string, button: HTMLButtonElement) {
    setMessageMenuMessageId((current) => {
      const next = current === messageId ? null : messageId;
      if (!next) {
        setMessageMenuAnchor(null);
        return null;
      }

      const rect = button.getBoundingClientRect();
      const width = 272;
      const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
      const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 332));
      setMessageMenuAnchor({ top, left });
      return next;
    });
    setEmojiOpen(false);
    setGifOpen(false);
    setGifQuery("");
    setGifTab("all");
    setReactionPickerMessageId(null);
  }

  function openEditMessage(message: ChatMessage) {
    setEditingMessageId(message.id);
    setEditDraftByMessage((current) =>
      Object.prototype.hasOwnProperty.call(current, message.id)
        ? current
        : setMessageEditDraft(current, message.id, message.body),
    );
    setModal("edit-message");
    setEmojiOpen(false);
    setGifOpen(false);
    setGifQuery("");
    setGifTab("all");
    setReactionPickerMessageId(null);
    setMessageMenuMessageId(null);
  }

  function openDeleteMessage(messageId: string) {
    setDeletingMessageId(messageId);
    setModal("delete-message");
    setEmojiOpen(false);
    setGifOpen(false);
    setGifQuery("");
    setGifTab("all");
    setReactionPickerMessageId(null);
    setMessageMenuMessageId(null);
  }

  function openReplyToMessage(message: ChatMessage) {
    setReplyTargetByChannel((current) => setReplyTarget(current, activeChannel, message.id));
    setEmojiOpen(false);
    setGifOpen(false);
    setGifQuery("");
    setGifTab("all");
    setReactionPickerMessageId(null);
    setMessageMenuMessageId(null);
    requestAnimationFrame(() => composerInputRef.current?.focus());
  }

  function openSearch() {
    setModal("search");
    setSearchIndex(0);
    setEmojiOpen(false);
    setGifOpen(false);
    setGifQuery("");
    setGifTab("all");
    setReactionPickerMessageId(null);
    setMessageMenuMessageId(null);
  }

  function openSessionTab() {
    setMainTab("session");
    setModal(null);
    setEmojiOpen(false);
    setGifOpen(false);
    setGifQuery("");
    setGifTab("all");
    setReactionPickerMessageId(null);
    setMessageMenuMessageId(null);
  }

  function stepSearch(direction: 1 | -1) {
    if (!searchActive || searchMatches.length === 0) return;
    setSearchIndex((current) => (current + direction + searchMatches.length) % searchMatches.length);
  }

  function jumpToMessage(messageId: string) {
    const target = messages.find((message) => message.id === messageId && message.channel === activeChannel);
    if (!target) {
      log("Original message is no longer available.");
      return;
    }

    if (searchActive) setSearchQuery("");
    setSearchIndex(0);
    requestAnimationFrame(() => {
      const node = messageListRef.current?.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);
      node?.scrollIntoView({ block: "center" });
    });
  }

  function jumpToLatest() {
    const list = messageListRef.current;
    if (!list) return;

    setFollowLatest(true);
    requestAnimationFrame(() => {
      list.scrollTop = list.scrollHeight;
    });
  }

  function clearComposerDraft() {
    if (!draft && !replyToMessage) return;
    setDraftByChannel((current) => clearChannelDraft(current, activeChannel));
    setReplyTargetByChannel((current) => clearReplyTarget(current, activeChannel));
    void sendTypingSync(false);
    log(`Cleared draft for #${activeLabel}.`);
  }

  async function copyText(value: string, successMessage: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const fallback = document.createElement("textarea");
        fallback.value = value;
        fallback.setAttribute("readonly", "true");
        fallback.style.position = "fixed";
        fallback.style.opacity = "0";
        fallback.style.pointerEvents = "none";
        fallback.style.left = "-9999px";
        document.body.appendChild(fallback);
        fallback.select();
        fallback.setSelectionRange(0, fallback.value.length);
        const copied = document.execCommand("copy");
        document.body.removeChild(fallback);
        if (!copied) throw new Error("Clipboard copy failed.");
      }
      log(successMessage);
    } catch {
      log("Clipboard access failed.");
    }
  }

  function collectWorkspaceBackupSettings(): WorkspaceBackupSettings {
    return {
      activeServer,
      activeChannelsByServer,
      activeVoiceRoom,
      channels,
      iceServersText,
      membersOpen,
      notificationsMuted,
      name,
      presence,
      recentEmojis,
      gifFavorites,
      newChannelName,
      newServerName,
      draftByChannel,
      editDraftByMessage,
      replyTargetByChannel,
      signalInput,
      signalOutput,
      searchQuery,
      searchIndex,
      roomPeerFingerprint,
      servers,
      unreadByChannel,
    };
  }

  function hydrateAttachmentUrls(nextMessages: ChatMessage[]) {
    return nextMessages.map((message) => {
      if (!message.attachment?.dataUrl || message.attachment.objectUrl) return message;
      const objectUrl = dataUrlToObjectUrl(message.attachment.dataUrl);
      objectUrlsRef.current.add(objectUrl);
      return {
        ...message,
        attachment: {
          ...message.attachment,
          objectUrl,
        },
      };
    });
  }

  function applyImportedWorkspace(settings: WorkspaceBackupSettings, importedMessages: ChatMessage[]) {
    const nextServers = settings.servers?.length ? settings.servers : servers.length ? servers : [activeServer];
    const nextChannels = settings.channels?.length ? settings.channels : channels.length ? channels : DEFAULT_CHANNELS;
    const nextActiveServer =
      settings.activeServer && nextServers.includes(settings.activeServer) ? settings.activeServer : nextServers[0];
    const channelMap = settings.activeChannelsByServer ?? {};
    const nextActiveChannelCandidate = channelMap[nextActiveServer] ?? activeChannel;
    const nextActiveChannel = nextChannels.some((channel) => channel.id === nextActiveChannelCandidate)
      ? nextActiveChannelCandidate
      : nextChannels[0]?.id ?? activeChannel;
    const nextActiveChannelsByServer = Object.fromEntries(
      nextServers.map((server) => {
        const candidate = channelMap[server] ?? nextActiveChannel;
        return [server, nextChannels.some((channel) => channel.id === candidate) ? candidate : nextActiveChannel];
      }),
    );

    setServers(nextServers);
    setChannels(nextChannels);
    setActiveServer(nextActiveServer);
    setActiveChannelsByServer({
      ...nextActiveChannelsByServer,
      [nextActiveServer]: nextActiveChannel,
    });
    setActiveChannel(nextActiveChannel);
    setActiveVoiceRoom(settings.activeVoiceRoom ?? null);
    setIceServersText(settings.iceServersText ?? formatIceServers(DEFAULT_ICE_SERVERS));
    setMembersOpen(settings.membersOpen ?? true);
    setNotificationsMuted(settings.notificationsMuted ?? false);
    setName(settings.name ?? "Anonymous");
    setPresence(settings.presence ?? "direct peer online");
    setRecentEmojis(settings.recentEmojis ?? defaultRecentEmojis);
    setGifFavorites(settings.gifFavorites ?? []);
    setNewChannelName(settings.newChannelName ?? "");
    setNewServerName(settings.newServerName ?? "");
    setDraftByChannel(settings.draftByChannel ?? {});
    setEditDraftByMessage(settings.editDraftByMessage ?? {});
    setReplyTargetByChannel(settings.replyTargetByChannel ?? {});
    setSignalInput(settings.signalInput ?? "");
    setSignalOutput(settings.signalOutput ?? "");
    setSearchQuery(settings.searchQuery ?? "");
    setSearchIndex(settings.searchIndex ?? 0);
    setRoomPeerFingerprint(settings.roomPeerFingerprint ?? "");
    setUnreadByChannel(settings.unreadByChannel ?? {});
    setGifTab("all");
    setGifQuery("");
    revokeAttachmentUrls();
    setMessages(hydrateAttachmentUrls(importedMessages));
    setHistoryUnlocked(true);
    setHistoryPassphrase(passphrase);
    setFollowLatest(true);
    setEmojiOpen(false);
    setReactionPickerMessageId(null);
    setSelectedMember(null);
    setPeerTypingChannel(null);
    setPendingGif(null);
    lastReadSyncRef.current = {};
    revokeAttachmentUrls();
  }

  function makeAttachment(fileName: string, mimeType: string, size: number, dataUrl: string) {
    const objectUrl = dataUrlToObjectUrl(dataUrl);
    objectUrlsRef.current.add(objectUrl);
    return {
      fileName,
      mimeType,
      size,
      dataUrl,
      objectUrl,
    };
  }

  function revokeAttachmentUrls() {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }

  function stopLocalMedia() {
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    screenStreamRef.current = null;
    setCallActive(false);
    setScreenSharing(false);
    setMicMuted(false);
  }

  function clearRemoteMedia() {
    remoteStreamRef.current.getTracks().forEach((track) => {
      track.stop();
      remoteStreamRef.current.removeTrack(track);
    });
    setRemoteMediaActive(false);
    setRemoteVideoActive(false);
  }

  function disconnectPeer() {
    channelRef.current?.close();
    pcRef.current?.close();
    channelRef.current = null;
    pcRef.current = null;
    renegotiatingRef.current = false;
    attachmentTransfersRef.current.clear();
    stopLocalMedia();
    clearRemoteMedia();
    setPeerTypingChannel(null);
    setStatus("closed");
    log("Disconnected peer session.");
  }

  function requestDisconnect() {
    void sendSessionControl("disconnect");
    disconnectPeer();
  }

  async function sendProfileSync(profile: {
    name: string;
    presence: string;
    notificationsMuted: boolean;
    membersOpen: boolean;
    activeServer: string;
    activeChannel: string;
  }) {
    await sendEncryptedPayload({
      type: "profile-sync",
      id: crypto.randomUUID(),
      author: profile.name || "Anonymous",
      channel: activeChannel,
      at: Date.now(),
      ...profile,
    });
  }

  async function waitForIceGatheringComplete(pc: RTCPeerConnection) {
    if (pc.iceGatheringState === "complete") return;

    await new Promise<void>((resolve) => {
      const finishWithTimeout = () => {
        pc.removeEventListener("icegatheringstatechange", finish);
        resolve();
      };
      const timeout = window.setTimeout(finishWithTimeout, 3500);
      const finish = () => {
        if (pc.iceGatheringState !== "complete") return;
        window.clearTimeout(timeout);
        pc.removeEventListener("icegatheringstatechange", finish);
        resolve();
      };

      pc.addEventListener("icegatheringstatechange", finish);
    });
  }

  async function toggleNotifications() {
    if (!notificationsMuted && "Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        log("Notification permission prompt was blocked.");
      }
    }

    setNotificationsMuted((muted) => {
      const nextMuted = !muted;
      log(nextMuted ? "Notifications muted for this device." : "Notifications enabled for this device.");
      void sendProfileSync({
        name,
        presence,
        notificationsMuted: nextMuted,
        membersOpen,
        activeServer,
        activeChannel,
      });
      return nextMuted;
    });
  }

  async function toggleCall() {
    if (callActive) {
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
      setCallActive(false);
      setMicMuted(false);
      addSystemMessage("Ended the local voice session.");
      void sendMediaSync({ callActive: false, screenSharing, micMuted: false });
      await negotiateMedia();
      return;
    }

    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setCallActive(true);
      setMicMuted(false);
      addLocalTracksToPeer();
      addSystemMessage("Started a local voice session with microphone capture.");
      void sendMediaSync({ callActive: true, screenSharing, micMuted: false });
      await negotiateMedia();
    } catch {
      log("Microphone permission denied or unavailable.");
    }
  }

  async function toggleScreenShare() {
    if (screenSharing) {
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setScreenSharing(false);
      addSystemMessage("Screen share stopped.");
      void sendMediaSync({ callActive, screenSharing: false, micMuted });
      await negotiateMedia();
      return;
    }

    try {
      screenStreamRef.current = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current.getVideoTracks()[0]?.addEventListener("ended", () => {
        setScreenSharing(false);
        screenStreamRef.current = null;
        void negotiateMedia();
        log("Screen share ended by browser.");
      });
      setScreenSharing(true);
      addLocalTracksToPeer();
      addSystemMessage("Screen share capture started locally.");
      void sendMediaSync({ callActive, screenSharing: true, micMuted });
      await negotiateMedia();
    } catch {
      log("Screen share permission denied or unavailable.");
    }
  }

  function toggleMic() {
    if (!micStreamRef.current) {
      void toggleCall();
      return;
    }

    setMicMuted((muted) => {
      const nextMuted = !muted;
      micStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
      log(nextMuted ? "Microphone muted." : "Microphone unmuted.");
      void sendMediaSync({ callActive, screenSharing, micMuted: nextMuted });
      return nextMuted;
    });
  }

  function joinVoiceRoom(room: string) {
    setActiveVoiceRoom((current) => {
      const nextRoom = current === room ? null : room;
      log(nextRoom ? `Joined voice room: ${nextRoom}.` : "Left voice mesh.");
      void sendVoiceSync(nextRoom);
      return nextRoom;
    });
  }

  async function shareProfile() {
    await sendProfileSync({
      name: name || "Anonymous",
      presence,
      notificationsMuted,
      membersOpen,
      activeServer,
      activeChannel,
    });
    log("Profile shared with peer.");
  }

  function switchChannel(channelId: string) {
    setActiveChannel(channelId);
    setFollowLatest(true);
    setEmojiOpen(false);
    setReactionPickerMessageId(null);
    setMessageMenuMessageId(null);
    setPeerTypingChannel(null);
    void sendProfileSync({
      name: name || "Anonymous",
      presence,
      notificationsMuted,
      membersOpen,
      activeServer,
      activeChannel: channelId,
    });
    log(`Opened #${channels.find((channel) => channel.id === channelId)?.label ?? channelId}.`);
  }

  function switchServer(server: string) {
    const nextChannel = activeChannelsByServer[server] ?? channels[0]?.id ?? activeChannel;
    setActiveChannelsByServer((current) => ({
      ...current,
      [activeServer]: activeChannel,
      [server]: nextChannel,
    }));
    setActiveServer(server);
    setActiveChannel(nextChannel);
    setFollowLatest(true);
    setEmojiOpen(false);
    setReactionPickerMessageId(null);
    setMessageMenuMessageId(null);
    setPeerTypingChannel(null);
    void sendProfileSync({
      name: name || "Anonymous",
      presence,
      notificationsMuted,
      membersOpen,
      activeServer: server,
      activeChannel: nextChannel,
    });
    log(`Switched to ${server}.`);
  }

  function openMemberProfile(member: string) {
    setSelectedMember(member);
    setModal("member");
    setEmojiOpen(false);
    setReactionPickerMessageId(null);
    setMessageMenuMessageId(null);
    log(`Opened profile for ${member}.`);
  }

  function toggleMembersPanel() {
    setMembersOpen((open) => {
      const nextOpen = !open;
      void sendProfileSync({
        name,
        presence,
        notificationsMuted,
        membersOpen: nextOpen,
        activeServer,
        activeChannel,
      });
      return nextOpen;
    });
  }

  function openRoomModal() {
    setRoomPeerFingerprint("");
    setRoomFingerprintMatch("idle");
    setModal("room");
  }

  function openCreateServer() {
    setNewServerName("");
    setModal("server");
  }

  function openRenameServer() {
    setNewServerName(activeServer);
    setModal("rename-server");
  }

  function openDeleteServer() {
    setModal("delete-server");
  }

  function openClearHistory() {
    setModal("clear-history");
  }

  function markAllUnreadAsRead() {
    setUnreadByChannel(clearAllUnreadCounts);
    log("Cleared unread channel badges.");
    const channelIds = Object.keys(unreadByChannel);
    channelIds.forEach((channelId) => {
      const readAt = messages.reduce((latest, message) => (message.channel === channelId ? Math.max(latest, message.at) : latest), 0);
      if (readAt > 0) void sendReadSync(channelId, readAt);
    });
  }

  function markChannelAsRead(channelId: string) {
    setUnreadByChannel((current) => clearUnreadCount(current, channelId));
    log(`Cleared unread badge for #${channels.find((channel) => channel.id === channelId)?.label ?? channelId}.`);
    const readAt = messages.reduce((latest, message) => (message.channel === channelId ? Math.max(latest, message.at) : latest), 0);
    if (readAt > 0) void sendReadSync(channelId, readAt);
  }

  function createServer() {
    const trimmed = newServerName.trim();
    if (!trimmed || servers.includes(trimmed)) return;
    setServers((current) => (current.includes(trimmed) ? current : [...current, trimmed]));
    setActiveServer(trimmed);
    setActiveChannelsByServer((current) => ({
      ...current,
      [activeServer]: activeChannel,
      [trimmed]: channels[0]?.id ?? activeChannel,
    }));
    setNewServerName("");
    setModal(null);
    log(`Created local server: ${trimmed}.`);
    void sendProfileSync({
      name: name || "Anonymous",
      presence,
      notificationsMuted,
      membersOpen,
      activeServer: trimmed,
      activeChannel,
    });
    void sendServerSync({ action: "create", serverName: trimmed, channelId: activeChannel });
  }

  function renameServer() {
    const nextServer = newServerName.trim();
    if (!nextServer || nextServer === activeServer) {
      setModal(null);
      return;
    }

    if (servers.some((server) => server !== activeServer && server === nextServer)) {
      log(`Server name ${nextServer} already exists.`);
      return;
    }

    const renamed = renameServerEntries(servers, activeChannelsByServer, activeServer, nextServer, activeChannel);
    setServers(renamed.servers);
    setActiveChannelsByServer(renamed.activeChannelsByServer);
    setActiveServer(nextServer);
    setNewServerName("");
    setModal(null);
    log(`Renamed ${activeServer} to ${nextServer}.`);
    void sendProfileSync({
      name: name || "Anonymous",
      presence,
      notificationsMuted,
      membersOpen,
      activeServer: nextServer,
      activeChannel,
    });
    void sendServerSync({
      action: "rename",
      serverName: activeServer,
      channelId: activeChannel,
      nextServerName: nextServer,
      nextChannelId: activeChannel,
    });
  }

  function deleteServer() {
    if (servers.length <= 1) return;

    const fallbackServer = servers.find((server) => server !== activeServer) ?? null;
    if (!fallbackServer) return;

    const fallbackChannel = activeChannelsByServer[fallbackServer] ?? channels[0]?.id ?? activeChannel;
    const deleted = deleteServerEntries(servers, activeChannelsByServer, activeServer, fallbackServer, fallbackChannel);

    setServers(deleted.servers);
    setActiveChannelsByServer(deleted.activeChannelsByServer);
    setActiveServer(fallbackServer);
    setActiveChannel(fallbackChannel);
    setNewServerName("");
    setModal(null);
    log(`Deleted ${activeServer} and switched to ${fallbackServer}.`);
    void sendProfileSync({
      name: name || "Anonymous",
      presence,
      notificationsMuted,
      membersOpen,
      activeServer: fallbackServer,
      activeChannel: fallbackChannel,
    });
    void sendServerSync({
      action: "delete",
      serverName: activeServer,
      channelId: activeChannel,
      nextServerName: fallbackServer,
      nextChannelId: fallbackChannel,
    });
  }

  function createChannel() {
    const label = newChannelName.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (!label) return;
    const channel = { id: label, label };
    setChannels((current) => (current.some((item) => item.id === channel.id) ? current : [...current, channel]));
    setActiveChannel(channel.id);
    setNewChannelName("");
    setModal(null);
    log(`Created #${label}.`);
    void sendProfileSync({
      name: name || "Anonymous",
      presence,
      notificationsMuted,
      membersOpen,
      activeServer,
      activeChannel: channel.id,
    });
    void sendChannelSync({ action: "create", channelId: channel.id, label: channel.label });
  }

  function closeModal() {
    setModal(null);
    setDeletingChannelId(null);
    setEditingChannelId(null);
    setEditingMessageId(null);
    setDeletingMessageId(null);
    setSelectedMember(null);
    setPendingAttachment(null);
    setEmojiOpen(false);
    setReactionPickerMessageId(null);
  }

  function saveEditedMessage() {
    const messageId = editingMessageId;
    const body = getMessageEditDraft(editDraftByMessage, messageId ?? "").trim();
    if (!messageId || !body) return;

    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, body, edited: true } : message,
      ),
    );

    const message = messages.find((item) => item.id === messageId);
    if (message) {
      void sendEncryptedPayload({
        type: "edit",
        id: crypto.randomUUID(),
        author: name || "Anonymous",
        channel: message.channel,
        at: Date.now(),
        messageId,
        nextBody: body,
      });
    }

    setEditingMessageId(null);
    setEditDraftByMessage((current) => clearMessageEditDraft(current, messageId));
    setModal(null);
    log("Message edited.");
  }

  function confirmDeleteMessage() {
    const messageId = deletingMessageId;
    if (!messageId) return;

    const message = messages.find((item) => item.id === messageId);
    setMessages((current) => current.filter((item) => item.id !== messageId));

    if (message) {
      void sendEncryptedPayload({
        type: "delete",
        id: crypto.randomUUID(),
        author: name || "Anonymous",
        channel: message.channel,
        at: Date.now(),
        messageId,
      });
    }

    setDeletingMessageId(null);
    setModal(null);
    log("Message deleted.");
  }

  function renameChannel() {
    const current = channels.find((channel) => channel.id === editingChannelId);
    const label = newChannelName.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (!current || !label) return;
    setChannels((items) => items.map((item) => (item.id === current.id ? { id: label, label } : item)));
    setMessages((items) => items.map((message) => (message.channel === current.id ? { ...message, channel: label } : message)));
    setDraftByChannel((currentDrafts) => moveChannelDraft(currentDrafts, current.id, label));
    setReplyTargetByChannel((currentTargets) => moveReplyTarget(currentTargets, current.id, label));
    setUnreadByChannel((counts) => moveUnreadCount(counts, current.id, label));
    setActiveChannelsByServer((currentMap) =>
      Object.fromEntries(
        Object.entries(currentMap).map(([server, channelId]) => [server, channelId === current.id ? label : channelId]),
      ),
    );
    if (activeChannel === current.id) setActiveChannel(label);
    setEditingChannelId(null);
    setNewChannelName("");
    setModal(null);
    log(`Renamed #${current.label} to #${label}.`);
    void sendProfileSync({
      name: name || "Anonymous",
      presence,
      notificationsMuted,
      membersOpen,
      activeServer,
      activeChannel: activeChannel === current.id ? label : activeChannel,
    });
    void sendChannelSync({ action: "rename", channelId: current.id, label: current.label, nextChannelId: label, nextLabel: label });
  }

  function deleteChannel(channelId: string) {
    if (channels.length <= 1) return;
    const removed = channels.find((channel) => channel.id === channelId);
    if (!removed) return;
    const remainingChannels = channels.filter((channel) => channel.id !== channelId);
    const nextChannel = remainingChannels[0] ?? channels[0];
    if (!nextChannel || nextChannel.id === channelId) return;

    setChannels(remainingChannels);
    setMessages((items) => items.map((message) => (message.channel === channelId ? { ...message, channel: nextChannel.id } : message)));
    setDraftByChannel((currentDrafts) => moveChannelDraft(currentDrafts, channelId, nextChannel.id));
    setReplyTargetByChannel((currentTargets) => moveReplyTarget(currentTargets, channelId, nextChannel.id));
    setUnreadByChannel((counts) => moveUnreadCount(counts, channelId, nextChannel.id));
    setActiveChannelsByServer((currentMap) =>
      Object.fromEntries(
        Object.entries(currentMap).map(([server, channel]) => [server, channel === channelId ? nextChannel.id : channel]),
      ),
    );
    setActiveChannel((current) => (current === channelId ? nextChannel.id : current));
    setDeletingChannelId(null);
    setModal(null);
    log(`Deleted #${removed.label}; moved its messages to #${nextChannel.label}.`);
    void sendProfileSync({
      name: name || "Anonymous",
      presence,
      notificationsMuted,
      membersOpen,
      activeServer,
      activeChannel: activeChannel === channelId ? nextChannel.id : activeChannel,
    });
    void sendChannelSync({
      action: "delete",
      channelId: removed.id,
      label: removed.label,
      nextChannelId: nextChannel.id,
      nextLabel: nextChannel.label,
    });
  }

  function confirmDeleteChannel() {
    if (!deletingChannelId) return;
    deleteChannel(deletingChannelId);
  }

  function roomIdentityText() {
    return [
      `server: ${activeServer}`,
      `channel: #${activeLabel}`,
      `presence: ${presence}`,
      `peer status: ${status}`,
      `notifications: ${notificationsMuted ? "muted" : "enabled"}`,
    ].join("\n");
  }

  function compareRoomFingerprint() {
    const local = normalizeFingerprint(roomFingerprint);
    const peer = normalizeFingerprint(roomPeerFingerprint);
    if (!peer) {
      log("Paste a peer fingerprint first.");
      setRoomFingerprintMatch("idle");
      return;
    }

    const matched = local.length > 0 && local === peer;
    setRoomFingerprintMatch(matched ? "match" : "mismatch");
    log(matched ? "Room fingerprints match." : "Room fingerprints do not match.");
  }

  function notifyIncomingMessage(author: string, channel: string, body: string, attachmentName?: string) {
    if (!("Notification" in window)) return;
    if (!shouldNotifyIncomingMessage({
      activeChannel,
      author,
      channel,
      notificationsMuted,
      selfName: name || "Anonymous",
      visibilityState: document.visibilityState,
    })) {
      return;
    }

    if (Notification.permission !== "granted") return;

    try {
      new Notification(`New message in #${channels.find((item) => item.id === channel)?.label ?? channel}`, {
        body: attachmentName ?? body,
      });
    } catch {
      log("Browser notifications are unavailable.");
    }
  }

  async function sendChannelSync(sync: {
    action: "create" | "delete" | "rename";
    channelId: string;
    label: string;
    nextChannelId?: string;
    nextLabel?: string;
  }) {
    await sendEncryptedPayload({
      type: "channel-sync",
      id: crypto.randomUUID(),
      author: name || "Anonymous",
      channel: activeChannel,
      at: Date.now(),
      ...sync,
    });
  }

  async function sendServerSync(sync: {
    action: "create" | "delete" | "rename";
    serverName: string;
    channelId: string;
    nextServerName?: string;
    nextChannelId?: string;
  }) {
    await sendEncryptedPayload({
      type: "server-sync",
      id: crypto.randomUUID(),
      author: name || "Anonymous",
      channel: activeChannel,
      at: Date.now(),
      ...sync,
    });
  }

  async function sendVoiceSync(room: string | null) {
    await sendEncryptedPayload({
      type: "voice-sync",
      id: crypto.randomUUID(),
      author: name || "Anonymous",
      channel: activeChannel,
      at: Date.now(),
      room,
    });
  }

  async function sendSessionControl(action: PlainWireSessionControl["action"]) {
    await sendEncryptedPayload({
      type: "session-control",
      id: crypto.randomUUID(),
      author: name || "Anonymous",
      channel: activeChannel,
      at: Date.now(),
      action,
    });
  }

  async function sendMediaSync(next: {
    callActive: boolean;
    screenSharing: boolean;
    micMuted: boolean;
  }) {
    await sendEncryptedPayload({
      type: "media-sync",
      id: crypto.randomUUID(),
      author: name || "Anonymous",
      channel: activeChannel,
      at: Date.now(),
      ...next,
    });
  }

  async function sendTypingSync(typing: boolean, channelId = activeChannel) {
    await sendEncryptedPayload({
      type: "typing-sync",
      id: crypto.randomUUID(),
      author: name || "Anonymous",
      channel: channelId,
      at: Date.now(),
      typing,
      channelId,
    });
  }

  async function sendReadSync(channelId: string, readAt: number) {
    await sendEncryptedPayload({
      type: "read-sync",
      id: crypto.randomUUID(),
      author: name || "Anonymous",
      channel: channelId,
      at: Date.now(),
      channelId,
      readAt,
    });
  }

  function getIceServers() {
    try {
      return parseIceServers(iceServersText);
    } catch {
      log("Invalid ICE server config. Falling back to direct host candidates.");
      return DEFAULT_ICE_SERVERS;
    }
  }

  function saveSettings() {
    try {
      parseIceServers(iceServersText);
      setModal(null);
      log("Settings saved.");
      void shareProfile();
    } catch (error) {
      log(error instanceof Error ? error.message : "Invalid ICE server config.");
    }
  }

  function resetSettings() {
    setServers([...DEFAULT_SERVERS]);
    setActiveServer(DEFAULT_SERVERS[0]);
    setActiveChannelsByServer({ [DEFAULT_SERVERS[0]]: DEFAULT_CHANNELS[0].id });
    setActiveChannel(DEFAULT_CHANNELS[0].id);
    setNewServerName("");
    setChannels(DEFAULT_CHANNELS);
    setNewChannelName("");
    setName(DEFAULT_NAME);
    setPresence(DEFAULT_PRESENCE);
    setIceServersText(formatIceServers(DEFAULT_ICE_SERVERS));
    setMembersOpen(true);
    setNotificationsMuted(false);
    setActiveVoiceRoom(null);
    setRecentEmojis(defaultRecentEmojis);
    setDraftByChannel({});
    setEditDraftByMessage({});
    setReplyTargetByChannel({});
    setSignalInput("");
    setSignalOutput("");
    setSearchQuery("");
    setSearchIndex(0);
    setRoomPeerFingerprint("");
    setUnreadByChannel({});
    setGifFavorites([]);
    setGifTab("all");
    setGifQuery("");
    setPendingGif(null);
    setMainTab("chat");
    setModal(null);
    setPeerTypingChannel(null);
    log("Workspace settings reset to defaults.");
    void sendProfileSync({
      name: DEFAULT_NAME,
      presence: DEFAULT_PRESENCE,
      notificationsMuted: false,
      membersOpen: true,
      activeServer: DEFAULT_SERVERS[0],
      activeChannel: DEFAULT_CHANNELS[0].id,
    });
  }

  function clearHistory() {
    revokeAttachmentUrls();
    setMessages(DEFAULT_MESSAGES);
    localStorage.removeItem(MESSAGES_KEY);
    setHistoryUnlocked(true);
    setHistoryPassphrase(passphrase);
    log("Local message history cleared.");
  }

  function retryHistoryUnlock() {
    setHistoryUnlockAttempt((attempt) => attempt + 1);
  }

  async function waitForDataChannelBuffer(channel: RTCDataChannel) {
    if (channel.bufferedAmount < 65536) return;

    await new Promise<void>((resolve) => {
      const previousThreshold = channel.bufferedAmountLowThreshold;
      channel.bufferedAmountLowThreshold = 32768;
      channel.addEventListener(
        "bufferedamountlow",
        () => {
          channel.bufferedAmountLowThreshold = previousThreshold;
          resolve();
        },
        { once: true },
      );
    });
  }

  async function sendEncryptedPayload(plain: PlainWirePayload) {
    const channel = channelRef.current;
    if (channel?.readyState !== "open") {
      log("Saved locally. Connect a peer to deliver it live.");
      return false;
    }

    const key = await deriveKey(passphrase);
    const encrypted = await encryptPayload(key, plain);
    await waitForDataChannelBuffer(channel);
    channel.send(JSON.stringify(encrypted));
    return true;
  }

  function addLocalTracksToPeer() {
    const pc = pcRef.current;
    if (!pc) return;
    const activeTracks = [micStreamRef.current, screenStreamRef.current].flatMap((stream) => stream?.getTracks() ?? []);
    const activeTrackIds = new Set(activeTracks.map((track) => track.id));

    pc.getSenders().forEach((sender) => {
      if (sender.track && !activeTrackIds.has(sender.track.id)) pc.removeTrack(sender);
    });

    const existingTrackIds = new Set(pc.getSenders().map((sender) => sender.track?.id).filter(Boolean));

    activeTracks.forEach((track) => {
      const stream = track.kind === "audio" ? micStreamRef.current : screenStreamRef.current;
      if (stream && !existingTrackIds.has(track.id)) pc.addTrack(track, stream);
    });
  }

  async function sendRtcSignal(description: RTCSessionDescriptionInit) {
    await sendEncryptedPayload({
      type: "rtc-signal",
      id: crypto.randomUUID(),
      author: name || "Anonymous",
      channel: activeChannel,
      at: Date.now(),
      description,
    });
  }

  async function sendReceipt(receivedId: string, channel: string) {
    await sendEncryptedPayload({
      type: "receipt",
      id: crypto.randomUUID(),
      author: name || "Anonymous",
      channel,
      at: Date.now(),
      receivedId,
    });
  }

  function handleReceipt(receipt: PlainWireReceipt) {
    setMessages((current) =>
      current.map((message) => (message.id === receipt.receivedId ? { ...message, delivered: true } : message)),
    );
    log(`Peer received ${receipt.receivedId.slice(0, 8)}.`);
  }

  function applyReaction(messageId: string, emoji: string, author: string, active: boolean) {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId) return message;
        const reactions = { ...(message.reactions ?? {}) };
        const authors = reactions[emoji] ?? [];
        const nextAuthors = active ? (authors.includes(author) ? authors : [...authors, author]) : authors.filter((name) => name !== author);
        if (nextAuthors.length > 0) {
          reactions[emoji] = nextAuthors;
        } else {
          delete reactions[emoji];
        }
        return { ...message, reactions };
      }),
    );
  }

  async function sendReaction(messageId: string, emoji: string) {
    const author = name || "Anonymous";
    const message = messages.find((item) => item.id === messageId);
    const active = !(message?.reactions?.[emoji] ?? []).includes(author);
    applyReaction(messageId, emoji, author, active);
    setRecentEmojis((current) => updateRecentEmojis(current, emoji));
    await sendEncryptedPayload({
      type: "reaction",
      id: crypto.randomUUID(),
      author,
      channel: activeChannel,
      at: Date.now(),
      messageId,
      emoji,
      active,
    });
    setReactionPickerMessageId(null);
  }

  function handleReaction(reaction: PlainWireReaction) {
    applyReaction(reaction.messageId, reaction.emoji, reaction.author, reaction.active);
    log(`${reaction.author} ${reaction.active ? "reacted" : "removed"} ${reaction.emoji}.`);
  }

  function handleEdit(edit: PlainWireEdit) {
    setMessages((current) =>
      current.map((message) => (message.id === edit.messageId ? { ...message, body: edit.nextBody, edited: true } : message)),
    );
    log(`${edit.author} edited a message.`);
  }

  function handleNote(note: PlainWireNote) {
    setMessages((current) => [
      ...current,
      {
        id: note.id,
        author: note.subject,
        body: note.body,
        channel: note.channel,
        at: note.at,
        encrypted: true,
        note: true,
      },
    ]);
    log(`${note.author} shared a profile note for ${note.subject}.`);
  }

  function handleDelete(del: PlainWireDelete) {
    setMessages((current) => current.filter((message) => message.id !== del.messageId));
    log(`${del.author} deleted a message.`);
  }

  function handleRead(read: PlainWireReadSync) {
    setMessages((current) =>
      current.map((message) => (message.channel === read.channelId && message.at <= read.readAt ? { ...message, seen: true } : message)),
    );
    if (read.channelId === activeChannel) {
      log(`${read.author} read #${channels.find((channel) => channel.id === read.channelId)?.label ?? read.channelId}.`);
    }
  }

  function handleChannelSync(sync: PlainWireChannelSync) {
    if (sync.action === "create") {
      setChannels((current) =>
        current.some((channel) => channel.id === sync.channelId)
          ? current
          : [...current, { id: sync.channelId, label: sync.label }],
      );
      log(`${sync.author} shared #${sync.label}.`);
      return;
    }

    if (sync.action === "rename" && sync.nextChannelId && sync.nextLabel) {
      setChannels((current) =>
        current.map((channel) => (channel.id === sync.channelId ? { id: sync.nextChannelId!, label: sync.nextLabel! } : channel)),
      );
      setMessages((current) =>
        current.map((message) => (message.channel === sync.channelId ? { ...message, channel: sync.nextChannelId! } : message)),
      );
      setDraftByChannel((currentDrafts) => moveChannelDraft(currentDrafts, sync.channelId, sync.nextChannelId!));
      setReplyTargetByChannel((currentTargets) => moveReplyTarget(currentTargets, sync.channelId, sync.nextChannelId!));
      setUnreadByChannel((counts) => moveUnreadCount(counts, sync.channelId, sync.nextChannelId!));
      setActiveChannelsByServer((currentMap) =>
        Object.fromEntries(
          Object.entries(currentMap).map(([server, channelId]) => [server, channelId === sync.channelId ? sync.nextChannelId! : channelId]),
        ),
      );
      if (activeChannel === sync.channelId) setActiveChannel(sync.nextChannelId);
      log(`${sync.author} renamed #${sync.label} to #${sync.nextLabel}.`);
      return;
    }

    if (sync.action === "delete") {
      setChannels((current) => {
        if (current.length <= 1 || !current.some((channel) => channel.id === sync.channelId)) return current;
        const next = current.filter((channel) => channel.id !== sync.channelId);
        const fallback = next.find((channel) => channel.id === sync.nextChannelId) ?? next[0];
        if (fallback) {
          setMessages((messages) =>
            messages.map((message) => (message.channel === sync.channelId ? { ...message, channel: fallback.id } : message)),
          );
          setDraftByChannel((currentDrafts) => moveChannelDraft(currentDrafts, sync.channelId, fallback.id));
          setReplyTargetByChannel((currentTargets) => moveReplyTarget(currentTargets, sync.channelId, fallback.id));
          setUnreadByChannel((counts) => moveUnreadCount(counts, sync.channelId, fallback.id));
          setActiveChannelsByServer((currentMap) =>
            Object.fromEntries(
              Object.entries(currentMap).map(([server, channelId]) => [server, channelId === sync.channelId ? fallback.id : channelId]),
            ),
          );
          setActiveChannel((currentChannel) => (currentChannel === sync.channelId ? fallback.id : currentChannel));
        }
        return next;
      });
      log(`${sync.author} deleted #${sync.label}.`);
    }
  }

  function handleServerSync(sync: PlainWireServerSync) {
    if (sync.action === "create") {
      setServers((current) => (current.includes(sync.serverName) ? current : [...current, sync.serverName]));
      setActiveChannelsByServer((currentMap) => ({
        ...currentMap,
        [sync.serverName]: sync.channelId,
      }));
      log(`${sync.author} shared server ${sync.serverName}.`);
      return;
    }

    if (sync.action === "rename" && sync.nextServerName) {
      const nextServer = sync.nextServerName;
      setServers((current) => current.map((server) => (server === sync.serverName ? nextServer : server)));
      setActiveChannelsByServer((currentMap) => {
        const nextMap = Object.fromEntries(
          Object.entries(currentMap).map(([server, channel]) => [server === sync.serverName ? nextServer : server, channel]),
        );
        nextMap[nextServer] = sync.nextChannelId ?? currentMap[sync.serverName] ?? activeChannel;
        return nextMap;
      });
      if (activeServer === sync.serverName) setActiveServer(nextServer);
      log(`${sync.author} renamed server ${sync.serverName} to ${nextServer}.`);
      return;
    }

    if (sync.action === "delete" && sync.nextServerName) {
      const fallbackServer = sync.nextServerName;
      const fallbackChannel = sync.nextChannelId ?? activeChannel;
      setServers((current) => current.filter((server) => server !== sync.serverName));
      setActiveChannelsByServer((currentMap) => {
        const nextMap = Object.fromEntries(Object.entries(currentMap).filter(([server]) => server !== sync.serverName));
        nextMap[fallbackServer] = fallbackChannel;
        return nextMap;
      });
      if (activeServer === sync.serverName) {
        setActiveServer(fallbackServer);
        setActiveChannel(fallbackChannel);
      }
      log(`${sync.author} deleted server ${sync.serverName}.`);
    }
  }

  async function negotiateMedia() {
    const pc = pcRef.current;
    if (!pc || channelRef.current?.readyState !== "open" || renegotiatingRef.current) return;

    try {
      renegotiatingRef.current = true;
      addLocalTracksToPeer();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (pc.localDescription) await sendRtcSignal(pc.localDescription);
      log("Sent encrypted media renegotiation offer.");
    } catch {
      log("Could not negotiate media tracks.");
    } finally {
      renegotiatingRef.current = false;
    }
  }

  async function handleRtcSignal(signal: PlainWireSignal) {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      if (signal.description.type === "offer") {
        addLocalTracksToPeer();
        await pc.setRemoteDescription(signal.description);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (pc.localDescription) await sendRtcSignal(pc.localDescription);
        log("Answered encrypted media renegotiation offer.");
        return;
      }

      if (signal.description.type === "answer") {
        await pc.setRemoteDescription(signal.description);
        log("Accepted encrypted media renegotiation answer.");
      }
    } catch {
      log("Could not apply media renegotiation signal.");
    }
  }

  async function sendAttachmentPayload(attachment: PlainWireAttachment) {
    const chunks = splitAttachmentPayload(attachment);

    for (const chunk of chunks) {
      const sent = await sendEncryptedPayload(chunk);
      if (!sent) return false;
    }

    log(`Sent ${attachment.fileName} in ${chunks.length} encrypted chunk${chunks.length === 1 ? "" : "s"}.`);
    return true;
  }

  async function loadSelectedAttachment(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result)));
      reader.addEventListener("error", () => reject(reader.error));
      reader.readAsDataURL(file);
    });

    setPendingAttachment({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      dataUrl: data,
    });
    log(`Selected attachment: ${file.name}.`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function sendPendingAttachment() {
    if (!pendingAttachment) return;

    const at = Date.now();
    const id = crypto.randomUUID();
    const attachment = {
      ...makeAttachment(
        pendingAttachment.fileName,
        pendingAttachment.mimeType,
        pendingAttachment.size,
        pendingAttachment.dataUrl,
      ),
    };

    setMessages((current) => [
      ...current,
      {
        id,
        author: name || "Anonymous",
        body: "",
        channel: activeChannel,
        at,
        local: true,
        encrypted: true,
        attachment,
      },
    ]);

    setModal(null);
    setPendingAttachment(null);
    log(`Attachment queued: ${pendingAttachment.fileName}.`);

    await sendAttachmentPayload({
      type: "attachment",
      id,
      author: name || "Anonymous",
      channel: activeChannel,
      at,
      fileName: pendingAttachment.fileName,
      mimeType: pendingAttachment.mimeType,
      size: pendingAttachment.size,
      data: pendingAttachment.dataUrl,
    });
  }

  function handleAttachmentChunk(chunk: PlainWireAttachmentChunk) {
    const current =
      attachmentTransfersRef.current.get(chunk.transferId) ??
      ({
        chunks: [],
        received: new Set<number>(),
        total: chunk.total,
      } satisfies AttachmentTransfer);

    if (!current.received.has(chunk.index)) {
      current.chunks.push(chunk);
      current.received.add(chunk.index);
    }

    attachmentTransfersRef.current.set(chunk.transferId, current);
    log(`Receiving ${chunk.fileName}: ${current.received.size}/${chunk.total} chunks.`);

    const attachment = reassembleAttachmentPayload(current.chunks);
    if (!attachment) return;

    attachmentTransfersRef.current.delete(chunk.transferId);
    setMessages((messages) => [
      ...messages,
      {
        id: attachment.id,
        author: attachment.author,
        body: "",
        channel: attachment.channel,
        at: attachment.at,
        encrypted: true,
        attachment: {
          ...makeAttachment(attachment.fileName, attachment.mimeType, attachment.size, attachment.data),
        },
      },
    ]);
    void sendReceipt(attachment.id, attachment.channel);
  }

  function makePeer() {
    pcRef.current?.close();
    const pc = new RTCPeerConnection({
      iceServers: getIceServers(),
    });

    pc.onconnectionstatechange = () => {
      log(`Connection state: ${pc.connectionState}`);
      if (pc.connectionState === "connected") setStatus("connected");
      if (["closed", "disconnected", "failed"].includes(pc.connectionState)) setStatus("closed");
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        log(`ICE candidate: ${event.candidate.candidate}`);
        return;
      }
      if (!pc.localDescription) return;
      if (pc.iceGatheringState !== "complete") return;
      log("ICE gathering complete.");
      setSignalOutput(JSON.stringify(pc.localDescription));
    };
    pc.onicegatheringstatechange = () => {
      log(`ICE gathering state: ${pc.iceGatheringState}`);
    };
    pc.oniceconnectionstatechange = () => {
      log(`ICE connection state: ${pc.iceConnectionState}`);
    };
    pc.onicecandidateerror = (event) => {
      log(`ICE candidate error: ${event.errorCode} ${event.errorText}`);
    };
    pc.ondatachannel = (event) => wireChannel(event.channel);
    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        if (!remoteStreamRef.current.getTracks().some((existing) => existing.id === track.id)) {
          remoteStreamRef.current.addTrack(track);
          track.addEventListener("ended", () => {
            remoteStreamRef.current.removeTrack(track);
            refreshRemoteMediaState();
            log("Remote media track ended.");
          });
        }
      });
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStreamRef.current;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
      void remoteAudioRef.current?.play().catch(() => log("Remote audio is ready; browser requires a click to play."));
      void remoteVideoRef.current?.play().catch(() => log("Remote video is ready; browser requires a click to play."));
      refreshRemoteMediaState();
      log("Receiving remote media track.");
    };
    pcRef.current = pc;
    addLocalTracksToPeer();
    return pc;
  }

  function wireChannel(channel: RTCDataChannel) {
    channelRef.current = channel;
    channel.onopen = () => {
      setStatus("connected");
      log("Encrypted P2P channel open.");
    };
    channel.onclose = () => {
      setStatus("closed");
      log("Peer channel closed.");
    };
    channel.onmessage = async (event) => {
      try {
        const wire = JSON.parse(event.data) as WireMessage;
        const key = await deriveKey(passphrase);
        const plain = await decryptPayload(key, wire);
        if (plain.type === "receipt") {
          handleReceipt(plain);
          return;
        }

        if (plain.type === "reaction") {
          handleReaction(plain);
          return;
        }

        if (plain.type === "edit") {
          handleEdit(plain);
          return;
        }

        if (plain.type === "note") {
          handleNote(plain);
          return;
        }

        if (plain.type === "delete") {
          handleDelete(plain);
          return;
        }

        if (plain.type === "channel-sync") {
          handleChannelSync(plain);
          return;
        }

        if (plain.type === "server-sync") {
          handleServerSync(plain);
          return;
        }

        if (plain.type === "voice-sync") {
          setActiveVoiceRoom(plain.room);
          log(plain.room ? `${plain.author} joined voice room: ${plain.room}.` : `${plain.author} left the voice mesh.`);
          return;
        }

        if (plain.type === "profile-sync") {
          setPeerName(plain.name);
          setPeerPresence(plain.presence);
          setPeerNotificationsMuted(plain.notificationsMuted ?? false);
          setPeerMembersOpen(plain.membersOpen ?? true);
          setPeerActiveServer(plain.activeServer ?? "unknown");
          setPeerActiveChannel(plain.activeChannel ?? "unknown");
          log(`Peer profile updated: ${plain.name}.`);
          return;
        }

        if (plain.type === "media-sync") {
          setPeerCallActive(plain.callActive);
          setPeerScreenSharing(plain.screenSharing);
          setPeerMicMuted(plain.micMuted);
          log(`Peer media updated: ${plain.callActive ? "call on" : "call off"}, ${plain.screenSharing ? "screen share on" : "screen share off"}.`);
          return;
        }

        if (plain.type === "typing-sync") {
          if (plain.channelId === activeChannel) {
            setPeerTypingChannel(plain.typing ? plain.channelId : null);
          }
          return;
        }

        if (plain.type === "read-sync") {
          handleRead(plain);
          return;
        }

        if (plain.type === "session-control") {
          if (plain.action === "disconnect") {
            log(`${plain.author} ended the session.`);
            disconnectPeer();
          }
          return;
        }

        if (plain.type === "rtc-signal") {
          await handleRtcSignal(plain);
          return;
        }

        if (plain.type === "attachment-chunk") {
          handleAttachmentChunk(plain);
          return;
        }

        setMessages((current) => [
          ...current,
          {
            id: plain.id,
            author: plain.author,
            body: plain.type === "attachment" ? "" : plain.body,
            channel: plain.channel,
            at: plain.at,
            encrypted: true,
            replyToId: plain.type === "message" ? plain.replyToId : undefined,
            replyToAuthor: plain.type === "message" ? plain.replyToAuthor : undefined,
            replyToBody: plain.type === "message" ? plain.replyToBody : undefined,
            attachment:
              plain.type === "attachment"
                ? {
                    ...makeAttachment(plain.fileName, plain.mimeType, plain.size, plain.data),
                  }
                : undefined,
          },
        ]);
        if (plain.channel !== activeChannel || document.visibilityState === "hidden") {
          setUnreadByChannel((current) => incrementUnreadCount(current, plain.channel));
        }
        notifyIncomingMessage(
          plain.author,
          plain.channel,
          plain.type === "attachment" ? "" : plain.body,
          plain.type === "attachment" ? plain.fileName : undefined,
        );
        void sendReceipt(plain.id, plain.channel);
      } catch {
        log("Could not decrypt a peer message. Check the shared passphrase.");
      }
    };
  }

  async function createInvite() {
    const pc = makePeer();
    const channel = pc.createDataChannel("relayless-chat", { ordered: true });
    wireChannel(channel);
    setStatus("hosting");
    setSignalInput("");
    log("Creating invite and gathering network candidates.");
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGatheringComplete(pc);
    if (pc.localDescription) {
      const payload = JSON.stringify(pc.localDescription);
      setSignalOutput(payload);
      void copyText(payload, "Invite copied to clipboard.");
    }
    log("Invite ready. Share the offer text with a peer.");
  }

  async function acceptInvite() {
    try {
      const pc = makePeer();
      setStatus("joining");
      const offer = JSON.parse(signalInput) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIceGatheringComplete(pc);
      if (pc.localDescription) {
        const payload = JSON.stringify(pc.localDescription);
        setSignalOutput(payload);
        void copyText(payload, "Answer copied to clipboard.");
      }
      log("Answer ready. Send it back to the host.");
    } catch {
      setStatus("idle");
      log("Could not accept offer. Paste a valid offer payload first.");
    }
  }

  async function finishPairing() {
    if (!pcRef.current) {
      log("Create an invite before using an answer.");
      return;
    }

    try {
      const answer = JSON.parse(signalInput) as RTCSessionDescriptionInit;
      await pcRef.current.setRemoteDescription(answer);
      setSignalInput("");
      log("Answer accepted. Waiting for direct channel.");
    } catch {
      log("Could not use answer. Paste a valid answer payload first.");
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    await submitMessage();
  }

  async function submitMessage() {
    const body = [draft.trim(), pendingGif?.url].filter(Boolean).join(" ");
    if (!body) return;

    const base: PlainWireMessage = {
      type: "message" as const,
      kind: "chat",
      id: crypto.randomUUID(),
      author: name || "Anonymous",
      channel: activeChannel,
      at: Date.now(),
      body,
      replyToId: replyToMessage?.id,
      replyToAuthor: replyToMessage?.author,
      replyToBody: replyToMessage?.body,
    };

    setMessages((current) => [
      ...current,
      {
        id: base.id,
        author: base.author,
        body,
        channel: activeChannel,
        at: base.at,
        local: true,
        encrypted: true,
        replyToId: base.replyToId,
        replyToAuthor: base.replyToAuthor,
        replyToBody: base.replyToBody,
      },
    ]);
    setDraftByChannel((current) => clearChannelDraft(current, activeChannel));
    setReplyTargetByChannel((current) => clearReplyTarget(current, activeChannel));
    setPendingGif(null);
    setFollowLatest(true);
    void sendTypingSync(false);

    await sendEncryptedPayload(base);
  }

  function insertComposerText(value: string) {
    const input = composerInputRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? draft.length;
    const nextDraft = `${draft.slice(0, start)}${value}${draft.slice(end)}`;
    const nextCursor = start + value.length;

    setDraftByChannel((current) => setChannelDraft(current, activeChannel, nextDraft));
    return nextCursor;
  }

  function insertEmoji(emoji: string) {
    const nextCursor = insertComposerText(emoji);

    setRecentEmojis((current) => updateRecentEmojis(current, emoji));
    setEmojiOpen(false);
    setGifOpen(false);
    setGifQuery("");
    setGifTab("all");
    requestAnimationFrame(() => {
      composerInputRef.current?.focus();
      composerInputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function insertGif(gif: { url: string; label: string; source: string }) {
    setPendingGif(gif);
    setEmojiOpen(false);
    setGifOpen(false);
    setGifQuery("");
    setGifTab("all");
    requestAnimationFrame(() => composerInputRef.current?.focus());
  }

  function renderBodyText(text: string, keyPrefix: string) {
    const markers = [
      { delimiter: "`", kind: "code" as const },
      { delimiter: "**", kind: "strong" as const },
      { delimiter: "__", kind: "underline" as const },
      { delimiter: "~~", kind: "strike" as const },
      { delimiter: "==", kind: "grey" as const },
      { delimiter: "*", kind: "italic" as const },
    ];

    function renderInlineMarkdown(value: string, innerPrefix: string, markerIndex = 0): React.ReactNode[] {
      const marker = markers[markerIndex];
      if (!marker) return [value];

      const parts = value.split(marker.delimiter);
      if (parts.length < 3) return renderInlineMarkdown(value, innerPrefix, markerIndex + 1);

      return parts.flatMap((part, partIndex) => {
        const nextPrefix = `${innerPrefix}-${markerIndex}-${partIndex}`;
        if (partIndex % 2 === 0) return renderInlineMarkdown(part, nextPrefix, markerIndex + 1);

        const content = marker.kind === "code" ? (
          part
        ) : (
          renderInlineMarkdown(part, nextPrefix, markerIndex + 1)
        );

        switch (marker.kind) {
          case "code":
            return [<code key={nextPrefix} className="inlineCode">{content}</code>];
          case "strong":
            return [<strong key={nextPrefix}>{content}</strong>];
          case "underline":
            return [<u key={nextPrefix}>{content}</u>];
          case "strike":
            return [<s key={nextPrefix}>{content}</s>];
          case "grey":
            return [<span key={nextPrefix} className="messageGrey">{content}</span>];
          case "italic":
            return [<em key={nextPrefix}>{content}</em>];
        }
      });
    }

    function renderTextParagraphs(value: string, paragraphPrefix: string) {
      return value
        .split(/\n{2,}/)
        .filter((paragraph) => paragraph.length > 0)
        .map((paragraph, paragraphIndex) => {
          const lines = paragraph.split("\n");
          const isQuote = lines.every((line) => line.trimStart().startsWith(">"));
          const body = lines.flatMap((line, lineIndex) => {
            const content = isQuote ? line.replace(/^\s*>\s?/, "") : line;
            return [
              ...(lineIndex > 0 ? [<br key={`${paragraphPrefix}-br-${paragraphIndex}-${lineIndex}`} />] : []),
              ...splitMessageText(content).flatMap((token, tokenIndex) =>
                token.type === "text" ? (
                  renderInlineMarkdown(token.value, `${paragraphPrefix}-t-${paragraphIndex}-${lineIndex}-${tokenIndex}`)
                ) : (
                  [
                    <a
                      key={`${paragraphPrefix}-a-${paragraphIndex}-${lineIndex}-${tokenIndex}-${token.href}`}
                      href={rewriteTweetUrlToFxTwitter(token.href)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {rewriteTweetUrlToFxTwitter(token.label)}
                    </a>,
                  ]
                ),
              ),
            ];
          });

          return isQuote ? (
            <blockquote key={`${paragraphPrefix}-q-${paragraphIndex}`} className="messageQuote">
              {body}
            </blockquote>
          ) : (
            <p key={`${paragraphPrefix}-p-${paragraphIndex}`}>{body}</p>
          );
        });
    }

    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    const fencePattern = /```([\s\S]*?)```/g;

    for (const match of text.matchAll(fencePattern)) {
      const index = match.index ?? 0;
      if (index > lastIndex) {
        nodes.push(...renderTextParagraphs(text.slice(lastIndex, index), `${keyPrefix}-text-${lastIndex}`));
      }

      const code = match[1].replace(/^\n/, "").replace(/\n$/, "");
      nodes.push(
        <div key={`${keyPrefix}-code-${index}`} className="messageCodeBlock">
          <button
            type="button"
            className="messageCodeCopy"
            onClick={() => void copyText(code, "Copied code block.")}
            aria-label="Copy code block"
            title="Copy"
          >
            <Copy size={13} />
          </button>
          <pre>
            <code>{code}</code>
          </pre>
        </div>,
      );
      lastIndex = index + match[0].length;
    }

    if (lastIndex < text.length) {
      nodes.push(...renderTextParagraphs(text.slice(lastIndex), `${keyPrefix}-text-${lastIndex}`));
    }

    return nodes;
  }

  function toggleGifFavorite(gifId: string) {
    setGifFavorites((current) => (current.includes(gifId) ? current.filter((item) => item !== gifId) : [...current, gifId]));
  }

  async function copySignal() {
    await copyText(signalOutput, "Copied signaling text.");
  }

  async function exportWorkspaceBackup() {
    const backup = createWorkspaceBackup(collectWorkspaceBackupSettings(), messages);
    const blob = new Blob([backup], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `relayless-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    log("Downloaded workspace backup.");
  }

  async function importWorkspaceBackup(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    try {
      const parsed = parseWorkspaceBackup(await file.text());
      if (!parsed) {
        log("Invalid workspace backup file.");
        return;
      }

      applyImportedWorkspace(parsed.settings, parsed.messages);
      log("Workspace backup imported.");
      setModal(null);
    } catch {
      log("Could not read workspace backup.");
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = "";
    }
  }

  async function pasteSignal() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        log("Clipboard is empty.");
        return;
      }
      setSignalInput(text);
      log("Pasted signaling text.");
    } catch {
      log("Clipboard read failed.");
    }
  }

  function clearSignal() {
    setSignalInput("");
    setSignalOutput("");
    setStatus((current) => (current === "hosting" || current === "joining" ? "idle" : current));
    log("Cleared signaling text.");
  }

  const sessionPane = (
    <>
      <section className="panelSection identity">
        <div className="sectionHeader">
          <Signal size={18} />
          <strong>P2P Session</strong>
        </div>
        <div className={`status ${connected ? "online" : ""}`}>
          <Circle size={10} fill="currentColor" />
          {status}
        </div>
        <label>
          Display name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Presence
          <input value={presence} onChange={(event) => setPresence(event.target.value)} />
        </label>
        <label>
          Shared passphrase
          <input value={passphrase} onChange={(event) => setPassphrase(event.target.value)} type="password" />
        </label>
        <label>
          Key fingerprint
          <input readOnly value={keyFingerprint} />
        </label>
        <div className="identitySummary">
          <span className={cryptoStatus === "available" ? "dot online" : "dot"} />
          WebCrypto {cryptoStatus}
        </div>
        <div className="identitySummary">
          <span className="dot online" />
          Peer {peerName} - {peerPresence}
        </div>
        <div className="identitySummary">
          <span className="dot online" />
          Peer workspace {peerActiveServer} / #{peerActiveChannel}
        </div>
        <div className="identitySummary">
          <span className={peerNotificationsMuted ? "dot" : "dot online"} />
          Peer notifications {peerNotificationsMuted ? "muted" : "enabled"}; members {peerMembersOpen ? "open" : "hidden"}
        </div>
        <button className="secondaryButton compact" type="button" onClick={shareProfile}>
          Share profile
        </button>
        <div className="historyStatus">
          <span className={historyUnlocked ? "dot online" : "dot"} />
          History {historyUnlocked ? "unlocked" : "locked"}
          {!historyUnlocked && (
            <button className="secondaryButton compact" type="button" onClick={retryHistoryUnlock}>
              Retry
            </button>
          )}
        </div>
      </section>

      <section className="panelSection">
        <div className="sectionHeader">
          <Radio size={18} />
          <strong>Manual Signaling</strong>
        </div>
        <div className="signalButtons">
          <button type="button" onClick={createInvite}>Create Invite</button>
          <button type="button" onClick={acceptInvite}>Accept Offer</button>
          <button type="button" onClick={finishPairing}>Use Answer</button>
        </div>
        <div className="signalStatus">{signalStatusText}</div>
        <button className="secondaryButton" type="button" onClick={requestDisconnect} disabled={!pcRef.current && !channelRef.current}>
          Disconnect
        </button>
        <div className="signalActions">
          <button type="button" onClick={pasteSignal}>Paste</button>
          <button type="button" onClick={clearSignal}>Clear</button>
        </div>
        <textarea
          value={signalInput}
          onChange={(event) => setSignalInput(event.target.value)}
          placeholder="Paste a peer offer or answer here"
        />
        <div className="outputHeader">
          <span>Share this text</span>
          <button type="button" onClick={copySignal} disabled={!signalOutput} aria-label="Copy signal">
            <Copy size={16} />
          </button>
        </div>
        <textarea readOnly value={signalOutput} placeholder="Generated signaling payload" />
        <button className="secondaryButton compact" type="button" onClick={copySignal} disabled={!signalOutput}>
          <Copy size={16} />
          Copy answer
        </button>
      </section>

      <section className="panelSection events" style={{ margin: 0 }}>
        <div className="sectionHeader splitHeader">
          <strong>Event Log</strong>
          <button className="secondaryButton compact" type="button" onClick={clearEventLog}>
            Clear
          </button>
        </div>
        {events.map((event) => (
          <span key={event}>{event}</span>
        ))}
      </section>
    </>
  );

  return (
    <main className={`shell ${membersOpen ? "" : "membersClosed"}`}>
      <aside className="serverRail" aria-label="Servers">
        {servers.map((server) => (
          <button
            className={`server ${activeServer === server ? "active" : ""}`}
            key={server}
            onClick={() => switchServer(server)}
            aria-label={`Open ${server}`}
            title={server}
          >
            <span>
              {server
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </span>
            {getUnreadCountForChannel(unreadByChannel, activeChannelsByServer[server]) > 0 && (
              <span className="serverUnread">{getUnreadCountForChannel(unreadByChannel, activeChannelsByServer[server])}</span>
            )}
          </button>
        ))}
        <button className="server add" aria-label="Add server" onClick={openCreateServer}>
          <Plus size={20} />
        </button>
      </aside>

      <aside className="sidebar">
        <div className="workspace">
          <div>
            <strong>{activeServer}</strong>
            <span>decentralized guild</span>
          </div>
          <div className="workspaceActions">
            <button className="iconButton" onClick={openRenameServer} aria-label="Rename server" title="Rename server">
              <Settings size={18} />
            </button>
            <button
              className="iconButton"
              onClick={openDeleteServer}
              aria-label="Delete server"
              title="Delete server"
              disabled={servers.length <= 1}
            >
              <Trash2 size={18} />
            </button>
            <button className="iconButton" onClick={openRoomModal} aria-label="Verify room" title="Verify room">
              <ShieldCheck size={20} />
            </button>
          </div>
        </div>

        <section className="channelBlock">
          <div className="blockTitle splitTitle">
            <span>Text Channels</span>
            <button type="button" onClick={() => setModal("channel")} aria-label="Add text channel">
              <Plus size={14} />
            </button>
          </div>
          {channels.map((channel) => (
            <div className={`channelRow ${activeChannel === channel.id ? "selected" : ""}`} key={channel.id}>
              <button className="channel" onClick={() => switchChannel(channel.id)}>
                <Hash size={17} />
                <span>{channel.label}</span>
                {unreadByChannel[channel.id] > 0 && <span className="channelUnread">{unreadByChannel[channel.id]}</span>}
              </button>
              <button
                className="channelTool"
                type="button"
                onClick={() => {
                  setEditingChannelId(channel.id);
                  setDeletingChannelId(null);
                  setNewChannelName(channel.label);
                  setModal("rename-channel");
                }}
                aria-label={`Rename ${channel.label}`}
              >
                <Settings size={14} />
              </button>
              <button
                className="channelTool"
                type="button"
                onClick={() => {
                  setDeletingChannelId(channel.id);
                  setEditingChannelId(null);
                  setModal("delete-channel");
                }}
                disabled={channels.length <= 1}
                aria-label={`Delete ${channel.label}`}
              >
                <X size={14} />
              </button>
              {unreadByChannel[channel.id] > 0 && (
                <button
                  className="channelTool"
                  type="button"
                  onClick={() => markChannelAsRead(channel.id)}
                  aria-label={`Mark ${channel.label} as read`}
                  title="Mark as read"
                >
                  <CheckCheck size={14} />
                </button>
              )}
            </div>
          ))}
        </section>

        <section className="channelBlock">
          <div className="blockTitle">Voice Mesh</div>
          {voiceRooms.map((room) => (
            <button className={`channel ${activeVoiceRoom === room ? "selected" : ""}`} key={room} onClick={() => joinVoiceRoom(room)}>
              <Volume2 size={17} />
              {room}
            </button>
          ))}
        </section>

        <div className="userStrip">
          <div className="avatar">LU</div>
          <div>
            <strong>{name || "Anonymous"}</strong>
            <span>{connected ? presence : "local only"}</span>
          </div>
          <button className={`miniButton ${micMuted ? "active" : ""}`} onClick={toggleMic} aria-label="Toggle microphone">
            {micMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button className="miniButton" onClick={() => setModal("settings")} aria-label="Open settings">
            <Settings size={18} />
          </button>
        </div>
      </aside>

      <section className="chat">
        <header className="topbar">
          <div className="roomTitle">
            <Hash size={22} />
            <strong>{activeLabel}</strong>
            <span>WebRTC data channel, no message server</span>
            {searchActive && (
              <span>{searchMatches.length ? `${Math.min(searchIndex, searchMatches.length - 1) + 1}/${searchMatches.length} results` : "0 results"}</span>
            )}
            {peerTypingChannel === activeChannel && <span>Peer typing...</span>}
          </div>
          <div className="chatTabs" role="tablist" aria-label="Main view">
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === "chat"}
              className={mainTab === "chat" ? "tabButton active" : "tabButton"}
              onClick={() => setMainTab("chat")}
            >
              Chat
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === "session"}
              className={mainTab === "session" ? "tabButton active" : "tabButton"}
              onClick={() => setMainTab("session")}
            >
              Session
            </button>
          </div>
          <div className="topActions">
            {Object.keys(unreadByChannel).length > 0 && (
              <button className="iconButton" onClick={markAllUnreadAsRead} aria-label="Mark all as read" title="Mark all as read">
                <CheckCheck size={19} />
              </button>
            )}
            <button className={`iconButton ${searchActive ? "active" : ""}`} onClick={openSearch} aria-label="Search messages">
              <Search size={19} />
            </button>
            <button className={`iconButton ${notificationsMuted ? "active" : ""}`} onClick={toggleNotifications} aria-label="Toggle notifications">
              <Bell size={19} />
            </button>
            <button className={`iconButton ${membersOpen ? "active" : ""}`} onClick={toggleMembersPanel} aria-label="Toggle members">
              <Users size={19} />
            </button>
            <button className={`iconButton ${callActive ? "active" : ""}`} onClick={toggleCall} aria-label="Toggle call">
              <PhoneCall size={19} />
            </button>
            <button className={`iconButton ${screenSharing ? "active" : ""}`} onClick={toggleScreenShare} aria-label="Toggle screen share">
              <ScreenShare size={19} />
            </button>
            <button className={`iconButton ${mainTab === "session" ? "active" : ""}`} onClick={openSessionTab} aria-label="Open P2P session" title="Open P2P session">
              <Signal size={19} />
            </button>
          </div>
        </header>

        <div className="chatBody">
          {mainTab === "chat" ? (
            <>
              <div className="messageList" ref={messageListRef}>
                {visibleMessages.length === 0 && searchActive ? (
                  <div className="emptyState">No messages matched this search in #{activeLabel}.</div>
                ) : visibleMessages.map((message) => {
            const mediaBaseUrl = window.location.origin;

            return (
            <article
              className={`message ${message.local ? "mine" : ""} ${selectedSearchMessage?.id === message.id ? "focused" : ""}`}
              key={message.id}
              data-message-id={message.id}
            >
              <div className="avatar small">{message.author.slice(0, 2).toUpperCase()}</div>
              <div className="bubble">
                <div className="meta">
                  <strong>{message.author}</strong>
                  <span>{new Date(message.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {message.note && <span className="noteLabel">note</span>}
                  {message.pinned && <span className="pinnedLabel">pinned</span>}
                  {message.edited && <span className="editedLabel">edited</span>}
                  {message.local && <span>{message.seen ? "seen" : message.delivered ? "delivered" : "sent"}</span>}
                  <div className="messageMenuSlot">
                    <button
                      className="messageAction menuButton"
                      type="button"
                      onClick={(event) => toggleMessageMenu(message.id, event.currentTarget)}
                      aria-label="Message actions"
                      aria-expanded={messageMenuMessageId === message.id}
                      title="Message actions"
                    >
                      <MoreHorizontal size={13} />
                    </button>
                  </div>
                </div>
                {message.replyToId && (
                  <button className="replyPreview" type="button" onClick={() => jumpToMessage(message.replyToId!)}>
                    <span>Replying to {message.replyToAuthor ?? "Unknown"}</span>
                    {renderBodyText(message.replyToBody ?? "", `reply-${message.replyToId}`)}
                  </button>
                )}
                {(() => {
                  const imageUrls = extractImageUrls(message.body);
                  const videoUrls = extractVideoUrls(message.body);
                  const audioUrls = extractAudioUrls(message.body);
                  const youtubeUrls = extractYouTubeUrls(message.body);
                  const tweetUrls = extractTweetUrls(message.body);
                  const mediaOnly =
                    hasOnlyLinkTokens(message.body) &&
                    (imageUrls.length > 0 || videoUrls.length > 0 || audioUrls.length > 0 || youtubeUrls.length > 0);

                  return (
                    <>
                      {message.body && !mediaOnly && <>{renderBodyText(message.body, message.id)}</>}
                      {imageUrls.map((url) => (
                        <a className="imageEmbed" key={url} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt={url} />
                        </a>
                      ))}
                      {videoUrls.map((url) =>
                        renderVideoEmbed({
                          baseUrl: mediaBaseUrl,
                          key: url,
                          href: url,
                          url,
                          className: "videoEmbed",
                        }),
                      )}
                      {audioUrls.map((url) => (
                        <a className="audioEmbed" key={url} href={url} target="_blank" rel="noreferrer">
                          <audio controls preload="metadata">
                            <source src={url} />
                          </audio>
                        </a>
                      ))}
                      {youtubeUrls.map((url) => {
                        const videoId = getYouTubeVideoId(url);
                        if (!videoId) return null;
                        const isShort = isYouTubeShortUrl(url);
                        return (
                          <iframe
                            key={url}
                            className={`youtubeEmbed ${isShort ? "youtubeShortEmbed" : ""}`}
                            src={buildYouTubeEmbedUrl(videoId)}
                            title={`YouTube video ${videoId}`}
                            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                            allowFullScreen
                            loading="lazy"
                          />
                        );
                      })}
                      {tweetUrls.map((url) => (
                        <TweetEmbed key={url} url={url} />
                      ))}
                    </>
                  );
                })()}
                {message.attachment &&
                  (isImageMimeType(message.attachment.mimeType) ? (
                    <a
                      className="imageEmbed attachmentImage"
                      href={message.attachment.objectUrl}
                      download={message.attachment.fileName}
                      onClick={(event) => {
                        if (!message.attachment?.objectUrl) event.preventDefault();
                      }}
                    >
                      <img src={message.attachment.objectUrl} alt={message.attachment.fileName} />
                    </a>
                  ) : isVideoMimeType(message.attachment.mimeType) ? (
                    renderVideoEmbed({
                      baseUrl: mediaBaseUrl,
                      key: message.attachment.fileName,
                      href: message.attachment.objectUrl!,
                      url: message.attachment.objectUrl!,
                      className: "videoEmbed attachmentVideo",
                      sourceType: message.attachment.mimeType,
                      download: message.attachment.fileName,
                      onClick: (event) => {
                        if (!message.attachment?.objectUrl) event.preventDefault();
                      },
                    })
                  ) : isAudioMimeType(message.attachment.mimeType) ? (
                    <a
                      className="audioEmbed attachmentAudio"
                      href={message.attachment.objectUrl}
                      download={message.attachment.fileName}
                      onClick={(event) => {
                        if (!message.attachment?.objectUrl) event.preventDefault();
                      }}
                    >
                      <audio controls preload="metadata">
                        <source src={message.attachment.objectUrl} />
                      </audio>
                    </a>
                  ) : (
                    <a
                      className="attachmentCard"
                      href={message.attachment.objectUrl}
                      download={message.attachment.fileName}
                      onClick={(event) => {
                        if (!message.attachment?.objectUrl) event.preventDefault();
                      }}
                    >
                      <Paperclip size={17} />
                      <span>
                        <strong>{message.attachment.fileName}</strong>
                        <small>{formatBytes(message.attachment.size)}</small>
                      </span>
                    </a>
                  ))}
                {hasAnyReactions(message.reactions) && (
                  <div className="reactionBar" aria-label="Message reactions">
                    {Object.entries(message.reactions ?? {}).map(([emoji, authors]) => (
                      <button
                        className={authors.includes(name || "Anonymous") ? "active" : ""}
                        type="button"
                        key={emoji}
                        onClick={() => sendReaction(message.id, emoji)}
                        title={authors.join(", ")}
                      >
                        <span>{emoji}</span>
                        <small>{authors.length}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>
            );
                  })}
                {messageMenuMessageId && messageMenuAnchor && (
                  <div
                    ref={messageMenuRef}
                    className="messageMenu"
                    role="dialog"
                    aria-label="Message actions menu"
                    style={{ top: `${messageMenuAnchor.top}px`, left: `${messageMenuAnchor.left}px` }}
                  >
                    {messages
                      .filter((message) => message.id === messageMenuMessageId)
                      .map((message) => (
                        <div key={message.id}>
                          <div className="messageMenuActions">
                            <button
                              type="button"
                              onClick={() =>
                                void copyText(
                                  message.attachment ? `${message.body}\nAttachment: ${message.attachment.fileName}` : message.body,
                                  "Copied message content.",
                                )
                              }
                              aria-label="Copy message"
                              title="Copy"
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                togglePinMessage(message.id);
                                setMessageMenuMessageId(null);
                                setMessageMenuAnchor(null);
                              }}
                              aria-label={message.pinned ? "Unpin message" : "Pin message"}
                              title={message.pinned ? "Unpin" : "Pin"}
                            >
                              {message.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                openReplyToMessage(message);
                                setMessageMenuMessageId(null);
                                setMessageMenuAnchor(null);
                              }}
                              aria-label="Reply to message"
                              title="Reply"
                            >
                              <Reply size={13} />
                            </button>
                            {message.local && (
                              <button
                                type="button"
                                onClick={() => {
                                  openEditMessage(message);
                                  setMessageMenuMessageId(null);
                                  setMessageMenuAnchor(null);
                                }}
                                aria-label="Edit message"
                                title="Edit"
                              >
                                <Settings size={13} />
                              </button>
                            )}
                            {message.local && (
                              <button
                                type="button"
                                onClick={() => {
                                  openDeleteMessage(message.id);
                                  setMessageMenuMessageId(null);
                                  setMessageMenuAnchor(null);
                                }}
                                aria-label="Delete message"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                          <div className="messageMenuReactions">
                            <div className="messageMenuReactionsGrid">
                              {DEFAULT_QUICK_REACTIONS.map((emoji) => {
                                const active = (message.reactions?.[emoji] ?? []).includes(name || "Anonymous");
                                return (
                                <button
                                  type="button"
                                  key={emoji}
                                  onClick={() => {
                                    void sendReaction(message.id, emoji);
                                  }}
                                  aria-label={`React ${emoji}`}
                                  className={active ? "active" : ""}
                                >
                                  <span>{emoji}</span>
                                  {active && <small>+1</small>}
                                </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {!followLatest && visibleMessages.length > 0 && (
                <button className="jumpToLatest secondaryButton" type="button" onClick={jumpToLatest}>
                  <ChevronDown size={16} />
                </button>
              )}

              <form className="composer" onSubmit={sendMessage}>
          {replyToMessage && (
            <div
              className="replyComposer"
              role="button"
              tabIndex={0}
              onClick={() => jumpToMessage(replyToMessage.id)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                jumpToMessage(replyToMessage.id);
              }}
            >
              <div>
                <span>Replying to {replyToMessage.author}</span>
                <p>{replyToMessage.body}</p>
              </div>
                <button
                type="button"
                className="messageAction"
                onClick={(event) => {
                  event.stopPropagation();
                  setReplyTargetByChannel((current) => clearReplyTarget(current, activeChannel));
                }}
                aria-label="Cancel reply"
              >
                <X size={13} />
              </button>
            </div>
          )}
          {pendingGif && (
            <div className="gifComposerPreview" role="group" aria-label="Selected GIF preview">
              <img src={pendingGif.url} alt={pendingGif.label} />
              <div className="gifComposerPreviewMeta">
                <strong>{pendingGif.label}</strong>
                <span>{pendingGif.source}</span>
              </div>
              <button
                type="button"
                className="gifComposerPreviewClear"
                onClick={() => setPendingGif(null)}
                aria-label="Remove selected GIF"
              >
                <X size={13} />
              </button>
            </div>
          )}
          <textarea
            ref={composerInputRef}
            value={draft}
            onChange={(event) => setDraftByChannel((current) => setChannelDraft(current, activeChannel, event.target.value))}
            placeholder={`Message #${activeLabel}`}
            rows={1}
            onKeyDown={(event) => {
              if (!shouldSubmitComposerMessage(event)) return;
              event.preventDefault();
              void submitMessage();
            }}
          />
          <div className="composerRight">
            <button type="button" aria-label="Add attachment" onClick={() => setModal("attachment")}>
              <Paperclip size={20} />
            </button>
            <div className="gifSlot" ref={gifPickerRef}>
              {gifOpen && (
                <div className="gifPicker" role="dialog" aria-label="GIF picker">
                  <div className="gifPickerHeader">
                    <span>GIFs</span>
                    <button type="button" onClick={() => setGifOpen(false)} aria-label="Close GIF picker">
                      <X size={12} />
                    </button>
                  </div>
                  <div className="gifTabs" role="tablist" aria-label="GIF categories">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={gifTab === "all"}
                      className={gifTab === "all" ? "active" : ""}
                      onClick={() => setGifTab("all")}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={gifTab === "favorites"}
                      className={gifTab === "favorites" ? "active" : ""}
                      onClick={() => setGifTab("favorites")}
                    >
                      Favorites
                    </button>
                  </div>
                  <label className="gifPickerSearch">
                    <input
                      ref={gifSearchRef}
                      value={gifQuery}
                      onChange={(event) => setGifQuery(event.target.value)}
                      placeholder="Filter GIFs"
                      aria-label="Filter GIFs"
                    />
                  </label>
                  <div className="gifGridShell">
                    {visibleGifs.length > 0 ? (
                      gifColumns.map((column, columnIndex) => (
                        <div className="gifColumn" key={columnIndex}>
                          {column.map((gif) => (
                            <div
                              key={gif.id}
                              className="gifCard"
                              role="button"
                              tabIndex={0}
                              onClick={() => insertGif(gif)}
                              onKeyDown={(event) => {
                                if (event.key !== "Enter" && event.key !== " ") return;
                                event.preventDefault();
                                insertGif(gif);
                              }}
                              aria-label={`Insert ${gif.label} GIF`}
                            >
                              <img src={gif.url} alt={gif.label} loading="lazy" />
                              <button
                                type="button"
                                className={`gifFavorite ${gif.favorite ? "active" : ""}`}
                                aria-label={
                                  gif.favorite ? `Remove ${gif.label} from favorites` : `Add ${gif.label} to favorites`
                                }
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleGifFavorite(gif.id);
                                }}
                              >
                                <Star size={24} fill={gif.favorite ? "currentColor" : "none"} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <div className="gifEmpty">{gifTab === "favorites" ? "No favorites yet." : "No GIFs match this filter."}</div>
                    )}
                  </div>
                </div>
              )}
              <button
                type="button"
                aria-label="GIF"
                aria-expanded={gifOpen}
                onClick={() => {
                  setGifOpen((open) => !open);
                  setEmojiOpen(false);
                }}
              >
                <Film size={20} />
              </button>
            </div>
            <div className="emojiSlot" ref={emojiPickerRef}>
              {emojiOpen && (
                <div className="emojiPicker" role="dialog" aria-label="Emoji picker">
                  {emojiPickerGroups.map((group) => (
                    <section className="emojiGroup" key={group.label}>
                      <span>{group.label}</span>
                      <div className="emojiGrid">
                        {group.items.map((emoji) => (
                          <button type="button" key={emoji} onClick={() => insertEmoji(emoji)} aria-label={`Insert ${emoji}`}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
              </div>
              )}
              <button
                type="button"
                aria-label="Emoji"
                aria-expanded={emojiOpen}
                onClick={() => {
                  setEmojiOpen((open) => !open);
                  setGifOpen(false);
                }}
              >
                <Smile size={20} />
              </button>
            </div>
            <button type="submit" aria-label="Send message">
              <Send size={20} />
            </button>
          </div>
        </form>
            </>
          ) : (
            <div className="sessionTab">
              {sessionPane}
            </div>
          )}
        </div>
      </section>

      <aside className="rightPanel">
        <section className="panelSection">
          <div className="sectionHeader">
            <Users size={18} />
            <strong>Members</strong>
          </div>
          <div className="memberList">
            {memberRoster.map((member, index) => (
              <div className="member" key={member}>
                <span className={index < 2 || connected ? "dot online" : "dot"} />
                <button type="button" onClick={() => openMemberProfile(member)}>{member}</button>
              </div>
            ))}
          </div>
        </section>

        <section className="panelSection">
          <div className="sectionHeader">
            <PhoneCall size={18} />
            <strong>Media</strong>
          </div>
          <div className="mediaState">
            <span className={callActive ? "dot online" : "dot"} />
            Local mic {callActive ? (micMuted ? "muted" : "live") : "off"}
          </div>
          <div className="mediaState">
            <span className={screenSharing ? "dot online" : "dot"} />
            Screen share {screenSharing ? "live" : "off"}
          </div>
          <div className="mediaState">
            <span className={remoteMediaActive ? "dot online" : "dot"} />
            Remote media {remoteMediaActive ? "receiving" : "idle"}
          </div>
          <div className="mediaState">
            <span className={peerCallActive ? "dot online" : "dot"} />
            Peer mic {peerCallActive ? (peerMicMuted ? "muted" : "live") : "off"}
          </div>
          <div className="mediaState">
            <span className={peerScreenSharing ? "dot online" : "dot"} />
            Peer screen share {peerScreenSharing ? "live" : "off"}
          </div>
          {(screenSharing || remoteVideoActive) && (
            <div className="videoGrid">
              {screenSharing && (
                <figure>
                  <video ref={localScreenVideoRef} autoPlay muted playsInline />
                  <figcaption>Local screen</figcaption>
                </figure>
              )}
              {remoteVideoActive && (
                <figure>
                  <video ref={remoteVideoRef} autoPlay playsInline />
                  <figcaption>Remote screen</figcaption>
                </figure>
              )}
            </div>
          )}
          <audio ref={remoteAudioRef} autoPlay playsInline />
        </section>
      </aside>

      {modal && (
        <div className={`modalLayer ${modal === "search" ? "searchLayer" : ""}`} role="presentation" onMouseDown={closeModal}>
          <section
            className={`modal ${modal === "search" ? "searchModal" : ""} ${modal === "session" ? "sessionModal" : ""}`}
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modalHeader">
              <strong>
                {modal === "server" && "Create Server"}
                {modal === "rename-server" && "Rename Server"}
                {modal === "delete-server" && "Delete Server"}
                {modal === "channel" && "Create Channel"}
                {modal === "rename-channel" && "Rename Channel"}
                {modal === "delete-channel" && "Delete Channel"}
                {modal === "edit-message" && "Edit Message"}
                {modal === "delete-message" && "Delete Message"}
                {modal === "search" && "Search Messages"}
                {modal === "settings" && "User Settings"}
                {modal === "attachment" && "Attach File"}
                {modal === "clear-history" && "Clear History"}
              </strong>
              <button className="iconButton" onClick={closeModal} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            {modal === "server" && (
              <div className="modalBody">
                <label>
                  Server name
                  <input value={newServerName} onChange={(event) => setNewServerName(event.target.value)} autoFocus />
                </label>
                <button className="primaryButton" type="button" onClick={createServer}>Create local server</button>
              </div>
            )}

            {modal === "rename-server" && (
              <div className="modalBody">
                <label>
                  Server name
                  <input value={newServerName} onChange={(event) => setNewServerName(event.target.value)} autoFocus />
                </label>
                <button className="primaryButton" type="button" onClick={renameServer}>Rename server</button>
              </div>
            )}

            {modal === "delete-server" && (
              <div className="modalBody">
                <p className="modalCopy">
                  Delete {activeServer}? The app will switch to another local server and keep the shared channels intact.
                </p>
                <div className="modalActions">
                  <button className="secondaryButton" type="button" onClick={closeModal}>Cancel</button>
                  <button className="dangerButton" type="button" onClick={deleteServer}>Delete server</button>
                </div>
              </div>
            )}

            {modal === "channel" && (
              <div className="modalBody">
                <label>
                  Channel name
                  <input value={newChannelName} onChange={(event) => setNewChannelName(event.target.value)} autoFocus />
                </label>
                <button className="primaryButton" type="button" onClick={createChannel}>Create text channel</button>
              </div>
            )}

            {modal === "rename-channel" && (
              <div className="modalBody">
                <label>
                  Channel name
                  <input value={newChannelName} onChange={(event) => setNewChannelName(event.target.value)} autoFocus />
                </label>
                <button className="primaryButton" type="button" onClick={renameChannel}>Rename text channel</button>
              </div>
            )}

            {modal === "delete-channel" && deletingChannel && deleteFallbackChannel && (
              <div className="modalBody">
                <p className="modalCopy">
                  Delete #{deletingChannel.label}? Messages from this channel will move to #{deleteFallbackChannel.label}.
                </p>
                <div className="modalActions">
                  <button className="secondaryButton" type="button" onClick={closeModal}>Cancel</button>
                  <button className="dangerButton" type="button" onClick={confirmDeleteChannel}>Delete channel</button>
                </div>
              </div>
            )}

            {modal === "edit-message" && editingMessageId && (
              <div className="modalBody">
                <label>
                  Message
                  <textarea
                    value={getMessageEditDraft(editDraftByMessage, editingMessageId)}
                    onChange={(event) =>
                      setEditDraftByMessage((current) =>
                        setMessageEditDraft(current, editingMessageId, event.target.value),
                      )
                    }
                    autoFocus
                    spellCheck={false}
                  />
                </label>
                <div className="modalActions">
                  <button className="secondaryButton" type="button" onClick={closeModal}>Cancel</button>
                  <button className="primaryButton" type="button" onClick={saveEditedMessage}>Save edit</button>
                </div>
              </div>
            )}

            {modal === "delete-message" && deletingMessageId && (
              <div className="modalBody">
                <p className="modalCopy">Delete this message from the local room and notify peers?</p>
                <div className="modalActions">
                  <button className="secondaryButton" type="button" onClick={closeModal}>Cancel</button>
                  <button className="dangerButton" type="button" onClick={confirmDeleteMessage}>Delete message</button>
                </div>
              </div>
            )}

            {modal === "search" && (
              <div className="modalBody">
                <label>
                  Search current channel
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    autoFocus
                    placeholder="author, reply text, or message body"
                  />
                </label>
                <div className="modalActions">
                  <button className="secondaryButton" type="button" onClick={() => stepSearch(-1)} disabled={!searchActive || searchMatches.length === 0}>
                    <ChevronUp size={16} />
                    Prev
                  </button>
                  <button className="secondaryButton" type="button" onClick={() => stepSearch(1)} disabled={!searchActive || searchMatches.length === 0}>
                    <ChevronDown size={16} />
                    Next
                  </button>
                  <button className="secondaryButton" type="button" onClick={() => setSearchQuery("")} disabled={!searchActive}>
                    <SearchX size={16} />
                    Clear
                  </button>
                  <button className="primaryButton" type="button" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </div>
            )}

            {modal === "member" && selectedMember && (
              <div className="modalBody">
                <p className="modalCopy">
                  Local profile for <strong>{selectedMember}</strong>.
                </p>
                <div className="modalActions">
                  <button
                    className="secondaryButton"
                    type="button"
                    onClick={() => {
                      setDraftByChannel((current) =>
                        setChannelDraft(current, activeChannel, `${draft}${draft ? " " : ""}@${selectedMember}`),
                      );
                      setModal(null);
                      setSelectedMember(null);
                      requestAnimationFrame(() => composerInputRef.current?.focus());
                    }}
                  >
                    Mention
                  </button>
                  <button
                    className="primaryButton"
                    type="button"
                    onClick={() => {
                      const body = `Opened ${selectedMember}'s local profile card.`;
                      const note = {
                        type: "note" as const,
                        id: crypto.randomUUID(),
                        author: name || "Anonymous",
                        channel: activeChannel,
                        at: Date.now(),
                        subject: selectedMember,
                        body,
                      };
                      setMessages((current) => [
                        ...current,
                        {
                          id: note.id,
                          author: selectedMember,
                          body: note.body,
                          channel: note.channel,
                          at: note.at,
                          encrypted: true,
                          note: true,
                        },
                      ]);
                      setFollowLatest(true);
                      void sendEncryptedPayload(note);
                      log(`Shared a note about ${selectedMember}.`);
                      closeModal();
                    }}
                  >
                    Share note
                  </button>
                </div>
              </div>
            )}

            {modal === "room" && (
              <div className="modalBody">
                <p className="modalCopy">
                  This room is scoped to the current local workspace and the active peer session.
                </p>
                <pre className="roomFingerprint">{roomIdentityText()}</pre>
                <label>
                  Room fingerprint
                  <input readOnly value={roomFingerprint} />
                </label>
                <label>
                  Peer fingerprint
                  <input
                    value={roomPeerFingerprint}
                    onChange={(event) => {
                      setRoomPeerFingerprint(event.target.value);
                      setRoomFingerprintMatch("idle");
                    }}
                    placeholder="Paste the other side's fingerprint"
                  />
                </label>
                {roomFingerprintMatch !== "idle" && (
                  <div className={`fingerprintStatus ${roomFingerprintMatch}`}>
                    {roomFingerprintMatch === "match" ? "Fingerprints match." : "Fingerprints do not match."}
                  </div>
                )}
                <div className="modalActions">
                  <button className="secondaryButton" type="button" onClick={closeModal}>
                    Close
                  </button>
                  <button className="secondaryButton" type="button" onClick={compareRoomFingerprint}>
                    Compare
                  </button>
                  <button className="primaryButton" type="button" onClick={() => void copyText(roomIdentityText(), "Copied room identity.")}>
                    Copy identity
                  </button>
                </div>
              </div>
            )}

            {modal === "settings" && (
              <div className="modalBody">
                <label>
                  Display name
                  <input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
                </label>
                <label>
                  Presence
                  <input value={presence} onChange={(event) => setPresence(event.target.value)} />
                </label>
                <label>
                  ICE servers
                  <textarea
                    className="settingsTextarea"
                    value={iceServersText}
                    onChange={(event) => setIceServersText(event.target.value)}
                    spellCheck={false}
                  />
                </label>
                <input
                  ref={backupInputRef}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(event) => importWorkspaceBackup(event.target.files)}
                />
                <button className="primaryButton" type="button" onClick={saveSettings}>Save settings</button>
                <div className="signalActions">
                  <button type="button" onClick={exportWorkspaceBackup}>Export backup</button>
                  <button type="button" onClick={() => backupInputRef.current?.click()}>Import backup</button>
                  <button type="button" onClick={resetSettings}>Reset workspace</button>
                </div>
              </div>
            )}

            {modal === "attachment" && (
              <div className="modalBody">
                <input ref={fileInputRef} type="file" onChange={(event) => loadSelectedAttachment(event.target.files)} />
                <button className="primaryButton" type="button" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={17} />
                  Choose file
                </button>
                {pendingAttachment && (
                  <div className="attachmentPreview">
                    <strong>{pendingAttachment.fileName}</strong>
                    <span>{pendingAttachment.mimeType}</span>
                    <span>{formatBytes(pendingAttachment.size)}</span>
                  </div>
                )}
                <div className="modalActions">
                  <button className="secondaryButton" type="button" onClick={closeModal}>
                    Cancel
                  </button>
                  <button className="primaryButton" type="button" onClick={sendPendingAttachment} disabled={!pendingAttachment}>
                    Send attachment
                  </button>
                </div>
              </div>
            )}

            {modal === "clear-history" && (
              <div className="modalBody">
                <p className="modalCopy">
                  Clear local message history and remove encrypted history from this browser?
                </p>
                <div className="modalActions">
                  <button className="secondaryButton" type="button" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    className="dangerButton"
                    type="button"
                    onClick={() => {
                      clearHistory();
                      closeModal();
                    }}
                  >
                    Clear history
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
