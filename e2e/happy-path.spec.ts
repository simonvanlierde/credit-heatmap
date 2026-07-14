import { expect, test } from "@playwright/test";

test.describe("Happy path UI flows", () => {
  test("Load sample data populates contributors and the heatmap", async ({ page }) => {
    await page.goto("/");

    // First-run empty state offers a sample dataset.
    await page.getByRole("button", { name: "Load sample data" }).click();

    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);
    // The name also appears in the generated statement, so match the first.
    await expect(page.getByText("Jane A. Smith", { exact: true }).first()).toBeVisible();

    // The contribution grid renders one editable cell per role × author. In
    // the default Binary mode, assigned cells read as "Contributed"; switching
    // to Levels surfaces the sample's graded scores.
    const cell = page.getByRole("button", { name: "Conceptualization for Jane A. Smith: Contributed" });
    await expect(cell).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("radio", { name: "Levels" }).click();
    await expect(page.getByRole("button", { name: "Conceptualization for Jane A. Smith: Lead" })).toBeVisible();

    // A statement is generated from the sample contributions.
    await expect(page.getByText(/^CRediT:/)).toBeVisible();
  });

  test("Clicking a grid cell toggles the contribution into the statement", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();

    // Jane has no Data curation in the sample; one click assigns it.
    const cell = page.getByRole("button", { name: /^Data curation for Jane A\. Smith:/ });
    await expect(cell).toHaveAttribute("aria-pressed", "false");
    await cell.click();
    await expect(cell).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/^CRediT:/)).toContainText("Data curation");
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
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(2);
    // The grid renders an (unassigned) cell for the imported contributor.
    await expect(page.getByRole("button", { name: /^Conceptualization for Jane Smith:/ })).toBeVisible();

    // Imported names have no roles yet → a validation notice appears.
    await expect(page.getByText(/has no assigned CRediT roles/).first()).toBeVisible();
  });

  test("Adding a comma-separated author list creates one row per name", async ({ page }) => {
    await page.goto("/");

    const input = page.getByLabel("New author names or ORCID iD");
    await input.fill("Jane Smith, Bob White, Carol Davis");
    await input.press("Enter");

    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);
    // A single "Lastname, Firstname" entry is not split.
    await input.fill("Curie, Marie");
    await input.press("Enter");
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(4);
    await expect(page.getByLabel("Name or ORCID iD", { exact: true }).last()).toHaveValue("Curie, Marie");
  });

  test("Share link round-trips the state through the URL", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);

    await page.getByRole("button", { name: "Share" }).click();
    const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(shareUrl).toContain("#s=");

    // Open the link in a fresh page (clears local storage) and confirm the state loads.
    const fresh = await context.newPage();
    await fresh.addInitScript(() => window.localStorage.clear());
    await fresh.goto(shareUrl);
    await expect(fresh.getByRole("button", { name: /^Remove / })).toHaveCount(3);
    await expect(fresh.getByText("Jane A. Smith", { exact: true }).first()).toBeVisible();
    // The share hash is cleared after loading.
    expect(new URL(fresh.url()).hash).toBe("");
  });

  test("XML export downloads client-side (no API round-trip)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);

    // XML (JATS4R) is the default export format; downloading generates it in the
    // browser and saves it directly (no API round-trip).
    await expect(page.getByRole("combobox", { name: "Export format" })).toHaveText(/XML \(JATS4R\)/);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("credit-contributors.xml");
  });
});
