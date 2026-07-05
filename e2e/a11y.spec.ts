import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Automated accessibility scans. axe-core catches a subset of WCAG issues
 * (roughly a third) — a guardrail against regressions, not a conformance claim.
 * We scan the app's main states; the heatmap SVG is aria-hidden (a text
 * alternative sits beside it) so axe correctly skips it.
 */
test.describe("Accessibility (axe-core)", () => {
  test("first-run empty state has no detectable violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("loaded state (contributors, heatmap, statement) has no detectable violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Load sample data" }).click();
    await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(3);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("import modal has no detectable violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Import" }).click();
    await page.locator("#import-text").waitFor({ state: "visible" });
    const results = await new AxeBuilder({ page }).analyze();
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
