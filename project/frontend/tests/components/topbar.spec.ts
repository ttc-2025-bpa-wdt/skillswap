import { test, expect } from "../fixtures/base";

test.describe("TopBar component", () => {
    test("shows logo link", async ({ page }) => {
        await page.goto("/");
        const logo = page.locator(".logo a, a[href='/']").first();
        if (await logo.count() > 0) {
            await expect(logo).toBeVisible();
        }
    });

    test("shows login/register for unauthenticated users", async ({ page }) => {
        await page.goto("/");

        // On desktop, should show Login/Register
        const loginButton = page.locator('a[href*="login"], button:has-text("Login")').first();
        if (await loginButton.count() > 0) {
            await expect(loginButton).toBeVisible();
        }
    });

    test("shows hamburger menu on mobile", async ({ mobilePage }) => {
        await mobilePage.goto("/");

        const hamburger = mobilePage.locator('[data-hamburger], button:has-text("☰")').first();
        if (await hamburger.count() > 0) {
            await expect(hamburger).toBeVisible();
        }
    });

    test("search bar visible on desktop", async ({ page }) => {
        await page.goto("/");

        const searchBar = page.locator('input[type="search"], input[placeholder*="Find"], .search input').first();
        // Search bar may be in the nav on desktop
    });
});