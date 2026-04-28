const FINGERPRINT_GROUP_SIZE = 4;
const FINGERPRINT_GROUPS = 8;

export function normalizeFingerprint(value: string) {
  return value.replace(/[^a-f0-9]/gi, "").toLowerCase();
}

export function formatFingerprint(bytes: Uint8Array) {
  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return Array.from({ length: FINGERPRINT_GROUPS }, (_, index) =>
    hex.slice(index * FINGERPRINT_GROUP_SIZE, (index + 1) * FINGERPRINT_GROUP_SIZE),
  ).join("-");
}

export async function deriveRoomFingerprint(seed: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
  return formatFingerprint(new Uint8Array(digest).slice(0, 16));
}

