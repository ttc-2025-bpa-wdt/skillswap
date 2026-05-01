import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser } from "../helpers/auth";
import { Security } from "shared/helpers";
import { db } from "shared/helpers";
import type { IAuthToken, IEmailVerificationToken } from "shared/schema";


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

describe("GET /auth/verify-email", () => {
    it("verifies email with valid token", async () => {
        const user = await registerUser(url, { email: "verify@test.com", handle: "verifyuser" });
        const dbUser = await db.user.findUnique({ where: { handle: "verifyuser" } });

        // Generate a verification token
        const token = Security.encodeToken<IEmailVerificationToken>({
            sub: dbUser!.id,
            email: dbUser!.email,
            iat: Math.floor(Date.now() / 1000),
        });

        const res = await apiFetch(url, `/api/v1/auth/verify-email?token=${token}`, { redirect: "manual" });

        expect([200, 302]).toContain(res.status);
        const updated = await db.user.findUnique({ where: { handle: "verifyuser" } });
        expect(updated!.emailVerified).toBe(true);
    });

    it("rejects invalid token", async () => {
        const res = await apiFetch(url, "/api/v1/auth/verify-email?token=invalidtoken");

        expect(res.status).toBe(400);
    });

    it("rejects token for nonexistent user", async () => {
        const token = Security.encodeToken<IEmailVerificationToken>({
            sub: "00000000-0000-0000-0000-000000000000",
            email: "nobody@test.com",
            iat: Math.floor(Date.now() / 1000),
        });

        const res = await apiFetch(url, `/api/v1/auth/verify-email?token=${token}`);

        // Should still return 400 since user doesn't exist
        expect([400, 404]).toContain(res.status);
    });
});