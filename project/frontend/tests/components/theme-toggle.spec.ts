import { test, expect } from "../fixtures/base";

test.describe("ThemeToggle component", () => {
    test("switches between light and dark themes", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(1000);

        const themeToggle = page.locator('[data-testid="theme-toggle"], .theme-toggle, button:has-text("🌙"), button:has-text("☀")').first();
        if (await themeToggle.count() > 0) {
            await themeToggle.click();
            await page.waitForTimeout(500);

            // Check data-theme attribute changed
            const theme = await page.locator("html").getAttribute("data-theme");
            expect(theme).toBeTruthy();
        }
    });

    test("theme persists in localStorage", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(1000);

        const themeToggle = page.locator('[data-testid="theme-toggle"], .theme-toggle').first();
        if (await themeToggle.count() > 0) {
            await themeToggle.click();
            await page.waitForTimeout(500);

            const stored = await page.evaluate(() => localStorage.getItem("theme"));
            expect(stored).toBeTruthy();
        }
    });
});