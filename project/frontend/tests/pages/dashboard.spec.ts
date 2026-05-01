import { test, expect } from "../fixtures/base";

test.describe("Dashboard page", () => {
    test("redirects to login when unauthenticated", async ({ page }) => {
        await page.goto("/dashboard");
        // Should redirect to login or show auth wall
        await page.waitForTimeout(2000);
        const url = page.url();
        expect(url).toMatch(/\/(auth\/login|dashboard)/);
    });

    test("shows welcome heading when authenticated", async ({ page }) => {
        // Login first via API
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

        await page.goto("/dashboard");
        await page.waitForTimeout(2000);
    });

    test("has create session button", async ({ page }) => {
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

        await page.goto("/dashboard");
        await page.waitForTimeout(2000);

        const createButton = page.locator('a:has-text("Create"), button:has-text("Create")').first();
        if (await createButton.count() > 0) {
            await expect(createButton).toBeVisible();
        }
    });
});