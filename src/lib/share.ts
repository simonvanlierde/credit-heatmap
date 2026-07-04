import type { Author } from "@credit-generator/core";
import { fromJson, toJson } from "@credit-generator/core";

const HASH_PREFIX = "#s=";

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
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
  try {
    const bytes = fromBase64Url(hash.slice(HASH_PREFIX.length));
    return fromJson(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
