import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * Automated accessibility scans. axe-core catches a subset of WCAG issues
 * (roughly a third). It is a guardrail against regressions, not a conformance claim.
 * We scan the app's main states; the heatmap SVG is aria-hidden (a text
 * alternative sits beside it) so axe correctly skips it.
 */

// Pin the rule set to WCAG 2.0/2.1 A + AA so the scan matches what the README
// documents, rather than tracking axe's shifting defaults (which also include
// best-practice rules).
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
/**
 * Panels scale in and rows fade up, and axe samples computed color; including
 * the opacity of an element still mid-transition. Scanning before motion
 * settles reports contrast failures that never reach the eye, and geometry
 * reads ~4% small. Wait for every running animation, with a ceiling so an
 * intentionally looping one can't hang the suite.
 */
async function settleMotion(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const done = Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
        const cap = new Promise<void>((r) => setTimeout(r, 2000));
        Promise.race([done, cap]).then(() => resolve());
      }),
  );
}

const scan = async (page: Page) => {
  await settleMotion(page);
  return new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
};

/**
 * Most flows exercise the workspace, not the first-run welcome. That welcome is
 * now a modal dialog, so leaving it open would intercept every click. Seeding
 * the "returning visitor" flag keeps it closed, and only when nothing is
 * stored yet, so the persistence and migration flows still own their own state.
 * The first-run modal itself is covered by its own tests.
 */
/** The contributor rows only; other lists exist (welcome steps, validation). */
function contributorRows(page: Page) {
  return page.locator("section[aria-label=Contributors]").getByRole("listitem");
}

async function asReturningVisitor(page: Page) {
  await page.addInitScript(() => {
    if (window.localStorage.getItem("credit-generator-state")) return;
    window.localStorage.setItem(
      "credit-generator-state",
      JSON.stringify({ state: { authors: [], welcomeSeen: true }, version: 4 }),
    );
  });
}

test.describe("Accessibility (axe-core)", () => {
  test.beforeEach(async ({ page }) => {
    await asReturningVisitor(page);
  });

  test("first-run welcome modal has no detectable violations", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.removeItem("credit-generator-state"));
    await page.goto("/");
    await expect(page.locator("dialog#getting-started")).toBeVisible();
    const results = await scan(page);
    expect(results.violations).toEqual([]);
  });

  test("returning empty state has no detectable violations", async ({ page }) => {
    await page.goto("/");
    const results = await scan(page);
    expect(results.violations).toEqual([]);
  });

  test("loaded state (contributors, heatmap, statement) has no detectable violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);
    const results = await scan(page);
    expect(results.violations).toEqual([]);
  });

  test("import modal has no detectable violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Import" }).click();
    await page.locator("#import-text").waitFor({ state: "visible" });
    const results = await scan(page);
    expect(results.violations).toEqual([]);
  });

  test("validation-error state (contributors with no roles) has no detectable violations", async ({ page }) => {
    await page.goto("/");
    // Imported names have no roles yet, so the validation notice renders.
    await page.getByRole("button", { name: "Import" }).click();
    await page.locator("#import-text").fill("Jane Smith\nBob White");
    await page.getByRole("button", { name: "Import data" }).click();
    await expect(page.getByText(/has no assigned CRediT roles/).first()).toBeVisible();
    const results = await scan(page);
    expect(results.violations).toEqual([]);
  });

  test("open popover (portalled Radix content) has no detectable violations", async ({ page }) => {
    await page.goto("/");
    // The header "About this app" popover renders its content in a portal.
    await page.getByRole("button", { name: "About this app" }).click();
    const results = await scan(page);
    expect(results.violations).toEqual([]);
    // The Radix Select listbox is deliberately not axe-scanned while open: on
    // open it sets aria-hidden on the rest of the page (to scope focus), which
    // trips axe's aria-hidden-focus rule even though FocusScope traps focus.
    // That is a framework behavior, not an app defect. Keyboard operability of
    // a Radix radiogroup control is covered by the segmented-control test below.
  });

  test("dark mode (loaded state) has no detectable violations", async ({ page }) => {
    // defaultTheme="system" + enableSystem, so emulating the color scheme flips
    // <html class="dark"> without needing to click the toggle.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);
    const results = await scan(page);
    expect(results.violations).toEqual([]);
  });

  test("segmented control is keyboard-operable (radiogroup + arrow keys)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();

    const group = page.getByRole("radiogroup", { name: "Statement grouping" });
    const byAuthor = group.getByRole("radio", { name: "By author" });
    const byRole = group.getByRole("radio", { name: "By role" });

    await expect(byAuthor).toBeChecked();
    await byAuthor.focus();
    await page.keyboard.press("ArrowRight");
    await expect(byRole).toBeChecked();
    await expect(byRole).toBeFocused();
  });

  test("help disclosure exposes state and respects reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const help = page.getByRole("button", { name: "How it works" });
    await expect(help).toHaveAttribute("aria-expanded", "false");
    await help.click();
    await expect(help).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#getting-started")).toBeVisible();
  });

  // axe cannot invoke a keyboard drag, so the dnd-kit reorder; the most
  // complex custom widget here, it needs an explicit test.
  test("the contributor list reorders by keyboard", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    const rows = contributorRows(page);
    await expect(rows).toHaveCount(3);

    const names = () =>
      rows.locator("input[type=text]").evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    expect(await names()).toEqual(["Jane A. Smith", "Bob White", "Carol Davis"]);

    // dnd-kit's KeyboardSensor needs a frame to register the pick-up before it
    // will act on an arrow key; pressing all three keys back-to-back drops the
    // row where it started.
    await page.getByRole("button", { name: /Reorder Jane/ }).focus();
    await page.keyboard.press("Space");
    // dnd-kit fires onDragStart then onDragOver immediately, so the "Picked up"
    // announcement is usually already replaced by the "is over" one. Either
    // proves the drag is live, which is the signal we actually need.
    await expect(page.getByText(/Picked up contributor|is over/)).toBeAttached();
    await page.keyboard.press("ArrowDown");
    // Drop only once the move has actually registered against the next row;
    // pressing Space in the same tick drops the row where it started.
    await expect(page.getByText(/is over Bob White/)).toBeAttached();
    await page.keyboard.press("Space");

    await expect.poll(names).toEqual(["Bob White", "Jane A. Smith", "Carol Davis"]);
  });

  test("the contributor list exposes its rows as a list", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    // Without list semantics a screen reader gets no item count or position.
    await expect(contributorRows(page)).toHaveCount(3);
  });

  // Removing a row unmounts the button that was just activated. Focus must not
  // fall back to <body>, which sends a keyboard user to the top of the page.
  test("keeps focus in the contributor list after removing a row", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(contributorRows(page)).toHaveCount(3);

    await page
      .getByRole("button", { name: /^Remove / })
      .first()
      .click();
    await expect(contributorRows(page)).toHaveCount(2);

    const focused = await page.evaluate(() => ({
      tag: document.activeElement?.tagName ?? "",
      label: document.activeElement?.getAttribute("aria-label") ?? "",
    }));
    expect(focused.tag, "focus fell back to the body").not.toBe("BODY");
    expect(focused.label).toMatch(/^Remove /);
  });

  test("the assigned-cell checkmark stays legible on every grid color", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await page.getByText("Heatmap options", { exact: true }).click();
    await page.getByRole("button", { name: "Grid color" }).click();
    // The Okabe-Ito yellow is the worst case: a white glyph vanishes on it.
    await page.getByRole("button", { name: "Set color #f0e442" }).click();
    await page.keyboard.press("Escape");

    const glyph = page
      .getByRole("button", { name: /Conceptualization for Jane A\. Smith: (Contributed|Lead)/ })
      .locator("svg");
    const color = await glyph.evaluate((el) => getComputedStyle(el).color);
    // Dark ink, not white; onColor picks by measured contrast.
    expect(color).toBe("rgb(22, 24, 28)");
  });

  test("compact icon controls meet the minimum target size", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();

    const settled = async (target: Locator) => {
      await settleMotion(page);
      return target.boundingBox();
    };

    const reorder = await settled(page.getByRole("button", { name: /Reorder Jane/ }));
    const roleInfo = await settled(page.getByRole("button", { name: "About Conceptualization" }));
    await page.getByText("Heatmap options", { exact: true }).click();
    await page.getByRole("button", { name: "Grid color" }).click();
    const swatch = await settled(page.getByRole("button", { name: /Set color/ }).first());

    for (const box of [reorder, roleInfo, swatch]) {
      expect(box).not.toBeNull();
      expect(box?.width).toBeGreaterThanOrEqual(24);
      expect(box?.height).toBeGreaterThanOrEqual(24);
    }
  });
});
