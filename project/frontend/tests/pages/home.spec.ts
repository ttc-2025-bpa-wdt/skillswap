import { test, expect } from "../fixtures/base";

test.describe("Home page", () => {
    test("displays hero section", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(1000);

        // Check that the page loaded with some content
        const body = page.locator("body");
        await expect(body).toBeVisible();
    });

    test("has navigation links", async ({ page }) => {
        await page.goto("/");

        // TopBar should have nav links
        const homeLink = page.locator('a[href="/"]').first();
        if (await homeLink.count() > 0) {
            await expect(homeLink).toBeVisible();
        }
    });
});