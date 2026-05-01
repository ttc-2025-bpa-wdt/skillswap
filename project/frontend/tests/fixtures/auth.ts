import type { Page } from "@playwright/test";
import { APIRequestContext } from "@playwright/test";

const AUTH_COOKIE_NAME = "__sstk";
const API_BASE = "/api/v1";

/** Login via API and extract the auth cookie */
export async function loginViaApi(page: Page, email: string, password: string): Promise<string> {
    const response = await page.request.post(`${API_BASE}/auth/login`, {
        data: { email, password, remember: true },
    });

    const setCookie = response.headers()["set-cookie"] ?? "";
    const cookie = setCookie
        .split(";")
        .find((c: string) => c.trim().startsWith(`${AUTH_COOKIE_NAME}=`))
        ?.trim() ?? "";

    return cookie;
}

/** Register via API */
export async function registerViaApi(
    request: APIRequestContext,
    overrides: Partial<{
        handle: string;
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        dob: string;
        registrationKey: string;
    }> = {}
): Promise<void> {
    await request.post(`${API_BASE}/auth/register`, {
        data: {
            handle: overrides.handle ?? `e2e_${Date.now()}`,
            email: overrides.email ?? `e2e_${Date.now()}@test.com`,
            password: overrides.password ?? "TestPass123!",
            firstName: overrides.firstName ?? "E2E",
            lastName: overrides.lastName ?? "Test",
            dob: overrides.dob ?? "1990-01-01",
            registrationKey: overrides.registrationKey ?? "BPA2026JudgePreview",
        },
    });
}

/** Set auth cookie on the page's context */
export async function setAuthCookie(page: Page, cookie: string): Promise<void> {
    if (!cookie) return;

    const [name, value] = cookie.split("=");
    await page.context().addCookies([
        {
            name,
            value: value?.split(";")[0] ?? "",
            domain: "localhost",
            path: "/",
        },
    ]);
}