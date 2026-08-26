/**
 * Give the tests a working `localStorage`.
 *
 * Node ships its own experimental `localStorage` global, which is unusable
 * without `--localstorage-file` and takes precedence over the one jsdom
 * installs. The Zustand `persist` middleware then writes into `undefined` and
 * every store test fails on a `setItem` of nothing.
 *
 * An in-memory implementation is enough: what the tests care about is that the
 * store can read and write, not what a browser does with quota or origins.
 */
function memoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, String(value));
    },
    removeItem: (key) => {
      entries.delete(key);
    },
    clear: () => {
      entries.clear();
    },
  };
}

function isUsable(candidate: unknown): boolean {
  try {
    return typeof (candidate as Storage | undefined)?.setItem === "function";
  } catch {
    // Access itself throws on an opaque origin.
    return false;
  }
}

if (!isUsable(globalThis.localStorage)) {
  Object.defineProperty(globalThis, "localStorage", { value: memoryStorage(), configurable: true, writable: true });
}
