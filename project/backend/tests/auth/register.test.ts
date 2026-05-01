import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser, TEST_PASSWORD, TEST_REGISTRATION_KEY } from "../helpers/auth";
import { db } from "shared/helpers";
import { LIMITS } from "shared/config";


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

describe("POST /auth/register", () => {
    it("registers with valid data and creates user with emailVerified=false", async () => {
        const res = await apiFetch(url, "/api/v1/auth/register", {
            method: "POST",
            body: JSON.stringify({
                handle: "newuser",
                email: "new@test.com",
                password: TEST_PASSWORD,
                firstName: "New",
                lastName: "User",
                dob: "1995-06-15",
                registrationKey: TEST_REGISTRATION_KEY,
            }),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);

        const user = await db.user.findUnique({ where: { handle: "newuser" } });
        expect(user).not.toBeNull();
        expect(user!.emailVerified).toBe(false);
    });

    it("rejects missing required fields", async () => {
        const cases = [
            { handle: "u", email: "u@t.com", password: TEST_PASSWORD, firstName: "T", lastName: "U", dob: "1990-01-01" }, // missing registrationKey
            { email: "nohandle@test.com", password: TEST_PASSWORD, firstName: "T", lastName: "U", dob: "1990-01-01", registrationKey: TEST_REGISTRATION_KEY }, // missing handle
        ];

        for (const body of cases) {
            const res = await apiFetch(url, "/api/v1/auth/register", {
                method: "POST",
                body: JSON.stringify(body),
            });
            expect(res.status).toBe(400);
        }
    });

    it("rejects invalid registration key", async () => {
        const res = await apiFetch(url, "/api/v1/auth/register", {
            method: "POST",
            body: JSON.stringify({
                handle: "badkey",
                email: "badkey@test.com",
                password: TEST_PASSWORD,
                firstName: "Bad",
                lastName: "Key",
                dob: "1990-01-01",
                registrationKey: "wrongkey",
            }),
        });

        expect(res.status).toBe(403);
    });

    it("rejects invalid email format", async () => {
        const res = await apiFetch(url, "/api/v1/auth/register", {
            method: "POST",
            body: JSON.stringify({
                handle: "bademail",
                email: "not-an-email",
                password: TEST_PASSWORD,
                firstName: "Bad",
                lastName: "Email",
                dob: "1990-01-01",
                registrationKey: TEST_REGISTRATION_KEY,
            }),
        });

        expect(res.status).toBe(400);
    });

    it("rejects handle shorter than 3 characters", async () => {
        const res = await apiFetch(url, "/api/v1/auth/register", {
            method: "POST",
            body: JSON.stringify({
                handle: "ab",
                email: "short@test.com",
                password: TEST_PASSWORD,
                firstName: "Short",
                lastName: "Handle",
                dob: "1990-01-01",
                registrationKey: TEST_REGISTRATION_KEY,
            }),
        });

        expect(res.status).toBe(400);
    });

    it("rejects handle longer than 24 characters", async () => {
        const res = await apiFetch(url, "/api/v1/auth/register", {
            method: "POST",
            body: JSON.stringify({
                handle: "a".repeat(25),
                email: "long@test.com",
                password: TEST_PASSWORD,
                firstName: "Long",
                lastName: "Handle",
                dob: "1990-01-01",
                registrationKey: TEST_REGISTRATION_KEY,
            }),
        });

        expect(res.status).toBe(400);
    });

    it("rejects duplicate email", async () => {
        const first = await registerUser(url, { email: "dup@test.com" });
        // Verify first user was actually created
        const checkUser = await db.user.findUnique({ where: { email: "dup@test.com" } });
        expect(checkUser).not.toBeNull();

        const res = await apiFetch(url, "/api/v1/auth/register", {
            method: "POST",
            body: JSON.stringify({
                handle: "anotheruser_dup",
                email: "dup@test.com",
                password: TEST_PASSWORD,
                firstName: "Dup",
                lastName: "Email",
                dob: "1990-01-01",
                registrationKey: TEST_REGISTRATION_KEY,
            }),
        });

        expect(res.status).toBe(409);
    });

    it("rejects duplicate handle", async () => {
        const first = await registerUser(url, { handle: "duphandle" });
        const checkUser = await db.user.findUnique({ where: { handle: "duphandle" } });
        expect(checkUser).not.toBeNull();

        const res = await apiFetch(url, "/api/v1/auth/register", {
            method: "POST",
            body: JSON.stringify({
                handle: "duphandle",
                email: "different_dup@test.com",
                password: TEST_PASSWORD,
                firstName: "Dup",
                lastName: "Handle",
                dob: "1990-01-01",
                registrationKey: TEST_REGISTRATION_KEY,
            }),
        });

        expect(res.status).toBe(409);
    });

    it("rejects name exceeding NAME_MAX", async () => {
        const res = await apiFetch(url, "/api/v1/auth/register", {
            method: "POST",
            body: JSON.stringify({
                handle: "longname",
                email: "longname@test.com",
                password: TEST_PASSWORD,
                firstName: "x".repeat(LIMITS.NAME_MAX + 1),
                lastName: "User",
                dob: "1990-01-01",
                registrationKey: TEST_REGISTRATION_KEY,
            }),
        });

        expect(res.status).toBe(400);
    });

    it("creates profile with default avatar and empty bio", async () => {
        await registerUser(url, { handle: "profiletest" });

        const user = await db.user.findUnique({
            where: { handle: "profiletest" },
            include: { profile: true },
        });

        expect(user).not.toBeNull();
        expect(user!.profile).not.toBeNull();
        expect(user!.profile!.avatarUrl).toContain("default");
        expect(user!.profile!.bio).toBe("");
    });
});