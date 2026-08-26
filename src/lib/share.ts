import type { Author } from "@credit-generator/core";
import { fromSharePayload, MAX_IMPORT_BYTES, toSharePayload } from "@credit-generator/core";

const HASH_PREFIX = "#s=";
/**
 * Marks which contributor the link was built for: `#s=<payload>&c=<index>`.
 *
 * A position in the encoded list, not an id — ids are not in the payload, and a
 * position costs one or two characters in a link that is already the longest
 * thing most people will ever paste into an email.
 */
const CLAIM_PARAM = "&c=";
const MAX_ENCODED_LENGTH = Math.ceil((MAX_IMPORT_BYTES * 4) / 3) + 4;

/**
 * base64url encode/decode with a fallback: the TC39 Uint8Array.toBase64 /
 * fromBase64 methods only landed in browsers from late 2024/2025, so feature-
 * detect and fall back to btoa/atob for older engines instead of throwing.
 */
function toBase64Url(bytes: Uint8Array): string {
  if (typeof bytes.toBase64 === "function") {
    return bytes.toBase64({ alphabet: "base64url", omitPadding: true });
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/[=]+$/, "");
}

function fromBase64Url(encoded: string): Uint8Array {
  if (typeof Uint8Array.fromBase64 === "function") {
    return Uint8Array.fromBase64(encoded, { alphabet: "base64url" });
  }
  const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Build a shareable absolute URL that encodes the draft in the fragment.
 *
 * Pass `claimIndex` to address the link at one contributor: opening it says
 * whose row is being asked for, and sending it back collects only that row.
 */
export function buildShareUrl(authors: Author[], claimIndex?: number): string {
  const bytes = new TextEncoder().encode(toSharePayload(authors));
  if (bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new Error("This draft is too large to share as a link.");
  }
  const encoded = toBase64Url(bytes);
  const claim = claimIndex === undefined ? "" : `${CLAIM_PARAM}${claimIndex}`;
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${HASH_PREFIX}${encoded}${claim}`;
}

export interface SharedDraft {
  authors: Author[];
  /** Which contributor the link was addressed to, or null for a plain share. */
  claimIndex: number | null;
}

/**
 * Decode a draft from a `#s=…` location hash. Returns null when the hash is
 * absent or malformed, so a bad link degrades to the normal app rather than
 * crashing. Links made before claims existed decode with `claimIndex: null`.
 */
export function decodeShareHash(hash: string): SharedDraft | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const body = hash.slice(HASH_PREFIX.length);
  const claimAt = body.indexOf(CLAIM_PARAM);
  const encoded = claimAt === -1 ? body : body.slice(0, claimAt);
  if (encoded.length > MAX_ENCODED_LENGTH) return null;

  const claimIndex = claimAt === -1 ? null : readClaim(body.slice(claimAt + CLAIM_PARAM.length));

  try {
    const bytes = fromBase64Url(encoded);
    if (bytes.byteLength > MAX_IMPORT_BYTES) return null;
    return { authors: fromSharePayload(new TextDecoder().decode(bytes)), claimIndex };
  } catch {
    return null;
  }
}

/** A claim is a small non-negative integer or it is nothing. */
function readClaim(raw: string): number | null {
  if (!/^\d{1,3}$/.test(raw)) return null;
  return Number(raw);
}
