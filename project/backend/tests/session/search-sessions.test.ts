import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser } from "../helpers/auth";
import { createTestUser, createTestSession } from "../helpers/fixtures";


let url: string;
let userCookie: string;
let hostId: string;

beforeAll(async () => {
    const result = await startTestServer();
    url = result.url;
});

afterAll(async () => {
    await stopTestServer();
});

beforeEach(async () => {
    await resetDatabase();
    const user = await registerUser(url, { handle: "searchuser", email: "search@test.com" });
    userCookie = user.cookie;
    const { user: host } = await createTestUser({ handle: "searchhost" });
    hostId = host.id;

    // Create sessions with different names for searching
    await createTestSession(hostId, { name: "JavaScript Basics", description: "Learn JS from scratch", categories: ["programming"] });
    await createTestSession(hostId, { name: "Python Advanced", description: "Advanced Python techniques", categories: ["coding", "data"] });
    await createTestSession(hostId, { name: "Cooking 101", description: "Basic cooking skills", categories: ["food", "lifestyle"] });
});

describe("GET /session/search", () => {
    it("matches on name", async () => {
        const res = await apiFetch(url, "/api/v1/session/search?q=javascript", { cookie: userCookie });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.sessions.length).toBeGreaterThan(0);
        expect(data.sessions[0].name).toContain("JavaScript");
    });

    it("matches on description", async () => {
        const res = await apiFetch(url, "/api/v1/session/search?q=techniques", { cookie: userCookie });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.sessions.length).toBeGreaterThan(0);
    });

    it("matches on categories", async () => {
        const res = await apiFetch(url, "/api/v1/session/search?q=programming", { cookie: userCookie });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.sessions.length).toBeGreaterThan(0);
    });

    it("returns empty results for no match", async () => {
        const res = await apiFetch(url, "/api/v1/session/search?q=nonexistentthing", { cookie: userCookie });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.sessions.length).toBe(0);
    });

    it("is case-insensitive", async () => {
        const res = await apiFetch(url, "/api/v1/session/search?q=JAVASCRIPT", { cookie: userCookie });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.sessions.length).toBeGreaterThan(0);
    });
});