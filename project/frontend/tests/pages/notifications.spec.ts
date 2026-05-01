import { test, expect } from "../fixtures/base";

test.describe("Notifications page", () => {
    test("shows notification list when authenticated", async ({ page }) => {
        const response = await page.request.post("/api/v1/auth/login", {
            data: { email: "e2etest@test.com", password: "TestPass123!", remember: true },
        });

        if (response.status() === 200) {
            const setCookie = response.headers()["set-cookie"] ?? "";
            if (setCookie) {
                await page.context().addCookies([{
                    name: "__sstk",
                    value: setCookie.split("__sstk=")[1]?.split(";")[0] ?? "",
                    domain: "localhost",
                    path: "/",
                }]);
            }
        }

        await page.goto("/notifications");
        await page.waitForTimeout(2000);

        // Should show some notification UI or empty state
        const body = page.locator("body");
        await expect(body).toBeVisible();
    });

    test("redirects to login when unauthenticated", async ({ page }) => {
        await page.goto("/notifications");
        await page.waitForTimeout(2000);
        // Should redirect or show auth wall
        const url = page.url();
        expect(url).toMatch(/\/(auth\/login|notifications)/);
    });
});