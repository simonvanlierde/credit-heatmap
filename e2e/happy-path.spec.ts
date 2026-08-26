// biome-ignore lint/correctness/noNodejsModules: Playwright tests run in Node.
import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";

/**
 * Most flows exercise the workspace, not the first-run welcome. That welcome is
 * now a modal dialog, so leaving it open would intercept every click. Seeding
 * the "returning visitor" flag keeps it closed, and only when nothing is
 * stored yet, so the persistence and migration flows still own their own state.
 * The first-run modal itself is covered by its own tests.
 */
async function asReturningVisitor(page: Page) {
  await page.addInitScript(() => {
    if (window.localStorage.getItem("credit-generator-state")) return;
    window.localStorage.setItem(
      "credit-generator-state",
      JSON.stringify({ state: { authors: [], welcomeSeen: true }, version: 4 }),
    );
  });
}

test.describe("Happy path UI flows", () => {
  test.beforeEach(async ({ page }) => {
    await asReturningVisitor(page);
  });

  test("the first-run welcome opens as a modal and dismisses to the workspace", async ({ page }) => {
    // Opt back out of the returning-visitor seed: this is the first-run path.
    await page.addInitScript(() => window.localStorage.removeItem("credit-generator-state"));
    await page.goto("/");

    const welcome = page.locator("dialog#getting-started");
    await expect(welcome).toBeVisible();
    // A modal, so focus is inside it and the workspace behind it is inert.
    await expect(welcome).toHaveJSProperty("open", true);
    await expect(page.locator("dialog#getting-started :focus")).toBeAttached();

    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(welcome).toBeHidden();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);

    // Re-opening from the header never re-offers a data-replacing action.
    await page.getByRole("button", { name: "How it works" }).click();
    await expect(welcome).toBeVisible();
    await expect(page.getByRole("button", { name: "Load sample data" })).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(welcome).toBeHidden();
  });

  test("Load sample data populates contributors and the heatmap", async ({ page }) => {
    await page.goto("/");

    // First-run empty state offers a sample dataset.
    await page.getByRole("button", { name: "Load sample data" }).click();

    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);
    await expect(page.getByLabel("Name or ORCID iD", { exact: true }).first()).toHaveValue("Jane A. Smith");

    // The contribution grid renders one editable cell per role × author. In
    // the default Yes / no mode, assigned cells read as "Contributed"; switching
    // to Levels surfaces the sample's graded scores.
    const cell = page.getByRole("button", { name: "Conceptualization for Jane A. Smith: Contributed" });
    await expect(cell).toHaveAttribute("aria-pressed", "true");
    await expect(cell.locator("svg")).toBeVisible();
    await expect(page.getByText("Ready to export", { exact: true })).toBeVisible();
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

  test("undoes contributor removal and confirms destructive imports", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();

    await page.getByRole("button", { name: "Remove Jane A. Smith" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(2);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);

    await page.getByRole("button", { name: "Import" }).click();
    await page.locator("#import-text").fill("Marie Curie");
    await page.getByRole("button", { name: "Import data" }).click();
    await expect(page.getByText("Replace the current workspace?", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Replace workspace" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(1);
    await expect(page.getByLabel("Name or ORCID iD", { exact: true })).toHaveValue("Marie Curie");
  });

  test("Import names and see the heatmap", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Import" }).click();

    const textarea = page.locator("#import-text");
    await textarea.waitFor({ state: "visible" });
    await textarea.fill("Jane Smith\nBob White");

    await page.getByRole("button", { name: "Import data" }).click();

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
    await page.getByRole("button", { name: "Import data" }).click();

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
      await page.getByRole("button", { name: "Import data" }).click();
      await expect(page.getByLabel("Name or ORCID iD", { exact: true })).toHaveValue(expectedName);
    });
  }

  test("keeps malformed structured imports visible and leaves state unchanged", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Import" }).click();
    await page.locator("#import-text").fill("<a><b>");
    await page.getByRole("button", { name: "Import data" }).click();

    await expect(page.locator("dialog").getByText(/^XML parse error:/)).toBeVisible();
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
    await expect(fresh.getByLabel("Name or ORCID iD", { exact: true }).first()).toHaveValue("Jane A. Smith");
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

  // A draft saved before MAX_AUTHOR_NAME_LENGTH existed can hold a longer name.
  // It rehydrates fine, but every later mutation then throws inside
  // createAuthor; so adding, removing or renaming anything bricked the
  // workspace. The v5 migration trims on the way in.
  test("keeps a pre-limit draft with an over-long name usable", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);

    await page.evaluate(() => {
      const raw = window.localStorage.getItem("credit-generator-state");
      if (!raw) throw new Error("expected persisted state");
      const persisted = JSON.parse(raw) as { version: number; state: { authors: { name: string }[] } };
      persisted.version = 4;
      const first = persisted.state.authors[0];
      if (!first) throw new Error("expected an author");
      first.name = "A".repeat(600);
      window.localStorage.setItem("credit-generator-state", JSON.stringify(persisted));
    });
    await page.reload();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);

    // The operation that used to throw: mutate the list at all.
    await page
      .getByRole("button", { name: /^Remove / })
      .last()
      .click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(2);

    const stored = await page.evaluate(() => {
      const raw = window.localStorage.getItem("credit-generator-state") ?? "{}";
      return (JSON.parse(raw) as { state?: { authors?: { name: string }[] } }).state?.authors?.[0]?.name ?? "";
    });
    expect(stored.length).toBeLessThanOrEqual(500);
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
    await page.getByRole("button", { name: "Import data" }).click();

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

  test("explains a rejected ORCID iD instead of dropping it, and never sticks on the lookup", async ({ page }) => {
    // Stub the proxy so the row's own states are what is under test, not the registry.
    await page.route("**/api/orcid", (route) =>
      route.fulfill({ json: { firstName: "Jane", surname: "Smith", displayName: "Jane A. Smith" } }),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);

    const orcidField = page.getByLabel("ORCID iD", { exact: true });
    await page.getByRole("button", { name: "Add ORCID iD" }).first().click();

    // Shape-valid but checksum-invalid: the store rejects it, so the row has to
    // say why rather than silently closing the input.
    await orcidField.fill("0000-0002-1825-0098");
    await orcidField.press("Enter");
    const rowError = page
      .locator("section[aria-label=Contributors] li, section[aria-label=Contributors] .space-y-1 > *")
      .first()
      .getByText(/invalid checksum/i);
    await expect(rowError).toBeVisible();
    await expect(orcidField).toBeVisible();

    // A valid iD resolves and must not leave the row stuck on "Looking up…".
    await orcidField.fill("0000-0002-1825-0097");
    await orcidField.press("Enter");
    await expect(page.getByText("Looking up…")).toBeHidden();
    await expect(page.getByRole("link", { name: /0000-0002-1825-0097/ })).toBeVisible();
  });

  test("matrix option panels close on an outside click and show their open state", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);

    for (const name of ["Bulk assign", "Heatmap options"]) {
      const trigger = page.getByRole("button", { name });
      await expect(trigger).toHaveAttribute("data-state", "closed");
      await trigger.click();
      await expect(trigger).toHaveAttribute("data-state", "open");

      // Clicking away dismisses it; a plain <details> never did.
      await page.getByRole("heading", { name: "Contributors" }).click();
      await expect(trigger).toHaveAttribute("data-state", "closed");
    }
  });

  test("gives an attached ORCID iD its own aligned line rather than a ragged wrap", async ({ page }) => {
    await page.route("**/api/orcid", (route) =>
      route.fulfill({ json: { firstName: "Jane", surname: "Smith", displayName: "Jane A. Smith" } }),
    );
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);

    const row = page.locator("section[aria-label=Contributors] .space-y-1 > *").first();
    const plainHeight = (await row.boundingBox())?.height ?? 0;

    await page.getByRole("button", { name: "Add ORCID iD" }).first().click();
    const field = page.getByLabel("ORCID iD", { exact: true });
    await field.fill("0000-0002-1825-0097");
    await field.press("Enter");

    const chip = row.getByRole("link", { name: /0000-0002-1825-0097/ });
    await expect(chip).toBeVisible();
    const badge = row.getByRole("button", { name: /Author/ });

    // The iD shares a left edge with the type badge above it...
    expect(Math.round((await chip.boundingBox())?.x ?? 0)).toBe(Math.round((await badge.boundingBox())?.x ?? -1));

    // ...its remove action sits on the same line, not wrapped below it...
    const remove = row.getByRole("button", { name: "Remove ORCID iD" });
    const chipBox = await chip.boundingBox();
    const removeBox = await remove.boundingBox();
    expect(Math.abs((chipBox?.y ?? 0) - (removeBox?.y ?? 99))).toBeLessThan(chipBox?.height ?? 0);

    // ...and the row grows by one line, not three.
    const withOrcid = (await row.boundingBox())?.height ?? 0;
    expect(withOrcid - plainHeight).toBeLessThanOrEqual(28);
  });

  test("bulk assigns a chosen level, and keeps the legend row stable across modes", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);

    // The export buttons and the card width must not move when the legend grows.
    const exports = page.getByText("Heatmap", { exact: true });
    const card = page.locator("section[aria-label='Contribution grid'] > div");
    const before = { x: (await exports.boundingBox())?.x, w: (await card.boundingBox())?.width };
    await page.getByRole("radio", { name: "Levels" }).click();
    await expect(page.getByText("Click to step up; wraps at the top", { exact: true })).toBeVisible();
    expect((await exports.boundingBox())?.x).toBe(before.x);
    expect((await card.boundingBox())?.width).toBe(before.w);

    // Bulk assign in Levels mode must apply the chosen level, not silently Lead.
    await page.getByRole("button", { name: "Bulk assign" }).click();
    await page.getByRole("combobox", { name: "Level to assign" }).click();
    await page.getByRole("option", { name: "Supporting" }).click();
    await page.getByRole("button", { name: "Assign every role" }).click();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: /^Conceptualization for Jane A\. Smith: Supporting$/ }),
    ).toBeVisible();
  });

  test("keeps matrix labels readable and the layout stable across display modes", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);

    // Switching assignment mode must not reflow the header and shove the matrix down.
    const table = page.locator("table");
    const beforeY = (await table.boundingBox())?.y;
    await page.getByRole("radio", { name: "Levels" }).click();
    await expect(page.getByText("Click to step up; wraps at the top", { exact: true })).toBeVisible();
    expect((await table.boundingBox())?.y).toBe(beforeY);

    // Enough contributors that the 14 role columns are squeezed to their minimum
    // width, the condition that used to clip every angled label.
    const longName = "Maximiliana Featherstonehaugh-Wentworth";
    const adder = page.getByLabel("New author names or ORCID iD");
    await adder.fill(`${longName}, Dmitri Ivanov, Elena Fischer, Farid Haddad, Grace Okoro`);
    await adder.press("Enter");
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(8);

    await page.getByText("Heatmap options", { exact: true }).click();
    await page.getByRole("button", { name: "Transpose" }).click();
    await page.keyboard.press("Escape");

    // An angled role label overhangs its own column, so it must paint above the
    // neighbouring headers rather than being buried under their backgrounds.
    // Sample along its length: every point must still hit the label itself.
    const buried = await page.evaluate(() => {
      const label = document.querySelector("thead th span[title]");
      if (!label) return "no label";
      const box = label.getBoundingClientRect();
      for (const fraction of [0.2, 0.4, 0.6]) {
        const x = box.left + box.width * fraction;
        const y = box.bottom - box.height * fraction;
        if (!label.contains(document.elementFromPoint(x, y))) return `covered at ${fraction}`;
      }
      return "";
    });
    expect(buried).toBe("");

    // A long contributor name is truncated in the transposed row header rather
    // than growing the label column and pushing role columns out of view.
    const rowHeader = page.locator("tbody th").filter({ hasText: "Maximiliana" }).locator("span > span").last();
    expect(await rowHeader.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  });

  test("bulk assigns one contributor without obscuring direct grid editing", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await page.getByText("Bulk assign", { exact: true }).click();

    await page.getByRole("button", { name: "Clear every role" }).click();
    await expect(page.getByRole("button", { name: "Conceptualization for Jane A. Smith: None" })).toBeVisible();
    await page.getByRole("button", { name: "Assign every role", exact: true }).click();
    await expect(page.getByRole("button", { name: "Conceptualization for Jane A. Smith: Contributed" })).toBeVisible();
  });

  // The "One role" panel (setRoleScores) had no coverage at any level, so a
  // wrong role index or a silent no-op would have shipped green.
  test("bulk assigns and clears one role across every contributor", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);

    const everyoneOnSoftware = [
      page.getByRole("button", { name: "Software for Jane A. Smith: Contributed" }),
      page.getByRole("button", { name: "Software for Bob White: Contributed" }),
      page.getByRole("button", { name: "Software for Carol Davis: Contributed" }),
    ];

    await page.getByText("Bulk assign", { exact: true }).click();
    await page.getByRole("combobox", { name: "Role for bulk assignment" }).click();
    await page.getByRole("option", { name: "Software", exact: true }).click();
    await page.getByRole("button", { name: "Assign to everyone" }).click();
    for (const cell of everyoneOnSoftware) await expect(cell).toBeVisible();

    // A different role must be untouched; catches a wrong-index write.
    await expect(page.getByRole("button", { name: "Supervision for Bob White: None" })).toBeVisible();

    await page.getByRole("button", { name: "Clear for everyone" }).click();
    await expect(page.getByRole("button", { name: "Software for Jane A. Smith: None" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Software for Carol Davis: None" })).toBeVisible();
  });

  // Regression: a failed lookup on a bare ORCID added through the main field
  // must leave no row named after the raw iD.
  test("removes the seeded row when a bare ORCID lookup fails", async ({ page }) => {
    await asReturningVisitor(page);
    await page.route("**/api/orcid", (route) =>
      route.fulfill({ status: 404, json: { code: "NOT_FOUND", error: "No ORCID record matches that iD." } }),
    );
    await page.goto("/");

    const field = page.getByLabel("New author names or ORCID iD");
    await field.fill("0000-0002-1825-0097");
    await field.press("Enter");

    // The stub controls this text, so it is deterministic.
    await expect(page.getByText("No ORCID record matches that iD.")).toBeVisible();
    // No contributor row at all, and specifically none named after the iD.
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0);
    await expect(page.locator("section[aria-label=Contributors]").getByRole("listitem")).toHaveCount(0);
  });

  test("uses a contributor-focused role list on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();

    await page.getByRole("combobox", { name: "Contributor to assign" }).click();
    await page.getByRole("option", { name: "Bob White" }).click();
    await expect(page.getByRole("button", { name: "Conceptualization for Bob White: None" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Conceptualization for Jane A\. Smith/ })).toBeHidden();
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
    await expect(page.getByRole("button", { name: "Load sample data" })).toBeVisible();
    const importButton = page.getByRole("button", { name: "Import" });
    const importBox = await importButton.boundingBox();
    expect(importBox).not.toBeNull();
    expect((importBox?.x ?? 321) + (importBox?.width ?? 0)).toBeLessThanOrEqual(320);

    await importButton.click();
    const names = Array.from({ length: 12 }, (_, index) => `Contributor${index} Surname${index}`).join("\n");
    await page.locator("#import-text").fill(names);
    await page.getByRole("button", { name: "Import data" }).click();
    const cell = page.getByRole("button", { name: /Conceptualization for Contributor0/ });
    expect((await cell.boundingBox())?.width).toBeGreaterThanOrEqual(44);
    expect((await cell.boundingBox())?.height).toBeGreaterThanOrEqual(44);
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
    // `code` is what a client localizes from; `error` is the English fallback
    // that rides along for logs and for clients predating a code.
    await expect(response.json()).resolves.toEqual({
      code: "INVALID_ID",
      error: "That is not a valid ORCID iD. Check the digits and try again.",
    });
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
