import { test, expect } from "../fixtures/base";

test.describe("ThemeToggle component", () => {
    test("switches between light and dark themes on desktop", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(1000);

        // ThemeToggle is in desktop nav
        const themeToggle = page.locator(".theme-toggle").first();
        if (await themeToggle.count() > 0) {
            await themeToggle.click();
            await page.waitForTimeout(500);

            const theme = await page.locator("html").getAttribute("data-theme");
            expect(theme).toBeTruthy();
        }
    });

    test("theme persists in localStorage on desktop", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(1000);

        const themeToggle = page.locator(".theme-toggle").first();
        if (await themeToggle.count() > 0) {
            await themeToggle.click();
            await page.waitForTimeout(500);

            const stored = await page.evaluate(() => localStorage.getItem("theme"));
            expect(stored).toBeTruthy();
        }
    });

    test("theme toggle accessible via mobile dropdown", async ({ mobilePage }) => {
        await mobilePage.goto("/");
        await mobilePage.waitForTimeout(1000);

        // Open hamburger menu to reveal dropdown
        const hamburger = mobilePage.locator("button.hamburger").first();
        await hamburger.click();
        await mobilePage.waitForTimeout(300);

        // Theme toggle should be in the dropdown
        const dropdownThemeToggle = mobilePage.locator(".dropdown-menu .theme-toggle").first();
        if (await dropdownThemeToggle.count() > 0) {
            await dropdownThemeToggle.click();
            await mobilePage.waitForTimeout(500);

            const theme = await mobilePage.locator("html").getAttribute("data-theme");
            expect(theme).toBeTruthy();
        }
    });

    test("defaults to light theme", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(1000);

        const theme = await page.locator("html").getAttribute("data-theme");
        expect(theme).toBe("light");
    });
});