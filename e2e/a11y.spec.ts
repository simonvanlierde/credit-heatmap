import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

/**
 * Automated accessibility scans. axe-core catches a subset of WCAG issues
 * (roughly a third) — a guardrail against regressions, not a conformance claim.
 * We scan the app's main states; the heatmap SVG is aria-hidden (a text
 * alternative sits beside it) so axe correctly skips it.
 */

// Pin the rule set to WCAG 2.0/2.1 A + AA so the scan matches what the README
// documents, rather than tracking axe's shifting defaults (which also include
// best-practice rules).
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const scan = (page: Page) => new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

test.describe("Accessibility (axe-core)", () => {
  test("first-run empty state has no detectable violations", async ({ page }) => {
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
    await page.getByRole("button", { name: "Import Data" }).click();
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
});
