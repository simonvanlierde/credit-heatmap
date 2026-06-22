import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    restoreMocks: true,
    // Timeout per test in milliseconds
    timeout: 10000,
    // Run this file before tests to provide DOMParser in Node via linkedom
    setupFiles: ["./src/test-setup.ts"],
  },
});
