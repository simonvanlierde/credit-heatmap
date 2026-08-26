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
/**
 * Which draft the link came from: `&d=<draft id>`.
 *
 * A reply has to land on the paper it was asked about. Without this, a reply
 * that arrives while you are working on a different paper merges into whatever
 * happens to be open, silently rewriting the wrong draft.
 */
const DRAFT_PARAM = "&d=";
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
 * Pass `draftId` so the reply can find its way back to the right paper.
 */
export function buildShareUrl(authors: Author[], options: { claimIndex?: number; draftId?: string } = {}): string {
  const bytes = new TextEncoder().encode(toSharePayload(authors));
  if (bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new Error("This draft is too large to share as a link.");
  }
  const encoded = toBase64Url(bytes);
  const claim = options.claimIndex === undefined ? "" : `${CLAIM_PARAM}${options.claimIndex}`;
  const draft = options.draftId ? `${DRAFT_PARAM}${encodeURIComponent(options.draftId)}` : "";
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${HASH_PREFIX}${encoded}${claim}${draft}`;
}

export interface SharedDraft {
  authors: Author[];
  /** Which contributor the link was addressed to, or null for a plain share. */
  claimIndex: number | null;
  /** The draft this link was built from, or null if the link predates it. */
  draftId: string | null;
}

/**
 * Decode a draft from a `#s=…` location hash. Returns null when the hash is
 * absent or malformed, so a bad link degrades to the normal app rather than
 * crashing. Links made before claims existed decode with `claimIndex: null`.
 */
export function decodeShareHash(hash: string): SharedDraft | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const body = hash.slice(HASH_PREFIX.length);
  // The payload runs to the first parameter, whichever comes first.
  const paramAt = firstIndexOf(body, [CLAIM_PARAM, DRAFT_PARAM]);
  const encoded = paramAt === -1 ? body : body.slice(0, paramAt);
  if (encoded.length > MAX_ENCODED_LENGTH) return null;

  const params = paramAt === -1 ? "" : body.slice(paramAt);
  const claimIndex = readClaim(readParam(params, CLAIM_PARAM));
  const draftId = readDraftId(readParam(params, DRAFT_PARAM));

  try {
    const bytes = fromBase64Url(encoded);
    if (bytes.byteLength > MAX_IMPORT_BYTES) return null;
    return { authors: fromSharePayload(new TextDecoder().decode(bytes)), claimIndex, draftId };
  } catch {
    return null;
  }
}

/** Earliest position at which any of `needles` occurs, or -1. */
function firstIndexOf(text: string, needles: string[]): number {
  const found = needles.map((needle) => text.indexOf(needle)).filter((at) => at !== -1);
  return found.length === 0 ? -1 : Math.min(...found);
}

/** Read one `&x=value` parameter, up to the next `&` or the end. */
function readParam(params: string, prefix: string): string | null {
  const at = params.indexOf(prefix);
  if (at === -1) return null;
  const rest = params.slice(at + prefix.length);
  const end = rest.indexOf("&");
  return end === -1 ? rest : rest.slice(0, end);
}

/** A claim is a small non-negative integer or it is nothing. */
function readClaim(raw: string | null): number | null {
  if (raw === null || !/^\d{1,3}$/.test(raw)) return null;
  return Number(raw);
}

/**
 * A draft id is an opaque token used only to look up a local draft, so it is
 * length- and charset-bounded rather than parsed. A value that matches nothing
 * simply fails the lookup.
 */
function readDraftId(raw: string | null): string | null {
  if (raw === null) return null;
  const decoded = decodeURIComponent(raw);
  return /^[\w-]{1,64}$/.test(decoded) ? decoded : null;
}
