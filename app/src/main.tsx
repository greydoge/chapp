import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as XMPP from "stanza";
import { NS_JSON_0 } from "stanza/Namespaces";
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
  Video,
  VideoOff,
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
  Columns3,
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
import { buildVideoEmbedSource, isLocalMediaUrl } from "./mediaEmbeds";
import { buildFallbackTweetPreview, fetchTweetPreview, extractTweetUrls, rewriteTweetUrlToFxTwitter, splitTweetText } from "./tweetEmbeds";
import { extractInstagramUrls, normalizeInstagramUrl } from "./instagramEmbeds";
import {
  buildFallbackTenorPreview,
  extractTenorUrls,
  fetchTenorPreview,
  fetchTenorPreviewWithoutCache,
  normalizeTenorUrl,
} from "./tenorEmbeds";
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

function TweetTextBlock({
  text,
  translationText,
  translationSourceLabel,
  prefix,
  renderTweetText,
}: {
  text: string;
  translationText?: string;
  translationSourceLabel?: string;
  prefix: string;
  renderTweetText: (value: string, prefix: string) => React.ReactNode;
}) {
  const originalText = text.trim();
  const englishText = translationText?.trim();
  const hasTranslation = Boolean(originalText && englishText);
  const [showTranslation, setShowTranslation] = useState(Boolean(englishText));
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const measureRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    setShowTranslation(Boolean(englishText));
  }, [englishText, originalText]);

  useEffect(() => {
    setExpanded(false);
  }, [originalText, englishText]);

  const activeText = showTranslation && englishText ? englishText : originalText || englishText || "";

  useEffect(() => {
    const element = measureRef.current;
    if (!element) return;

    const updateExpansionState = () => {
      setCanExpand(element.scrollHeight - element.clientHeight > 1);
    };

    updateExpansionState();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateExpansionState);
      return () => window.removeEventListener("resize", updateExpansionState);
    }

    const observer = new ResizeObserver(() => updateExpansionState());
    observer.observe(element);
    return () => observer.disconnect();
  }, [activeText]);

  if (!activeText) return null;

  return (
    <div className="tweetTextBlock">
      {hasTranslation && translationSourceLabel && (
        <div className="tweetTranslationSource">
          <em>translated from {translationSourceLabel}</em>
        </div>
      )}
      <p ref={measureRef} className="tweetTextClamped tweetTextMeasure" aria-hidden="true">
        {renderTweetText(activeText, showTranslation ? `${prefix}-translation` : prefix)}
      </p>
      <p className={!expanded ? "tweetTextClamped" : undefined}>
        {renderTweetText(activeText, showTranslation ? `${prefix}-translation` : prefix)}
      </p>
      {(hasTranslation || canExpand || expanded) && (
        <div className="tweetTextActions">
          {hasTranslation && (
            <button className="tweetTranslationToggle" type="button" onClick={() => setShowTranslation((current) => !current)}>
              Toggle translation
            </button>
          )}
          {(canExpand || expanded) && (
            <button className="tweetTranslationToggle" type="button" onClick={() => setExpanded((current) => !current)}>
              {expanded ? "Collapse" : "Expand"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RelatedTweetBlock({
  label,
  tweet,
  kind,
  getProfileUrl,
  formatRelatedDate,
  renderTweetText,
  renderTweetMedia,
}: RelatedTweetBlockProps) {
  if (!tweet) return null;

  const openLabel = `Open ${label.toLowerCase()}`;
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
      </div>
      <TweetTextBlock
        text={tweet.text}
        translationText={tweet.translationText}
        translationSourceLabel={tweet.translationSourceLabel}
        prefix={kind}
        renderTweetText={renderTweetText}
      />
      {tweet.media.length > 0 && (
        <div className={`tweetMediaGrid count-${Math.min(tweet.media.length, 4)}`}>{renderTweetMedia(tweet.media, kind)}</div>
      )}
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
  const [measuredSize, setMeasuredSize] = useState<{ width: number; height: number } | null>(null);
  const mediaUrl = useMemo(
    () =>
      buildTweetMediaProxyUrl(window.location.origin, {
        src: item.streamUrl ?? item.url,
        poster: item.posterUrl ?? undefined,
      }),
    [item.posterUrl, item.streamUrl, item.url],
  );
  const videoWidth = measuredSize?.width ?? item.width;
  const videoHeight = measuredSize?.height ?? item.height;
  const videoAspect = videoWidth && videoHeight ? videoWidth / videoHeight : null;
  const portrait = videoAspect !== null && videoAspect < 1;
  const videoStyle = videoAspect
    ? ({
        "--tweet-video-aspect": String(videoAspect),
        "--tweet-video-ratio": `${videoWidth} / ${videoHeight}`,
      } as React.CSSProperties)
    : undefined;

  useEffect(() => {
    setLoaded(false);
    setMeasuredSize(null);
  }, [item.posterUrl, item.streamUrl, item.url]);

  return (
    <div className={`tweetVideoWrap ${portrait ? "portrait" : ""}`} style={videoStyle}>
      <video
        ref={videoRef}
        className="tweetVideo"
        key={mediaUrl}
        autoPlay
        muted
        playsInline
        loop
        controls
        preload="metadata"
        poster={item.posterUrl ?? undefined}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setMeasuredSize({ width: video.videoWidth, height: video.videoHeight });
          }
          setLoaded(true);
        }}
        onLoadedData={() => setLoaded(true)}
        onCanPlay={() => setLoaded(true)}
        onError={() => setLoaded(false)}
      >
        <source src={mediaUrl} type="video/mp4" />
      </video>
      {!loaded && <div className="tweetVideoLoading">Loading video...</div>}
    </div>
  );
}

let instagramEmbedScriptPromise: Promise<void> | null = null;

function loadInstagramEmbedScript() {
  if (typeof document === "undefined") return Promise.resolve();
  if ((window as Window & { instgrm?: { Embeds?: { process?: () => void } } }).instgrm?.Embeds?.process) {
    return Promise.resolve();
  }
  if (instagramEmbedScriptPromise) return instagramEmbedScriptPromise;

  instagramEmbedScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.instagram.com/embed.js"]');
    if (existing) {
      if ((window as Window & { instgrm?: { Embeds?: { process?: () => void } } }).instgrm?.Embeds?.process) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Instagram embed.js")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Instagram embed.js"));
    document.body.appendChild(script);
  });

  return instagramEmbedScriptPromise;
}

function InstagramEmbed({ url }: { url: string }) {
  const canonicalUrl = useMemo(() => normalizeInstagramUrl(url) ?? url, [url]);

  useEffect(() => {
    let cancelled = false;
    void loadInstagramEmbedScript()
      .then(() => {
        if (cancelled) return;
        (window as Window & { instgrm?: { Embeds?: { process?: () => void } } }).instgrm?.Embeds?.process?.();
      })
      .catch((error) => {
        console.debug("Instagram embed script failed to load", canonicalUrl, error);
      });

    return () => {
      cancelled = true;
    };
  }, [canonicalUrl]);

  return (
    <article className="instagramNativeCard">
      <blockquote
        className="instagram-media instagramNativeBlockquote"
        data-instgrm-permalink={canonicalUrl}
        data-instgrm-version="14"
      >
        <a href={canonicalUrl} target="_blank" rel="noreferrer">
          Open on Instagram
        </a>
      </blockquote>
    </article>
  );
}

function TenorEmbed({ url }: { url: string }) {
  const [preview, setPreview] = useState<NonNullable<Awaited<ReturnType<typeof fetchTenorPreview>>>>(
    () => buildFallbackTenorPreview(url)!,
  );
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  const canonicalUrl = useMemo(() => normalizeTenorUrl(url) ?? url, [url]);

  useEffect(() => {
    let cancelled = false;
    setPreview(buildFallbackTenorPreview(url)!);
    setDebugMessage(null);

    void fetchTenorPreview(url)
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setPreview(result);
          if (result.media.length === 0) {
            setDebugMessage(`Tenor preview parsed with no media for ${result.url}. Retrying once without cache.`);
            void fetchTenorPreviewWithoutCache(url).then((retryResult) => {
              if (cancelled || !retryResult) return;
              if (retryResult.media.length > 0) {
                setPreview(retryResult);
                setDebugMessage(null);
              } else {
                setDebugMessage(`Tenor preview parsed with no media for ${retryResult.url}.`);
              }
            });
          }
        } else {
          setDebugMessage(`Tenor preview fetch returned nothing for ${canonicalUrl}.`);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setPreview(buildFallbackTenorPreview(url)!);
        setDebugMessage(`Tenor preview fetch failed for ${canonicalUrl}.`);
      });

    return () => {
      cancelled = true;
    };
  }, [url, canonicalUrl]);

  const media = preview.media[0];

  return (
    <>
      {media ? (
        media.type === "image" ? (
          <a className="imageEmbed tenorEmbed" href={canonicalUrl} target="_blank" rel="noreferrer">
            <img src={media.url} alt={preview.title ?? preview.description ?? "Tenor GIF"} loading="lazy" />
          </a>
        ) : (
          <a className="videoEmbed tenorEmbed tenorVideoEmbed" href={canonicalUrl} target="_blank" rel="noreferrer">
            <video autoPlay muted loop playsInline controls preload="metadata" poster={media.posterUrl}>
              <source src={media.url} />
            </video>
          </a>
        )
      ) : (
        <a className="tenorFallbackLink" href={canonicalUrl} target="_blank" rel="noreferrer">
          Open on Tenor
        </a>
      )}
      {debugMessage && <div className="instagramDebug" title={debugMessage}>{debugMessage}</div>}
    </>
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

function TweetEmbed({ url, onOpenImage }: { url: string; onOpenImage: (url: string, alt: string) => void }) {
  const [preview, setPreview] = useState<ResolvedTweetPreview>(() => buildFallbackTweetPreview(url)!);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const getProfileUrl = (handle: string) => `https://fxtwitter.com/${handle}`;
  const formatCondensedDate = (parsed: Date) => {
    const year = String(parsed.getFullYear());
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    const hours24 = parsed.getHours();
    const hours12 = hours24 % 12 || 12;
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    const meridiem = hours24 >= 12 ? "pm" : "am";
    return `${year}/${month}/${day} | ${hours12}:${minutes} ${meridiem}`;
  };
  const tweetDate = useMemo(() => {
    if (!preview?.createdAt) return null;
    const parsed = new Date(preview.createdAt);
    return Number.isNaN(parsed.getTime()) ? null : formatCondensedDate(parsed);
  }, [preview?.createdAt]);
  const formatRelatedDate = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return formatCondensedDate(parsed);
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
    media.slice(0, 4).map((item, index) => {
      const hiddenCount = media.length - 4;
      const showHiddenCount = hiddenCount > 0 && index === 3;
      return (
      item.type === "image" ? (
        <a
          key={`${prefix}-image-${item.url}-${index}`}
          className={`tweetMediaLink ${showHiddenCount ? "hasMore" : ""}`}
          href={item.url}
          onClick={(event) => {
            event.preventDefault();
            onOpenImage(item.url, "Tweet media");
          }}
        >
          <img className="tweetImage" src={item.url} alt="Tweet media" loading="lazy" />
          {showHiddenCount && <span className="tweetMediaMore">+{hiddenCount}</span>}
        </a>
      ) : (
        <div className={showHiddenCount ? "tweetMediaVideoTile hasMore" : "tweetMediaVideoTile"} key={`${prefix}-video-${item.url}-${index}`}>
          <TweetVideoMedia item={item} />
          {showHiddenCount && <span className="tweetMediaMore">+{hiddenCount}</span>}
        </div>
      )
      );
    });
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
      </header>
      <RelatedTweetBlock
        label="Reply"
        tweet={preview.reply}
        kind="reply"
        getProfileUrl={getProfileUrl}
        formatRelatedDate={formatRelatedDate}
        renderTweetText={renderTweetText}
        renderTweetMedia={renderTweetMedia}
      />
      <RelatedTweetBlock
        label="Quoted tweet"
        tweet={preview.quote}
        kind="quote"
        getProfileUrl={getProfileUrl}
        formatRelatedDate={formatRelatedDate}
        renderTweetText={renderTweetText}
        renderTweetMedia={renderTweetMedia}
      />
      <RelatedTweetBlock
        label="Retweet"
        tweet={preview.retweet}
        kind="retweet"
        getProfileUrl={getProfileUrl}
        formatRelatedDate={formatRelatedDate}
        renderTweetText={renderTweetText}
        renderTweetMedia={renderTweetMedia}
      />
      <div className="tweetBody">
        <TweetTextBlock
          text={preview.text}
          translationText={preview.translationText}
          translationSourceLabel={preview.translationSourceLabel}
          prefix="tweet"
          renderTweetText={renderTweetText}
        />
      </div>
      {preview.media.length > 0 && (
        <div className={`tweetMediaGrid count-${Math.min(preview.media.length, 4)}`}>{renderTweetMedia(preview.media, "tweet")}</div>
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
  | "voice-channel"
  | "delete-voice-channel"
  | "edit-message"
  | "delete-message"
  | "search"
  | "session"
  | "member"
  | "room"
  | "settings"
  | "xmpp-account"
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
const DEFAULT_PRESENCE = "xmpp online";
const DEFAULT_SERVER_SUBTITLE = "self-hosted guild";
const APP_THEMES = [
  { id: "midnight", label: "Midnight" },
  { id: "maximum-black", label: "Maximum Black" },
  { id: "light", label: "White" },
  { id: "maximum-white", label: "Maximum White" },
  { id: "ocean", label: "Ocean" },
  { id: "forest", label: "Forest" },
  { id: "rose", label: "Rose" },
  { id: "amber", label: "Amber" },
  { id: "honey", label: "Honey" },
  { id: "parchment", label: "Parchment" },
  { id: "copper", label: "Copper" },
  { id: "grape", label: "Grape" },
] as const;
type AppTheme = (typeof APP_THEMES)[number]["id"];

const DEFAULT_VOICE_ROOMS = ["war room", "release desk", "pairing"];
const baseMembers = ["Ada", "Linus", "Grace", "Katherine"];
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

type XmppRoomOccupant = {
  nick: string;
  role?: string;
  affiliation?: string;
  self?: boolean;
};

type StoredSettings = {
  activeServer?: string;
  activeChannelsByServer?: Record<string, string>;
  serverSubtitles?: Record<string, string>;
  activeVoiceRoom?: string | null;
  channels?: typeof DEFAULT_CHANNELS;
  channelChildren?: Record<string, string[]>;
  voiceRooms?: typeof DEFAULT_VOICE_ROOMS;
  xmppWebSocketUrl?: string;
  xmppJid?: string;
  xmppPassword?: string;
  xmppRoomJid?: string;
  xmppSpaceServiceJid?: string;
  xmppSpaceNode?: string;
  xmppNick?: string;
  iceServersText?: string;
  membersOpen?: boolean;
  notificationsMuted?: boolean;
  name?: string;
  presence?: string;
  about?: string;
  pronouns?: string;
  pronunciation?: string;
  hobbies?: string;
  languages?: string;
  accentColor?: string;
  appTheme?: AppTheme;
  statusMessage?: string;
  website?: string;
  location?: string;
  headline?: string;
  timezone?: string;
  birthday?: string;
  company?: string;
  school?: string;
  major?: string;
  recentEmojis?: string[];
  newChannelName?: string;
  newServerName?: string;
  newServerSubtitle?: string;
  draftByChannel?: ChannelDrafts;
  editDraftByMessage?: MessageEditDrafts;
  replyTargetByChannel?: ReplyTargets;
  chatPaneDrafts?: string[];
  chatPaneReplyTargets?: Array<string | null>;
  chatPaneCompactSections?: boolean[];
  searchQuery?: string;
  searchIndex?: number;
  roomPeerFingerprint?: string;
  servers?: string[];
  unreadByChannel?: Record<string, number>;
  gifFavorites?: string[];
  mainTab?: "chat" | "session";
  events?: string[];
  avatarUrl?: string;
  avatarFrameUrl?: string;
  bannerUrl?: string;
  avatarAnimated?: boolean;
  chatPaneMode?: "single" | "split";
  chatPaneChannels?: string[];
};

type XmppConnectionSettings = {
  websocketUrl: string;
  jid: string;
  password: string;
  roomJid: string;
  spaceServiceJid: string;
  spaceNode: string;
  nick: string;
};

const DEFAULT_CHAT_PANE_COUNT = 4;
const MAX_CHAT_PANES = 8;

function normalizeChatPaneChannels(
  nextChannels: string[] | undefined,
  paneCount: number,
  availableChannelIds: string[],
  fallbackChannelId: string,
): string[] {
  const normalized = (nextChannels ?? [])
    .filter((channelId) => availableChannelIds.includes(channelId))
    .slice(0, paneCount);

  const used = new Set(normalized);
  while (normalized.length < paneCount) {
    const nextPreferred =
      availableChannelIds.find((channelId) => !used.has(channelId)) ??
      fallbackChannelId;
    normalized.push(nextPreferred);
    used.add(nextPreferred);
  }
  return normalized;
}

function normalizeChatPaneDrafts(nextDrafts: string[] | undefined, paneCount: number) {
  const drafts = (nextDrafts ?? []).slice(0, paneCount);
  while (drafts.length < paneCount) drafts.push("");
  return drafts;
}

function normalizeChatPaneReplyTargets(nextTargets: Array<string | null> | undefined, paneCount: number) {
  const targets = (nextTargets ?? []).slice(0, paneCount);
  while (targets.length < paneCount) targets.push(null);
  return targets;
}

function normalizeChatPaneCompactSections(nextSections: boolean[] | undefined, paneCount: number) {
  const sections = (nextSections ?? []).slice(0, paneCount);
  while (sections.length < paneCount) sections.push(false);
  return sections;
}

function normalizeXmppConnectionSettings(
  settings: Pick<XmppConnectionSettings, "websocketUrl" | "jid" | "password" | "roomJid" | "spaceServiceJid" | "spaceNode" | "nick">,
  fallbackNick: string,
): XmppConnectionSettings {
  return {
    websocketUrl: settings.websocketUrl.trim(),
    jid: settings.jid.trim(),
    password: settings.password.trim(),
    roomJid: settings.roomJid.trim(),
    spaceServiceJid: settings.spaceServiceJid.trim(),
    spaceNode: settings.spaceNode.trim(),
    nick: settings.nick.trim() || fallbackNick.trim() || DEFAULT_NAME,
  };
}

function deriveXmppWebSocketUrl(target: string) {
  const trimmed = target.trim();
  if (!trimmed) return "";

  const domain = trimmed.includes("@") ? trimmed.split("@").pop() ?? "" : trimmed;
  if (!domain) return "";

  const labels = domain.split(".").filter(Boolean);
  if (labels.length >= 3 && labels[0] !== "xmpp") {
    return `wss://xmpp.${labels.slice(1).join(".")}/xmpp-websocket`;
  }

  if (labels[0] === "xmpp") {
    return `wss://${domain}/xmpp-websocket`;
  }

  return `wss://xmpp.${domain}/xmpp-websocket`;
}

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

function normalizeAppTheme(value?: string): AppTheme {
  return APP_THEMES.some((theme) => theme.id === value) ? (value as AppTheme) : "midnight";
}

const storedSettings = typeof localStorage === "undefined" ? {} : loadSettings();

function App() {
  const [servers, setServers] = useState(storedSettings.servers ?? DEFAULT_SERVERS);
  const [activeServer, setActiveServer] = useState(storedSettings.activeServer ?? storedSettings.servers?.[0] ?? DEFAULT_SERVERS[0]);
  const [serverSubtitles, setServerSubtitles] = useState<Record<string, string>>(storedSettings.serverSubtitles ?? {});
  const [newServerName, setNewServerName] = useState(storedSettings.newServerName ?? "");
  const [newServerSubtitle, setNewServerSubtitle] = useState(storedSettings.newServerSubtitle ?? "");
  const [channels, setChannels] = useState(storedSettings.channels ?? DEFAULT_CHANNELS);
  const [channelChildren, setChannelChildren] = useState<Record<string, string[]>>(storedSettings.channelChildren ?? {});
  const [voiceRooms, setVoiceRooms] = useState(storedSettings.voiceRooms ?? DEFAULT_VOICE_ROOMS);
  const [xmppWebSocketUrl, setXmppWebSocketUrl] = useState(storedSettings.xmppWebSocketUrl ?? "");
  const [xmppJid, setXmppJid] = useState(storedSettings.xmppJid ?? "");
  const [xmppPassword, setXmppPassword] = useState(storedSettings.xmppPassword ?? "");
  const [xmppRoomJid, setXmppRoomJid] = useState(storedSettings.xmppRoomJid ?? "");
  const [xmppSpaceServiceJid, setXmppSpaceServiceJid] = useState(storedSettings.xmppSpaceServiceJid ?? "");
  const [xmppSpaceNode, setXmppSpaceNode] = useState(storedSettings.xmppSpaceNode ?? "");
  const [xmppNick, setXmppNick] = useState(storedSettings.xmppNick ?? "");
  const [xmppConnectionSettings, setXmppConnectionSettings] = useState<XmppConnectionSettings>(() =>
    normalizeXmppConnectionSettings(
      {
        websocketUrl: storedSettings.xmppWebSocketUrl ?? "",
        jid: storedSettings.xmppJid ?? "",
        password: storedSettings.xmppPassword ?? "",
        roomJid: storedSettings.xmppRoomJid ?? "",
        spaceServiceJid: storedSettings.xmppSpaceServiceJid ?? "",
        spaceNode: storedSettings.xmppSpaceNode ?? "",
        nick: storedSettings.xmppNick ?? "",
      },
      storedSettings.name ?? DEFAULT_NAME,
    ),
  );
  const [xmppConnectNonce, setXmppConnectNonce] = useState(0);
  const [xmppInviteUri, setXmppInviteUri] = useState("");
  const [xmppAccountUsername, setXmppAccountUsername] = useState("");
  const [xmppAccountDomain, setXmppAccountDomain] = useState("doge-cube.local");
  const [xmppAccountPassword, setXmppAccountPassword] = useState("");
  const [newChannelName, setNewChannelName] = useState(storedSettings.newChannelName ?? "");
  const [newSubchannelName, setNewSubchannelName] = useState("");
  const [channelCreateKind, setChannelCreateKind] = useState<"text" | "voice">("text");
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [editingVoiceRoom, setEditingVoiceRoom] = useState<string | null>(null);
  const [deletingVoiceRoom, setDeletingVoiceRoom] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null);
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
  const [mainTab, setMainTab] = useState<"chat" | "session">(storedSettings.mainTab ?? "chat");
  const [chatPaneMode, setChatPaneMode] = useState<"single" | "split">(storedSettings.chatPaneMode ?? "single");
  const [chatPaneChannels, setChatPaneChannels] = useState<string[]>(() =>
    normalizeChatPaneChannels(
      storedSettings.chatPaneChannels,
      DEFAULT_CHAT_PANE_COUNT,
      (storedSettings.channels ?? DEFAULT_CHANNELS).map((channel) => channel.id),
      storedSettings.channels?.[0]?.id ?? DEFAULT_CHANNELS[0].id,
    ),
  );
  const [chatPaneDrafts, setChatPaneDrafts] = useState<string[]>(() =>
    normalizeChatPaneDrafts(storedSettings.chatPaneDrafts, DEFAULT_CHAT_PANE_COUNT),
  );
  const [chatPaneReplyTargets, setChatPaneReplyTargets] = useState<Array<string | null>>(() =>
    normalizeChatPaneReplyTargets(storedSettings.chatPaneReplyTargets, DEFAULT_CHAT_PANE_COUNT),
  );
  const [chatPaneCompactSections, setChatPaneCompactSections] = useState<boolean[]>(() =>
    normalizeChatPaneCompactSections(storedSettings.chatPaneCompactSections, DEFAULT_CHAT_PANE_COUNT),
  );
  const [splitViewportCompact, setSplitViewportCompact] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1200 : false,
  );
  const [splitViewportStacked, setSplitViewportStacked] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 820 : false,
  );
  const [status, setStatus] = useState<PeerStatus>("idle");
  const [events, setEvents] = useState<string[]>(
    storedSettings.events?.length ? storedSettings.events.slice(0, 200) : ["Ready for local XMPP."],
  );
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
  const [pendingGifChannel, setPendingGifChannel] = useState<string>(activeChannel);
  const [pendingGifPaneIndex, setPendingGifPaneIndex] = useState<number | null>(null);
  const [composerTargetChannel, setComposerTargetChannel] = useState<string>(activeChannel);
  const [composerTargetPaneIndex, setComposerTargetPaneIndex] = useState<number | null>(null);
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
  const [pendingAttachmentChannel, setPendingAttachmentChannel] = useState<string>(activeChannel);
  const [pendingAttachmentPaneIndex, setPendingAttachmentPaneIndex] = useState<number | null>(null);
  const [voiceRecording, setVoiceRecording] = useState<{ channelId: string; paneIndex: number | null } | null>(null);
  const [notificationsMuted, setNotificationsMuted] = useState(storedSettings.notificationsMuted ?? false);
  const [membersOpen, setMembersOpen] = useState(storedSettings.membersOpen ?? true);
  const [callActive, setCallActive] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [peerCallActive, setPeerCallActive] = useState(false);
  const [peerScreenSharing, setPeerScreenSharing] = useState(false);
  const [peerMicMuted, setPeerMicMuted] = useState(false);
  const [peerCameraActive, setPeerCameraActive] = useState(false);
  const [activeVoiceRoom, setActiveVoiceRoom] = useState<string | null>(storedSettings.activeVoiceRoom ?? null);
  const [presence, setPresence] = useState(storedSettings.presence ?? DEFAULT_PRESENCE);
  const [about, setAbout] = useState(storedSettings.about ?? "");
  const [pronouns, setPronouns] = useState(storedSettings.pronouns ?? "");
  const [pronunciation, setPronunciation] = useState(storedSettings.pronunciation ?? "");
  const [hobbies, setHobbies] = useState(storedSettings.hobbies ?? "");
  const [languages, setLanguages] = useState(storedSettings.languages ?? "");
  const [accentColor, setAccentColor] = useState(storedSettings.accentColor ?? "#7c8cff");
  const [appTheme, setAppTheme] = useState<AppTheme>(() => normalizeAppTheme(storedSettings.appTheme));
  const [statusMessage, setStatusMessage] = useState(storedSettings.statusMessage ?? "");
  const [website, setWebsite] = useState(storedSettings.website ?? "");
  const [location, setLocation] = useState(storedSettings.location ?? "");
  const [headline, setHeadline] = useState(storedSettings.headline ?? "");
  const [timezone, setTimezone] = useState(storedSettings.timezone ?? "");
  const [birthday, setBirthday] = useState(storedSettings.birthday ?? "");
  const [company, setCompany] = useState(storedSettings.company ?? "");
  const [school, setSchool] = useState(storedSettings.school ?? "");
  const [major, setMajor] = useState(storedSettings.major ?? "");
  const [avatarUrl, setAvatarUrl] = useState(storedSettings.avatarUrl ?? "");
  const [avatarFrameUrl, setAvatarFrameUrl] = useState(storedSettings.avatarFrameUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(storedSettings.bannerUrl ?? "");
  const [avatarAnimated, setAvatarAnimated] = useState(storedSettings.avatarAnimated ?? false);
  const [peerName, setPeerName] = useState("Peer");
  const [peerPresence, setPeerPresence] = useState("waiting for profile");
  const [peerAbout, setPeerAbout] = useState("");
  const [peerPronouns, setPeerPronouns] = useState("");
  const [peerPronunciation, setPeerPronunciation] = useState("");
  const [peerHobbies, setPeerHobbies] = useState("");
  const [peerLanguages, setPeerLanguages] = useState("");
  const [peerCompany, setPeerCompany] = useState("");
  const [peerAccentColor, setPeerAccentColor] = useState("#7c8cff");
  const [peerStatusMessage, setPeerStatusMessage] = useState("");
  const [peerWebsite, setPeerWebsite] = useState("");
  const [peerLocation, setPeerLocation] = useState("");
  const [peerHeadline, setPeerHeadline] = useState("");
  const [peerTimezone, setPeerTimezone] = useState("");
  const [peerBirthday, setPeerBirthday] = useState("");
  const [peerSchool, setPeerSchool] = useState("");
  const [peerMajor, setPeerMajor] = useState("");
  const [peerAvatarUrl, setPeerAvatarUrl] = useState("");
  const [peerAvatarFrameUrl, setPeerAvatarFrameUrl] = useState("");
  const [peerBannerUrl, setPeerBannerUrl] = useState("");
  const [peerAvatarAnimated, setPeerAvatarAnimated] = useState(false);
  const [peerNotificationsMuted, setPeerNotificationsMuted] = useState(false);
  const [peerMembersOpen, setPeerMembersOpen] = useState(true);
  const [peerActiveServer, setPeerActiveServer] = useState("unknown");
  const [peerActiveChannel, setPeerActiveChannel] = useState("unknown");
  const [peerTypingChannel, setPeerTypingChannel] = useState<string | null>(null);
  const [xmppRoomOccupants, setXmppRoomOccupants] = useState<Record<string, XmppRoomOccupant>>({});
  const [xmppSelfNick, setXmppSelfNick] = useState("");
  const [iceServersText, setIceServersText] = useState(storedSettings.iceServersText ?? formatIceServers(DEFAULT_ICE_SERVERS));
  const [xmppStatus, setXmppStatus] = useState("disconnected");
  const prevXmppStatusRef = useRef(xmppStatus);
  const [remoteMediaActive, setRemoteMediaActive] = useState(false);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [peerAudioLevel, setPeerAudioLevel] = useState(0);
  const [followLatest, setFollowLatest] = useState(true);
  const [roomFingerprint, setRoomFingerprint] = useState("");
  const [roomPeerFingerprint, setRoomPeerFingerprint] = useState(storedSettings.roomPeerFingerprint ?? "");
  const [roomFingerprintMatch, setRoomFingerprintMatch] = useState<"idle" | "match" | "mismatch">("idle");
  const [unreadByChannel, setUnreadByChannel] = useState<UnreadCounts>(storedSettings.unreadByChannel ?? {});
  const [recentEmojis, setRecentEmojis] = useState<string[]>(storedSettings.recentEmojis ?? defaultRecentEmojis);
  const [gifFavorites, setGifFavorites] = useState<string[]>(storedSettings.gifFavorites ?? []);
  const [cameraActive, setCameraActive] = useState(false);
  const activeServerSubtitle = serverSubtitles[activeServer]?.trim() || DEFAULT_SERVER_SUBTITLE;
  const localMemberName = name.trim() || DEFAULT_NAME;
  const selectedMemberIsLocal = selectedMember === localMemberName || selectedMember === "You";
  const selectedMemberIsPeer = selectedMember === peerName;
  const memberRoster = useMemo(() => {
    const roomMembers = Object.values(xmppRoomOccupants)
      .sort((left, right) => Number(Boolean(right.self)) - Number(Boolean(left.self)) || left.nick.localeCompare(right.nick))
      .map((occupant) => (occupant.self ? localMemberName : occupant.nick));

    if (roomMembers.length > 0) {
      return Array.from(new Set(roomMembers));
    }

    const fallbackMembers = [localMemberName, ...baseMembers];
    if (!peerName.trim() || fallbackMembers.includes(peerName)) return fallbackMembers;
    return [localMemberName, peerName, ...baseMembers];
  }, [localMemberName, peerName, xmppRoomOccupants]);
  const nestedChannelIds = useMemo(
    () => new Set(Object.values(channelChildren).flat()),
    [channelChildren],
  );
  const topLevelChannels = useMemo(
    () => channels.filter((channel) => !nestedChannelIds.has(channel.id)),
    [channels, nestedChannelIds],
  );
  const voiceRoomMembers = useMemo(() => {
    if (!activeVoiceRoom) return [];

    const nextMembers: Array<{
      id: string;
      name: string;
      avatarUrl: string;
      avatarFrameUrl: string;
      speaking: boolean;
    }> = [];
    const seen = new Set<string>();
    const addMember = (member: {
      id: string;
      name: string;
      avatarUrl: string;
      avatarFrameUrl: string;
      speaking: boolean;
    }) => {
      if (seen.has(member.id)) return;
      seen.add(member.id);
      nextMembers.push(member);
    };

    addMember({
      id: localMemberName,
      name: localMemberName,
      avatarUrl,
      avatarFrameUrl,
      speaking: callActive && !micMuted && localAudioLevel > 12,
    });

    if (peerName.trim()) {
      addMember({
        id: peerName,
        name: peerName,
        avatarUrl: peerAvatarUrl,
        avatarFrameUrl: peerAvatarFrameUrl,
        speaking: peerCallActive && !peerMicMuted && peerAudioLevel > 12,
      });
    }

    Object.values(xmppRoomOccupants).forEach((occupant) => {
      const name = occupant.self ? localMemberName : occupant.nick;
      if (!name.trim()) return;
      addMember({
        id: name,
        name,
        avatarUrl: name === localMemberName ? avatarUrl : name === peerName ? peerAvatarUrl : "",
        avatarFrameUrl: name === localMemberName ? avatarFrameUrl : name === peerName ? peerAvatarFrameUrl : "",
        speaking: false,
      });
    });

    return nextMembers;
  }, [
    activeVoiceRoom,
    avatarFrameUrl,
    avatarUrl,
    callActive,
    localAudioLevel,
    localMemberName,
    micMuted,
    peerAudioLevel,
    peerAvatarFrameUrl,
    peerAvatarUrl,
    peerCallActive,
    peerMicMuted,
    peerName,
    xmppRoomOccupants,
  ]);
  const messageAvatarByAuthor = useMemo(() => {
    const avatars = new Map<string, string>();
    const addAvatar = (memberName: string, url: string) => {
      const key = memberName.trim().toLowerCase();
      if (!key || !url.trim() || avatars.has(key)) return;
      avatars.set(key, url);
    };

    addAvatar(localMemberName, avatarUrl);
    addAvatar(peerName, peerAvatarUrl);
    voiceRoomMembers.forEach((member) => addAvatar(member.name, member.avatarUrl));
    return avatars;
  }, [avatarUrl, localMemberName, peerAvatarUrl, peerName, voiceRoomMembers]);
  const draft = getChannelDraft(draftByChannel, activeChannel);
  const replyToMessageId = getReplyTarget(replyTargetByChannel, activeChannel);
  const focusedComposerChannel = composerTargetChannel || activeChannel;
  const focusedComposerDraft = composerTargetPaneIndex === null ? draft : chatPaneDrafts[composerTargetPaneIndex] ?? "";
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const xmppClientRef = useRef<XMPP.Agent | null>(null);
  const xmppRoomRef = useRef<string | null>(null);
  const xmppSpaceRef = useRef<{ serviceJid: string; node: string } | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const channelScrollPositionsRef = useRef<Record<string, number>>({});
  const restoredScrollChannelRef = useRef<string | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const paneComposerInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const paneMessageListRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const paneMediaPreviewRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const gifPickerRef = useRef<HTMLDivElement | null>(null);
  const gifSearchRef = useRef<HTMLInputElement | null>(null);
  const reactionPickerSlotRef = useRef<HTMLDivElement | null>(null);
  const messageMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceRecordingStreamRef = useRef<MediaStream | null>(null);
  const voiceRecordingChunksRef = useRef<Blob[]>([]);
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const avatarUploadRef = useRef<HTMLInputElement | null>(null);
  const bannerUploadRef = useRef<HTMLInputElement | null>(null);
  const frameUploadRef = useRef<HTMLInputElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localCameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const localScreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const localAudioContextRef = useRef<AudioContext | null>(null);
  const localAudioFrameRef = useRef<number | null>(null);
  const peerAudioContextRef = useRef<AudioContext | null>(null);
  const peerAudioFrameRef = useRef<number | null>(null);
  const renegotiatingRef = useRef(false);
  const attachmentTransfersRef = useRef<Map<string, AttachmentTransfer>>(new Map());
  const processedWireIdsRef = useRef<Set<string>>(new Set());
  const messagesRef = useRef<ChatMessage[]>(DEFAULT_MESSAGES);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const lastReadSyncRef = useRef<Record<string, number>>({});
  const paneMessageCountRef = useRef<Record<string, number>>({});
  const typingSyncRef = useRef<{ channelId: string | null; typing: boolean }>({ channelId: null, typing: false });
  const draftRef = useRef(draft);
  const activeChannelRef = useRef(activeChannel);
  const draftSyncTimerRef = useRef<number | null>(null);

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
  const connected = xmppStatus === "connected";
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

  function resizeComposerTextarea(element: HTMLTextAreaElement) {
    element.style.height = "auto";
    const computed = window.getComputedStyle(element);
    const lineHeight = Number.parseFloat(computed.lineHeight) || 20;
    const padding = Number.parseFloat(computed.paddingTop) + Number.parseFloat(computed.paddingBottom);
    const maxHeight = lineHeight * 5 + padding;
    const nextHeight = Math.min(element.scrollHeight, maxHeight);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
  }

  function syncMainDraftToState(channelId = activeChannelRef.current, value = draftRef.current) {
    setDraftByChannel((current) => setChannelDraft(current, channelId, value));
  }

  function scheduleMainDraftSync(channelId = activeChannelRef.current, value = draftRef.current) {
    if (draftSyncTimerRef.current !== null) {
      window.clearTimeout(draftSyncTimerRef.current);
    }
    draftSyncTimerRef.current = window.setTimeout(() => {
      draftSyncTimerRef.current = null;
      syncMainDraftToState(channelId, value);
    }, 250);
  }
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
  const chatInspectorMessage = selectedSearchMessage ?? visibleMessages[visibleMessages.length - 1] ?? null;
  const chatInspectorPinnedCount = visibleMessages.filter((message) => message.pinned).length;
  const deletingChannel = channels.find((channel) => channel.id === deletingChannelId);
  const deletingChannelParentId = deletingChannelId?.includes(":")
    ? deletingChannelId.slice(0, deletingChannelId.lastIndexOf(":"))
    : null;
  const deleteFallbackChannel =
    (deletingChannelParentId ? channels.find((channel) => channel.id === deletingChannelParentId) : null) ??
    channels.find((channel) => channel.id !== deletingChannelId && !channel.id.includes(":")) ??
    channels.find((channel) => channel.id !== deletingChannelId) ??
    channels[0];
  const deleteFallbackVoiceRoom = voiceRooms.find((room) => room !== deletingVoiceRoom) ?? voiceRooms[0];
  const pendingAttachmentTargetLabel =
    pendingAttachmentPaneIndex === null
      ? `#${getChannelLabel(pendingAttachmentChannel || activeChannel)}`
      : `Pane ${pendingAttachmentPaneIndex + 1} / #${getChannelLabel(pendingAttachmentChannel || activeChannel)}`;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  useEffect(() => {
    return () => {
      if (draftSyncTimerRef.current !== null) {
        window.clearTimeout(draftSyncTimerRef.current);
      }
      if (voiceRecorderRef.current && voiceRecorderRef.current.state !== "inactive") {
        voiceRecorderRef.current.stop();
      }
      voiceRecordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    draftRef.current = draft;
    const element = composerInputRef.current;
    if (element && document.activeElement !== element && element.value !== draft) {
      element.value = draft;
    }
  }, [draft]);

  useEffect(() => {
    document.documentElement.dataset.theme = appTheme;
  }, [appTheme]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const settings: StoredSettings = {
        activeServer,
        activeChannelsByServer,
        serverSubtitles,
        channels,
        channelChildren,
        voiceRooms,
        xmppWebSocketUrl,
        xmppJid,
        xmppPassword,
        xmppRoomJid,
        xmppSpaceServiceJid,
        xmppSpaceNode,
        xmppNick,
        editDraftByMessage,
        newChannelName,
        newServerName,
        newServerSubtitle,
        replyTargetByChannel,
        activeVoiceRoom,
        iceServersText,
        draftByChannel,
        searchQuery,
        searchIndex,
        roomPeerFingerprint,
        recentEmojis,
        gifFavorites,
        avatarUrl,
        avatarFrameUrl,
        bannerUrl,
        avatarAnimated,
        chatPaneMode,
        chatPaneChannels,
        chatPaneDrafts,
        chatPaneReplyTargets,
        chatPaneCompactSections,
        mainTab,
        events,
        membersOpen,
        notificationsMuted,
        name,
        presence,
        about,
        pronouns,
        pronunciation,
        hobbies,
        languages,
        accentColor,
        appTheme,
        statusMessage,
        website,
        location,
        headline,
        timezone,
        birthday,
        company,
        school,
        major,
        servers,
        unreadByChannel,
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [
    activeChannelsByServer,
    activeServer,
    activeVoiceRoom,
    serverSubtitles,
    draftByChannel,
    editDraftByMessage,
    newChannelName,
    newServerName,
    newServerSubtitle,
    replyTargetByChannel,
    searchQuery,
    searchIndex,
    roomPeerFingerprint,
    recentEmojis,
    gifFavorites,
    avatarUrl,
    avatarFrameUrl,
    bannerUrl,
    avatarAnimated,
    chatPaneMode,
    chatPaneChannels,
    chatPaneDrafts,
    chatPaneReplyTargets,
    chatPaneCompactSections,
    mainTab,
    events,
    channels,
    channelChildren,
    voiceRooms,
    xmppWebSocketUrl,
    xmppJid,
    xmppPassword,
    xmppRoomJid,
    xmppSpaceServiceJid,
    xmppSpaceNode,
    xmppNick,
    iceServersText,
    membersOpen,
    name,
    notificationsMuted,
    presence,
    about,
    pronouns,
    pronunciation,
    hobbies,
    languages,
    accentColor,
    appTheme,
    statusMessage,
    website,
    location,
    headline,
    timezone,
    birthday,
    company,
    school,
    major,
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
        setMessages(normalizeLoadedMessages(restored));
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
    const websocketUrl = xmppConnectionSettings.websocketUrl;
    const jid = xmppConnectionSettings.jid;
    const password = xmppConnectionSettings.password;
    const room = xmppConnectionSettings.roomJid;
    const spaceServiceJid = xmppConnectionSettings.spaceServiceJid;
    const spaceNode = xmppConnectionSettings.spaceNode;

    xmppClientRef.current?.disconnect();
    xmppClientRef.current = null;
    xmppRoomRef.current = null;
    xmppSpaceRef.current = null;
    setXmppRoomOccupants({});
    setXmppSelfNick("");

    if (!websocketUrl || !jid || !password || (!room && (!spaceServiceJid || !spaceNode))) {
      if (xmppConnectNonce > 0) setXmppStatus("disabled");
      return undefined;
    }

    let cancelled = false;
    setXmppStatus("connecting");

    const describeXmppFailure = (value: unknown): string => {
      const muc = (value as { muc?: Record<string, unknown> } | null)?.muc ?? {};
      if (muc.passwordRequired) return "password required";
      if (muc.roomNotFound) return "room not found";
      if (muc.forbidden) return "forbidden";
      if (muc.conflict) return "nickname conflict";

      const stanzaError = (value as { error?: { condition?: string; text?: string } } | null)?.error;
      const condition = stanzaError?.condition;
      if (condition === "item-not-found") return "room not found";
      if (condition === "not-authorized") return "password required";
      if (condition === "forbidden") return "forbidden";
      if (condition) return condition;
      if (stanzaError?.text) return stanzaError.text;

      if (value instanceof Error && value.message) return value.message;
      if (typeof value === "string" && value.trim()) return value;
      return "unknown error";
    };

    const client = XMPP.createClient({
      jid,
      password,
      transports: {
        websocket: websocketUrl,
      },
      transportPreferenceOrder: ["websocket"],
      autoReconnect: true,
    });

    xmppClientRef.current = client;

    client.on("stream:start", () => {
      if (!cancelled) log("XMPP stream started.");
    });
    client.on("connected", () => {
      if (!cancelled) log("XMPP transport connected.");
    });
    client.on("session:prebind", () => {
      if (!cancelled) log("XMPP session prebind.");
    });
    client.on("session:bound", () => {
      if (!cancelled) log("XMPP session bound.");
    });

    client.on("session:started", async () => {
      if (cancelled) return;
      try {
        client.sendPresence();
        if (spaceServiceJid && spaceNode) {
          await client.subscribeToNode(spaceServiceJid, { node: spaceNode });
          xmppSpaceRef.current = { serviceJid: spaceServiceJid, node: spaceNode };
          if (!cancelled) setXmppStatus("connected");
          log(`XMPP space subscribed: ${spaceServiceJid} / ${spaceNode}.`);
        } else {
          xmppRoomRef.current = room;
          await client.joinRoom(room, xmppConnectionSettings.nick);
          if (!cancelled) setXmppStatus("connected");
          log(`XMPP room connected: ${room}.`);
        }
      } catch (error) {
        if (!cancelled) setXmppStatus("failed");
        const detail = describeXmppFailure(error);
        log(spaceServiceJid && spaceNode ? `Could not join the XMPP space: ${detail}.` : `Could not join the XMPP room: ${detail}.`);
      }
    });

    client.on("groupchat", (msg) => {
      if (cancelled || !msg.body) return;
      void handleEncryptedWireText(msg.body);
    });

    client.on("muc:failed", (presence) => {
      if (!cancelled) {
        log(`MUC join failed: ${describeXmppFailure(presence)}.`);
      }
    });

    const getPresenceRoom = (presence: { from?: string }) => presence.from?.split("/")[0] ?? "";
    const getPresenceNick = (presence: { from?: string }) => {
      const [, resource = ""] = presence.from?.split("/", 2) ?? [];
      return decodeURIComponent(resource).trim();
    };
    const isSelfPresence = (presence: { muc?: { statusCodes?: Array<string | number> } }) =>
      (presence.muc?.statusCodes ?? []).map(String).includes("110");

    client.on("muc:available", (presence) => {
      if (cancelled || !xmppRoomRef.current || getPresenceRoom(presence) !== xmppRoomRef.current) return;

      const nick = getPresenceNick(presence);
      if (!nick) return;

      const self = isSelfPresence(presence);
      if (self) setXmppSelfNick(nick);

      setXmppRoomOccupants((current) => ({
        ...current,
        [nick]: {
          nick,
          role: presence.muc?.role,
          affiliation: presence.muc?.affiliation,
          self,
        },
      }));
    });

    client.on("muc:unavailable", (presence) => {
      if (cancelled || !xmppRoomRef.current || getPresenceRoom(presence) !== xmppRoomRef.current) return;

      const nick = getPresenceNick(presence);
      if (!nick) return;

      const self = isSelfPresence(presence);
      if (self) {
        setXmppSelfNick("");
        setXmppRoomOccupants({});
        return;
      }

      setXmppRoomOccupants((current) => {
        const next = { ...current };
        delete next[nick];
        return next;
      });
    });

    client.on("pubsub:published", (msg) => {
      if (cancelled || !xmppSpaceRef.current) return;
      const published = msg.pubsub.items?.published ?? [];
      if (msg.pubsub.items?.node !== xmppSpaceRef.current.node) return;
      published.forEach((item) => {
        const content = item.content as { json?: unknown } | undefined;
        const payload = content?.json;
        if (typeof payload === "string") {
          void handleEncryptedWireText(payload);
          return;
        }
        if (payload && typeof payload === "object") {
          void handleEncryptedWireText(JSON.stringify(payload));
        }
      });
    });

    client.on("disconnected", () => {
      if (!cancelled) setXmppStatus("disconnected");
    });
    client.on("auth:failed", () => {
      if (!cancelled) {
        setXmppStatus("failed");
        log("XMPP auth failed.");
      }
    });
    client.on("stream:error", (streamError, error) => {
      if (!cancelled) {
        setXmppStatus("failed");
        const detail =
          streamError?.condition ??
          (error instanceof Error ? error.message : typeof error === "string" ? error : "unknown error");
        log(`XMPP stream error: ${detail}.`);
      }
    });
    client.on("session:end", () => {
      if (!cancelled) log("XMPP session ended.");
    });
    client.on("stream:end", () => {
      if (!cancelled) log("XMPP stream ended.");
    });
    client.on("--transport-disconnected", () => {
      if (!cancelled) log("XMPP transport disconnected.");
    });
    client.on("stanza:failed", (...args) => {
      if (!cancelled) log(`XMPP stanza failed: ${args.map((arg) => describeDebugValue(arg)).join(" | ") || "unknown"}.`);
    });
    client.on("muc:error", (...args) => {
      if (!cancelled) {
        setXmppStatus("failed");
        const detail = args.map((arg) => describeXmppFailure(arg)).find((entry) => entry !== "unknown error") ?? "unknown";
        log(`MUC error: ${detail}.`);
      }
    });

    void client.connect();

    return () => {
      cancelled = true;
      client.disconnect();
    };
  }, [xmppConnectNonce]);

  useEffect(() => {
    if (prevXmppStatusRef.current === xmppStatus) return;
    prevXmppStatusRef.current = xmppStatus;
    log(`XMPP status: ${xmppStatus}`);
  }, [xmppStatus]);

  useEffect(() => {
    if (mainTab !== "chat") {
      const list = messageListRef.current;
      if (list) {
        channelScrollPositionsRef.current[activeChannel] = list.scrollTop;
        setFollowLatest(isNearBottom(list.scrollTop, list.clientHeight, list.scrollHeight));
      }
      restoredScrollChannelRef.current = null;
      return;
    }

    const list = messageListRef.current;
    if (!list) return;

    if (restoredScrollChannelRef.current !== `${mainTab}:${activeChannel}`) {
      restoredScrollChannelRef.current = `${mainTab}:${activeChannel}`;
      const savedScrollTop = channelScrollPositionsRef.current[activeChannel];
      requestAnimationFrame(() => {
        const nextScrollTop = savedScrollTop ?? list.scrollHeight;
        list.scrollTop = Math.min(nextScrollTop, Math.max(0, list.scrollHeight - list.clientHeight));
        setFollowLatest(isNearBottom(list.scrollTop, list.clientHeight, list.scrollHeight));
      });
      return;
    }

    if (followLatest) list.scrollTop = list.scrollHeight;
  }, [activeChannel, followLatest, mainTab, visibleMessages.length]);

  useEffect(() => {
    if (chatPaneMode !== "split") return;

    requestAnimationFrame(() => {
      chatPaneChannels.forEach((channelId, paneIndex) => {
        const paneKey = `pane-${paneIndex}`;
        const list = paneMessageListRefs.current[paneKey];
        if (!list) return;

        const nextCount = messages.filter((message) => message.channel === channelId).length;
        const prevCount = paneMessageCountRef.current[paneKey] ?? 0;
        const nearBottom = isNearBottom(list.scrollTop, list.clientHeight, list.scrollHeight);

        if (nextCount > prevCount && nearBottom) {
          list.scrollTop = list.scrollHeight;
        }

        paneMessageCountRef.current[paneKey] = nextCount;
      });
    });
  }, [chatPaneChannels, chatPaneMode, messages]);

  useEffect(() => {
    if (chatPaneMode !== "split") {
      setSplitViewportCompact(false);
      setSplitViewportStacked(false);
      return;
    }

    function updateSplitViewportCompact() {
      setSplitViewportCompact(window.innerWidth < 1200);
      setSplitViewportStacked(window.innerWidth < 820);
    }

    updateSplitViewportCompact();
    window.addEventListener("resize", updateSplitViewportCompact, { passive: true });
    return () => window.removeEventListener("resize", updateSplitViewportCompact);
  }, [chatPaneMode]);

  useEffect(() => {
    let frame = 0;

    const getMessageLists = () =>
      [messageListRef.current, ...Object.values(paneMessageListRefs.current)].filter(
        (element): element is HTMLDivElement => Boolean(element),
      );

    const updateEmbedVideoHeight = () => {
      getMessageLists().forEach((element) => {
        const height = element.clientHeight || element.getBoundingClientRect().height;
        if (height <= 0) return;
        element.style.setProperty("--embed-video-max-height", `${Math.round(height * 0.5)}px`);
      });
    };

    const scheduleUpdate = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        updateEmbedVideoHeight();
      });
    };

    scheduleUpdate();
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    if (typeof ResizeObserver === "undefined") {
      return () => {
        if (frame) cancelAnimationFrame(frame);
        window.removeEventListener("resize", scheduleUpdate);
      };
    }

    const observer = new ResizeObserver(scheduleUpdate);
    getMessageLists().forEach((element) => observer.observe(element));

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [chatPaneChannels, chatPaneMode, mainTab]);

  useEffect(() => {
    const element = composerInputRef.current;
    if (!element) return;

    resizeComposerTextarea(element);
  }, [activeChannel, draft]);

  useEffect(() => {
    if (chatPaneMode !== "split") return;

    chatPaneChannels.forEach((_, paneIndex) => {
      const element = paneComposerInputRefs.current[`pane-${paneIndex}`];
      if (!element) return;

      element.style.height = "auto";
      const computed = window.getComputedStyle(element);
      const lineHeight = Number.parseFloat(computed.lineHeight) || 20;
      const padding = Number.parseFloat(computed.paddingTop) + Number.parseFloat(computed.paddingBottom);
      const maxHeight = lineHeight * 5 + padding;
      const nextHeight = Math.min(element.scrollHeight, maxHeight);
      element.style.height = `${nextHeight}px`;
      element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
    });
  }, [chatPaneChannels, chatPaneDrafts, chatPaneMode]);

  useEffect(() => {
    const list = messageListRef.current;
    if (!list) return;
    const listElement = list;

    function syncFollowState() {
      channelScrollPositionsRef.current[activeChannel] = listElement.scrollTop;
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
    if (chatPaneMode === "split") return;
    setPendingGif(null);
    setPendingGifChannel(activeChannel);
    setComposerTargetChannel(activeChannel);
    setPendingGifPaneIndex(null);
    setComposerTargetPaneIndex(null);
    setGifOpen(false);
    setGifQuery("");
    setGifTab("all");
  }, [activeChannel, chatPaneMode]);

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
    if (chatPaneMode !== "split") return;

    const visibleChannels = new Set(chatPaneChannels);
    visibleChannels.forEach((channelId) => {
      const lastReadAt = messages.reduce((latest, message) => {
        if (message.channel !== channelId) return latest;
        return Math.max(latest, message.at);
      }, 0);
      if (lastReadAt === 0) return;
      if (lastReadSyncRef.current[channelId] === lastReadAt) return;
      lastReadSyncRef.current[channelId] = lastReadAt;
      setUnreadByChannel((counts) => clearUnreadCount(counts, channelId));
      void sendReadSync(channelId, lastReadAt);
    });
  }, [chatPaneChannels, chatPaneMode, messages]);

  useEffect(() => {
    if (!connected) {
      typingSyncRef.current = { channelId: null, typing: false };
      return;
    }

    const active = focusedComposerDraft.trim().length > 0;
    const previous = typingSyncRef.current;
    if (previous.channelId !== focusedComposerChannel || previous.typing !== active) {
      typingSyncRef.current = { channelId: focusedComposerChannel, typing: active };
      void sendTypingSync(active, focusedComposerChannel);
    }

    if (!active) return;

    const timeout = window.setTimeout(() => {
      typingSyncRef.current = { channelId: focusedComposerChannel, typing: false };
      void sendTypingSync(false, focusedComposerChannel);
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [connected, focusedComposerChannel, focusedComposerDraft]);

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
    const channelIds = channels.map((channel) => channel.id);
    const fallbackChannelId = channelIds[0] ?? activeChannel;
    const nextPaneChannels = normalizeChatPaneChannels(chatPaneChannels, DEFAULT_CHAT_PANE_COUNT, channelIds, fallbackChannelId);
    const nextPaneDrafts = normalizeChatPaneDrafts(chatPaneDrafts, nextPaneChannels.length);
    const nextPaneReplyTargets = normalizeChatPaneReplyTargets(chatPaneReplyTargets, nextPaneChannels.length);
    const nextPaneCompactSections = normalizeChatPaneCompactSections(chatPaneCompactSections, nextPaneChannels.length);

    if (JSON.stringify(nextPaneChannels) !== JSON.stringify(chatPaneChannels)) {
      setChatPaneChannels(nextPaneChannels);
    }
    if (JSON.stringify(nextPaneDrafts) !== JSON.stringify(chatPaneDrafts)) {
      setChatPaneDrafts(nextPaneDrafts);
    }
    if (JSON.stringify(nextPaneReplyTargets) !== JSON.stringify(chatPaneReplyTargets)) {
      setChatPaneReplyTargets(nextPaneReplyTargets);
    }
    if (JSON.stringify(nextPaneCompactSections) !== JSON.stringify(chatPaneCompactSections)) {
      setChatPaneCompactSections(nextPaneCompactSections);
    }
  }, [activeChannel, channels, chatPaneChannels, chatPaneCompactSections, chatPaneDrafts, chatPaneReplyTargets]);

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
        about,
        pronouns,
        pronunciation,
        hobbies,
        company,
        school,
        major,
        notificationsMuted,
        membersOpen,
        activeServer,
        activeChannel,
        avatarUrl,
        avatarFrameUrl,
        bannerUrl,
        avatarAnimated,
        statusMessage,
        website,
        location,
        headline,
        timezone,
        birthday,
      });
    }, 500);

    return () => window.clearTimeout(handle);
  }, [about, accentColor, avatarAnimated, avatarFrameUrl, avatarUrl, bannerUrl, birthday, company, connected, headline, hobbies, languages, location, major, membersOpen, name, notificationsMuted, presence, pronouns, pronunciation, statusMessage, timezone, website]);

  useEffect(() => {
    function closeEmojiPicker(event: PointerEvent) {
      const target = event.target as Node;
      if (emojiPickerRef.current?.contains(target)) return;
      if (gifPickerRef.current?.contains(target)) return;
      if (composerInputRef.current?.contains(target)) return;
      if (target instanceof HTMLElement && (target.closest(".composer") || target.closest(".paneComposer"))) return;
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
      stopAudioMeter();
      stopAudioMeter(peerAudioContextRef, peerAudioFrameRef, setPeerAudioLevel);
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
    if (!localCameraVideoRef.current) return;
    localCameraVideoRef.current.srcObject = cameraStreamRef.current;
    void localCameraVideoRef.current.play().catch(() => undefined);
  }, [cameraActive]);

  useEffect(() => {
    if (!remoteVideoRef.current) return;
    remoteVideoRef.current.srcObject = remoteStreamRef.current;
    void remoteVideoRef.current.play().catch(() => log("Remote video is ready; browser requires a click to play."));
  }, [remoteVideoActive]);

  useEffect(() => {
    driveAudioMeter(micStreamRef.current);
    return () => stopAudioMeter();
  }, [callActive, micMuted]);

  useEffect(() => {
    driveAudioMeter(remoteMediaActive ? remoteStreamRef.current : null, peerAudioContextRef, peerAudioFrameRef, setPeerAudioLevel);
    return () => stopAudioMeter(peerAudioContextRef, peerAudioFrameRef, setPeerAudioLevel);
  }, [remoteMediaActive]);

  useEffect(() => {
    const stream = remoteVideoActive ? remoteStreamRef.current : null;
    Object.values(paneMediaPreviewRefs.current).forEach((node) => {
      if (!node) return;
      node.srcObject = stream;
      if (stream) void node.play().catch(() => undefined);
    });
  }, [remoteVideoActive]);

  function refreshRemoteMediaState() {
    const tracks = remoteStreamRef.current.getTracks();
    setRemoteMediaActive(tracks.some((track) => track.readyState === "live"));
    setRemoteVideoActive(remoteStreamRef.current.getVideoTracks().some((track) => track.readyState === "live"));
  }

  function stopAudioMeter(
    contextRef = localAudioContextRef,
    frameRef = localAudioFrameRef,
    setLevel = setLocalAudioLevel,
  ) {
    const context = contextRef.current;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (context) {
      void context.close().catch(() => undefined);
      contextRef.current = null;
    }
    setLevel(0);
  }

  function driveAudioMeter(
    stream: MediaStream | null,
    contextRef = localAudioContextRef,
    frameRef = localAudioFrameRef,
    setLevel = setLocalAudioLevel,
  ) {
    stopAudioMeter(contextRef, frameRef, setLevel);
    if (!stream || stream.getAudioTracks().length === 0) return;

    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const total = data.reduce((sum, value) => sum + value, 0);
      const nextLevel = Math.min(100, Math.round((total / (data.length * 255)) * 100));
      setLevel(nextLevel);
      frameRef.current = requestAnimationFrame(tick);
    };

    contextRef.current = context;
    frameRef.current = requestAnimationFrame(tick);
  }

  function log(event: string) {
    setEvents((current) => [event, ...current].slice(0, 200));
  }

  function clearEventLog() {
    setEvents([]);
  }

  useEffect(() => {
    const startedAt = new Date();
    const stamp = `${startedAt.getFullYear()}/${String(startedAt.getMonth() + 1).padStart(2, "0")}/${String(startedAt.getDate()).padStart(2, "0")} ${String(startedAt.getHours()).padStart(2, "0")}:${String(startedAt.getMinutes()).padStart(2, "0")}:${String(startedAt.getSeconds()).padStart(2, "0")}`;
    log(`App session started: ${stamp}.`);
  }, []);

  function addSystemMessage(body: string, channel = activeChannel, attachment?: ChatMessage["attachment"]) {
    setMessages((current) =>
      appendMessageIfUnique(current, {
        id: crypto.randomUUID(),
        author: "System",
        body,
        channel,
        at: Date.now(),
        encrypted: true,
        attachment,
      }),
    );
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

  function stepSearch(direction: 1 | -1) {
    if (!searchActive || searchMatches.length === 0) return;
    setSearchIndex((current) => (current + direction + searchMatches.length) % searchMatches.length);
  }

  function jumpToMessage(messageId: string, channelId = activeChannel) {
    const target = messages.find((message) => message.id === messageId && message.channel === channelId);
    if (!target) {
      log("Original message is no longer available.");
      return;
    }

    if (activeChannel !== channelId) {
      setActiveChannel(channelId);
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
      channelScrollPositionsRef.current[activeChannel] = list.scrollTop;
    });
  }

  function jumpPaneToLatest(paneIndex: number) {
    const list = paneMessageListRefs.current[`pane-${paneIndex}`];
    if (!list) return;

    requestAnimationFrame(() => {
      list.scrollTop = list.scrollHeight;
    });
  }

  function clearComposerDraft() {
    if (!draftRef.current && !replyToMessage) return;
    if (draftSyncTimerRef.current !== null) {
      window.clearTimeout(draftSyncTimerRef.current);
      draftSyncTimerRef.current = null;
    }
    draftRef.current = "";
    if (composerInputRef.current) {
      composerInputRef.current.value = "";
      composerInputRef.current.style.height = "auto";
    }
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

  const MAX_XMPP_PAYLOAD_CHARS = 48_000;
  const MAX_ATTACHMENT_BYTES = 512 * 1024;

  function summarizeDebugString(value: string, limit = 240) {
    return value.length > limit ? `${value.slice(0, limit)}...[${value.length} chars]` : value;
  }

  function sanitizeDebugBody(value: string) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return sanitizeDebugValue(parsed);
    } catch {
      return summarizeDebugString(value);
    }
  }

  function describePlainWirePayload(plain: PlainWirePayload) {
    switch (plain.type) {
      case "message":
        return `chat message${plain.body ? ` (${summarizeDebugString(plain.body, 72)})` : ""}`;
      case "attachment":
        return `attachment ${plain.fileName} (${formatBytes(plain.size)})`;
      case "attachment-chunk":
        return `attachment chunk ${plain.fileName} ${plain.index + 1}/${plain.total}`;
      case "rtc-signal":
        return "voice signal";
      case "receipt":
        return "receipt";
      case "reaction":
        return "reaction";
      case "edit":
        return "edit";
      case "note":
        return "note";
      case "delete":
        return "delete";
      case "channel-sync":
        return `channel sync ${plain.action} #${plain.channelId}`;
      case "server-sync":
        return `server sync ${plain.action} ${plain.serverName}`;
      case "voice-sync":
        return "voice sync";
      case "profile-sync":
        return describeProfileSyncPayload(plain);
      case "session-control":
        return `session control ${plain.action}`;
      case "media-sync":
        return "media sync";
      case "typing-sync":
        return "typing sync";
      case "read-sync":
        return "read sync";
    }
    return "payload";
  }

  function describeProfileSyncPayload(plain: PlainWireProfileSync) {
    const longFields = Object.entries(plain)
      .filter(([key, value]) => {
        if (typeof value !== "string") return false;
        if (key === "type" || key === "id" || key === "author" || key === "channel" || key === "name" || key === "presence") return false;
        return value.length > 1000;
      })
      .map(([key, value]) => `${key}=${(value as string).length}`);

    if (longFields.length === 0) return "profile sync";
    return `profile sync (${longFields.join(", ")})`;
  }

  async function sendXmppEncryptedPayload(encrypted: WireMessage, plain: PlainWirePayload) {
    const client = xmppClientRef.current;
    const room = xmppRoomRef.current?.trim();
    const space = xmppSpaceRef.current;
    if (!client || xmppStatus !== "connected") return false;

    const payload = JSON.stringify(encrypted);
    if (payload.length > MAX_XMPP_PAYLOAD_CHARS) {
      log(`XMPP payload too large to send live (${payload.length} chars) for ${describePlainWirePayload(plain)}.`);
      return false;
    }

    try {
      if (space) {
        await client.publish(space.serviceJid, space.node, {
          itemType: NS_JSON_0,
          json: encrypted,
        });
        return true;
      }
      if (!room) {
        log("Saved locally. Connect XMPP or a peer channel to deliver it live.");
        return false;
      }
      client.sendMessage({
        to: room,
        type: "groupchat",
        body: payload,
      });
      return true;
    } catch {
      log("Could not reach the XMPP room.");
      return false;
    }
  }

  function collectWorkspaceBackupSettings(): WorkspaceBackupSettings {
    return {
      activeServer,
      activeChannelsByServer,
      serverSubtitles,
      activeVoiceRoom,
      channels,
      channelChildren,
      voiceRooms,
      iceServersText,
      membersOpen,
      notificationsMuted,
      name,
      presence,
      about,
      pronouns,
      pronunciation,
      hobbies,
      languages,
      accentColor,
      appTheme,
      statusMessage,
      website,
      location,
      headline,
      timezone,
      birthday,
      recentEmojis,
      gifFavorites,
      avatarUrl,
      avatarFrameUrl,
      bannerUrl,
      avatarAnimated,
      chatPaneMode,
      chatPaneChannels,
      chatPaneDrafts,
      chatPaneReplyTargets,
      chatPaneCompactSections,
      events,
      newChannelName,
      newServerName,
      newServerSubtitle,
      draftByChannel,
      editDraftByMessage,
      replyTargetByChannel,
      searchQuery,
      searchIndex,
      roomPeerFingerprint,
      servers,
      unreadByChannel,
      xmppWebSocketUrl,
      xmppJid,
      xmppPassword,
      xmppRoomJid,
      xmppSpaceServiceJid,
      xmppSpaceNode,
      xmppNick,
    };
  }

  function sanitizeDebugValue(value: unknown, seen = new WeakSet<object>()): unknown {
    if (typeof value === "string") return summarizeDebugString(value);
    if (typeof value === "number" || typeof value === "boolean" || value == null) return value;
    if (Array.isArray(value)) return value.map((entry) => sanitizeDebugValue(entry, seen));
    if (typeof value !== "object") return String(value);
    if (seen.has(value)) return "[Circular]";
    seen.add(value);

    const entries = Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (key === "ciphertext" || key === "iv") return [key, "[redacted]"];
      if (key === "body" && typeof entry === "string") return [key, sanitizeDebugBody(entry)];
      return [key, sanitizeDebugValue(entry, seen)];
    });
    return Object.fromEntries(entries);
  }

  function describeDebugValue(value: unknown) {
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    if (typeof value === "string") return summarizeDebugString(value);
    if (typeof value === "number" || typeof value === "boolean" || value == null) return String(value);
    try {
      return JSON.stringify(sanitizeDebugValue(value));
    } catch {
      return Object.prototype.toString.call(value);
    }
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

  function dedupeMessagesById(nextMessages: ChatMessage[]) {
    const seen = new Set<string>();
    return nextMessages.filter((message) => {
      if (seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    });
  }

  function normalizeLoadedMessages(nextMessages: ChatMessage[]) {
    return hydrateAttachmentUrls(dedupeMessagesById(nextMessages));
  }

  function appendMessageIfUnique(current: ChatMessage[], nextMessage: ChatMessage) {
    return current.some((message) => message.id === nextMessage.id) ? current : [...current, nextMessage];
  }

  function applyImportedWorkspace(settings: WorkspaceBackupSettings, importedMessages: ChatMessage[]) {
    const nextServers = settings.servers?.length ? settings.servers : servers.length ? servers : [activeServer];
    const nextChannels = settings.channels?.length ? settings.channels : channels.length ? channels : DEFAULT_CHANNELS;
    const nextVoiceRooms = settings.voiceRooms?.length ? settings.voiceRooms : voiceRooms.length ? voiceRooms : DEFAULT_VOICE_ROOMS;
    const nextChannelChildren = settings.channelChildren ?? channelChildren;
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
    setServerSubtitles(settings.serverSubtitles ?? {});
    setChannels(nextChannels);
    setChannelChildren(nextChannelChildren);
    setVoiceRooms(nextVoiceRooms);
    setActiveServer(nextActiveServer);
    setActiveChannelsByServer({
      ...nextActiveChannelsByServer,
      [nextActiveServer]: nextActiveChannel,
    });
    setActiveChannel(nextActiveChannel);
    setXmppWebSocketUrl(settings.xmppWebSocketUrl ?? "");
    setXmppJid(settings.xmppJid ?? "");
    setXmppPassword(settings.xmppPassword ?? "");
    setXmppRoomJid(settings.xmppRoomJid ?? "");
    setXmppSpaceServiceJid(settings.xmppSpaceServiceJid ?? "");
    setXmppSpaceNode(settings.xmppSpaceNode ?? "");
    setXmppNick(settings.xmppNick ?? "");
    log(`Loaded XMPP target: ${settings.xmppJid ?? "(no JID)"} via ${settings.xmppWebSocketUrl ?? "(no WebSocket URL)"}. Expected host/IP: doge-cube.local.`);
    setXmppConnectionSettings(
      normalizeXmppConnectionSettings(
        {
          websocketUrl: settings.xmppWebSocketUrl ?? "",
          jid: settings.xmppJid ?? "",
          password: settings.xmppPassword ?? "",
          roomJid: settings.xmppRoomJid ?? "",
          spaceServiceJid: settings.xmppSpaceServiceJid ?? "",
          spaceNode: settings.xmppSpaceNode ?? "",
          nick: settings.xmppNick ?? "",
        },
        settings.name ?? DEFAULT_NAME,
      ),
    );
    setActiveVoiceRoom(settings.activeVoiceRoom ?? null);
    setIceServersText(settings.iceServersText ?? formatIceServers(DEFAULT_ICE_SERVERS));
    setMembersOpen(settings.membersOpen ?? true);
    setNotificationsMuted(settings.notificationsMuted ?? false);
    setName(settings.name ?? "Anonymous");
    setPresence(settings.presence ?? DEFAULT_PRESENCE);
    setAbout(settings.about ?? "");
    setPronouns(settings.pronouns ?? "");
    setPronunciation(settings.pronunciation ?? "");
    setHobbies(settings.hobbies ?? "");
    setLanguages(settings.languages ?? "");
    setCompany(settings.company ?? "");
    setSchool(settings.school ?? "");
    setMajor(settings.major ?? "");
    setAccentColor(settings.accentColor ?? "#7c8cff");
    setAppTheme(normalizeAppTheme(settings.appTheme));
    setStatusMessage(settings.statusMessage ?? "");
    setWebsite(settings.website ?? "");
    setLocation(settings.location ?? "");
    setHeadline(settings.headline ?? "");
    setTimezone(settings.timezone ?? "");
    setBirthday(settings.birthday ?? "");
    setRecentEmojis(settings.recentEmojis ?? defaultRecentEmojis);
    setGifFavorites(settings.gifFavorites ?? []);
    setAvatarUrl(settings.avatarUrl ?? "");
    setAvatarFrameUrl(settings.avatarFrameUrl ?? "");
    setBannerUrl(settings.bannerUrl ?? "");
    setAvatarAnimated(settings.avatarAnimated ?? false);
    setChatPaneMode(settings.chatPaneMode ?? "single");
    setChatPaneChannels(
      normalizeChatPaneChannels(
        settings.chatPaneChannels,
        DEFAULT_CHAT_PANE_COUNT,
        nextChannels.map((channel) => channel.id),
        nextActiveChannel,
      ),
    );
    setChatPaneDrafts(normalizeChatPaneDrafts(settings.chatPaneDrafts, DEFAULT_CHAT_PANE_COUNT));
    setChatPaneReplyTargets(normalizeChatPaneReplyTargets(settings.chatPaneReplyTargets, DEFAULT_CHAT_PANE_COUNT));
    setChatPaneCompactSections(normalizeChatPaneCompactSections(settings.chatPaneCompactSections, DEFAULT_CHAT_PANE_COUNT));
    setEvents(settings.events?.length ? settings.events.slice(0, 200) : ["Ready for XMPP federation."]);
    setNewChannelName(settings.newChannelName ?? "");
    setNewServerName(settings.newServerName ?? "");
    setNewServerSubtitle(settings.newServerSubtitle ?? "");
    setDraftByChannel(settings.draftByChannel ?? {});
    setEditDraftByMessage(settings.editDraftByMessage ?? {});
    setReplyTargetByChannel(settings.replyTargetByChannel ?? {});
    setSearchQuery(settings.searchQuery ?? "");
    setSearchIndex(settings.searchIndex ?? 0);
    setRoomPeerFingerprint(settings.roomPeerFingerprint ?? "");
    setUnreadByChannel(settings.unreadByChannel ?? {});
    setGifTab("all");
    setGifQuery("");
    revokeAttachmentUrls();
    setMessages(normalizeLoadedMessages(importedMessages));
    setHistoryUnlocked(true);
    setHistoryPassphrase(passphrase);
    setFollowLatest(true);
    setEmojiOpen(false);
    setReactionPickerMessageId(null);
    setSelectedMember(null);
    setPeerTypingChannel(null);
    setPendingGif(null);
    setPendingGifPaneIndex(null);
    setComposerTargetPaneIndex(null);
    setPendingAttachment(null);
    setPendingAttachmentChannel(nextActiveChannel);
    setPendingAttachmentPaneIndex(null);
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

  function isAttachmentTooLarge(size: number) {
    return size > MAX_ATTACHMENT_BYTES;
  }

  function formatVoiceAttachmentName(at: number, mimeType: string) {
    const stamp = new Date(at);
    const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "webm";
    const date = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, "0")}${String(stamp.getDate()).padStart(2, "0")}`;
    const time = `${String(stamp.getHours()).padStart(2, "0")}${String(stamp.getMinutes()).padStart(2, "0")}${String(stamp.getSeconds()).padStart(2, "0")}`;
    return `voice-note-${date}-${time}.${ext}`;
  }

  function chooseVoiceMimeType() {
    if (typeof MediaRecorder === "undefined") return "";
    const candidates = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm", "audio/ogg"];
    return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
  }

  async function blobToDataUrl(blob: Blob) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result)));
      reader.addEventListener("error", () => reject(reader.error));
      reader.readAsDataURL(blob);
    });
  }

  function revokeAttachmentUrls() {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }

  function stopLocalMedia() {
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    setCallActive(false);
    setCameraActive(false);
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
    setPeerCameraActive(false);
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

  async function sendProfileSync(
    profile: Partial<{
      name: string;
      presence: string;
      notificationsMuted: boolean;
      membersOpen: boolean;
      activeServer: string;
      activeChannel: string;
      activeVoiceRoom: string | null;
      channelChildren: Record<string, string[]>;
      voiceRooms: string[];
      avatarUrl: string;
      avatarFrameUrl: string;
      bannerUrl: string;
      avatarAnimated: boolean;
      about: string;
      pronouns: string;
      pronunciation: string;
      hobbies: string;
      languages: string;
      company: string;
      school: string;
      major: string;
      accentColor: string;
      statusMessage: string;
      website: string;
      location: string;
      headline: string;
      timezone: string;
      birthday: string;
    }> = {},
  ) {
    const nextName = (profile.name ?? name) || "Anonymous";
    await sendEncryptedPayload({
      type: "profile-sync",
      id: crypto.randomUUID(),
      author: nextName,
      channel: activeChannel,
      at: Date.now(),
      name: nextName,
      presence: profile.presence ?? presence,
      notificationsMuted: profile.notificationsMuted ?? notificationsMuted,
      membersOpen: profile.membersOpen ?? membersOpen,
      activeServer: profile.activeServer ?? activeServer,
      activeChannel: profile.activeChannel ?? activeChannel,
      avatarUrl: profile.avatarUrl ?? avatarUrl,
      avatarFrameUrl: profile.avatarFrameUrl ?? avatarFrameUrl,
      bannerUrl: profile.bannerUrl ?? bannerUrl,
      avatarAnimated: profile.avatarAnimated ?? avatarAnimated,
      about: profile.about ?? about,
      pronouns: profile.pronouns ?? pronouns,
      pronunciation: profile.pronunciation ?? pronunciation,
      hobbies: profile.hobbies ?? hobbies,
      languages: profile.languages ?? languages,
      company: profile.company ?? company,
      school: profile.school ?? school,
      major: profile.major ?? major,
      accentColor: profile.accentColor ?? accentColor,
      statusMessage: profile.statusMessage ?? statusMessage,
      website: profile.website ?? website,
      location: profile.location ?? location,
      headline: profile.headline ?? headline,
      timezone: profile.timezone ?? timezone,
      birthday: profile.birthday ?? birthday,
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
    about,
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
      void sendMediaSync({ callActive: false, screenSharing, micMuted: false, cameraActive });
      await negotiateMedia();
      return;
    }

    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setCallActive(true);
      setMicMuted(false);
      addLocalTracksToPeer();
      addSystemMessage("Started a local voice session with microphone capture.");
      void sendMediaSync({ callActive: true, screenSharing, micMuted: false, cameraActive });
      await negotiateMedia();
    } catch {
      log("Microphone permission denied or unavailable.");
    }
  }

  async function toggleCamera() {
    if (cameraActive) {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setCameraActive(false);
      addSystemMessage("Camera stopped locally.");
      void sendMediaSync({ callActive, screenSharing, micMuted, cameraActive: false });
      await negotiateMedia();
      return;
    }

    try {
      cameraStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      cameraStreamRef.current.getVideoTracks()[0]?.addEventListener("ended", () => {
        setCameraActive(false);
        cameraStreamRef.current = null;
        void negotiateMedia();
        log("Camera ended by browser.");
      });
      setCameraActive(true);
      addLocalTracksToPeer();
      addSystemMessage("Camera capture started locally.");
      void sendMediaSync({ callActive, screenSharing, micMuted, cameraActive: true });
      await negotiateMedia();
    } catch {
      log("Camera permission denied or unavailable.");
    }
  }

  async function toggleScreenShare() {
    if (screenSharing) {
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setScreenSharing(false);
      addSystemMessage("Screen share stopped.");
      void sendMediaSync({ callActive, screenSharing: false, micMuted, cameraActive });
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
      void sendMediaSync({ callActive, screenSharing: true, micMuted, cameraActive });
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
      void sendMediaSync({ callActive, screenSharing, micMuted: nextMuted, cameraActive });
      return nextMuted;
    });
  }

  function joinVoiceRoom(room: string) {
    setActiveVoiceRoom((current) => {
      const nextRoom = current === room ? null : room;
      log(nextRoom ? `Joined voice channel: ${nextRoom}.` : "Left voice channel.");
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
    const list = messageListRef.current;
    if (list) {
      channelScrollPositionsRef.current[activeChannel] = list.scrollTop;
    }
    setActiveChannel(channelId);
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

  function deriveXmppAccountDomain() {
    const roomDomain = xmppRoomJid.trim().split("@", 2)[1] ?? "";
    if (roomDomain) return roomDomain;

    const spaceDomain = xmppSpaceServiceJid.trim().split("@", 2)[1] ?? "";
    if (spaceDomain) return spaceDomain;

    try {
      const host = new URL(xmppWebSocketUrl.trim()).hostname.trim();
      if (host.startsWith("xmpp.")) return host.slice("xmpp.".length);
      return host || "doge-cube.local";
    } catch {
      return "doge-cube.local";
    }
  }

  function openXmppAccountModal() {
    const jid = xmppJid.trim();
    const username = jid.includes("@") ? jid.split("@")[0] : jid;
    setXmppAccountUsername(username);
    setXmppAccountDomain(deriveXmppAccountDomain());
    setXmppAccountPassword(xmppPassword);
    setModal("xmpp-account");
  }

  function saveXmppAccountPrompt() {
    const username = xmppAccountUsername.trim().replace(/^@+/, "");
    const domain = xmppAccountDomain.trim().replace(/^@+/, "");
    const password = xmppAccountPassword;
    if (!username || !domain || !password) {
      log("Fill the account username, domain, and password first.");
      return;
    }

    const jid = username.includes("@") ? username : `${username}@${domain}`;
    const nextXmppConnectionSettings = normalizeXmppConnectionSettings(
      {
        websocketUrl: xmppConnectionSettings.websocketUrl || xmppWebSocketUrl.trim() || deriveXmppWebSocketUrl(domain),
        jid,
        password,
        roomJid: xmppConnectionSettings.roomJid || xmppRoomJid.trim(),
        spaceServiceJid: xmppConnectionSettings.spaceServiceJid || xmppSpaceServiceJid.trim(),
        spaceNode: xmppConnectionSettings.spaceNode || xmppSpaceNode.trim(),
        nick: xmppNick,
      },
      name,
    );

    setXmppWebSocketUrl(nextXmppConnectionSettings.websocketUrl);
    setXmppJid(nextXmppConnectionSettings.jid);
    setXmppPassword(nextXmppConnectionSettings.password);
    setXmppRoomJid(nextXmppConnectionSettings.roomJid);
    setXmppSpaceServiceJid(nextXmppConnectionSettings.spaceServiceJid);
    setXmppSpaceNode(nextXmppConnectionSettings.spaceNode);
    setXmppConnectionSettings(nextXmppConnectionSettings);
    setModal(null);
    log(`Prepared XMPP account ${jid}.`);
    setXmppConnectNonce((current) => current + 1);
  }

  function openCreateServer() {
    setNewServerName("");
    setNewServerSubtitle(DEFAULT_SERVER_SUBTITLE);
    setModal("server");
  }

  function openRenameServer() {
    setNewServerName(activeServer);
    setNewServerSubtitle(activeServerSubtitle);
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
    setServerSubtitles((current) => ({
      ...current,
      [trimmed]: newServerSubtitle.trim() || DEFAULT_SERVER_SUBTITLE,
    }));
    setNewServerName("");
    setNewServerSubtitle("");
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
    const nextSubtitle = newServerSubtitle.trim() || DEFAULT_SERVER_SUBTITLE;
    if (!nextServer) {
      return;
    }

    if (servers.some((server) => server !== activeServer && server === nextServer)) {
      log(`Server name ${nextServer} already exists.`);
      return;
    }

    if (nextServer !== activeServer) {
      const renamed = renameServerEntries(servers, activeChannelsByServer, activeServer, nextServer, activeChannel);
      setServers(renamed.servers);
      setActiveChannelsByServer(renamed.activeChannelsByServer);
      setActiveServer(nextServer);
      setServerSubtitles((current) => {
        const next = { ...current };
        delete next[activeServer];
        next[nextServer] = nextSubtitle;
        return next;
      });
      void sendServerSync({
        action: "rename",
        serverName: activeServer,
        channelId: activeChannel,
        nextServerName: nextServer,
        nextChannelId: activeChannel,
      });
      log(`Renamed ${activeServer} to ${nextServer}.`);
    } else {
      setServerSubtitles((current) => ({ ...current, [activeServer]: nextSubtitle }));
      log(`Updated ${activeServer} subtitle.`);
    }
    setNewServerName(nextServer);
    setNewServerSubtitle(nextSubtitle);
    void sendProfileSync({
      name: name || "Anonymous",
      presence,
      notificationsMuted,
      membersOpen,
      activeServer: nextServer,
      activeChannel,
    });
  }

  function deleteServer() {
    if (servers.length <= 1) return;

    const fallbackServer = servers.find((server) => server !== activeServer) ?? null;
    if (!fallbackServer) return;

    const fallbackChannel = activeChannelsByServer[fallbackServer] ?? channels[0]?.id ?? activeChannel;
    const deleted = deleteServerEntries(servers, activeChannelsByServer, activeServer, fallbackServer, fallbackChannel);

    setServers(deleted.servers);
    setServerSubtitles((current) => {
      const next = { ...current };
      delete next[activeServer];
      return next;
    });
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
    if (channelCreateKind === "voice") {
      setVoiceRooms((current) => (current.includes(label) ? current : [...current, label]));
      setActiveVoiceRoom(label);
      log(`Created voice channel ${label}.`);
      setNewChannelName("");
      setChannelCreateKind("text");
      setModal(null);
      void sendProfileSync({
        name: name || "Anonymous",
        presence,
        notificationsMuted,
        membersOpen,
        activeServer,
        activeChannel,
        activeVoiceRoom: label,
        voiceRooms,
      });
      return;
    }

    const channel = { id: label, label };
    setChannels((current) => (current.some((item) => item.id === channel.id) ? current : [...current, channel]));
    setActiveChannel(channel.id);
    setNewChannelName("");
    setChannelCreateKind("text");
    setModal(null);
    log(`Created #${label}.`);
    void sendProfileSync({
      name: name || "Anonymous",
      presence,
      notificationsMuted,
      membersOpen,
      activeServer,
      activeChannel: channel.id,
      activeVoiceRoom,
    });
    void sendChannelSync({ action: "create", channelId: channel.id, label: channel.label });
  }

  function createTextSubchannel() {
    const parent = editingChannelId;
    const label = newSubchannelName.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (!parent || !label) return;
    const childId = `${parent}:${label}`;
    if (channels.some((channel) => channel.id === childId)) return;

    const nextChannelChildren = {
      ...channelChildren,
      [parent]: [...(channelChildren[parent] ?? []), childId],
    };
    const childChannel = { id: childId, label };

    setChannels((current) => [...current, childChannel]);
    setChannelChildren(nextChannelChildren);
    setNewSubchannelName("");
    log(`Created subchannel ${label} under ${parent}.`);
    void sendProfileSync({
      name: name || "Anonymous",
      presence,
      notificationsMuted,
      membersOpen,
      activeServer,
      activeChannel,
      activeVoiceRoom,
      voiceRooms,
      channelChildren: nextChannelChildren,
    });
  }

  function closeModal() {
    setModal(null);
    setLightboxImage(null);
    setDeletingChannelId(null);
    setEditingVoiceRoom(null);
    setDeletingVoiceRoom(null);
    setEditingChannelId(null);
    setEditingMessageId(null);
    setDeletingMessageId(null);
    setSelectedMember(null);
    setPendingAttachment(null);
    setPendingAttachmentPaneIndex(null);
    setEmojiOpen(false);
    setReactionPickerMessageId(null);
    setChannelCreateKind("text");
    setNewSubchannelName("");
    setXmppAccountUsername("");
    setXmppAccountDomain("doge-cube.local");
    setXmppAccountPassword("");
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
    if (channels.some((item) => item.id === label && item.id !== current.id)) return;
    const currentPrefix = `${current.id}:`;
    const nextPrefix = `${label}:`;
    const nextChannels = channels.map((item) => {
      if (item.id === current.id) return { id: label, label };
      if (item.id.startsWith(currentPrefix)) {
        return { ...item, id: item.id.replace(currentPrefix, nextPrefix) };
      }
      return item;
    });
    const nextChannelChildren = { ...channelChildren };
    const childIds = nextChannelChildren[current.id] ?? [];
    delete nextChannelChildren[current.id];
    if (childIds.length > 0) {
      nextChannelChildren[label] = childIds.map((childId) => childId.replace(currentPrefix, nextPrefix));
    }
    for (const [parentId, childList] of Object.entries(nextChannelChildren)) {
      nextChannelChildren[parentId] = childList.map((childId) => childId.replace(currentPrefix, nextPrefix));
    }
    setChannels(nextChannels);
    setChannelChildren(nextChannelChildren);
    setMessages((items) =>
      items.map((message) => {
        if (message.channel === current.id) return { ...message, channel: label };
        if (message.channel.startsWith(currentPrefix)) return { ...message, channel: message.channel.replace(currentPrefix, nextPrefix) };
        return message;
      }),
    );
    setDraftByChannel((currentDrafts) => moveChannelDraft(currentDrafts, current.id, label));
    setReplyTargetByChannel((currentTargets) => moveReplyTarget(currentTargets, current.id, label));
    setUnreadByChannel((counts) => moveUnreadCount(counts, current.id, label));
    setChatPaneChannels((currentChannels) =>
      currentChannels.map((channelId) => (channelId === current.id ? label : channelId.replace(currentPrefix, nextPrefix))),
    );
    if (composerTargetChannel === current.id || composerTargetChannel?.startsWith(currentPrefix)) {
      setComposerTargetChannel(composerTargetChannel.replace(currentPrefix, nextPrefix));
    }
    if (pendingAttachmentChannel === current.id || pendingAttachmentChannel?.startsWith(currentPrefix)) {
      setPendingAttachmentChannel(pendingAttachmentChannel.replace(currentPrefix, nextPrefix));
    }
    if (pendingGifChannel === current.id || pendingGifChannel?.startsWith(currentPrefix)) {
      setPendingGifChannel(pendingGifChannel.replace(currentPrefix, nextPrefix));
    }
    setActiveChannelsByServer((currentMap) =>
      Object.fromEntries(
        Object.entries(currentMap).map(([server, channelId]) => [
          server,
          channelId === current.id ? label : channelId.replace(currentPrefix, nextPrefix),
        ]),
      ),
    );
    if (activeChannel === current.id || activeChannel.startsWith(currentPrefix)) {
      setActiveChannel(activeChannel.replace(currentPrefix, nextPrefix));
    }
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
      activeChannel: activeChannel === current.id ? label : activeChannel.replace(currentPrefix, nextPrefix),
      channelChildren: nextChannelChildren,
    });
    void sendChannelSync({ action: "rename", channelId: current.id, label: current.label, nextChannelId: label, nextLabel: label });
  }

  function deleteVoiceRoom() {
    if (!deletingVoiceRoom) return;

    const room = deletingVoiceRoom;
    const nextRoom = deleteFallbackVoiceRoom && deleteFallbackVoiceRoom !== room ? deleteFallbackVoiceRoom : null;
    const nextVoiceRooms = voiceRooms.filter((item) => item !== room);
    setVoiceRooms(nextVoiceRooms);
    if (activeVoiceRoom === room || activeVoiceRoom?.startsWith(`${room}:`)) setActiveVoiceRoom(nextRoom);
    setDeletingVoiceRoom(null);
    setEditingVoiceRoom(null);
    setModal(null);
    log(`Deleted voice channel ${room}.`);
    void sendProfileSync({
      name: name || "Anonymous",
      presence,
      notificationsMuted,
      membersOpen,
      activeServer,
      activeChannel,
      activeVoiceRoom: nextRoom,
      voiceRooms: nextVoiceRooms,
    });
  }

  function saveVoiceRoom() {
    const current = editingVoiceRoom;
    const label = newChannelName.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (!current || !label) return;
    if (voiceRooms.some((item) => item === label && item !== current)) return;
    const nextVoiceRooms = voiceRooms.map((item) => (item === current ? label : item));
    setVoiceRooms(nextVoiceRooms);
    if (activeVoiceRoom === current) {
      setActiveVoiceRoom(label);
    } else if (activeVoiceRoom?.startsWith(`${current}:`)) {
      setActiveVoiceRoom(activeVoiceRoom.replace(`${current}:`, `${label}:`));
    }
    setEditingVoiceRoom(null);
    setNewChannelName("");
    setModal(null);
    log(`Renamed voice channel ${current} to ${label}.`);
    void sendProfileSync({
      name: name || "Anonymous",
      presence,
      notificationsMuted,
      membersOpen,
      activeServer,
      activeChannel,
      activeVoiceRoom: activeVoiceRoom === current ? label : activeVoiceRoom,
      voiceRooms: nextVoiceRooms,
    });
  }

  function deleteChannel(channelId: string) {
    if (channels.length <= 1) return;
    const removed = channels.find((channel) => channel.id === channelId);
    if (!removed) return;
    const prefix = `${channelId}:`;
    const parentId = channelId.includes(":") ? channelId.slice(0, channelId.lastIndexOf(":")) : null;
    const removedIds = channels
      .filter((channel) => channel.id === channelId || channel.id.startsWith(prefix))
      .map((channel) => channel.id);
    const remainingChannels = channels.filter((channel) => !removedIds.includes(channel.id));
    const nextChannel =
      (parentId ? channels.find((channel) => channel.id === parentId) : null) ??
      remainingChannels.find((channel) => !channel.id.includes(":")) ??
      remainingChannels[0] ??
      channels.find((channel) => channel.id !== channelId);
    if (!nextChannel) return;
    if (remainingChannels.length === 0) return;

    const nextChannelChildren = Object.fromEntries(
      Object.entries(channelChildren)
        .filter(([parentId]) => !removedIds.includes(parentId))
        .map(([parentId, childIds]) => [
          parentId,
          childIds.filter((childId) => !removedIds.includes(childId)),
        ])
        .filter(([, childIds]) => childIds.length > 0),
    );

    setChannels(remainingChannels);
    setChannelChildren(nextChannelChildren);
    setMessages((items) =>
      items.map((message) => (removedIds.includes(message.channel) ? { ...message, channel: nextChannel.id } : message)),
    );
    setDraftByChannel((currentDrafts) =>
      removedIds.reduce((drafts, removedId) => moveChannelDraft(drafts, removedId, nextChannel.id), currentDrafts),
    );
    setReplyTargetByChannel((currentTargets) =>
      removedIds.reduce((targets, removedId) => moveReplyTarget(targets, removedId, nextChannel.id), currentTargets),
    );
    setUnreadByChannel((counts) =>
      removedIds.reduce((nextCounts, removedId) => moveUnreadCount(nextCounts, removedId, nextChannel.id), counts),
    );
    setChatPaneChannels((currentChannels) =>
      currentChannels.map((paneChannelId) => (removedIds.includes(paneChannelId) ? nextChannel.id : paneChannelId)),
    );
    if (removedIds.includes(composerTargetChannel ?? "")) setComposerTargetChannel(nextChannel.id);
    if (removedIds.includes(pendingAttachmentChannel ?? "")) setPendingAttachmentChannel(nextChannel.id);
    if (removedIds.includes(pendingGifChannel ?? "")) setPendingGifChannel(nextChannel.id);
    setActiveChannelsByServer((currentMap) =>
      Object.fromEntries(
        Object.entries(currentMap).map(([server, channel]) => [server, removedIds.includes(channel) ? nextChannel.id : channel]),
      ),
    );
    setActiveChannel((current) => (removedIds.includes(current) ? nextChannel.id : current));
    setDeletingChannelId(null);
    setModal(null);
    log(`Deleted #${removed.label}; moved its messages to #${nextChannel.label}.`);
    void sendProfileSync({
      name: name || "Anonymous",
      presence,
      notificationsMuted,
      membersOpen,
      activeServer,
      activeChannel: removedIds.includes(activeChannel) ? nextChannel.id : activeChannel,
      channelChildren: nextChannelChildren,
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
      `xmpp status: ${xmppStatus}`,
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

  async function sendMediaSync(next: {
    callActive: boolean;
    screenSharing: boolean;
    micMuted: boolean;
    cameraActive: boolean;
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

  async function logSelectedCandidatePair(pc: RTCPeerConnection) {
    try {
      const stats = await pc.getStats();
      const pair = Array.from(stats.values()).find(
        (stat): stat is RTCIceCandidatePairStats =>
          stat.type === "candidate-pair" && (stat.selected || stat.nominated || stat.state === "succeeded"),
      );
      if (!pair) {
        log("ICE stats: no selected candidate pair yet.");
        return;
      }

      const local = pair.localCandidateId ? stats.get(pair.localCandidateId) : undefined;
      const remote = pair.remoteCandidateId ? stats.get(pair.remoteCandidateId) : undefined;
      const describe = (candidate: RTCStats | undefined) => {
        if (!candidate || candidate.type !== "local-candidate" && candidate.type !== "remote-candidate") return "unknown";
        const iceCandidate = candidate as RTCStats & {
          candidateType?: string;
          protocol?: string;
          address?: string;
          ip?: string;
          port?: number;
        };
        const parts = [
          iceCandidate.candidateType,
          iceCandidate.protocol,
          iceCandidate.address ?? iceCandidate.ip ?? "",
          iceCandidate.port ? `:${iceCandidate.port}` : "",
        ].filter(Boolean);
        return parts.join(" ");
      };

      log(
        `ICE selected pair: ${describe(local)} -> ${describe(remote)} (${pair.state}, ${Math.round(pair.currentRoundTripTime ?? 0)}ms rtt)`,
      );
    } catch (error) {
      log(`ICE stats error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function getIceServers() {
    try {
      return parseIceServers(iceServersText);
    } catch {
      log("Invalid ICE server config. Falling back to direct host candidates.");
      return DEFAULT_ICE_SERVERS;
    }
  }

  function parseXmppInviteUri(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return null;
    }

    if (parsed.protocol !== "xmpp:") return null;

    const target = parsed.pathname.trim();
    if (!target) return null;

    const flags = new Set<string>();
    const params = new Map<string, string>();
    const search = parsed.search.replace(/^\?/, "");
    for (const segment of search.split(/[&;]/)) {
      if (!segment) continue;
      const [rawKey, ...rawValue] = segment.split("=");
      const key = decodeURIComponent(rawKey).replace(/^;+/, "").trim();
      if (!key) continue;
      const value = rawValue.length ? decodeURIComponent(rawValue.join("=")).trim() : "";
      if (value) params.set(key, value);
      else flags.add(key);
    }

    return { target, params, flags };
  }

  function applyXmppInviteUri() {
    const invite = parseXmppInviteUri(xmppInviteUri);
    if (!invite) {
      log("Paste a valid xmpp: invite URI first.");
      return;
    }

    const node = invite.params.get("node");
    const roomJid = invite.params.get("jid") ?? invite.target;
    if (node) {
      setXmppSpaceServiceJid(roomJid);
      setXmppSpaceNode(node);
      setXmppRoomJid("");
      setXmppWebSocketUrl((current) => current.trim() || deriveXmppWebSocketUrl(roomJid));
      log(`Invite node applied for ${roomJid} / ${node}.`);
    } else {
      setXmppRoomJid(roomJid);
      setXmppSpaceServiceJid("");
      setXmppSpaceNode("");
      setXmppWebSocketUrl((current) => current.trim() || deriveXmppWebSocketUrl(roomJid));
      log(`Invite applied for ${roomJid}.`);
    }
  }

  function saveSettings() {
    try {
      parseIceServers(iceServersText);
      const websocketUrl = xmppWebSocketUrl.trim();
      const jid = xmppJid.trim();
      const password = xmppPassword.trim();
      const room = xmppRoomJid.trim();
      const spaceServiceJid = xmppSpaceServiceJid.trim();
      const spaceNode = xmppSpaceNode.trim();
      const nextXmppConnectionSettings = normalizeXmppConnectionSettings(
        {
          websocketUrl,
          jid,
          password,
          roomJid: room,
          spaceServiceJid,
          spaceNode,
          nick: xmppNick,
        },
        name,
      );
      if (websocketUrl) {
        const parsed = new URL(websocketUrl);
        if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
          throw new Error("XMPP WebSocket URL must use ws or wss.");
        }
        nextXmppConnectionSettings.websocketUrl = parsed.toString().replace(/\/+$/, "");
        setXmppWebSocketUrl(nextXmppConnectionSettings.websocketUrl);
      }
      const hasRoom = Boolean(room);
      const hasSpace = Boolean(spaceServiceJid || spaceNode);
      if (hasRoom && hasSpace) {
        throw new Error("Use either a room JID or a space invite, not both.");
      }
      if (hasSpace && (!spaceServiceJid || !spaceNode)) {
        throw new Error("Fill both the space service JID and node, or clear both.");
      }
      setXmppConnectionSettings(nextXmppConnectionSettings);
      setModal(null);
      log("Settings saved.");
      void shareProfile();
      return true;
    } catch (error) {
      log(error instanceof Error ? error.message : "Invalid settings.");
      return false;
    }
  }

  function connectXmpp() {
    if (!xmppJid.trim() || !xmppPassword.trim()) {
      openXmppAccountModal();
      log("Create an XMPP account to connect, then try again.");
      return;
    }
    if (!saveSettings()) return;
    log("XMPP connect requested.");
    setXmppConnectNonce((current) => current + 1);
  }

  function resetSettings() {
    xmppClientRef.current?.disconnect();
    xmppClientRef.current = null;
    xmppRoomRef.current = null;
    xmppSpaceRef.current = null;
    setServers([...DEFAULT_SERVERS]);
    setServerSubtitles({});
    setActiveServer(DEFAULT_SERVERS[0]);
    setActiveChannelsByServer({ [DEFAULT_SERVERS[0]]: DEFAULT_CHANNELS[0].id });
    setActiveChannel(DEFAULT_CHANNELS[0].id);
    setNewServerName("");
    setNewServerSubtitle("");
    setXmppWebSocketUrl("");
    setXmppJid("");
    setXmppPassword("");
    setXmppRoomJid("");
    setXmppSpaceServiceJid("");
    setXmppSpaceNode("");
    setXmppNick("");
    setXmppAccountUsername("");
    setXmppAccountDomain("doge-cube.local");
    setXmppAccountPassword("");
    setXmppConnectionSettings(
      normalizeXmppConnectionSettings(
        {
          websocketUrl: "",
          jid: "",
          password: "",
          roomJid: "",
          spaceServiceJid: "",
          spaceNode: "",
          nick: "",
        },
        DEFAULT_NAME,
      ),
    );
    setXmppStatus("disabled");
    setChannels(DEFAULT_CHANNELS);
    setVoiceRooms(DEFAULT_VOICE_ROOMS);
    setChannelChildren({});
    setNewChannelName("");
    setNewSubchannelName("");
    setChannelCreateKind("text");
    setEditingVoiceRoom(null);
    setDeletingVoiceRoom(null);
    setName(DEFAULT_NAME);
    setPresence(DEFAULT_PRESENCE);
    setAccentColor("#7c8cff");
    setAppTheme("midnight");
    setStatusMessage("");
    setWebsite("");
    setLocation("");
    setHeadline("");
    setTimezone("");
    setBirthday("");
    setAvatarUrl("");
    setAvatarFrameUrl("");
    setBannerUrl("");
    setAvatarAnimated(false);
    setIceServersText(formatIceServers(DEFAULT_ICE_SERVERS));
    setMembersOpen(true);
    setNotificationsMuted(false);
    setActiveVoiceRoom(null);
    setRecentEmojis(defaultRecentEmojis);
    setDraftByChannel({});
    setEditDraftByMessage({});
    setReplyTargetByChannel({});
    setSearchQuery("");
    setSearchIndex(0);
    setRoomPeerFingerprint("");
    setUnreadByChannel({});
    setGifFavorites([]);
    setEvents(["Ready for XMPP federation."]);
    setGifTab("all");
    setGifQuery("");
    setPendingGif(null);
    setPendingGifPaneIndex(null);
    setComposerTargetPaneIndex(null);
    setPendingGifChannel(DEFAULT_CHANNELS[0].id);
    setComposerTargetChannel(DEFAULT_CHANNELS[0].id);
    setPendingAttachment(null);
    setPendingAttachmentChannel(DEFAULT_CHANNELS[0].id);
    setPendingAttachmentPaneIndex(null);
    setMainTab("chat");
    setChatPaneMode("single");
    setChatPaneChannels(DEFAULT_CHANNELS.slice(0, DEFAULT_CHAT_PANE_COUNT).map((channel) => channel.id));
    setChatPaneDrafts(Array.from({ length: DEFAULT_CHAT_PANE_COUNT }, () => ""));
    setChatPaneReplyTargets(Array.from({ length: DEFAULT_CHAT_PANE_COUNT }, () => null));
    setChatPaneCompactSections(Array.from({ length: DEFAULT_CHAT_PANE_COUNT }, () => false));
    setModal(null);
    setPeerTypingChannel(null);
    log("Workspace settings reset to defaults.");
    void sendProfileSync({
      name: DEFAULT_NAME,
      presence: DEFAULT_PRESENCE,
      about: "",
      pronouns: "",
      pronunciation: "",
      hobbies: "",
      languages: "",
      company: "",
      school: "",
      major: "",
      accentColor: "#7c8cff",
      statusMessage: "",
      website: "",
      location: "",
      headline: "",
      timezone: "",
      birthday: "",
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

  async function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result)));
      reader.addEventListener("error", () => reject(reader.error));
      reader.readAsDataURL(file);
    });
  }

  async function uploadProfileArt(file: File, apply: (dataUrl: string) => void, label: string) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      apply(dataUrl);
      log(`${label} uploaded: ${file.name}.`);
    } catch {
      log(`Could not read ${label.toLowerCase()} file.`);
    }
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
    const key = await deriveKey(passphrase);
    const encrypted = await encryptPayload(key, plain);

    if (xmppStatus === "connected" && (await sendXmppEncryptedPayload(encrypted, plain))) {
      processedWireIdsRef.current.add(plain.id);
      return true;
    }

    const channel = channelRef.current;
    if (channel?.readyState !== "open") {
      log("Saved locally. Connect XMPP or a peer channel to deliver it live.");
      return false;
    }

    await waitForDataChannelBuffer(channel);
    channel.send(JSON.stringify(encrypted));
    processedWireIdsRef.current.add(plain.id);
    return true;
  }

  async function handleEncryptedWireText(raw: string) {
    try {
      const wire = JSON.parse(raw) as WireMessage;
      if (processedWireIdsRef.current.has(wire.id) || messagesRef.current.some((message) => message.id === wire.id)) {
        processedWireIdsRef.current.add(wire.id);
        return;
      }

      const key = await deriveKey(passphrase);
      const plain = await decryptPayload(key, wire);
      processedWireIdsRef.current.add(wire.id);
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
        log(plain.room ? `${plain.author} joined voice channel: ${plain.room}.` : `${plain.author} left voice channel.`);
        return;
      }

      if (plain.type === "profile-sync") {
        setPeerName(plain.name);
        setPeerPresence(plain.presence);
        setPeerAbout(plain.about ?? "");
        setPeerPronouns(plain.pronouns ?? "");
        setPeerPronunciation(plain.pronunciation ?? "");
        setPeerHobbies(plain.hobbies ?? "");
        setPeerLanguages(plain.languages ?? "");
        setPeerCompany(plain.company ?? "");
        setPeerSchool(plain.school ?? "");
        setPeerMajor(plain.major ?? "");
        setPeerAccentColor(plain.accentColor ?? "#7c8cff");
        setPeerStatusMessage(plain.statusMessage ?? "");
        setPeerWebsite(plain.website ?? "");
        setPeerLocation(plain.location ?? "");
        setPeerHeadline(plain.headline ?? "");
        setPeerTimezone(plain.timezone ?? "");
        setPeerBirthday(plain.birthday ?? "");
        setPeerNotificationsMuted(plain.notificationsMuted ?? false);
        setPeerMembersOpen(plain.membersOpen ?? true);
        setPeerActiveServer(plain.activeServer ?? "unknown");
        setPeerActiveChannel(plain.activeChannel ?? "unknown");
        setPeerAvatarUrl(plain.avatarUrl ?? "");
        setPeerAvatarFrameUrl(plain.avatarFrameUrl ?? "");
        setPeerBannerUrl(plain.bannerUrl ?? "");
        setPeerAvatarAnimated(plain.avatarAnimated ?? false);
        log(`Peer profile updated: ${plain.name}.`);
        return;
      }

      if (plain.type === "media-sync") {
        setPeerCallActive(plain.callActive);
        setPeerScreenSharing(plain.screenSharing);
        setPeerMicMuted(plain.micMuted);
        setPeerCameraActive(plain.cameraActive);
        log(
          `Peer media updated: ${plain.callActive ? "call on" : "call off"}, ${
            plain.screenSharing ? "screen share on" : "screen share off"
          }, ${plain.cameraActive ? "camera on" : "camera off"}.`,
        );
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

      setMessages((current) =>
        appendMessageIfUnique(current, {
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
        }),
      );
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
  }

  function addLocalTracksToPeer() {
    const pc = pcRef.current;
    if (!pc) return;
    const activeTracks = [micStreamRef.current, cameraStreamRef.current, screenStreamRef.current].flatMap(
      (stream) => stream?.getTracks() ?? [],
    );
    const activeTrackIds = new Set(activeTracks.map((track) => track.id));

    pc.getSenders().forEach((sender) => {
      if (sender.track && !activeTrackIds.has(sender.track.id)) pc.removeTrack(sender);
    });

    const existingTrackIds = new Set(pc.getSenders().map((sender) => sender.track?.id).filter(Boolean));

    activeTracks.forEach((track) => {
      const stream =
        track.kind === "audio"
          ? micStreamRef.current
          : cameraStreamRef.current?.getVideoTracks().some((videoTrack) => videoTrack.id === track.id)
            ? cameraStreamRef.current
            : screenStreamRef.current;
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
    setMessages((current) =>
      appendMessageIfUnique(current, {
        id: note.id,
        author: note.subject,
        body: note.body,
        channel: note.channel,
        at: note.at,
        encrypted: true,
        note: true,
      }),
    );
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
      setChatPaneChannels((currentChannels) =>
        currentChannels.map((paneChannelId) => (paneChannelId === sync.channelId ? sync.nextChannelId! : paneChannelId)),
      );
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
          setChatPaneChannels((currentChannels) =>
            currentChannels.map((paneChannelId) => (paneChannelId === sync.channelId ? fallback.id : paneChannelId)),
          );
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

  async function loadAttachmentFile(file: File, fallbackName?: string) {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result)));
      reader.addEventListener("error", () => reject(reader.error));
      reader.readAsDataURL(file);
    });

    setPendingAttachment({
      fileName: file.name || fallbackName || "clipboard-image.png",
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      dataUrl: data,
    });
    log(`${fallbackName ? "Pasted" : "Selected"} attachment: ${file.name || fallbackName || "attachment"}.`);
  }

  async function loadSelectedAttachment(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    await loadAttachmentFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function sendPreparedAttachment(
    nextAttachment: { fileName: string; mimeType: string; size: number; dataUrl: string },
    targetChannel: string,
  ) {
    if (isAttachmentTooLarge(nextAttachment.size)) {
      log(`Attachment rejected: ${nextAttachment.fileName} is too large (${formatBytes(nextAttachment.size)}; max ${formatBytes(MAX_ATTACHMENT_BYTES)}).`);
      return false;
    }

    const at = Date.now();
    const id = crypto.randomUUID();
    const attachment = {
      ...makeAttachment(nextAttachment.fileName, nextAttachment.mimeType, nextAttachment.size, nextAttachment.dataUrl),
    };

    setMessages((current) =>
      appendMessageIfUnique(current, {
        id,
        author: name || "Anonymous",
        body: "",
        channel: targetChannel,
        at,
        local: true,
        encrypted: true,
        attachment,
      }),
    );

    log(`Attachment queued: ${nextAttachment.fileName}.`);

    return await sendAttachmentPayload({
      type: "attachment",
      id,
      author: name || "Anonymous",
      channel: targetChannel,
      at,
      fileName: nextAttachment.fileName,
      mimeType: nextAttachment.mimeType,
      size: nextAttachment.size,
      data: nextAttachment.dataUrl,
    });
  }

  async function handleComposerPaste(
    event: React.ClipboardEvent<HTMLTextAreaElement>,
    channelId: string,
    paneIndex: number | null,
  ) {
    const clipboardFile =
      Array.from(event.clipboardData.files).find((file) => file.type.startsWith("image/")) ??
      Array.from(event.clipboardData.items)
        .map((item) => item.getAsFile())
        .find((file): file is File => Boolean(file && file.type.startsWith("image/")));

    if (!clipboardFile) return;

    event.preventDefault();
    setComposerTargetChannel(channelId);
    setComposerTargetPaneIndex(paneIndex);
    setPendingAttachmentChannel(channelId);
    setPendingAttachmentPaneIndex(paneIndex);
    await loadAttachmentFile(clipboardFile, "clipboard-image.png");
    setModal("attachment");
  }

  async function sendPendingAttachment() {
    if (!pendingAttachment) return;
    const targetChannel = pendingAttachmentChannel || activeChannel;
    setModal(null);
    const nextAttachment = pendingAttachment;
    setPendingAttachment(null);
    await sendPreparedAttachment(nextAttachment, targetChannel);
    setPendingAttachmentChannel(activeChannel);
    setPendingAttachmentPaneIndex(null);
  }

  async function startVoiceRecording(channelId: string, paneIndex: number | null) {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      log("Voice recording is unavailable in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = chooseVoiceMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      voiceRecordingStreamRef.current = stream;
      voiceRecorderRef.current = recorder;
      voiceRecordingChunksRef.current = [];
      setVoiceRecording({ channelId, paneIndex });
      log(`Recording voice message for #${getChannelLabel(channelId)}.`);

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) voiceRecordingChunksRef.current.push(event.data);
      });

      recorder.addEventListener(
        "stop",
        () => {
          const chunks = [...voiceRecordingChunksRef.current];
          const outputType = recorder.mimeType || mimeType || "audio/webm";
          const fileName = formatVoiceAttachmentName(Date.now(), outputType);
          const targetChannelId = activeChannelRef.current;
          voiceRecorderRef.current = null;
          voiceRecordingChunksRef.current = [];
          voiceRecordingStreamRef.current?.getTracks().forEach((track) => track.stop());
          voiceRecordingStreamRef.current = null;
          setVoiceRecording(null);

          void (async () => {
            if (chunks.length === 0) {
              log("Voice recording discarded.");
              return;
            }

            const blob = new Blob(chunks, { type: outputType });
            const dataUrl = await blobToDataUrl(blob);
            await sendPreparedAttachment(
              {
                fileName,
                mimeType: outputType,
                size: blob.size,
                dataUrl,
              },
              targetChannelId,
            );
          })().catch(() => {
            log("Could not prepare voice message.");
          });
        },
        { once: true },
      );

      recorder.start();
    } catch {
      log("Microphone permission denied or unavailable.");
    }
  }

  function stopVoiceRecording() {
    const recorder = voiceRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  }

  async function toggleVoiceRecording(channelId: string, paneIndex: number | null) {
    if (voiceRecording) {
      if (voiceRecording.channelId === channelId && voiceRecording.paneIndex === paneIndex) {
        stopVoiceRecording();
        return;
      }
      log("Finish the current voice recording first.");
      return;
    }

    await startVoiceRecording(channelId, paneIndex);
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
    setMessages((current) =>
      appendMessageIfUnique(current, {
        id: attachment.id,
        author: attachment.author,
        body: "",
        channel: attachment.channel,
        at: attachment.at,
        encrypted: true,
        attachment: {
          ...makeAttachment(attachment.fileName, attachment.mimeType, attachment.size, attachment.data),
        },
      }),
    );
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
      if (["closed", "disconnected", "failed"].includes(pc.connectionState)) {
        setStatus("closed");
        void logSelectedCandidatePair(pc);
      }
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        log(`ICE candidate: ${event.candidate.candidate}`);
        return;
      }
      if (!pc.localDescription) return;
      if (pc.iceGatheringState !== "complete") return;
      log("ICE gathering complete.");
    };
    pc.onicegatheringstatechange = () => {
      log(`ICE gathering state: ${pc.iceGatheringState}`);
    };
    pc.oniceconnectionstatechange = () => {
      log(`ICE connection state: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed" || pc.iceConnectionState === "failed") {
        void logSelectedCandidatePair(pc);
      }
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
    channel.onmessage = (event) => {
      void handleEncryptedWireText(event.data);
    };
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    await submitMessage();
  }

  async function submitMessageForChannel(
    channelId: string,
    bodyText: string,
    options: { includePendingGif?: boolean; targetPaneIndex?: number | null } = {},
  ) {
    const replyToMessageId = getReplyTarget(replyTargetByChannel, channelId);
    const replyToMessage = replyToMessageId ? messages.find((message) => message.id === replyToMessageId) ?? null : null;
    const includeGif =
      options.includePendingGif &&
      pendingGif &&
      pendingGifChannel === channelId &&
      pendingGifPaneIndex === (options.targetPaneIndex ?? null);
    const body = [bodyText.trim(), includeGif ? pendingGif?.url : null].filter(Boolean).join(" ");
    if (!body) return;
    const base: PlainWireMessage = {
      type: "message" as const,
      kind: "chat",
      id: crypto.randomUUID(),
      author: name || "Anonymous",
      channel: channelId,
      at: Date.now(),
      body,
      replyToId: replyToMessage?.id,
      replyToAuthor: replyToMessage?.author,
      replyToBody: replyToMessage?.body,
    };

    setMessages((current) =>
      appendMessageIfUnique(current, {
        id: base.id,
        author: base.author,
        body,
        channel: channelId,
        at: base.at,
        local: true,
        encrypted: true,
        replyToId: base.replyToId,
        replyToAuthor: base.replyToAuthor,
        replyToBody: base.replyToBody,
      }),
    );
    if (options.targetPaneIndex !== null && options.targetPaneIndex !== undefined) {
      setChatPaneDrafts((current) => current.map((draft, currentIndex) => (currentIndex === options.targetPaneIndex ? "" : draft)));
      setChatPaneReplyTargets((current) => current.map((target, currentIndex) => (currentIndex === options.targetPaneIndex ? null : target)));
    } else {
      setDraftByChannel((current) => clearChannelDraft(current, channelId));
      setReplyTargetByChannel((current) => clearReplyTarget(current, channelId));
    }
    if (includeGif) {
      setPendingGif(null);
      setPendingGifChannel(channelId);
      setPendingGifPaneIndex(null);
    }
    if (channelId === activeChannel) setFollowLatest(true);
    void sendTypingSync(false, channelId);

    await sendEncryptedPayload(base);
  }

  async function submitMessage() {
    if (draftSyncTimerRef.current !== null) {
      window.clearTimeout(draftSyncTimerRef.current);
      draftSyncTimerRef.current = null;
    }
    await submitMessageForChannel(activeChannel, draftRef.current, { includePendingGif: true, targetPaneIndex: null });
    draftRef.current = "";
    if (composerInputRef.current) {
      composerInputRef.current.value = "";
      composerInputRef.current.style.height = "auto";
    }
  }

  function insertComposerText(value: string) {
    const targetChannel = composerTargetChannel || activeChannel;
    const targetPaneIndex = composerTargetPaneIndex;
    const currentDraft =
      targetPaneIndex === null
        ? targetChannel === activeChannel
          ? draftRef.current
          : getChannelDraft(draftByChannel, targetChannel)
        : chatPaneDrafts[targetPaneIndex] ?? "";
    const input = targetPaneIndex === null ? composerInputRef.current : paneComposerInputRefs.current[`pane-${targetPaneIndex}`] ?? null;
    const start = input?.selectionStart ?? currentDraft.length;
    const end = input?.selectionEnd ?? currentDraft.length;
    const nextDraft = `${currentDraft.slice(0, start)}${value}${currentDraft.slice(end)}`;
    const nextCursor = start + value.length;

    if (targetPaneIndex === null) {
      if (draftSyncTimerRef.current !== null) {
        window.clearTimeout(draftSyncTimerRef.current);
        draftSyncTimerRef.current = null;
      }
      if (targetChannel === activeChannel && composerInputRef.current) {
        draftRef.current = nextDraft;
        composerInputRef.current.value = nextDraft;
      }
      setDraftByChannel((current) => setChannelDraft(current, targetChannel, nextDraft));
    } else {
      setChatPaneDrafts((current) => current.map((draft, currentIndex) => (currentIndex === targetPaneIndex ? nextDraft : draft)));
    }
    return { nextCursor, targetChannel, targetPaneIndex };
  }

  function insertEmoji(emoji: string) {
    const { nextCursor, targetChannel, targetPaneIndex } = insertComposerText(emoji);

    setRecentEmojis((current) => updateRecentEmojis(current, emoji));
    setEmojiOpen(false);
    setGifOpen(false);
    setGifQuery("");
    setGifTab("all");
    requestAnimationFrame(() => {
      if (targetPaneIndex === null && targetChannel === activeChannel) {
        composerInputRef.current?.focus();
        composerInputRef.current?.setSelectionRange(nextCursor, nextCursor);
        return;
      }
      if (targetPaneIndex !== null) {
        const paneInput = paneComposerInputRefs.current[`pane-${targetPaneIndex}`];
        paneInput?.focus();
        paneInput?.setSelectionRange(nextCursor, nextCursor);
      }
    });
  }

  function insertGif(gif: { url: string; label: string; source: string }) {
    setPendingGif(gif);
    setPendingGifChannel(composerTargetChannel || activeChannel);
    setPendingGifPaneIndex(composerTargetPaneIndex);
    setEmojiOpen(false);
    setGifOpen(false);
    setGifQuery("");
    setGifTab("all");
    requestAnimationFrame(() => {
      if (composerTargetPaneIndex === null && (composerTargetChannel || activeChannel) === activeChannel) {
        composerInputRef.current?.focus();
        return;
      }
      if (composerTargetPaneIndex !== null) {
        paneComposerInputRefs.current[`pane-${composerTargetPaneIndex}`]?.focus();
      }
    });
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
                  (() => {
                    const normalizedInstagramHref = normalizeInstagramUrl(token.href);
                    const normalizedTenorHref = normalizeTenorUrl(token.href);
                    const normalizedHref = normalizedInstagramHref ?? normalizedTenorHref ?? rewriteTweetUrlToFxTwitter(token.href);
                    const normalizedLabel =
                      normalizeInstagramUrl(token.label) ??
                      normalizeTenorUrl(token.label) ??
                      rewriteTweetUrlToFxTwitter(token.label);

                    return [
                      <a
                        key={`${paragraphPrefix}-a-${paragraphIndex}-${lineIndex}-${tokenIndex}-${token.href}`}
                        href={normalizedHref}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {normalizedLabel}
                      </a>,
                    ];
                  })()
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

  function renderMessageContent(message: ChatMessage, keyPrefix: string, mediaBaseUrl: string) {
    const imageUrls = extractImageUrls(message.body);
    const videoUrls = extractVideoUrls(message.body);
    const audioUrls = extractAudioUrls(message.body);
    const youtubeUrls = extractYouTubeUrls(message.body);
    const instagramUrls = extractInstagramUrls(message.body);
    const tenorUrls = extractTenorUrls(message.body);
    const tweetUrls = extractTweetUrls(message.body);
    const mediaOnly =
      hasOnlyLinkTokens(message.body) &&
      (imageUrls.length > 0 ||
        videoUrls.length > 0 ||
        audioUrls.length > 0 ||
        youtubeUrls.length > 0 ||
        instagramUrls.length > 0 ||
        tenorUrls.length > 0 ||
        tweetUrls.length > 0);

    return (
      <>
        {message.body && !mediaOnly && <>{renderBodyText(message.body, keyPrefix)}</>}
        {imageUrls.map((url) => (
          <a
            className="imageEmbed"
            key={url}
            href={isLocalMediaUrl(mediaBaseUrl, url) ? url : buildTweetMediaProxyUrl(mediaBaseUrl, { src: url })}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              event.preventDefault();
              setLightboxImage({
                url: isLocalMediaUrl(mediaBaseUrl, url) ? url : buildTweetMediaProxyUrl(mediaBaseUrl, { src: url }),
                alt: url,
              });
            }}
          >
            <img src={isLocalMediaUrl(mediaBaseUrl, url) ? url : buildTweetMediaProxyUrl(mediaBaseUrl, { src: url })} alt={url} />
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
              allow="fullscreen"
              allowFullScreen
              loading="lazy"
            />
          );
        })}
        {instagramUrls.map((url) => (
          <InstagramEmbed key={url} url={url} />
        ))}
        {tenorUrls.map((url) => (
          <TenorEmbed key={url} url={url} />
        ))}
        {tweetUrls.map((url) => (
          <TweetEmbed key={url} url={url} onOpenImage={(url, alt) => setLightboxImage({ url, alt })} />
        ))}
        {message.attachment &&
          (isImageMimeType(message.attachment.mimeType) ? (
            <a
              className="imageEmbed attachmentImage"
              href={message.attachment.objectUrl}
              download={message.attachment.fileName}
              onClick={(event) => {
                if (!message.attachment?.objectUrl) event.preventDefault();
                event.preventDefault();
                if (message.attachment?.objectUrl) {
                  setLightboxImage({ url: message.attachment.objectUrl, alt: message.attachment.fileName });
                }
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
      </>
    );
  }

  const pendingAttachmentTooLarge = Boolean(pendingAttachment && isAttachmentTooLarge(pendingAttachment.size));

  function renderChatWindowPane(channelId: string, paneIndex: number, paneCount: number) {
    const paneRefKey = `pane-${paneIndex}`;
    const paneLabel = getChannelLabel(channelId);
    const paneMessages = messages.filter((message) => message.channel === channelId);
    const searchTerm = searchQuery.trim().toLowerCase();
    const paneVisibleMessages = searchTerm
      ? paneMessages.filter((message) =>
          `${message.author}\n${message.body}`.toLowerCase().includes(searchTerm),
        )
      : paneMessages;
    const paneUnreadCount = getUnreadCountForChannel(unreadByChannel, channelId);
    const paneDraft = chatPaneDrafts[paneIndex] ?? "";
    const replyToMessageId = chatPaneReplyTargets[paneIndex] ?? null;
    const paneReplyToMessage = messages.find((message) => message.id === replyToMessageId) ?? null;
    const paneCompact = splitViewportCompact || (chatPaneCompactSections[paneIndex] ?? false);

    async function submitPaneMessage() {
      await submitMessageForChannel(channelId, paneDraft, { includePendingGif: true, targetPaneIndex: paneIndex });
      requestAnimationFrame(() => {
        const list = paneMessageListRefs.current[paneRefKey];
        if (!list) return;
        list.scrollTop = list.scrollHeight;
      });
    }

    function clearPaneComposer() {
      if (!paneDraft && !paneReplyToMessage && !(pendingGif && pendingGifChannel === channelId && pendingGifPaneIndex === paneIndex)) {
        return;
      }

      setChatPaneDrafts((current) => current.map((draft, currentIndex) => (currentIndex === paneIndex ? "" : draft)));
      setChatPaneReplyTargets((current) => current.map((target, currentIndex) => (currentIndex === paneIndex ? null : target)));
      if (pendingGif && pendingGifChannel === channelId && pendingGifPaneIndex === paneIndex) {
        setPendingGif(null);
        setPendingGifChannel(channelId);
        setPendingGifPaneIndex(null);
      }
      void sendTypingSync(false, channelId);
      requestAnimationFrame(() => paneComposerInputRefs.current[paneRefKey]?.focus());
    }

    return (
      <section className="panelSection chatWindow" key={channelId}>
        <div className="chatWindowHeader">
          <div className="chatWindowTitle">
            <strong>#{paneLabel}</strong>
            <small className="paneUnreadBadge">{paneCompact ? "compact" : paneUnreadCount > 0 ? `${paneUnreadCount} unread` : "expanded"}</small>
          </div>
          <div className="chatWindowActions">
            <button
              type="button"
              className="secondaryButton compact"
              onClick={() => focusChatPaneChannel(channelId)}
              aria-label={`Focus #${paneLabel}`}
              title="Focus channel"
            >
              <ExternalLink size={13} />
            </button>
            <button
              type="button"
              className="secondaryButton compact"
              onClick={() => spotlightChatPane(paneIndex, channelId)}
              aria-label={`Spotlight #${paneLabel}`}
              title="Spotlight pane"
            >
              <Pin size={13} />
            </button>
            <button
              type="button"
              className={`secondaryButton compact ${callActive ? "active" : ""}`}
              onClick={toggleCall}
              aria-label={callActive ? `End voice for #${paneLabel}` : `Start voice for #${paneLabel}`}
              title={callActive ? "End voice" : "Start voice"}
            >
              <PhoneCall size={13} />
            </button>
            <button
              type="button"
              className={`secondaryButton compact ${screenSharing ? "active" : ""}`}
              onClick={toggleScreenShare}
              aria-label={screenSharing ? `Stop screen share for #${paneLabel}` : `Start screen share for #${paneLabel}`}
              title={screenSharing ? "Stop screen share" : "Start screen share"}
            >
              <ScreenShare size={13} />
            </button>
            {paneUnreadCount > 0 && (
              <button
                type="button"
                className="secondaryButton compact"
                onClick={() => markChatPaneRead(channelId)}
                aria-label={`Mark #${paneLabel} as read`}
                title="Mark read"
              >
                <CheckCheck size={13} />
              </button>
            )}
            <button
              type="button"
              className="secondaryButton compact"
              onClick={() => jumpPaneToLatest(paneIndex)}
              aria-label={`Jump #${paneLabel} to latest`}
              title="Jump to latest"
            >
              <ChevronDown size={13} />
            </button>
            <label className="chatPaneChannelSelect">
              <select value={channelId} onChange={(event) => updateChatPaneChannel(paneIndex, event.target.value)}>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="secondaryButton compact"
              onClick={() => togglePaneCompactSections(paneIndex)}
              aria-label={paneCompact ? `Expand #${paneLabel} pane` : `Compact #${paneLabel} pane`}
              title={paneCompact ? "Expand pane" : "Compact pane"}
            >
              <Columns3 size={13} />
            </button>
            <button
              type="button"
              className="secondaryButton compact"
              onClick={() => moveChatPane(paneIndex, -1)}
              disabled={paneIndex === 0}
              aria-label={`Move pane ${paneIndex + 1} up`}
            >
              <ChevronUp size={13} />
            </button>
            <button
              type="button"
              className="secondaryButton compact"
              onClick={() => moveChatPane(paneIndex, 1)}
              disabled={paneIndex === paneCount - 1}
              aria-label={`Move pane ${paneIndex + 1} down`}
            >
              <ChevronDown size={13} />
            </button>
            <button
              type="button"
              className="secondaryButton compact"
              onClick={() => duplicateChatPane(paneIndex)}
              disabled={paneCount >= MAX_CHAT_PANES}
              aria-label={`Duplicate pane ${paneIndex + 1}`}
              title="Duplicate pane"
            >
              <Copy size={13} />
            </button>
            {paneCount > 1 && (
              <button
                type="button"
                className="secondaryButton compact"
                onClick={() => removeChatPane(paneIndex)}
                aria-label={`Remove pane ${paneIndex + 1}`}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        <div
          className="paneMessageList chatWindowMessages"
          ref={(node) => {
            paneMessageListRefs.current[paneRefKey] = node;
          }}
        >
          {!paneCompact && (
            <div className="paneProfileSummary">
            <div className="paneProfileSummaryBanner">
              {bannerUrl ? <img src={bannerUrl} alt="" /> : null}
            </div>
            <div className="paneProfileSummaryRow">
              <div className={`profileAvatarWrap ${avatarAnimated ? "animated" : ""}`}>
                {avatarUrl ? (
                  <img className="profileAvatar" src={avatarUrl} alt={name || "Profile avatar"} />
                ) : (
                  <div className="profileAvatar profileAvatarFallback" aria-hidden="true">
                    {getAvatarFallback(name || "Anonymous", name || "Anonymous")}
                  </div>
                )}
                {avatarFrameUrl && <img className="profileAvatarFrame" src={avatarFrameUrl} alt="" aria-hidden="true" />}
              </div>
              <div className="paneProfileSummaryMeta">
                <strong>{name || "Anonymous"}</strong>
                <span>{presence}</span>
                <span>{activeVoiceRoom ? `Voice channel: ${activeVoiceRoom}` : "No voice channel"}</span>
              </div>
              <div className="paneProfileSummaryPeer">
                <div className={`profileAvatarWrap ${peerAvatarAnimated ? "animated" : ""}`}>
                  {peerAvatarUrl ? (
                    <img className="profileAvatar" src={peerAvatarUrl} alt={peerName} />
                  ) : (
                    <div className="profileAvatar profileAvatarFallback" aria-hidden="true">
                      {getAvatarFallback(peerName, peerName)}
                    </div>
                  )}
                  {peerAvatarFrameUrl && <img className="profileAvatarFrame" src={peerAvatarFrameUrl} alt="" aria-hidden="true" />}
                </div>
                <div className="paneProfileSummaryMeta">
                  <strong>{peerName}</strong>
                  <span>{peerPresence}</span>
                  <span>{peerBannerUrl ? "Peer banner shared" : "Peer banner none"}</span>
                </div>
              </div>
            </div>
            </div>
          )}
          {!paneCompact && (
            <div className="paneMediaStrip">
              <div className="paneMediaStripHeader">
                <PhoneCall size={13} />
                <span>Media</span>
              </div>
              <div className="paneAudioMeters">
                <div className="paneAudioMeter">
                  <span>Mic</span>
                  <div className="paneAudioMeterBar">
                    <div className="paneAudioMeterFill" style={{ width: `${callActive ? localAudioLevel : 0}%` }} />
                  </div>
                </div>
              </div>
              <div className="paneMediaStripActions">
                <button
                  type="button"
                  className={`secondaryButton compact mediaIconButton ${micMuted ? "active" : ""}`}
                  onClick={toggleMic}
                  aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
                  title={micMuted ? "Unmute microphone" : "Mute microphone"}
                  aria-pressed={micMuted}
                >
                  {micMuted ? <MicOff size={13} /> : <Mic size={13} />}
                </button>
                <button
                  type="button"
                  className={`secondaryButton compact mediaIconButton ${callActive ? "active" : ""}`}
                  onClick={toggleCall}
                  aria-label={callActive ? "End voice call" : "Start voice call"}
                  title={callActive ? "End voice call" : "Start voice call"}
                  aria-pressed={callActive}
                >
                  <PhoneCall size={13} />
                </button>
                <button
                  type="button"
                  className={`secondaryButton compact mediaIconButton ${screenSharing ? "active" : ""}`}
                  onClick={toggleScreenShare}
                  aria-label={screenSharing ? "Stop screen share" : "Start screen share"}
                  title={screenSharing ? "Stop screen share" : "Start screen share"}
                  aria-pressed={screenSharing}
                >
                  <ScreenShare size={13} />
                </button>
                <button
                  type="button"
                  className={`secondaryButton compact mediaIconButton ${cameraActive ? "active" : ""}`}
                  onClick={toggleCamera}
                  aria-label={cameraActive ? "Stop camera" : "Start camera"}
                  title={cameraActive ? "Stop camera" : "Start camera"}
                  aria-pressed={cameraActive}
                >
                  {cameraActive ? <VideoOff size={13} /> : <Video size={13} />}
                </button>
              </div>
            </div>
          )}
          {(!paneCompact && (cameraActive || screenSharing || remoteVideoActive)) && (
            <div className="paneVideoPreview">
              <div className="paneVideoPreviewHeader">
                {remoteVideoActive ? <Video size={13} /> : cameraActive ? <Video size={13} /> : <ScreenShare size={13} />}
                <span>{remoteVideoActive ? (peerCameraActive ? "Peer camera" : peerScreenSharing ? "Peer screen share" : "Remote video") : cameraActive ? "Camera" : "Screen share"}</span>
              </div>
              <div className="paneVideoPreviewGrid">
                {cameraActive && (
                  <figure>
                    <video
                      ref={(node) => {
                        if (!node) return;
                        node.srcObject = cameraStreamRef.current;
                        void node.play().catch(() => undefined);
                      }}
                      autoPlay
                      muted
                      playsInline
                    />
                    <figcaption>Camera</figcaption>
                  </figure>
                )}
                {screenSharing && (
                  <figure>
                    <video
                      ref={(node) => {
                        if (!node) return;
                        node.srcObject = screenStreamRef.current;
                        void node.play().catch(() => undefined);
                      }}
                      autoPlay
                      muted
                      playsInline
                    />
                    <figcaption>Screen share</figcaption>
                  </figure>
                )}
                {remoteVideoActive && (
                  <figure>
                    <video
                      ref={(node) => {
                        paneMediaPreviewRefs.current[paneRefKey] = node;
                        if (!node) return;
                        node.srcObject = remoteStreamRef.current;
                        void node.play().catch(() => undefined);
                      }}
                      autoPlay
                      playsInline
                      muted={!remoteVideoActive}
                    />
                    <figcaption>{peerCameraActive ? "Peer camera" : peerScreenSharing ? "Peer screen share" : "Remote video"}</figcaption>
                  </figure>
                )}
              </div>
            </div>
          )}
          {paneVisibleMessages.slice(-20).map((message) => (
            <div
              key={message.id}
              className="paneMessageItem"
              role="button"
              tabIndex={0}
              onClick={() => jumpToMessage(message.id, channelId)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                jumpToMessage(message.id, channelId);
              }}
            >
              <div className="paneMessageItemMeta">
                <strong>{message.author}</strong>
                <span>{new Date(message.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <button
                  type="button"
                  className="messageAction"
                  onClick={(event) => {
                    event.stopPropagation();
                    setChatPaneReplyTargets((current) => current.map((target, currentIndex) => (currentIndex === paneIndex ? message.id : target)));
                    setComposerTargetChannel(channelId);
                    setComposerTargetPaneIndex(paneIndex);
                    requestAnimationFrame(() => paneComposerInputRefs.current[paneRefKey]?.focus());
                  }}
                  aria-label={`Reply to ${message.author}`}
                  title="Reply"
                >
                  <Reply size={13} />
                </button>
                <button
                  type="button"
                  className="messageAction"
                  onClick={(event) => toggleMessageMenu(message.id, event.currentTarget)}
                  aria-label="Message actions"
                  aria-expanded={messageMenuMessageId === message.id}
                  title="Message actions"
                >
                  <MoreHorizontal size={13} />
                </button>
              </div>
              <div className="paneMessageItemBodyRich">
                {message.body || message.attachment || hasAnyReactions(message.reactions)
                  ? renderMessageContent(message, `pane-chat-${message.id}`, window.location.origin)
                  : "Empty message"}
              </div>
            </div>
          ))}
          {paneVisibleMessages.length === 0 && <div className="emptyState compact">No messages in #{paneLabel}.</div>}
        </div>

        <form
          className="paneComposer"
          onSubmit={(event) => {
            event.preventDefault();
            void submitPaneMessage();
          }}
        >
          {paneReplyToMessage && (
            <div
              className="replyComposer compact"
              role="button"
              tabIndex={0}
              onClick={() => jumpToMessage(paneReplyToMessage.id, channelId)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                jumpToMessage(paneReplyToMessage.id, channelId);
              }}
            >
              <div>
                <span>Replying to {paneReplyToMessage.author}</span>
                <p>{paneReplyToMessage.body}</p>
              </div>
              <button
                type="button"
                className="messageAction"
                onClick={(event) => {
                  event.stopPropagation();
                  setChatPaneReplyTargets((current) => current.map((target, currentIndex) => (currentIndex === paneIndex ? null : target)));
                }}
                aria-label="Cancel reply"
              >
                <X size={13} />
              </button>
            </div>
          )}
          {pendingGif && pendingGifChannel === channelId && pendingGifPaneIndex === paneIndex && (
            <div className="gifComposerPreview" role="group" aria-label="Selected GIF preview">
              <img src={pendingGif.url} alt={pendingGif.label} />
              <div className="gifComposerPreviewMeta">
                <strong>{pendingGif.label}</strong>
                <span>{pendingGif.source}</span>
              </div>
              <button
                type="button"
                className="gifComposerPreviewClear"
                onClick={() => {
                  setPendingGif(null);
                  setPendingGifChannel(activeChannel);
                  setPendingGifPaneIndex(null);
                }}
                aria-label="Remove selected GIF"
              >
                <X size={13} />
              </button>
            </div>
          )}
          {gifOpen && composerTargetChannel === channelId && (
            <div ref={gifPickerRef} className="gifPicker panePicker" role="dialog" aria-label="GIF picker">
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
                            aria-label={gif.favorite ? `Remove ${gif.label} from favorites` : `Add ${gif.label} to favorites`}
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
          {emojiOpen && composerTargetChannel === channelId && (
            <div ref={emojiPickerRef} className="emojiPicker panePicker" role="dialog" aria-label="Emoji picker">
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
          <textarea
            ref={(node) => {
              paneComposerInputRefs.current[paneRefKey] = node;
            }}
            value={paneDraft}
            onChange={(event) =>
              setChatPaneDrafts((current) => current.map((draft, currentIndex) => (currentIndex === paneIndex ? event.target.value : draft)))
            }
            onFocus={() => {
              focusChatPaneChannel(channelId);
              setComposerTargetChannel(channelId);
              setComposerTargetPaneIndex(paneIndex);
            }}
            onPaste={(event) => {
              void handleComposerPaste(event, channelId, paneIndex);
            }}
            placeholder={`Message #${paneLabel}`}
            rows={2}
            onKeyDown={(event) => {
              if (!shouldSubmitComposerMessage(event)) return;
              event.preventDefault();
              void submitPaneMessage();
            }}
          />
          <div className="paneComposerActions">
            <button
              type="button"
              className="secondaryButton compact"
              onClick={clearPaneComposer}
              disabled={!paneDraft && !paneReplyToMessage && !(pendingGif && pendingGifChannel === channelId && pendingGifPaneIndex === paneIndex)}
            >
              <X size={13} />
              Clear
            </button>
            <button
              type="button"
              className="secondaryButton compact"
              onClick={() => {
                focusChatPaneChannel(channelId);
                setComposerTargetChannel(channelId);
                setComposerTargetPaneIndex(paneIndex);
              }}
            >
              <ExternalLink size={13} />
              Focus
            </button>
              <button
                type="button"
                className="secondaryButton compact"
                aria-label={`Add emoji to #${paneLabel}`}
                onClick={() => {
                  setComposerTargetChannel(channelId);
                  setComposerTargetPaneIndex(paneIndex);
                  setPendingGifChannel(channelId);
                  setEmojiOpen(true);
                  setGifOpen(false);
                }}
              >
              <Smile size={13} />
            </button>
              <button
                type="button"
                className="secondaryButton compact"
                aria-label={`Add GIF to #${paneLabel}`}
                onClick={() => {
                  setComposerTargetChannel(channelId);
                  setComposerTargetPaneIndex(paneIndex);
                  setPendingGifChannel(channelId);
                  setPendingGifPaneIndex(paneIndex);
                  setGifOpen(true);
                  setEmojiOpen(false);
                }}
              >
              <Film size={13} />
            </button>
            <button
              type="button"
              className={`secondaryButton compact ${
                voiceRecording?.channelId === channelId && voiceRecording?.paneIndex === paneIndex ? "active recording" : ""
              }`}
              aria-label={
                voiceRecording?.channelId === channelId && voiceRecording?.paneIndex === paneIndex
                  ? `Stop voice message recording for #${paneLabel}`
                  : `Record voice message for #${paneLabel}`
              }
              aria-pressed={voiceRecording?.channelId === channelId && voiceRecording?.paneIndex === paneIndex}
              onClick={() => {
                void toggleVoiceRecording(channelId, paneIndex);
              }}
            >
              <Mic size={13} />
            </button>
            <button
              type="button"
              className="secondaryButton compact"
              aria-label={`Attach file to #${paneLabel}`}
              onClick={() => {
                setPendingAttachmentChannel(channelId);
                setPendingAttachmentPaneIndex(paneIndex);
                setModal("attachment");
              }}
            >
              <Paperclip size={13} />
            </button>
            <button type="submit" aria-label={`Send message to #${paneLabel}`}>
              <Send size={16} />
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderSplitChatWindows() {
    const paneCount = Math.max(1, chatPaneChannels.length);
    const chatPaneGridColumns = Math.max(1, Math.ceil(Math.sqrt(paneCount)));
    const chatPaneGridRows = Math.max(1, Math.ceil(paneCount / chatPaneGridColumns));
    const chatPaneGridStyle = {
      gridTemplateColumns: splitViewportStacked
        ? "1fr"
        : `repeat(${chatPaneGridColumns}, minmax(0, 1fr))`,
      gridTemplateRows: splitViewportStacked
        ? `repeat(${paneCount}, minmax(0, 1fr))`
        : `repeat(${chatPaneGridRows}, minmax(0, 1fr))`,
    } as const;

    return (
      <div className="chatSplit chatSplitWindows">
        <div className="chatSplitToolbar">
          <strong>Chat panes</strong>
          <div className="chatSplitToolbarActions">
            <button
              type="button"
              className="chatSplitToolbarState"
              onClick={() => setAllPaneCompactSections(!(chatPaneCompactSections.every(Boolean)))}
              aria-label={chatPaneCompactSections.every(Boolean) ? "Expand all panes" : "Compact all panes"}
            >
              {splitViewportCompact
                ? "Auto compact"
                : chatPaneCompactSections.every(Boolean)
                  ? "All compact"
                  : chatPaneCompactSections.some(Boolean)
                    ? "Mixed"
                    : "All expanded"}
            </button>
            <button type="button" className="secondaryButton compact" onClick={addChatPane} disabled={chatPaneChannels.length >= MAX_CHAT_PANES}>
              <Plus size={13} />
              Add pane
            </button>
            <button type="button" className="secondaryButton compact" onClick={() => switchChatPaneMode("single")}>
              Single
            </button>
          </div>
        </div>
        <div
          className="chatSplitGrid"
          style={chatPaneGridStyle}
        >
          {chatPaneChannels.map((_, index) => {
            const channelId = chatPaneChannels[index] ?? activeChannel;

            return (
              <section className="chatWindowShell" key={`pane-${index}`}>
                {renderChatWindowPane(channelId, index, chatPaneChannels.length)}
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  function getChannelLabel(channelId: string) {
    return channels.find((channel) => channel.id === channelId)?.label ?? channelId;
  }

  function updateChatPaneChannel(index: number, nextChannelId: string) {
    setChatPaneChannels((current) => current.map((channelId, currentIndex) => (currentIndex === index ? nextChannelId : channelId)));
    paneMessageCountRef.current[`pane-${index}`] = messages.filter((message) => message.channel === nextChannelId).length;
    if (composerTargetPaneIndex === index) {
      setComposerTargetChannel(nextChannelId);
    }
    if (pendingGifPaneIndex === index) {
      setPendingGifChannel(nextChannelId);
    }
    requestAnimationFrame(() => {
      const list = paneMessageListRefs.current[`pane-${index}`];
      if (!list) return;
      list.scrollTop = list.scrollHeight;
    });
  }

  function focusChatPaneChannel(channelId: string) {
    setActiveChannel(channelId);
    setMainTab("chat");
    setFollowLatest(true);
    setUnreadByChannel((counts) => clearUnreadCount(counts, channelId));
    const readAt = messages.reduce((latest, message) => (message.channel === channelId ? Math.max(latest, message.at) : latest), 0);
    if (readAt > 0) {
      lastReadSyncRef.current[channelId] = readAt;
      void sendReadSync(channelId, readAt);
    }
  }

  function markChatPaneRead(channelId: string) {
    setUnreadByChannel((counts) => clearUnreadCount(counts, channelId));
    log(`Marked #${getChannelLabel(channelId)} as read.`);
  }

  function addChatPane() {
    const nextCompact = chatPaneChannels.length >= 2;
    setChatPaneChannels((current) => {
      if (current.length >= MAX_CHAT_PANES) return current;
      const nextChannelId = channels.find((channel) => !current.includes(channel.id))?.id ?? activeChannel;
      return [...current, nextChannelId];
    });
    setChatPaneDrafts((current) => [...current, ""]);
    setChatPaneReplyTargets((current) => [...current, null]);
    setChatPaneCompactSections((current) => [...current, nextCompact]);
    setPendingGif(null);
    setGifOpen(false);
    setEmojiOpen(false);
    setComposerTargetPaneIndex(null);
  }

  function duplicateChatPane(index: number) {
    setChatPaneChannels((current) => {
      if (current.length >= MAX_CHAT_PANES) return current;
      const channelId = current[index];
      if (!channelId) return current;
      const next = [...current];
      next.splice(index + 1, 0, channelId);
      return next.slice(0, MAX_CHAT_PANES);
    });
    setChatPaneDrafts((current) => {
      if (current.length >= MAX_CHAT_PANES) return current;
      const next = [...current];
      next.splice(index + 1, 0, current[index] ?? "");
      return next.slice(0, MAX_CHAT_PANES);
    });
    setChatPaneReplyTargets((current) => {
      if (current.length >= MAX_CHAT_PANES) return current;
      const next = [...current];
      next.splice(index + 1, 0, current[index] ?? null);
      return next.slice(0, MAX_CHAT_PANES);
    });
    setChatPaneCompactSections((current) => {
      if (current.length >= MAX_CHAT_PANES) return current;
      const next = [...current];
      next.splice(index + 1, 0, current[index] ?? false);
      return next.slice(0, MAX_CHAT_PANES);
    });
    setPendingGif(null);
    setGifOpen(false);
    setEmojiOpen(false);
    setComposerTargetPaneIndex((current) => (current === null ? null : current > index ? current + 1 : current));
    setPendingGifPaneIndex((current) => (current === null ? null : current > index ? current + 1 : current));
  }

  function moveChatPane(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    setChatPaneChannels((current) => {
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setChatPaneDrafts((current) => {
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setChatPaneReplyTargets((current) => {
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setChatPaneCompactSections((current) => {
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setPendingGif(null);
    setGifOpen(false);
    setEmojiOpen(false);
    setComposerTargetPaneIndex((current) => {
      if (current === null) return null;
      if (current === index) return nextIndex;
      if (current === nextIndex) return index;
      return current;
    });
    setPendingGifPaneIndex((current) => {
      if (current === null) return null;
      if (current === index) return nextIndex;
      if (current === nextIndex) return index;
      return current;
    });
  }

  function removeChatPane(index: number) {
    setChatPaneChannels((current) => {
      if (current.length <= 1) return current;
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
    setChatPaneDrafts((current) => {
      if (current.length <= 1) return current;
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
    setChatPaneReplyTargets((current) => {
      if (current.length <= 1) return current;
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
    setChatPaneCompactSections((current) => {
      if (current.length <= 1) return current;
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
    setPendingGif(null);
    setGifOpen(false);
    setEmojiOpen(false);
    setComposerTargetPaneIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
    setPendingGifPaneIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
  }

  function switchChatPaneMode(nextMode: "single" | "split") {
    setChatPaneMode(nextMode);
    if (nextMode === "single") {
      setComposerTargetChannel(activeChannel);
      setComposerTargetPaneIndex(null);
      setPendingGifChannel(activeChannel);
      setPendingGifPaneIndex(null);
      setPendingGif(null);
      setGifOpen(false);
      setEmojiOpen(false);
    }
  }

  function togglePaneCompactSections(paneIndex: number) {
    setChatPaneCompactSections((current) => current.map((value, currentIndex) => (currentIndex === paneIndex ? !value : value)));
  }

  function setAllPaneCompactSections(nextValue: boolean) {
    setChatPaneCompactSections((current) => current.map(() => nextValue));
  }

  function spotlightChatPane(paneIndex: number, channelId: string) {
    setChatPaneMode("split");
    setChatPaneCompactSections((current) => current.map((_, currentIndex) => currentIndex !== paneIndex));
    focusChatPaneChannel(channelId);
    requestAnimationFrame(() => {
      const list = paneMessageListRefs.current[`pane-${paneIndex}`];
      if (!list) return;
      list.scrollTop = list.scrollHeight;
    });
  }

  function toggleGifFavorite(gifId: string) {
    setGifFavorites((current) => (current.includes(gifId) ? current.filter((item) => item !== gifId) : [...current, gifId]));
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

  const sessionPane = (
    <>
      <section className="panelSection">
        <div className="sectionHeader">
          <ShieldCheck size={18} />
          <strong>XMPP Federation</strong>
        </div>
        <label>
          WebSocket URL
          <input
            value={xmppWebSocketUrl}
            onChange={(event) => setXmppWebSocketUrl(event.target.value)}
            placeholder="wss://chat.example.com/xmpp-websocket"
          />
        </label>
        <label>
          JID
          <input value={xmppJid} onChange={(event) => setXmppJid(event.target.value)} placeholder="user@example.com" />
        </label>
        <label>
          Password
          <input value={xmppPassword} onChange={(event) => setXmppPassword(event.target.value)} type="password" placeholder="••••••••" />
        </label>
        <label>
          Room JID
          <input value={xmppRoomJid} onChange={(event) => setXmppRoomJid(event.target.value)} placeholder="room@conference.example.com" />
        </label>
        <label>
          Space service JID
          <input value={xmppSpaceServiceJid} onChange={(event) => setXmppSpaceServiceJid(event.target.value)} placeholder="spaces.example.com" />
        </label>
        <label>
          Space node
          <input value={xmppSpaceNode} onChange={(event) => setXmppSpaceNode(event.target.value)} placeholder="G4OyS0LK" />
        </label>
        <label>
          Invite URI
          <input
            value={xmppInviteUri}
            onChange={(event) => setXmppInviteUri(event.target.value)}
            placeholder="xmpp:room@conference.example.com?join"
          />
        </label>
        <label>
          Nick
          <input value={xmppNick} onChange={(event) => setXmppNick(event.target.value)} placeholder={name || DEFAULT_NAME} />
        </label>
        <div className="signalStatus">
          Encrypted room traffic is sent through the XMPP server instead of browser-to-browser transport.
        </div>
        <div className="signalActions">
          <button type="button" onClick={applyXmppInviteUri}>
            Use invite
          </button>
          <button type="button" onClick={() => setXmppInviteUri("")}>
            Clear invite
          </button>
        </div>
        <div className="signalActions">
          <button type="button" onClick={() => void saveSettings()}>
            Validate / save
          </button>
          <button type="button" onClick={() => void connectXmpp()}>
            Connect
          </button>
          <button type="button" onClick={() => xmppClientRef.current?.disconnect()}>
            Disconnect
          </button>
          <button
            type="button"
            onClick={() => {
              setXmppWebSocketUrl("");
              setXmppJid("");
              setXmppPassword("");
              setXmppRoomJid("");
              setXmppSpaceServiceJid("");
              setXmppSpaceNode("");
              setXmppInviteUri("");
              setXmppNick("");
            }}
          >
            Clear
          </button>
        </div>
      </section>

      <section className="panelSection events" style={{ margin: 0 }}>
        <div className="sectionHeader splitHeader">
          <strong>Event Log</strong>
          <button className="secondaryButton compact" type="button" onClick={clearEventLog}>
            Clear
          </button>
        </div>
        <textarea className="eventsLog" readOnly value={events.join("\n")} spellCheck={false} />
      </section>
    </>
  );

  return (
    <main className={`shell ${membersOpen ? "" : "membersClosed"}`} data-theme={appTheme}>
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
          <div className="workspaceActions">
            <div className="workspaceIdentityButton" aria-label="Active server">
              <span>
                <strong>{activeServer}</strong>
                <small>{activeServerSubtitle}</small>
              </span>
            </div>
            <button className="iconButton" onClick={openRoomModal} aria-label="Verify room" title="Verify room">
              <ShieldCheck size={20} />
            </button>
            <button className="iconButton" onClick={openRenameServer} aria-label="Server settings" title="Server settings">
              <Settings size={18} />
            </button>
          </div>
        </div>

        <section className="channelBlock">
          <div className="blockTitle splitTitle">
            <span>Text Channels</span>
            <button
              type="button"
              onClick={() => {
                setChannelCreateKind("text");
                setModal("channel");
              }}
              aria-label="Add text channel"
            >
              <Plus size={14} />
            </button>
          </div>
          {topLevelChannels.map((channel) => (
            <React.Fragment key={channel.id}>
              <div className={`channelRow ${activeChannel === channel.id ? "selected" : ""}`}>
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
              {(channelChildren[channel.id] ?? []).length > 0 && (
                <div className="channelChildren" aria-label={`${channel.label} subchannels`}>
              {(channelChildren[channel.id] ?? []).map((childId) => {
                  const childChannel = channels.find((item) => item.id === childId);
                  return (
                    <div className={`channelRow channelChildRow ${activeChannel === childId ? "selected" : ""}`} key={childId}>
                      <button className="channel" onClick={() => switchChannel(childId)} aria-pressed={activeChannel === childId}>
                        <Hash size={16} />
                        <span>{childChannel?.label ?? childId}</span>
                        {unreadByChannel[childId] > 0 && <span className="channelUnread">{unreadByChannel[childId]}</span>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            </React.Fragment>
          ))}
          <div className="voiceChannelSection">
            <div className="blockTitle splitTitle">
              <span>Voice Channels</span>
              <button
                type="button"
                onClick={() => {
                  setChannelCreateKind("voice");
                  setModal("channel");
                }}
                aria-label="Add voice channel"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="voiceChannelRooms">
              {voiceRooms.map((room) => {
                const isActive = activeVoiceRoom === room;
                return (
                  <div key={room} className="voiceChannelRoom">
                    <div className={`channelRow ${isActive ? "selected" : ""}`}>
                      <button
                        type="button"
                        className="channel"
                        onClick={() => joinVoiceRoom(room)}
                        aria-pressed={isActive}
                      >
                        <Volume2 size={17} />
                        <span>{room}</span>
                      </button>
                      <button
                        type="button"
                        className="channelTool"
                        onClick={() => {
                          setEditingVoiceRoom(room);
                          setNewChannelName(room);
                          setModal("voice-channel");
                        }}
                        aria-label={`Voice channel settings for ${room}`}
                        title="Voice channel settings"
                      >
                        <Settings size={14} />
                      </button>
                    </div>
                    {isActive && voiceRoomMembers.length > 0 && (
                      <div className="voiceChannelMembers" aria-label={`${room} members`}>
                        {voiceRoomMembers.map((member) => (
                          <div className={`voiceChannelMember ${member.speaking ? "speaking" : ""}`} key={`${room}:${member.id}`}>
                            <span className={`voiceChannelMemberAvatar ${member.speaking ? "speaking" : ""}`} aria-hidden="true">
                              {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : getAvatarFallback(member.name, member.name)}
                            </span>
                            <span>{member.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {activeVoiceRoom && (
          <section className="panelSection sidebarMediaSection">
            <div className="paneAudioMeters">
              <div className="paneAudioMeter">
                <span>Mic</span>
                <div className="paneAudioMeterBar">
                  <div className="paneAudioMeterFill" style={{ width: `${callActive ? localAudioLevel : 0}%` }} />
                </div>
              </div>
            </div>
            <div className="mediaActions">
              <button
                type="button"
                className={`secondaryButton compact mediaIconButton ${micMuted ? "active" : ""}`}
                onClick={toggleMic}
                aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
                title={micMuted ? "Unmute microphone" : "Mute microphone"}
                aria-pressed={micMuted}
              >
                {micMuted ? <MicOff size={13} /> : <Mic size={13} />}
              </button>
              <button
                type="button"
                className={`secondaryButton compact mediaIconButton ${callActive ? "active" : ""}`}
                onClick={toggleCall}
                aria-label={callActive ? "End voice call" : "Start voice call"}
                title={callActive ? "End voice call" : "Start voice call"}
                aria-pressed={callActive}
              >
                <PhoneCall size={13} />
              </button>
              <button
                type="button"
                className={`secondaryButton compact mediaIconButton ${screenSharing ? "active" : ""}`}
                onClick={toggleScreenShare}
                aria-label={screenSharing ? "Stop screen share" : "Start screen share"}
                title={screenSharing ? "Stop screen share" : "Start screen share"}
                aria-pressed={screenSharing}
              >
                <ScreenShare size={13} />
              </button>
              <button
                type="button"
                className={`secondaryButton compact mediaIconButton ${cameraActive ? "active" : ""}`}
                onClick={toggleCamera}
                aria-label={cameraActive ? "Stop camera" : "Start camera"}
                title={cameraActive ? "Stop camera" : "Start camera"}
                aria-pressed={cameraActive}
              >
                {cameraActive ? <VideoOff size={13} /> : <Video size={13} />}
              </button>
            </div>
            <audio ref={remoteAudioRef} autoPlay playsInline />
          </section>
        )}

        <div className="userStrip">
          <div className="avatar" aria-label={name || "Anonymous avatar"}>
            {avatarUrl ? <img src={avatarUrl} alt="" /> : getAvatarFallback(name || "Anonymous", name || "Anonymous")}
          </div>
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
              Federation
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
            <button
              className={`iconButton ${chatPaneMode === "split" ? "active" : ""}`}
              onClick={() => switchChatPaneMode(chatPaneMode === "split" ? "single" : "split")}
              aria-label="Toggle split chat panes"
              title="Toggle split chat panes"
            >
              <Columns3 size={19} />
            </button>
            <div className={`signalStatus topbarStatus ${xmppStatus}`} aria-live="polite">
              XMPP status: {xmppStatus}
            </div>
          </div>
        </header>

        <div className="chatBody">
          {mainTab === "chat" ? (
            chatPaneMode === "split" ? (
              renderSplitChatWindows()
            ) : (
            <>
              <div className="messageList" ref={messageListRef}>
                {visibleMessages.length === 0 && searchActive ? (
                  <div className="emptyState">No messages matched this search in #{activeLabel}.</div>
                ) : visibleMessages.map((message) => (
            <article
              className={`message ${message.local ? "mine" : ""} ${selectedSearchMessage?.id === message.id ? "focused" : ""}`}
              key={message.id}
              data-message-id={message.id}
            >
              <div className={`avatar small ${messageAvatarByAuthor.has(message.author.trim().toLowerCase()) ? "hasImage" : ""}`}>
                {messageAvatarByAuthor.get(message.author.trim().toLowerCase()) ? (
                  <img src={messageAvatarByAuthor.get(message.author.trim().toLowerCase())!} alt="" />
                ) : (
                  getAvatarFallback(message.author, message.author)
                )}
              </div>
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
                {renderMessageContent(message, message.id, window.location.origin)}
              </div>
            </article>
            ))}
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
                              <button
                                type="button"
                                className="messageMenuEmojiButton"
                                onClick={() => {
                                  setReactionPickerMessageId((current) => (current === message.id ? null : message.id));
                                }}
                                aria-label="Add emoji reaction"
                                aria-expanded={reactionPickerMessageId === message.id}
                                title="Emoji"
                              >
                                <Smile size={14} />
                              </button>
                            </div>
                          </div>
                          {reactionPickerMessageId === message.id && (
                            <div className="messageMenuEmojiPicker" role="dialog" aria-label="Emoji reaction picker">
                              {emojiPickerGroups.map((group) => (
                                <section className="emojiGroup" key={group.label}>
                                  <span>{group.label}</span>
                                  <div className="emojiGrid">
                                    {group.items.map((emoji) => (
                                      <button
                                        type="button"
                                        key={emoji}
                                        onClick={() => {
                                          void sendReaction(message.id, emoji);
                                        }}
                                        aria-label={`React ${emoji}`}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </section>
                              ))}
                            </div>
                          )}
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
          {pendingGif && pendingGifChannel === activeChannel && pendingGifPaneIndex === null && (
            <div className="gifComposerPreview" role="group" aria-label="Selected GIF preview">
              <img src={pendingGif.url} alt={pendingGif.label} />
              <div className="gifComposerPreviewMeta">
                <strong>{pendingGif.label}</strong>
                <span>{pendingGif.source}</span>
              </div>
              <button
                type="button"
                className="gifComposerPreviewClear"
                onClick={() => {
                  setPendingGif(null);
                  setPendingGifChannel(activeChannel);
                  setPendingGifPaneIndex(null);
                }}
                aria-label="Remove selected GIF"
              >
                <X size={13} />
              </button>
            </div>
          )}
          <textarea
            ref={composerInputRef}
            defaultValue={draft}
            onChange={(event) => {
              draftRef.current = event.target.value;
              resizeComposerTextarea(event.currentTarget);
              scheduleMainDraftSync(activeChannel, event.target.value);
            }}
            onFocus={() => {
              setComposerTargetChannel(activeChannel);
              setComposerTargetPaneIndex(null);
            }}
            onPaste={(event) => {
              void handleComposerPaste(event, activeChannel, null);
            }}
            placeholder={`Message #${activeLabel}`}
            rows={1}
            onKeyDown={(event) => {
              if (!shouldSubmitComposerMessage(event)) return;
              event.preventDefault();
              void submitMessage();
            }}
          />
          <div className="composerRight">
            <button
              type="button"
              className={voiceRecording?.channelId === activeChannel && voiceRecording?.paneIndex === null ? "active recording" : ""}
              aria-label={
                voiceRecording?.channelId === activeChannel && voiceRecording?.paneIndex === null
                  ? `Stop voice message recording for #${activeLabel}`
                  : `Record voice message for #${activeLabel}`
              }
              aria-pressed={voiceRecording?.channelId === activeChannel && voiceRecording?.paneIndex === null}
              onClick={() => {
                void toggleVoiceRecording(activeChannel, null);
              }}
            >
              <Mic size={20} />
            </button>
            <button
              type="button"
              aria-label="Add attachment"
              onClick={() => {
                setComposerTargetChannel(activeChannel);
                setComposerTargetPaneIndex(null);
                setPendingAttachmentChannel(activeChannel);
                setPendingAttachmentPaneIndex(null);
                setModal("attachment");
              }}
            >
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
                  setComposerTargetChannel(activeChannel);
                  setComposerTargetPaneIndex(null);
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
                  setComposerTargetChannel(activeChannel);
                  setComposerTargetPaneIndex(null);
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
            )
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
                <button type="button" onClick={() => openMemberProfile(member)}>
                  {member === localMemberName ? (
                    <span className="memberAvatar">
                      {avatarUrl ? <img src={avatarUrl} alt="" /> : getAvatarFallback(localMemberName, localMemberName)}
                    </span>
                  ) : member === peerName ? (
                    <span className="memberAvatar">
                      {peerAvatarUrl ? <img src={peerAvatarUrl} alt="" /> : member.slice(0, 2).toUpperCase()}
                    </span>
                  ) : (
                    <span className="memberAvatar">{member.slice(0, 2).toUpperCase()}</span>
                  )}
                  <span>{member}</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      </aside>

      {lightboxImage && (
        <div className="lightboxLayer" role="presentation" onMouseDown={() => setLightboxImage(null)}>
          <div className="lightboxDialog" role="dialog" aria-modal="true" aria-label="Image preview" onMouseDown={(event) => event.stopPropagation()}>
            <img src={lightboxImage.url} alt={lightboxImage.alt} />
          </div>
        </div>
      )}

      {modal && (
        <div className={`modalLayer ${modal === "search" ? "searchLayer" : ""}`} role="presentation" onMouseDown={closeModal}>
          <section
            className={`modal ${modal === "search" ? "searchModal" : ""} ${modal === "session" ? "sessionModal" : ""} ${modal === "settings" ? "settingsModal" : ""}`}
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modalHeader">
              <strong>
                {modal === "server" && "Create Server"}
                {modal === "rename-server" && "Server Settings"}
                {modal === "delete-server" && "Delete Server"}
                {modal === "channel" && (channelCreateKind === "voice" ? "Create Voice Channel" : "Create Channel")}
                {modal === "rename-channel" && "Channel Settings"}
                {modal === "delete-channel" && "Delete Channel"}
                {modal === "voice-channel" && "Voice Channel Settings"}
                {modal === "delete-voice-channel" && "Delete Voice Channel"}
                {modal === "edit-message" && "Edit Message"}
                {modal === "delete-message" && "Delete Message"}
                {modal === "search" && "Search Messages"}
                {modal === "xmpp-account" && "Create XMPP Account"}
                {modal === "settings" && "User Settings"}
                {modal === "attachment" && `Attach File to ${pendingAttachmentTargetLabel}`}
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
                <label>
                  Subtitle
                  <input value={newServerSubtitle} onChange={(event) => setNewServerSubtitle(event.target.value)} placeholder={DEFAULT_SERVER_SUBTITLE} />
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
                <label>
                  Subtitle
                  <input value={newServerSubtitle} onChange={(event) => setNewServerSubtitle(event.target.value)} placeholder={DEFAULT_SERVER_SUBTITLE} />
                </label>
                <div className="modalActions">
                  <button className="primaryButton" type="button" onClick={renameServer}>Save</button>
                  <button
                    className="dangerButton"
                    type="button"
                    onClick={openDeleteServer}
                    disabled={servers.length <= 1}
                  >
                    Delete server
                  </button>
                </div>
              </div>
            )}

            {modal === "delete-server" && (
              <div className="modalBody">
                <p className="modalCopy">
                  Delete {activeServer}? The app will switch to another local server and keep the shared channels intact.
                </p>
                <div className="modalActions">
                  <button className="secondaryButton" type="button" onClick={() => setModal("rename-server")}>Back</button>
                  <button className="dangerButton" type="button" onClick={deleteServer}>Delete server</button>
                </div>
              </div>
            )}

            {modal === "channel" && (
              <div className="modalBody">
                <label>
                  {channelCreateKind === "voice" ? "Voice channel name" : "Channel name"}
                  <input value={newChannelName} onChange={(event) => setNewChannelName(event.target.value)} autoFocus />
                </label>
                <button className="primaryButton" type="button" onClick={createChannel}>
                  {channelCreateKind === "voice" ? "Create voice channel" : "Create text channel"}
                </button>
              </div>
            )}

            {modal === "rename-channel" && (
              <div className="modalBody">
                <label>
                  {editingChannelId?.includes(":") ? "Subchannel name" : "Channel name"}
                  <input value={newChannelName} onChange={(event) => setNewChannelName(event.target.value)} autoFocus />
                </label>
                <label>
                  New subchannel
                  <input
                    value={newSubchannelName}
                    onChange={(event) => setNewSubchannelName(event.target.value)}
                    placeholder="Lounge"
                  />
                </label>
                {(channelChildren[editingChannelId ?? ""] ?? []).length > 0 && (
                  <div className="modalChildList">
                    <strong>Subchannels</strong>
                    {(channelChildren[editingChannelId ?? ""] ?? []).map((childId) => {
                      const childChannel = channels.find((item) => item.id === childId);
                      return (
                        <div className="modalChildRow" key={childId}>
                          <button
                            className="secondaryButton compact"
                            type="button"
                            onClick={() => {
                              setEditingChannelId(childId);
                              setNewChannelName(childChannel?.label ?? childId.split(":").pop() ?? childId);
                              setNewSubchannelName("");
                            }}
                          >
                            {childChannel?.label ?? childId}
                          </button>
                          <button
                            className="dangerButton compact"
                            type="button"
                            onClick={() => {
                              setEditingChannelId(childId);
                              setDeletingChannelId(childId);
                              setModal("delete-channel");
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="modalActions">
                  <button className="primaryButton" type="button" onClick={renameChannel}>Save</button>
                  <button className="secondaryButton" type="button" onClick={createTextSubchannel}>Create subchannel</button>
                  <button
                    className="dangerButton"
                    type="button"
                    onClick={() => {
                      setDeletingChannelId(editingChannelId);
                      setModal("delete-channel");
                    }}
                    disabled={channels.length <= 1 || !editingChannelId}
                  >
                    {editingChannelId?.includes(":") ? "Delete subchannel" : "Delete channel"}
                  </button>
                </div>
              </div>
            )}

            {modal === "delete-channel" && deletingChannel && deleteFallbackChannel && (
              <div className="modalBody">
                <p className="modalCopy">
                  Delete {deletingChannel.id.includes(":") ? "subchannel" : "channel"} #{deletingChannel.label}? Messages from this channel will move to #{deleteFallbackChannel.label}.
                </p>
                <div className="modalActions">
                  <button className="secondaryButton" type="button" onClick={() => setModal(editingChannelId ? "rename-channel" : null)}>Back</button>
                  <button className="dangerButton" type="button" onClick={confirmDeleteChannel}>
                    {deletingChannel.id.includes(":") ? "Delete subchannel" : "Delete channel"}
                  </button>
                </div>
              </div>
            )}

            {modal === "voice-channel" && editingVoiceRoom && (
              <div className="modalBody">
                <label>
                  Voice channel name
                  <input value={newChannelName} onChange={(event) => setNewChannelName(event.target.value)} autoFocus />
                </label>
                <div className="modalActions">
                  <button className="primaryButton" type="button" onClick={saveVoiceRoom}>Save</button>
                  <button
                    className="dangerButton"
                    type="button"
                    onClick={() => {
                      setDeletingVoiceRoom(editingVoiceRoom);
                      setModal("delete-voice-channel");
                    }}
                  >
                    Delete voice channel
                  </button>
                </div>
              </div>
            )}

            {modal === "delete-voice-channel" && deletingVoiceRoom && (
              <div className="modalBody">
                <p className="modalCopy">
                  Delete voice channel {deletingVoiceRoom}?
                </p>
                <div className="modalActions">
                  <button className="secondaryButton" type="button" onClick={() => setModal("voice-channel")}>Back</button>
                  <button className="dangerButton" type="button" onClick={deleteVoiceRoom}>Delete voice channel</button>
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
                  Profile for <strong>{selectedMember}</strong>.
                </p>
                <div
                  className="profileCard"
                  style={{
                    boxShadow:
                      selectedMemberIsLocal
                        ? `inset 4px 0 0 ${accentColor}`
                        : selectedMemberIsPeer
                          ? `inset 4px 0 0 ${peerAccentColor}`
                          : "inset 4px 0 0 #2d3139",
                  }}
                >
                  <div className="profileBanner">
                    {selectedMemberIsLocal ? (
                      bannerUrl ? <img src={bannerUrl} alt="" /> : null
                    ) : selectedMemberIsPeer ? (
                      peerBannerUrl ? <img src={peerBannerUrl} alt="" /> : null
                    ) : null}
                  </div>
                  <div className="profileHeader">
                    <div
                      className={`profileAvatarWrap ${
                        selectedMemberIsLocal
                          ? avatarAnimated
                            ? "animated"
                            : ""
                          : selectedMemberIsPeer && peerAvatarAnimated
                            ? "animated"
                            : ""
                      }`}
                    >
                      {selectedMemberIsLocal ? (
                        avatarUrl ? (
                          <img className="profileAvatar" src={avatarUrl} alt={selectedMember} />
                        ) : (
                          <div className="profileAvatar profileAvatarFallback" aria-hidden="true">
                            {getAvatarFallback(name || "Anonymous", name || "Anonymous")}
                          </div>
                        )
                      ) : selectedMemberIsPeer ? (
                        peerAvatarUrl ? (
                          <img className="profileAvatar" src={peerAvatarUrl} alt={selectedMember} />
                        ) : (
                          <div className="profileAvatar profileAvatarFallback" aria-hidden="true">
                            {getAvatarFallback(peerName, peerName)}
                          </div>
                        )
                      ) : (
                        <div className="profileAvatar profileAvatarFallback" aria-hidden="true">
                          {getAvatarFallback(selectedMember, selectedMember)}
                        </div>
                      )}
                      {selectedMemberIsLocal ? (
                        avatarFrameUrl ? <img className="profileAvatarFrame" src={avatarFrameUrl} alt="" aria-hidden="true" /> : null
                      ) : selectedMemberIsPeer ? (
                        peerAvatarFrameUrl ? <img className="profileAvatarFrame" src={peerAvatarFrameUrl} alt="" aria-hidden="true" /> : null
                      ) : null}
                    </div>
                    <div className="profileMeta">
                      <strong>{selectedMemberIsLocal ? localMemberName : selectedMember}</strong>
                      <span>
                        {selectedMemberIsLocal ? presence : selectedMemberIsPeer ? peerPresence : "local profile"}
                      </span>
                      <span>
                        {selectedMemberIsLocal ? headline || "No headline set" : selectedMemberIsPeer ? peerHeadline || "No headline set" : "Profile card"}
                      </span>
                      <span>
                        {selectedMemberIsLocal ? statusMessage || "No custom status set" : selectedMemberIsPeer ? peerStatusMessage || "No custom status set" : "Profile card"}
                      </span>
                      <span>
                        {selectedMemberIsLocal ? (
                          website.trim() ? (
                            <a href={website} target="_blank" rel="noreferrer">
                              {website}
                            </a>
                          ) : (
                            "No website set"
                          )
                        ) : selectedMemberIsPeer ? (
                          peerWebsite.trim() ? (
                            <a href={peerWebsite} target="_blank" rel="noreferrer">
                              {peerWebsite}
                            </a>
                          ) : (
                            "No website set"
                          )
                        ) : (
                          "Profile card"
                        )}
                      </span>
                      <span>
                        {selectedMemberIsLocal
                          ? location || "No location set"
                          : selectedMemberIsPeer
                            ? peerLocation || "No location set"
                            : "Profile card"}
                      </span>
                      <span>
                        {selectedMemberIsLocal
                          ? timezone || "No timezone set"
                          : selectedMemberIsPeer
                            ? peerTimezone || "No timezone set"
                            : "Profile card"}
                      </span>
                      <span>
                        {selectedMemberIsLocal
                          ? birthday || "No birthday set"
                          : selectedMemberIsPeer
                            ? peerBirthday || "No birthday set"
                            : "Profile card"}
                      </span>
                      <span>
                        {selectedMemberIsLocal
                          ? company || "No company set"
                          : selectedMemberIsPeer
                            ? peerCompany || "No company set"
                            : "Profile card"}
                      </span>
                      <span>
                        {selectedMemberIsLocal
                          ? school || "No school set"
                          : selectedMemberIsPeer
                            ? peerSchool || "No school set"
                            : "Profile card"}
                      </span>
                      <span>
                        {selectedMemberIsLocal
                          ? major || "No major set"
                          : selectedMemberIsPeer
                            ? peerMajor || "No major set"
                            : "Profile card"}
                      </span>
                      <span>
                        {selectedMemberIsLocal ? pronouns || "Pronouns not set" : selectedMemberIsPeer ? peerPronouns || "Pronouns not set" : "Profile card"}
                      </span>
                      <span>
                        {selectedMemberIsLocal
                          ? pronunciation || "No pronunciation set"
                          : selectedMemberIsPeer
                            ? peerPronunciation || "No pronunciation set"
                            : "Profile card"}
                      </span>
                      <span>
                        {selectedMemberIsLocal
                          ? hobbies || "No hobbies set"
                          : selectedMemberIsPeer
                            ? peerHobbies || "No hobbies set"
                            : "Profile card"}
                      </span>
                      <span>
                        {selectedMemberIsLocal
                          ? languages || "No languages set"
                          : selectedMemberIsPeer
                            ? peerLanguages || "No languages set"
                            : "Profile card"}
                      </span>
                      <span>
                        {selectedMemberIsLocal ? about || "No profile note set" : selectedMemberIsPeer ? peerAbout || "No profile note set" : "Profile card"}
                      </span>
                      <span>
                        {selectedMemberIsLocal
                          ? avatarAnimated
                            ? "Animated avatar enabled"
                            : "Static avatar"
                          : selectedMemberIsPeer
                            ? peerAvatarAnimated
                              ? "Animated avatar enabled"
                              : "Static avatar"
                            : "Profile card"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="modalActions">
                  <button
                    className="secondaryButton"
                    type="button"
                    onClick={() => {
                      const nextDraft = `${draftRef.current}${draftRef.current ? " " : ""}@${selectedMember}`;
                      if (draftSyncTimerRef.current !== null) {
                        window.clearTimeout(draftSyncTimerRef.current);
                        draftSyncTimerRef.current = null;
                      }
                      draftRef.current = nextDraft;
                      if (composerInputRef.current) {
                        composerInputRef.current.value = nextDraft;
                      }
                      setDraftByChannel((current) => setChannelDraft(current, activeChannel, nextDraft));
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
                      setMessages((current) =>
                        appendMessageIfUnique(current, {
                          id: note.id,
                          author: selectedMember,
                          body: note.body,
                          channel: note.channel,
                          at: note.at,
                          encrypted: true,
                          note: true,
                        }),
                      );
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

            {modal === "xmpp-account" && (
              <div className="modalBody">
                <p className="modalCopy">
                  Enter the XMPP account details you want to use on <strong>doge-cube.local</strong>. This app will
                  build the JID from the username and domain, then connect with that account.
                </p>
                <label>
                  Username
                  <input value={xmppAccountUsername} onChange={(event) => setXmppAccountUsername(event.target.value)} autoFocus />
                </label>
                <label>
                  Domain
                  <input value={xmppAccountDomain} onChange={(event) => setXmppAccountDomain(event.target.value)} />
                </label>
                <label>
                  Password
                  <input
                    value={xmppAccountPassword}
                    onChange={(event) => setXmppAccountPassword(event.target.value)}
                    type="password"
                  />
                </label>
                <div className="modalActions">
                  <button className="secondaryButton" type="button" onClick={closeModal}>
                    Cancel
                  </button>
                  <button className="primaryButton" type="button" onClick={saveXmppAccountPrompt}>
                    Save and connect
                  </button>
                </div>
              </div>
            )}

            {modal === "settings" && (
              <div className="modalBody">
                <details className="collapsibleSection profileSettingsGrid" open>
                  <summary>Profile</summary>
                  <label>
                    Display name
                    <input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
                  </label>
                  <label>
                    Presence
                    <input value={presence} onChange={(event) => setPresence(event.target.value)} />
                  </label>
                  <label>
                    Pronouns
                    <input value={pronouns} onChange={(event) => setPronouns(event.target.value)} placeholder="they/them" />
                  </label>
                  <label>
                    Pronunciation
                    <input value={pronunciation} onChange={(event) => setPronunciation(event.target.value)} placeholder="how to say your name" />
                  </label>
                  <label>
                    Hobbies
                    <input value={hobbies} onChange={(event) => setHobbies(event.target.value)} placeholder="music, hiking, coffee" />
                  </label>
                  <label>
                    Languages
                    <input value={languages} onChange={(event) => setLanguages(event.target.value)} placeholder="English, French" />
                  </label>
                  <label>
                    Accent color
                    <input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} />
                  </label>
                  <label>
                    Theme
                    <select value={appTheme} onChange={(event) => setAppTheme(normalizeAppTheme(event.target.value))}>
                      {APP_THEMES.map((theme) => (
                        <option key={theme.id} value={theme.id}>
                          {theme.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Status
                    <input value={statusMessage} onChange={(event) => setStatusMessage(event.target.value)} placeholder="Working on the build" />
                  </label>
                  <label>
                    Website
                    <input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://example.com" />
                  </label>
                  <label>
                    Location
                    <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="San Francisco, CA" />
                  </label>
                  <label>
                    Headline
                    <input value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Builder, ops, night shift" />
                  </label>
                  <label>
                    Timezone
                    <input value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="UTC-4" />
                  </label>
                  <label>
                    Birthday
                    <input value={birthday} onChange={(event) => setBirthday(event.target.value)} placeholder="Jan 1" />
                  </label>
                  <label>
                    Company
                    <input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Relayless" />
                  </label>
                  <label>
                    School
                    <input value={school} onChange={(event) => setSchool(event.target.value)} placeholder="University of..." />
                  </label>
                  <label>
                    Major
                    <input value={major} onChange={(event) => setMajor(event.target.value)} placeholder="Computer Science" />
                  </label>
                  <label>
                    About
                    <textarea value={about} onChange={(event) => setAbout(event.target.value)} placeholder="A short profile note" />
                  </label>
                </details>
                <details className="collapsibleSection">
                  <summary>Avatar art</summary>
                  <label>
                    Profile picture URL
                    <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." />
                  </label>
                  <input
                    ref={avatarUploadRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadProfileArt(file, setAvatarUrl, "Avatar");
                      event.currentTarget.value = "";
                    }}
                  />
                  <label>
                    Profile banner URL
                    <input value={bannerUrl} onChange={(event) => setBannerUrl(event.target.value)} placeholder="https://..." />
                  </label>
                  <input
                    ref={bannerUploadRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadProfileArt(file, setBannerUrl, "Banner");
                      event.currentTarget.value = "";
                    }}
                  />
                  <label>
                    Avatar frame URL
                    <input value={avatarFrameUrl} onChange={(event) => setAvatarFrameUrl(event.target.value)} placeholder="https://..." />
                  </label>
                  <input
                    ref={frameUploadRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadProfileArt(file, setAvatarFrameUrl, "Avatar frame");
                      event.currentTarget.value = "";
                    }}
                  />
                  <label className="toggleRow">
                    <input type="checkbox" checked={avatarAnimated} onChange={(event) => setAvatarAnimated(event.target.checked)} />
                    <span>Animated avatar</span>
                  </label>
                  <div className="signalActions">
                    <button type="button" onClick={() => avatarUploadRef.current?.click()}>
                      Upload avatar
                    </button>
                    <button type="button" onClick={() => bannerUploadRef.current?.click()}>
                      Upload banner
                    </button>
                    <button type="button" onClick={() => frameUploadRef.current?.click()}>
                      Upload frame
                    </button>
                  </div>
                  <div className="signalActions">
                    <button
                      type="button"
                      onClick={() => {
                        void shareProfile();
                      }}
                    >
                      Share profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl("");
                        setAvatarFrameUrl("");
                        setBannerUrl("");
                        setAvatarAnimated(false);
                      }}
                    >
                      Clear profile art
                    </button>
                  </div>
                </details>
                <p className="modalCopy">XMPP connection settings are configured in the Federation tab.</p>
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
                <p className="modalCopy">Sending to {pendingAttachmentTargetLabel}.</p>
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
                    {pendingAttachmentTooLarge && (
                      <span className="attachmentError">
                        Attachment rejected: files larger than {formatBytes(MAX_ATTACHMENT_BYTES)} cannot be sent.
                      </span>
                    )}
                  </div>
                )}
                <div className="modalActions">
                  <button className="secondaryButton" type="button" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    className="primaryButton"
                    type="button"
                    onClick={sendPendingAttachment}
                    disabled={!pendingAttachment || pendingAttachmentTooLarge}
                  >
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
