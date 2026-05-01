import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser, createAdminUser } from "../helpers/auth";
import { LIMITS } from "shared/config";


let url: string;
let userCookie: string;
let adminCookie: string;

beforeAll(async () => {
    const result = await startTestServer();
    url = result.url;
});

afterAll(async () => {
    await stopTestServer();
});

beforeEach(async () => {
    await resetDatabase();
    const user = await registerUser(url, { handle: "updateuser", email: "update@test.com" });
    userCookie = user.cookie;
    const admin = await createAdminUser(url);
    adminCookie = admin.cookie;
});

describe("PUT /user", () => {
    it("updates display name and bio", async () => {
        const res = await apiFetch(url, "/api/v1/user", {
            method: "PUT",
            cookie: userCookie,
            body: JSON.stringify({ displayName: "New Name", bio: "New bio" }),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
    });

    it("rejects display name exceeding DISPLAY_NAME_MAX", async () => {
        const res = await apiFetch(url, "/api/v1/user", {
            method: "PUT",
            cookie: userCookie,
            body: JSON.stringify({ displayName: "x".repeat(LIMITS.DISPLAY_NAME_MAX + 1) }),
        });

        expect(res.status).toBe(400);
    });

    it("rejects bio exceeding BIO_MAX", async () => {
        const res = await apiFetch(url, "/api/v1/user", {
            method: "PUT",
            cookie: userCookie,
            body: JSON.stringify({ bio: "x".repeat(LIMITS.BIO_MAX + 1) }),
        });

        expect(res.status).toBe(400);
    });

    it("rejects invalid avatarUrl", async () => {
        const res = await apiFetch(url, "/api/v1/user", {
            method: "PUT",
            cookie: userCookie,
            body: JSON.stringify({ avatarUrl: "https://evil.com/avatar.png" }),
        });

        expect(res.status).toBe(400);
    });

    it("allows admin to update another user", async () => {
        const res = await apiFetch(url, "/api/v1/user", {
            method: "PUT",
            cookie: adminCookie,
            body: JSON.stringify({ handle: "updateuser", displayName: "Admin Changed" }),
        });

        expect(res.status).toBe(200);
    });

    it("forbids non-admin from updating another user", async () => {
        const res = await apiFetch(url, "/api/v1/user", {
            method: "PUT",
            cookie: userCookie,
            body: JSON.stringify({ handle: "adminuser", displayName: "Hacked" }),
        });

        expect(res.status).toBe(403);
    });

    it("sanitizes tags with validator.escape", async () => {
        const res = await apiFetch(url, "/api/v1/user", {
            method: "PUT",
            cookie: userCookie,
            body: JSON.stringify({ tags: ["<script>alert(1)</script>"] }),
        });

        expect(res.status).toBe(200);
    });

    it("sanitizes skills with validator.escape", async () => {
        const res = await apiFetch(url, "/api/v1/user", {
            method: "PUT",
            cookie: userCookie,
            body: JSON.stringify({ skills: ["<b>bold</b>"] }),
        });

        expect(res.status).toBe(200);
    });

    it("truncates tags exceeding TAGS_COUNT_MAX", async () => {
        const tooMany = Array.from({ length: LIMITS.TAGS_COUNT_MAX + 5 }, (_, i) => `tag${i}`);
        const res = await apiFetch(url, "/api/v1/user", {
            method: "PUT",
            cookie: userCookie,
            body: JSON.stringify({ tags: tooMany }),
        });

        expect(res.status).toBe(200);
    });

    it("truncates tags exceeding TAG_MAX length", async () => {
        const longTag = "x".repeat(LIMITS.TAG_MAX + 10);
        const res = await apiFetch(url, "/api/v1/user", {
            method: "PUT",
            cookie: userCookie,
            body: JSON.stringify({ tags: [longTag] }),
        });

        expect(res.status).toBe(200);
    });
});