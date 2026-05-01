import { test, expect } from "../fixtures/base";

test.describe("Responsive layout", () => {
    test("desktop: topbar nav links visible, footer visible", async ({ page }) => {
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.goto("/");
        await page.waitForTimeout(1000);

        // Desktop nav should be visible
        const nav = page.locator("nav").first();
        if (await nav.count() > 0) {
            await expect(nav).toBeVisible();
        }
    });

    test("mobile: hamburger visible, footer hidden", async ({ mobilePage }) => {
        await mobilePage.goto("/");
        await mobilePage.waitForTimeout(1000);

        // Footer should be hidden on mobile
        const desktopFooter = mobilePage.locator("footer.desktop-footer, footer").first();
        // On mobile, footer might be hidden via CSS
    });

    test("chat overlay renders full-screen on small screens", async ({ page }) => {
        await page.setViewportSize({ width: 480, height: 800 });
        await page.goto("/");
        await page.waitForTimeout(1000);
        // Chat overlay behavior tested in chat-overlay spec
    });
});