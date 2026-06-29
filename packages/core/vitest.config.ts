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
    coverage: {
      provider: "v8",
      // lcov feeds Codecov; text prints a summary in the terminal/CI log
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts", "src/test-setup.ts"],
    },
  },
});
