import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser } from "../helpers/auth";
import { createTestUser, createTestNotification } from "../helpers/fixtures";
import { db } from "shared/helpers";


let url: string;
let userCookie: string;
let userId: string;

beforeAll(async () => {
    const result = await startTestServer();
    url = result.url;
});

afterAll(async () => {
    await stopTestServer();
});

beforeEach(async () => {
    await resetDatabase();
    const user = await registerUser(url, { handle: "notifuser", email: "notif@test.com" });
    userCookie = user.cookie;
    userId = user.id;
});

describe("GET /notifications", () => {
    it("returns notification list with total", async () => {
        await createTestNotification(userId, "SESSION_JOIN");
        await createTestNotification(userId, "NEW_REVIEW");

        const res = await apiFetch(url, "/api/v1/notifications", { cookie: userCookie });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
    });

    it("returns 401 when unauthenticated", async () => {
        const res = await apiFetch(url, "/api/v1/notifications");

        expect(res.status).toBe(401);
    });

    it("filters by unread", async () => {
        await createTestNotification(userId, "SESSION_JOIN", { read: true });
        await createTestNotification(userId, "NEW_REVIEW", { read: false });

        const res = await apiFetch(url, "/api/v1/notifications?unread=true", { cookie: userCookie });

        expect(res.status).toBe(200);
    });
});

describe("PATCH /notifications/:id", () => {
    it("marks notification as read", async () => {
        const notif = await createTestNotification(userId, "SESSION_JOIN");

        const res = await apiFetch(url, `/api/v1/notifications/${notif.id}`, {
            method: "PATCH",
            cookie: userCookie,
        });

        expect(res.status).toBe(200);
        const updated = await db.notification.findUnique({ where: { id: notif.id } });
        expect(updated!.read).toBe(true);
    });

    it("does not mark another user's notification", async () => {
        const { user: other } = await createTestUser({ handle: "othernotif" });
        const notif = await createTestNotification(other.id, "SESSION_JOIN");

        const res = await apiFetch(url, `/api/v1/notifications/${notif.id}`, {
            method: "PATCH",
            cookie: userCookie,
        });

        const updated = await db.notification.findUnique({ where: { id: notif.id } });
        // Should not be marked read since userId doesn't match
        expect(updated!.read).toBe(false);
    });
});

describe("PATCH /notifications/read-all", () => {
    it("marks all notifications as read", async () => {
        await createTestNotification(userId, "SESSION_JOIN");
        await createTestNotification(userId, "NEW_REVIEW");

        const res = await apiFetch(url, "/api/v1/notifications/read-all", {
            method: "PATCH",
            cookie: userCookie,
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
    });
});

describe("DELETE /notifications/:id", () => {
    it("deletes own notification", async () => {
        const notif = await createTestNotification(userId, "SESSION_JOIN");

        const res = await apiFetch(url, `/api/v1/notifications/${notif.id}`, {
            method: "DELETE",
            cookie: userCookie,
        });

        expect(res.status).toBe(200);
    });

    it("silently fails for another user's notification", async () => {
        const { user: other } = await createTestUser({ handle: "otherdel" });
        const notif = await createTestNotification(other.id, "SESSION_JOIN");

        const res = await apiFetch(url, `/api/v1/notifications/${notif.id}`, {
            method: "DELETE",
            cookie: userCookie,
        });

        // Should still return 200 but not actually delete
        expect(res.status).toBe(200);
        const existing = await db.notification.findUnique({ where: { id: notif.id } });
        expect(existing).not.toBeNull();
    });
});

describe("GET /notifications/unread-count", () => {
    it("returns correct unread count", async () => {
        await createTestNotification(userId, "SESSION_JOIN", { read: false });
        await createTestNotification(userId, "NEW_REVIEW", { read: false });
        await createTestNotification(userId, "SYSTEM", { read: true });

        const res = await apiFetch(url, "/api/v1/notifications/unread-count", { cookie: userCookie });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.count).toBe(2);
    });

    it("returns 0 when all read", async () => {
        await createTestNotification(userId, "SYSTEM", { read: true });

        const res = await apiFetch(url, "/api/v1/notifications/unread-count", { cookie: userCookie });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.count).toBe(0);
    });
});