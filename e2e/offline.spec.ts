// biome-ignore lint/correctness/noNodejsModules: Playwright tests run in Node.
import process from "node:process";
import { expect, test } from "@playwright/test";

/**
 * The offline path needs the shipped bundle: `ServiceWorkerRegistrar` skips
 * registration in development, where a cache in front of unhashed dev modules
 * would fight HMR. CI runs the suite against `pnpm build && pnpm start`, so
 * that is where this test runs; locally `pnpm dev` serves the app and it skips.
 */
test.describe("Offline", () => {
  test("the workspace still loads with the network cut", async ({ page, context }) => {
    test.skip(!process.env.CI, "needs the production build; CI runs one");
    await page.goto("/");
    // Registration happens in an effect, and only the second load runs through
    // the worker, which is the load that fills the cache.
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect(page.getByRole("heading", { name: "CRediT Matrix" })).toBeVisible();

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole("heading", { name: "CRediT Matrix" })).toBeVisible();
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);
  });

  test("the manifest is served and installable", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const manifest = (await res.json()) as { icons: { src: string }[]; start_url: string };
    expect(manifest.start_url).toBe("/");
    for (const icon of manifest.icons) {
      expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
    }
  });
});
