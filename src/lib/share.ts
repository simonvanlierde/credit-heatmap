import type { Author } from "@credit-generator/core";
import { fromSharePayload, MAX_IMPORT_BYTES, toSharePayload } from "@credit-generator/core";

/** The payload is base64url over deflate-raw compressed JSON. */
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
 * Push bytes through a compression transform and collect the output, refusing
 * to grow past `maxBytes`: on the inflate side a few kB of hostile input can
 * otherwise decompress to gigabytes out of a mount effect.
 */
async function transformBytes(
  bytes: Uint8Array,
  transform: ReadableWritablePair<Uint8Array, BufferSource>,
  maxBytes: number,
): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  // The DOM lib types the writable side as WritableStream<BufferSource>, which
  // pipeThrough's ReadableWritablePair<T, Uint8Array> shape rejects; the bytes
  // fed in are Uint8Arrays, so the pair is narrower in practice than in type.
  const reader = source.pipeThrough(transform as ReadableWritablePair<Uint8Array, Uint8Array>).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Share payload is too large.");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/** Deflate the payload so the link stays short enough to paste into an email. */
function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  // Deflate never grows input meaningfully; the bound is a formality.
  return transformBytes(bytes, new CompressionStream("deflate-raw"), MAX_IMPORT_BYTES);
}

/** Inflate, capped at the same size every other import path enforces. */
function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  return transformBytes(bytes, new DecompressionStream("deflate-raw"), MAX_IMPORT_BYTES);
}

/**
 * Build a shareable absolute URL that encodes the draft, deflate-compressed,
 * in the fragment. Throws on a browser without CompressionStream (pre-2023);
 * the caller already turns a throw into the copy-failed state.
 *
 * Pass `claimIndex` to address the link at one contributor: opening it says
 * whose row is being asked for, and sending it back collects only that row.
 * Pass `draftId` so the reply can find its way back to the right paper.
 */
export async function buildShareUrl(
  authors: Author[],
  options: { claimIndex?: number; draftId?: string } = {},
): Promise<string> {
  const bytes = new TextEncoder().encode(toSharePayload(authors));
  if (bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new Error("This draft is too large to share as a link.");
  }
  const encoded = toBase64Url(await deflate(bytes));
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
export async function decodeShareHash(hash: string): Promise<SharedDraft | null> {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const body = hash.slice(HASH_PREFIX.length);
  // The payload is base64url, so it never contains "&": everything after the
  // first one is parameters. URLSearchParams percent-decodes and never throws,
  // even on a truncated escape like "&d=%", so a mangled link stays a null
  // return instead of a URIError out of a mount effect.
  const paramAt = body.indexOf("&");
  const encoded = paramAt === -1 ? body : body.slice(0, paramAt);
  if (encoded.length > MAX_ENCODED_LENGTH) return null;

  const params = new URLSearchParams(paramAt === -1 ? "" : body.slice(paramAt + 1));
  const claimIndex = readClaim(params.get("c"));
  const draftId = readDraftId(params.get("d"));

  try {
    // inflate caps the decompressed size at MAX_IMPORT_BYTES.
    const bytes = await inflate(fromBase64Url(encoded));
    return { authors: fromSharePayload(new TextDecoder().decode(bytes)), claimIndex, draftId };
  } catch {
    return null;
  }
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
  return raw !== null && /^[\w-]{1,64}$/.test(raw) ? raw : null;
}
