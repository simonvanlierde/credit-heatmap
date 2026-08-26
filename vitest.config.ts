// biome-ignore lint/correctness/noNodejsModules: this config runs in Node, not the browser bundle.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the app layer: the Zustand store, the `src/lib` helpers, and
 * anything else that is plain TypeScript rather than a React tree.
 *
 * The domain logic lives in `packages/core` and has its own Vitest project;
 * user-visible behaviour is covered by Playwright in `e2e/`. This sits between
 * them, for the browser-facing glue that has real branching but no UI worth
 * driving a browser for.
 *
 * `jsdom` rather than `node`: the code under test reaches for `localStorage`,
 * `navigator`, and `Blob` the way it does in the browser, and stubbing those by
 * hand in every file is more work than the environment costs.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    restoreMocks: true,
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      provider: "v8",
      // lcov feeds Codecov; text prints a summary in the terminal/CI log
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.ts", "src/store/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts", "src/test-setup.ts"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
