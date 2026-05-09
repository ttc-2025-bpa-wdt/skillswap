import { test as base, expect } from "@playwright/test";
import { loginViaApi, registerViaApi, setAuthCookie } from "./auth";

export const TEST_USER = {
    handle: "e2etestuser",
    email: "e2etest@test.com",
    password: "password123",
    firstName: "E2E",
    lastName: "Test",
    dob: "1990-01-01",
    registrationKey: "BPA2026JudgePreview",
};

export const ADMIN_USER = {
    handle: "e2eadmin",
    email: "e2eadmin@test.com",
    password: "password123",
    firstName: "Admin",
    lastName: "E2E",
    dob: "1985-06-15",
    registrationKey: "BPA2026JudgePreview",
};

export const DEMO_USER = {
    handle: "demo.user",
    email: "demo@skillswap.bpariverside.org",
    password: "password123",
};

type TestFixtures = {
    authenticatedPage: typeof base.page;
    adminPage: typeof base.page;
    mobilePage: typeof base.page;
    iphonePage: typeof base.page;
};

export const test = base.extend<TestFixtures>({
    authenticatedPage: async ({ page }, use) => {
        const cookie = await loginViaApi(page, TEST_USER.email, TEST_USER.password);
        await setAuthCookie(page, cookie);
        await use(page);
    },

    adminPage: async ({ page }, use) => {
        const cookie = await loginViaApi(page, ADMIN_USER.email, ADMIN_USER.password);
        await setAuthCookie(page, cookie);
        await use(page);
    },

    mobilePage: async ({ page }, use) => {
        await page.setViewportSize({ width: 393, height: 830 });
        await use(page);
    },

    iphonePage: async ({ page }, use) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await use(page);
    },
});

export { expect };