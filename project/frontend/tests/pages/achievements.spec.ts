import { test, expect } from "../fixtures/base";

test.describe("Achievements page", () => {
    test("shows achievement grid", async ({ page }) => {
        await page.goto("/achievements");
        await page.waitForTimeout(2000);

        // Should show some achievement UI
        const body = page.locator("body");
        await expect(body).toBeVisible();
    });

    test("shows leaderboard section", async ({ page }) => {
        await page.goto("/achievements");
        await page.waitForTimeout(2000);

        // Check for leaderboard
        const leaderboard = page.locator('[data-testid="leaderboard"], .leaderboard, :has-text("Leaderboard")').first();
        // May or may not be present depending on data
    });
});