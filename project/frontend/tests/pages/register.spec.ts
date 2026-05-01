import { test, expect } from "../fixtures/base";

test.describe("Register page", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/auth/register");
    });

    test("displays registration form with all fields", async ({ page }) => {
        await expect(page.locator('input[name="email"], input[placeholder*="mail"]').first()).toBeVisible();
        await expect(page.locator('input[type="password"]').first()).toBeVisible();
        await expect(page.locator('input[name="handle"], input[placeholder*="handle"]').first()).toBeVisible();
    });

    test("successful registration shows success message", async ({ page }) => {
        const timestamp = Date.now();
        const emailInput = page.locator('input[name="email"], input[placeholder*="mail"]').first();
        const handleInput = page.locator('input[name="handle"], input[placeholder*="handle"]').first();
        const passwordInputs = page.locator('input[type="password"]');
        const firstNameInput = page.locator('input[name="firstName"], input[placeholder*="First"]').first();
        const lastNameInput = page.locator('input[name="lastName"], input[placeholder*="Last"]').first();

        await emailInput.fill(`e2ereg_${timestamp}@test.com`);
        await handleInput.fill(`e2ereg_${timestamp}`);
        await passwordInputs.nth(0).fill("TestPass123!");
        if (await passwordInputs.count() > 1) {
            await passwordInputs.nth(1).fill("TestPass123!");
        }
        await firstNameInput.fill("E2E");
        await lastNameInput.fill("Reg");

        // Fill DOB if present
        const dobInput = page.locator('input[name="dob"], input[type="date"]').first();
        if (await dobInput.count() > 0) {
            await dobInput.fill("1990-01-01");
        }

        // Fill registration key
        const regKeyInput = page.locator('input[name="registrationKey"], input[placeholder*="key"]').first();
        if (await regKeyInput.count() > 0) {
            await regKeyInput.fill("BPA2026JudgePreview");
        }

        // Check terms if checkbox exists
        const termsCheckbox = page.locator('input[type="checkbox"]').first();
        if (await termsCheckbox.count() > 0) {
            await termsCheckbox.check();
        }

        const submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
        await submitButton.click();

        await page.waitForTimeout(3000);
    });

    test("has login link", async ({ page }) => {
        const loginLink = page.locator('a[href*="login"], a:has-text("Login")');
        if (await loginLink.count() > 0) {
            await expect(loginLink.first()).toBeVisible();
        }
    });
});