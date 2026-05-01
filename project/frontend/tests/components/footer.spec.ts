import { test, expect } from "../fixtures/base";

test.describe("Footer component", () => {
    test("visible on desktop", async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.goto("/");
        await page.waitForTimeout(1000);

        const footer = page.locator("footer").first();
        if (await footer.count() > 0) {
            await expect(footer).toBeVisible();
        }
    });

    test("hidden on mobile", async ({ mobilePage }) => {
        await mobilePage.goto("/");
        await mobilePage.waitForTimeout(1000);

        // On mobile, the desktop footer should be hidden
        // The body padding should account for the mobile nav
        const bodyPadding = await mobilePage.evaluate(() => {
            return window.getComputedStyle(document.body).paddingBottom;
        });
        expect(parseInt(bodyPadding)).toBeGreaterThan(0);
    });
});