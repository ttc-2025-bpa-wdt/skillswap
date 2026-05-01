import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser, createAdminUser } from "../helpers/auth";
import { createTestUser, createTestSession, createTestRegistration } from "../helpers/fixtures";
import { db } from "shared/helpers";


let url: string;
let hostCookie: string;
let otherCookie: string;
let adminCookie: string;
let hostId: string;
let sessionId: string;

beforeAll(async () => {
    const result = await startTestServer();
    url = result.url;
});

afterAll(async () => {
    await stopTestServer();
});

beforeEach(async () => {
    await resetDatabase();
    const host = await registerUser(url, { handle: "deletehost", email: "deletehost@test.com" });
    hostCookie = host.cookie;
    hostId = host.id;
    const other = await registerUser(url, { handle: "deleter", email: "deleter@test.com" });
    otherCookie = other.cookie;
    const admin = await createAdminUser(url);
    adminCookie = admin.cookie;
    const session = await createTestSession(hostId);
    sessionId = session.id;
});

describe("DELETE /session", () => {
    it("deletes own session", async () => {
        const res = await apiFetch(url, "/api/v1/session", {
            method: "DELETE",
            cookie: hostCookie,
            body: JSON.stringify({ id: sessionId }),
        });

        expect(res.status).toBe(200);
        const session = await db.session.findUnique({ where: { id: sessionId } });
        expect(session).toBeNull();
    });

    it("allows admin to delete any session", async () => {
        const res = await apiFetch(url, "/api/v1/session", {
            method: "DELETE",
            cookie: adminCookie,
            body: JSON.stringify({ id: sessionId }),
        });

        expect(res.status).toBe(200);
    });

    it("forbids non-owner non-admin from deleting", async () => {
        const res = await apiFetch(url, "/api/v1/session", {
            method: "DELETE",
            cookie: otherCookie,
            body: JSON.stringify({ id: sessionId }),
        });

        expect(res.status).toBe(403);
    });

    it("sends cancel notification to registered users", async () => {
        const { user: student } = await createTestUser({ handle: "cancelstudent" });
        await createTestRegistration(sessionId, student.id);

        const res = await apiFetch(url, "/api/v1/session", {
            method: "DELETE",
            cookie: hostCookie,
            body: JSON.stringify({ id: sessionId }),
        });

        expect(res.status).toBe(200);
        const notifications = await db.notification.findMany({ where: { userId: student.id } });
        expect(notifications.length).toBeGreaterThan(0);
        expect(notifications[0].type).toBe("SESSION_CANCEL");
    });

    it("returns 404 for nonexistent session", async () => {
        const res = await apiFetch(url, "/api/v1/session", {
            method: "DELETE",
            cookie: adminCookie,
            body: JSON.stringify({ id: "00000000-0000-0000-0000-000000000000" }),
        });

        expect(res.status).toBe(404);
    });
});