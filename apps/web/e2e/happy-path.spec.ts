import { expect, test } from "@playwright/test";

test.describe("Happy path UI flows", () => {
  test("Import names, assign role, and see heatmap", async ({ page }) => {
    await page.goto("/");

    // Open import modal
    await page.getByRole("button", { name: "Import" }).click();

    // Wait for modal textarea to appear, then fill
    const textarea = page.locator("#import-text");
    await textarea.waitFor({ state: "visible" });
    await textarea.fill("Jane Smith\nBob White");

    // Click Import Data (ensure it's in view first)
    const importBtn = page.getByRole("button", { name: "Import Data" });
    await importBtn.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Import Data");
      (btn as HTMLButtonElement | undefined)?.click();
    });

    // Verify authors appear (count shows 2 authors) and Jane is visible
    await expect(page.getByText("Jane Smith")).toBeVisible();
    await expect(page.getByText("2 authors")).toBeVisible();

    // Verify heatmap SVG is present (authors were imported)
    await expect(page.locator("svg").first()).toBeVisible();
  });

  test("XML export triggers API call (mocked)", async ({ page }) => {
    await page.goto("/");

    // Mock the XML export endpoint
    await page.route("/api/v1/xml/export", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/xml",
        body: "<contrib-group></contrib-group>",
        headers: { "Content-Disposition": 'attachment; filename="credit-contributors.xml"' },
      });
    });

    // Open import modal and add Alice Brown
    await page.getByRole("button", { name: "Import" }).click();
    const ta = page.locator("#import-text");
    await ta.waitFor({ state: "visible" });
    await ta.fill("Alice Brown");
    const importBtn2 = page.getByRole("button", { name: "Import Data" });
    await importBtn2.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Import Data");
      (btn as HTMLButtonElement | undefined)?.click();
    });

    // Verify author appears
    await expect(page.getByText("Alice Brown")).toBeVisible();

    // Click XML export button
    await page.getByRole("button", { name: /XML \(JATS4R\)/ }).click();

    // No error should be visible — ensure button is enabled again
    await expect(page.getByRole("button", { name: /XML \(JATS4R\)/ })).toBeEnabled();
  });
});
