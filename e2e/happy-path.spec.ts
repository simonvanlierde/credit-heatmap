import { expect, test } from "@playwright/test";

test.describe("Happy path UI flows", () => {
  test("Load sample data populates contributors and the heatmap", async ({ page }) => {
    await page.goto("/");

    // First-run empty state offers a sample dataset.
    await page.getByRole("button", { name: "Load sample data" }).click();

    await expect(page.getByText("3 authors")).toBeVisible();
    // The name now also appears (colored) in the statement, so match the first.
    await expect(page.getByText("Jane A. Smith", { exact: true }).first()).toBeVisible();

    // Heatmap renders for the loaded authors.
    await expect(page.locator("svg").first()).toBeVisible();

    // A statement is generated from the sample contributions.
    await expect(page.getByText(/^CRediT:/)).toBeVisible();
  });

  test("Import names and see the heatmap", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Import" }).click();

    const textarea = page.locator("#import-text");
    await textarea.waitFor({ state: "visible" });
    await textarea.fill("Jane Smith\nBob White");

    await page.getByRole("button", { name: "Import Data" }).click();

    // The contributor name is rendered in an editable input.
    await expect(page.getByLabel("Name or ORCID iD", { exact: true }).first()).toHaveValue("Jane Smith");
    await expect(page.getByText("2 authors")).toBeVisible();
    await expect(page.locator("svg").first()).toBeVisible();

    // Imported names have no roles yet → a validation notice appears.
    await expect(page.getByText(/has no assigned CRediT roles/).first()).toBeVisible();
  });

  test("Share link round-trips the state through the URL", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(page.getByText("3 authors")).toBeVisible();

    await page.getByRole("button", { name: "Share" }).click();
    const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(shareUrl).toContain("#s=");

    // Open the link in a fresh page (clears local storage) and confirm the state loads.
    const fresh = await context.newPage();
    await fresh.addInitScript(() => window.localStorage.clear());
    await fresh.goto(shareUrl);
    await expect(fresh.getByText("3 authors")).toBeVisible();
    await expect(fresh.getByText("Jane A. Smith", { exact: true }).first()).toBeVisible();
    // The share hash is cleared after loading.
    expect(new URL(fresh.url()).hash).toBe("");
  });

  test("XML export downloads client-side (no API round-trip)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(page.getByText("3 authors")).toBeVisible();

    // XML (JATS4R) is the default export format; downloading generates it in the
    // browser and saves it directly (no API round-trip).
    await expect(page.getByRole("combobox", { name: "Export format" })).toHaveText(/XML \(JATS4R\)/);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("credit-contributors.xml");
  });
});
