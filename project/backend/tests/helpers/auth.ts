import { Security } from "shared/helpers";
import { AUTH_COOKIE_NAME } from "shared/config";
import { db } from "shared/helpers";
import type { IAuthToken } from "shared/schema";
import { apiFetch } from "./setup";

const TEST_PASSWORD = "TestPass123!";
const TEST_REGISTRATION_KEY = "BPA2026JudgePreview";

interface RegisteredUser {
    id: string;
    handle: string;
    email: string;
    cookie: string;
}

export async function registerUser(
    url: string,
    overrides: Partial<{
        handle: string;
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        dob: string;
        registrationKey: string;
    }> = {}
): Promise<RegisteredUser> {
    const handle = overrides.handle ?? `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const email = overrides.email ?? `${handle}@test.com`;
    const password = overrides.password ?? TEST_PASSWORD;

    const res = await apiFetch(url, "/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
            handle,
            email,
            password,
            firstName: overrides.firstName ?? "Test",
            lastName: overrides.lastName ?? "User",
            dob: overrides.dob ?? "1990-01-01",
            registrationKey: overrides.registrationKey ?? TEST_REGISTRATION_KEY,
        }),
    });

    if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`registerUser failed (${res.status}): ${errBody}`);
    }

    // Register doesn't set a login cookie — must login separately
    const loginRes = await apiFetch(url, "/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ emailOrHandle: email, password, remember: true }),
    });

    const cookie = extractCookie(loginRes);

    // Get user ID from DB
    const user = await db.user.findUnique({ where: { handle } });

    return {
        id: user?.id ?? "",
        handle,
        email,
        cookie,
    };
}

function extractCookie(res: Response): string {
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
        const match = setCookie.split(";").find((c: string) => c.trim().startsWith(`${AUTH_COOKIE_NAME}=`));
        return match?.trim() ?? "";
    }
    // Try getSetCookie() as fallback
    if (typeof res.headers.getSetCookie === "function") {
        const cookies = res.headers.getSetCookie();
        const match = cookies.find((c: string) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
        if (match) return match.split(";")[0].trim();
    }
    return "";
}

export async function loginUser(
    url: string,
    emailOrHandle: string,
    password: string = TEST_PASSWORD
): Promise<{ cookie: string; data: any }> {
    const res = await apiFetch(url, "/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
            emailOrHandle: emailOrHandle,
            password,
            remember: true,
        }),
    });

    const cookie = extractCookie(res);
    const data = await res.json();
    return { cookie, data };
}

export async function createAdminUser(url: string): Promise<RegisteredUser> {
    const user = await registerUser(url);
    await db.user.update({
        where: { id: user.id },
        data: { role: "ADMIN" },
    });
    return user;
}

export async function getAuthCookie(url: string, overrides?: Parameters<typeof registerUser>[1]): Promise<string> {
    const user = await registerUser(url, overrides);
    return user.cookie;
}

/** Create a token cookie directly (without hitting the register/login endpoints) */
export function makeAuthCookie(userId: string, handle: string): string {
    const token = Security.encodeToken<IAuthToken>({ sub: userId, iat: Math.floor(Date.now() / 1000) });
    return `${AUTH_COOKIE_NAME}=${token}`;
}

export { TEST_PASSWORD, TEST_REGISTRATION_KEY };