import type { Author } from "@credit-generator/core";
import { fromJson, toJson } from "@credit-generator/core";

const HASH_PREFIX = "#s=";

/** Build a shareable absolute URL that encodes the author state in the fragment. */
export function buildShareUrl(authors: Author[]): string {
  const bytes = new TextEncoder().encode(toJson(authors));
  const encoded = bytes.toBase64({ alphabet: "base64url", omitPadding: true });
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
    const bytes = Uint8Array.fromBase64(hash.slice(HASH_PREFIX.length), { alphabet: "base64url" });
    return fromJson(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
