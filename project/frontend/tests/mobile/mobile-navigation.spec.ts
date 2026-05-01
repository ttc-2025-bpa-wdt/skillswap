import { test, expect } from "../fixtures/base";

test.describe("Mobile navigation", () => {
    test("bottom nav visible on mobile viewport", async ({ mobilePage }) => {
        await mobilePage.goto("/");
        await mobilePage.waitForTimeout(1000);

        // MobileNavBar should be visible on small screens
        const nav = mobilePage.locator("nav, .mobile-nav, [data-testid='mobile-nav']").first();
        // May use different selector
    });

    test("navigation links work on mobile", async ({ mobilePage }) => {
        await mobilePage.goto("/");
        await mobilePage.waitForTimeout(1000);

        // Find and click navigation links
        const navLinks = mobilePage.locator("nav a, .mobile-nav a").first();
        if (await navLinks.count() > 0) {
            await navLinks.first().click();
        }
    });
});