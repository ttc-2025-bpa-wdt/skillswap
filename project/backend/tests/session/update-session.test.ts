import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser, createAdminUser } from "../helpers/auth";
import { createTestUser, createTestSession } from "../helpers/fixtures";


let url: string;
let hostCookie: string;
let otherCookie: string;
let adminCookie: string;
let hostId: string;
let sessionId: string;

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

beforeAll(async () => {
    const result = await startTestServer();
    url = result.url;
});

afterAll(async () => {
    await stopTestServer();
});

beforeEach(async () => {
    await resetDatabase();
    const host = await registerUser(url, { handle: "updatehost", email: "updatehost@test.com" });
    hostCookie = host.cookie;
    hostId = host.id;
    const other = await registerUser(url, { handle: "otheruser", email: "other@test.com" });
    otherCookie = other.cookie;
    const admin = await createAdminUser(url);
    adminCookie = admin.cookie;
    const session = await createTestSession(hostId);
    sessionId = session.id;
});

describe("PATCH /session", () => {
    it("updates own session", async () => {
        const res = await apiFetch(url, "/api/v1/session", {
            method: "PATCH",
            cookie: hostCookie,
            body: JSON.stringify({
                id: sessionId,
                name: "Updated Name",
                description: "Updated description",
                categories: ["testing"],
                difficulty: "beginner",
                meetingUrl: "https://zoom.us/j/123456",
                duration: 60,
                eventDate: FUTURE_DATE,
            }),
        });

        expect(res.status).toBe(200);
    });

    it("allows admin to update any session", async () => {
        const res = await apiFetch(url, "/api/v1/session", {
            method: "PATCH",
            cookie: adminCookie,
            body: JSON.stringify({
                id: sessionId,
                name: "Admin Updated",
                description: "Admin updated",
                categories: ["testing"],
                difficulty: "beginner",
                meetingUrl: "https://zoom.us/j/123456",
                duration: 60,
                eventDate: FUTURE_DATE,
            }),
        });

        expect(res.status).toBe(200);
    });

    it("forbids non-owner non-admin from updating", async () => {
        const res = await apiFetch(url, "/api/v1/session", {
            method: "PATCH",
            cookie: otherCookie,
            body: JSON.stringify({
                id: sessionId,
                name: "Hacked",
                description: "Hacked",
                categories: ["testing"],
                difficulty: "beginner",
                meetingUrl: "https://zoom.us/j/123456",
                duration: 60,
                eventDate: FUTURE_DATE,
            }),
        });

        expect(res.status).toBe(403);
    });

    it("returns 404 for nonexistent session", async () => {
        const res = await apiFetch(url, "/api/v1/session", {
            method: "PATCH",
            cookie: hostCookie,
            body: JSON.stringify({
                id: "00000000-0000-0000-0000-000000000000",
                name: "Ghost",
                description: "Ghost",
                categories: ["testing"],
                difficulty: "beginner",
                meetingUrl: "https://zoom.us/j/123456",
                duration: 60,
                eventDate: FUTURE_DATE,
            }),
        });

        expect(res.status).toBe(404);
    });

    it("rejects invalid data", async () => {
        const res = await apiFetch(url, "/api/v1/session", {
            method: "PATCH",
            cookie: hostCookie,
            body: JSON.stringify({
                id: sessionId,
                meetingUrl: "https://google.com",
            }),
        });

        expect(res.status).toBe(400);
    });
});