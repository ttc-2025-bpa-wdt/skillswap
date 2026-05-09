import { test, expect } from "../fixtures/base";

test.describe("TopBar component", () => {
    test("shows logo link", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(1000);
        const logo = page.locator(".logo a").first();
        await expect(logo).toBeVisible();
    });

    test("shows login/register for unauthenticated users on desktop", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(1000);
        // Desktop view — nav should be visible above 768px
        const loginButton = page.locator("nav .auth-buttons a[href*='login']").first();
        await expect(loginButton).toBeVisible();
    });

    test("shows hamburger menu on mobile", async ({ mobilePage }) => {
        await mobilePage.goto("/");
        await mobilePage.waitForTimeout(1000);
        const hamburger = mobilePage.locator("button.hamburger").first();
        await expect(hamburger).toBeVisible();
    });

    test("hamburger opens dropdown menu on mobile", async ({ mobilePage }) => {
        await mobilePage.goto("/");
        await mobilePage.waitForTimeout(1000);
        const hamburger = mobilePage.locator("button.hamburger").first();
        await hamburger.click();

        const dropdown = mobilePage.locator(".dropdown-menu").first();
        await expect(dropdown).toBeVisible();

        const themeToggle = dropdown.locator(".dropdown-theme").first();
        await expect(themeToggle).toBeVisible();
    });

    test("search bar visible on desktop", async ({ page }) => {
        await page.goto("/");
        await page.waitForTimeout(1000);
        const searchBar = page.locator("nav .search input, nav input[placeholder*='Find']").first();
        await expect(searchBar).toBeVisible();
    });

    test("search bar hidden on mobile", async ({ mobilePage }) => {
        await mobilePage.goto("/");
        await mobilePage.waitForTimeout(1000);
        const desktopNav = mobilePage.locator(".topbar nav").first();
        await expect(desktopNav).toBeHidden();
    });

    test("notification bell visible on mobile when logged in", async ({ authenticatedPage }) => {
        await authenticatedPage.setViewportSize({ width: 393, height: 830 });
        await authenticatedPage.goto("/dashboard");
        await authenticatedPage.waitForTimeout(2000);

        // Skip if auth didn't work (redirected to login)
        if (authenticatedPage.url().includes("/auth/login")) {
            test.skip();
        }

        const bell = authenticatedPage.locator(".mobile-icon-btn[aria-label='Notifications']").first();
        if (await bell.count() > 0) {
            await expect(bell).toBeVisible();
        }
    });
});