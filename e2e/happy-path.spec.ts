// biome-ignore lint/correctness/noNodejsModules: Playwright tests run in Node.
import { readFile } from "node:fs/promises";
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

  test("imports surname-first notation as one correctly structured contributor", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Import" }).click();
    await page.locator("#import-text").fill("Curie, Marie");
    await page.getByRole("button", { name: "Import Data" }).click();

    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(1);
    await expect(page.getByLabel("Name or ORCID iD", { exact: true })).toHaveValue("Curie, Marie");
  });

  for (const [format, payload, expectedName] of [
    ["CSV", "Name,ORCID,Type\nJane Smith,,author", "Jane Smith"],
    [
      "JSON",
      JSON.stringify({
        version: 1,
        authors: [
          {
            id: "json-author",
            name: "Bob White",
            firstName: "Bob",
            middleName: "",
            surname: "White",
            initials: "BW",
            contributorType: "author",
            contributions: [],
          },
        ],
      }),
      "Bob White",
    ],
    [
      "XML",
      // biome-ignore lint/security/noSecrets: inline XML fixture contains no credential.
      '<article><contrib-group><contrib contrib-type="contributor"><name><surname>Davis</surname><given-names>Carol</given-names></name></contrib></contrib-group></article>',
      "Carol Davis",
    ],
  ] as const) {
    test(`imports structured ${format} through the modal`, async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Import" }).click();
      await page.locator("#import-text").fill(payload);
      await expect(
        page.getByText(`Detected: ${format === "XML" ? "JATS4R XML" : format === "JSON" ? "JSON export" : "CSV"}`),
      ).toBeVisible();
      await page.getByRole("button", { name: "Import Data" }).click();
      await expect(page.getByLabel("Name or ORCID iD", { exact: true })).toHaveValue(expectedName);
    });
  }

  test("keeps malformed structured imports visible and leaves state unchanged", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Import" }).click();
    await page.locator("#import-text").fill("<a><b>");
    await page.getByRole("button", { name: "Import Data" }).click();

    await expect(page.getByText(/^XML parse error:/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0);
    await expect(page.locator("#import-text")).toBeVisible();
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
    await expect(page.getByText("Anyone with this link can read every contributor name")).toBeVisible();
    await page.getByRole("button", { name: "Copy data link" }).click();
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

  test("persists, migrates, and clears the local draft", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);
    await page.reload();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);

    await page.evaluate(() => {
      const raw = window.localStorage.getItem("credit-generator-state");
      if (!raw) throw new Error("expected persisted state");
      const persisted = JSON.parse(raw) as { version: number; state: { inputMode: string } };
      persisted.version = 0;
      persisted.state.inputMode = "slider";
      window.localStorage.setItem("credit-generator-state", JSON.stringify(persisted));
    });
    await page.reload();
    await expect(page.getByRole("radio", { name: "Levels" })).toBeChecked();

    await page.getByRole("button", { name: "Clear local draft" }).click();
    await page.getByRole("button", { name: "Clear draft" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0);
  });

  test("handles invalid contributor names and ORCID checksums without losing input", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    const name = page.getByLabel("Name or ORCID iD", { exact: true }).first();
    await name.fill("123");
    await name.press("Tab");
    await expect(page.getByText(/Enter a name with at least one letter/)).toBeVisible();

    const add = page.getByLabel("New author names or ORCID iD");
    await add.fill("0000-0002-1825-0098");
    await add.press("Enter");
    await expect(add).toHaveValue("0000-0002-1825-0098");
    await expect(page.getByText(/invalid checksum/).first()).toBeVisible();
  });

  test("normalizes canonical ORCID URLs imported from JSON", async ({ page }) => {
    const payload = JSON.stringify({
      version: 1,
      authors: [
        {
          id: "orcid-author",
          name: "Jane Smith",
          firstName: "Jane",
          middleName: "",
          surname: "Smith",
          initials: "JS",
          orcid: "https://orcid.org/0000-0002-1825-0097",
          contributorType: "author",
          contributions: [],
        },
      ],
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Import" }).click();
    await page.locator("#import-text").fill(payload);
    await page.getByRole("button", { name: "Import Data" }).click();

    await expect(page.getByRole("link", { name: /0000-0002-1825-0097/ })).toHaveAttribute(
      "href",
      "https://orcid.org/0000-0002-1825-0097",
    );
    await expect(page.getByRole("button", { name: "Look up name from ORCID" })).toBeAttached();
  });

  test("cycles contribution levels and moves non-authors to acknowledgements", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await page.getByRole("radio", { name: "Levels" }).click();
    const cell = page.getByRole("button", { name: "Data curation for Jane A. Smith: None" });
    await cell.click();
    await expect(page.getByRole("button", { name: "Data curation for Jane A. Smith: Supporting" })).toBeVisible();
    await page.getByRole("button", { name: "Data curation for Jane A. Smith: Supporting" }).click();
    await expect(page.getByRole("button", { name: "Data curation for Jane A. Smith: Equal" })).toBeVisible();
    await page.getByRole("button", { name: "Data curation for Jane A. Smith: Equal" }).click();
    await expect(page.getByRole("button", { name: "Data curation for Jane A. Smith: Lead" })).toBeVisible();
    await page.getByRole("button", { name: "Data curation for Jane A. Smith: Lead" }).click();
    await expect(page.getByRole("button", { name: "Data curation for Jane A. Smith: None" })).toBeVisible();

    await page.getByRole("button", { name: "Author" }).first().click();
    const statement = page.getByLabel("Statement and export").locator("p").filter({ hasText: "CRediT:" });
    await expect(statement).toContainText("Acknowledgements: Jane A. Smith");
    await page.getByRole("switch", { name: /Separate acknowledgements/ }).click();
    await expect(statement).not.toContainText("Acknowledgements:");
  });

  test("downloads a browser-generated PNG heatmap", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("credit-heatmap.png");
    const path = await download.path();
    if (!path) throw new Error("expected downloaded PNG path");
    expect([...(await readFile(path)).subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  test("keeps header, grid cells, and long statements usable on a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/");
    const importButton = page.getByRole("button", { name: "Import" });
    const importBox = await importButton.boundingBox();
    expect(importBox).not.toBeNull();
    expect((importBox?.x ?? 321) + (importBox?.width ?? 0)).toBeLessThanOrEqual(320);

    await importButton.click();
    const names = Array.from({ length: 12 }, (_, index) => `Contributor${index} Surname${index}`).join("\n");
    await page.locator("#import-text").fill(names);
    await page.getByRole("button", { name: "Import Data" }).click();
    const cell = page.getByRole("button", { name: /Conceptualization for Contributor0/ });
    expect((await cell.boundingBox())?.width).toBeGreaterThanOrEqual(24);
    await cell.click();

    const firstName = page.getByLabel("Name or ORCID iD", { exact: true }).first();
    await firstName.fill("A".repeat(240));
    await firstName.press("Enter");
    expect(await page.evaluate(() => document.body.scrollWidth)).toBe(320);
    const statement = page.getByLabel("Statement and export");
    expect((await statement.boundingBox())?.width).toBeLessThanOrEqual(320);
  });

  test("rejects malformed ORCID API requests before upstream lookup", async ({ request }) => {
    const response = await request.post("/api/orcid", { data: { id: "0000-0002-1825-0098" } });
    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid ORCID iD format" });
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
