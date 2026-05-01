import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser, loginUser, TEST_PASSWORD } from "../helpers/auth";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_EXPIRY } from "shared/config";


let url: string;

beforeAll(async () => {
    const result = await startTestServer();
    url = result.url;
});

afterAll(async () => {
    await stopTestServer();
});

beforeEach(async () => {
    await resetDatabase();
});

describe("POST /auth/login", () => {
    it("logs in with valid email and returns auth cookie", async () => {
        const user = await registerUser(url, { email: "login@test.com", handle: "loginuser" });

        const { cookie, data } = await loginUser(url, "login@test.com");

        expect(data.success).toBe(true);
        expect(cookie).toContain(AUTH_COOKIE_NAME);
    });

    it("logs in with valid handle", async () => {
        await registerUser(url, { handle: "handlelogin", email: "handlelogin@test.com" });

        const { data } = await loginUser(url, "handlelogin");

        expect(data.success).toBe(true);
    });

    it("sets cookie maxAge to AUTH_COOKIE_EXPIRY when remember=true", async () => {
        await registerUser(url, { email: "remember@test.com", handle: "rememberuser" });

        const res = await apiFetch(url, "/api/v1/auth/login", {
            method: "POST",
            body: JSON.stringify({ emailOrHandle: "remember@test.com", password: TEST_PASSWORD, remember: true }),
        });

        const setCookie = res.headers.get("set-cookie") ?? "";
        // Cookie should contain max-age close to AUTH_COOKIE_EXPIRY (7 days in seconds)
        expect(setCookie).toContain("Max-Age");
    });

    it("rejects wrong password", async () => {
        await registerUser(url, { email: "wrongpw@test.com", handle: "wrongpw" });

        const res = await apiFetch(url, "/api/v1/auth/login", {
            method: "POST",
            body: JSON.stringify({ emailOrHandle: "wrongpw@test.com", password: "WrongPassword1!" }),
        });

        expect(res.status).toBe(401);
    });

    it("rejects nonexistent user", async () => {
        const res = await apiFetch(url, "/api/v1/auth/login", {
            method: "POST",
            body: JSON.stringify({ emailOrHandle: "nonexistent@test.com", password: TEST_PASSWORD }),
        });

        expect(res.status).toBe(401);
    });

    it("rejects missing fields", async () => {
        const res = await apiFetch(url, "/api/v1/auth/login", {
            method: "POST",
            body: JSON.stringify({}),
        });

        expect(res.status).toBe(400);
    });

    it("sets httpOnly and sameSite flags on cookie", async () => {
        await registerUser(url, { email: "flags@test.com", handle: "flagsuser" });

        const res = await apiFetch(url, "/api/v1/auth/login", {
            method: "POST",
            body: JSON.stringify({ emailOrHandle: "flags@test.com", password: TEST_PASSWORD, remember: true }),
        });

        const setCookie = res.headers.get("set-cookie") ?? "";
        expect(setCookie).toContain("HttpOnly");
        expect(setCookie).toContain("SameSite");
    });
});