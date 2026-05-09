import { test, expect } from "../fixtures/base";

test.describe("Footer component", () => {
    test("visible on desktop", async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.goto("/");
        await page.waitForTimeout(1000);

        const footer = page.locator("footer.desktop-footer").first();
        await expect(footer).toBeVisible();
    });

    test("hidden on mobile", async ({ mobilePage }) => {
        await mobilePage.goto("/");
        await mobilePage.waitForTimeout(1000);

        const footer = mobilePage.locator("footer.desktop-footer").first();
        await expect(footer).toBeHidden();
    });

    test("body has bottom padding on mobile for nav bar", async ({ mobilePage }) => {
        await mobilePage.goto("/");
        await mobilePage.waitForTimeout(1000);

        const bodyPadding = await mobilePage.evaluate(() => {
            return window.getComputedStyle(document.body).paddingBottom;
        });
        expect(parseInt(bodyPadding)).toBeGreaterThan(0);
    });
});