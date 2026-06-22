// Provide a DOMParser global in Node test environment using linkedom.
// This lets tests (and code paths that call `fromJats4rXml`) run without
// switching the whole suite to a jsdom environment.
import { DOMParser as LinkeDOMParser } from "linkedom";

if (typeof (globalThis as unknown as { DOMParser?: unknown }).DOMParser === "undefined") {
  // Assign linkedom's DOMParser to the global scope. Cast to `unknown`
  // rather than `any` to satisfy the no-explicit-any lint rule.
  (globalThis as unknown as { DOMParser?: unknown }).DOMParser = LinkeDOMParser as unknown;
}
