import { type NextRequest, NextResponse } from "next/server";

/**
 * Every failure carries a stable `code` plus an English `error`.
 *
 * The client localizes from the code; the message is the fallback for a client
 * that meets a code it does not know, and what shows up in logs and `curl`.
 * Codes are API surface: add new ones rather than renaming existing ones.
 */
export function errorResponse(status: number, code: string, error: string) {
  return NextResponse.json({ code, error }, { status });
}

/**
 * Read one string field from the JSON body.
 *
 * Returns the field's value ("" when the body carries no such string, so the
 * lookup's own validation rejects it), or null when the body is not JSON at all.
 */
export async function readStringField(request: NextRequest, name: string): Promise<string | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  if (body !== null && typeof body === "object" && name in body) {
    const value = (body as Record<string, unknown>)[name];
    if (typeof value === "string") return value;
  }
  return "";
}
