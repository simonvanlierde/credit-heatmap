import type { Author } from "@credit-generator/core";
import { fromJson, MAX_IMPORT_BYTES, toJson } from "@credit-generator/core";

const HASH_PREFIX = "#s=";
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

/** Build a shareable absolute URL that encodes the author state in the fragment. */
export function buildShareUrl(authors: Author[]): string {
  const bytes = new TextEncoder().encode(toJson(authors));
  if (bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new Error("This draft is too large to share as a link.");
  }
  const encoded = toBase64Url(bytes);
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${HASH_PREFIX}${encoded}`;
}

/**
 * Decode author state from a `#s=…` location hash. Returns null when the hash is
 * absent or malformed, so a bad link degrades to the normal app rather than crashing.
 */
export function decodeShareHash(hash: string): Author[] | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const encoded = hash.slice(HASH_PREFIX.length);
  if (encoded.length > MAX_ENCODED_LENGTH) return null;
  try {
    const bytes = fromBase64Url(encoded);
    if (bytes.byteLength > MAX_IMPORT_BYTES) return null;
    return fromJson(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
