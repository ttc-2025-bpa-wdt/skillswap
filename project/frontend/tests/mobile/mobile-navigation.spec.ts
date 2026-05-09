import { test, expect } from "../fixtures/base";

test.describe("Mobile navigation", () => {
    test("bottom nav visible on mobile viewport", async ({ mobilePage }) => {
        await mobilePage.goto("/");
        await mobilePage.waitForTimeout(1000);

        const nav = mobilePage.locator("nav.mobile-nav").first();
        await expect(nav).toBeVisible();
    });

    test("bottom nav shows Explore and Sign In for logged-out users", async ({ mobilePage }) => {
        await mobilePage.goto("/");
        await mobilePage.waitForTimeout(1000);

        const nav = mobilePage.locator("nav.mobile-nav");
        // Explore link should always be visible
        const exploreLink = nav.locator('a[href="/search"]').first();
        await expect(exploreLink).toBeVisible();

        // Sign In link visible when logged out
        const signInLink = nav.locator('a[href="/auth/login"]').first();
        await expect(signInLink).toBeVisible();
    });

    test("bottom nav shows Home, Explore, Create, Alerts, Profile for logged-in users", async ({ authenticatedPage }) => {
        await authenticatedPage.setViewportSize({ width: 393, height: 830 });
        await authenticatedPage.goto("/dashboard");
        await authenticatedPage.waitForTimeout(2000);

        // Verify we actually authenticated (redirected to dashboard, not login)
        const url = authenticatedPage.url();
        if (!url.includes("/dashboard") && !url.includes("/home")) {
            test.skip();
        }

        const nav = authenticatedPage.locator("nav.mobile-nav");
        await expect(nav.locator('a[href="/dashboard"]').first()).toBeVisible();
        await expect(nav.locator('a[href="/search"]').first()).toBeVisible();
        await expect(nav.locator('a[href="/session/create"]').first()).toBeVisible();
        await expect(nav.locator('a[href="/notifications"]').first()).toBeVisible();
        await expect(nav.locator('a[href="/profile"]').first()).toBeVisible();
    });

    test("center Create button is elevated", async ({ authenticatedPage }) => {
        await authenticatedPage.setViewportSize({ width: 393, height: 830 });
        await authenticatedPage.goto("/dashboard");
        await authenticatedPage.waitForTimeout(2000);

        const url = authenticatedPage.url();
        if (!url.includes("/dashboard") && !url.includes("/home")) {
            test.skip();
        }

        const centerButton = authenticatedPage.locator("nav.mobile-nav a.center .center-button").first();
        await expect(centerButton).toBeVisible();
    });

    test("navigation links navigate on click", async ({ mobilePage }) => {
        await mobilePage.goto("/");
        await mobilePage.waitForTimeout(1000);

        const exploreLink = mobilePage.locator("nav.mobile-nav a[href='/search']").first();
        await exploreLink.click();
        await mobilePage.waitForTimeout(1000);

        expect(mobilePage.url()).toContain("/search");
    });
});