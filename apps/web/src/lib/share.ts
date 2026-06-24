import type { Author } from "@credit-generator/core";
import { fromJson, toJson } from "@credit-generator/core";

const HASH_PREFIX = "#s=";

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Build a shareable absolute URL that encodes the author state in the fragment. */
export function buildShareUrl(authors: Author[]): string {
  const encoded = toBase64Url(toJson(authors));
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
    return fromJson(fromBase64Url(hash.slice(HASH_PREFIX.length)));
  } catch {
    return null;
  }
}
