import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser } from "../helpers/auth";
import { createTestUser, createTestMessage, createTestSession } from "../helpers/fixtures";
import { db } from "shared/helpers";
import { LIMITS } from "shared/config";


let url: string;
let userCookie: string;
let userId: string;
let otherId: string;

beforeAll(async () => {
    const result = await startTestServer();
    url = result.url;
});

afterAll(async () => {
    await stopTestServer();
});

beforeEach(async () => {
    await resetDatabase();
    const user = await registerUser(url, { handle: "msguser", email: "msg@test.com" });
    userCookie = user.cookie;
    userId = user.id;
    const { user: other } = await createTestUser({ handle: "msgother" });
    otherId = other.id;
});

describe("GET /messages", () => {
    it("returns conversations list", async () => {
        await createTestMessage(userId, otherId, "Hello");
        await createTestMessage(otherId, userId, "Hi back");

        const res = await apiFetch(url, "/api/v1/messages", { cookie: userCookie });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
    });

    it("returns messages with specific user", async () => {
        await createTestMessage(userId, otherId, "Hello");

        const res = await apiFetch(url, `/api/v1/messages?user=${otherId}`, { cookie: userCookie });

        expect(res.status).toBe(200);
    });

    it("returns 401 when unauthenticated", async () => {
        const res = await apiFetch(url, "/api/v1/messages");

        expect(res.status).toBe(401);
    });

    it("supports pagination", async () => {
        for (let i = 0; i < 5; i++) {
            await createTestMessage(userId, otherId, `Message ${i}`);
        }

        const res = await apiFetch(url, `/api/v1/messages?user=${otherId}&limit=2`, { cookie: userCookie });

        expect(res.status).toBe(200);
    });
});

describe("POST /contact/host", () => {
    let sessionId: string;

    beforeEach(async () => {
        const session = await createTestSession(otherId, { name: "Contact Test" });
        sessionId = session.id;
    });

    it("creates message and notification", async () => {
        const res = await apiFetch(url, "/api/v1/contact/host", {
            method: "POST",
            cookie: userCookie,
            body: JSON.stringify({ sessionId, message: "I want to attend!" }),
        });

        expect(res.status).toBe(200);

        const messages = await db.message.findMany({ where: { senderId: userId, recipientId: otherId } });
        expect(messages.length).toBeGreaterThan(0);

        const notifications = await db.notification.findMany({ where: { userId: otherId } });
        expect(notifications.length).toBeGreaterThan(0);
    });

    it("rejects missing message", async () => {
        const res = await apiFetch(url, "/api/v1/contact/host", {
            method: "POST",
            cookie: userCookie,
            body: JSON.stringify({ sessionId }),
        });

        expect(res.status).toBe(400);
    });

    it("rejects message exceeding MESSAGE_MAX", async () => {
        const res = await apiFetch(url, "/api/v1/contact/host", {
            method: "POST",
            cookie: userCookie,
            body: JSON.stringify({ sessionId, message: "x".repeat(LIMITS.MESSAGE_MAX + 1) }),
        });

        expect(res.status).toBe(400);
    });

    it("sanitizes XSS in message", async () => {
        const res = await apiFetch(url, "/api/v1/contact/host", {
            method: "POST",
            cookie: userCookie,
            body: JSON.stringify({ sessionId, message: "<script>alert(1)</script>" }),
        });

        expect(res.status).toBe(200);
        const msg = await db.message.findFirst({ where: { senderId: userId } });
        expect(msg!.content).not.toContain("<script>");
    });

    it("rejects unauthenticated request", async () => {
        const res = await apiFetch(url, "/api/v1/contact/host", {
            method: "POST",
            body: JSON.stringify({ sessionId, message: "Hello" }),
        });

        expect(res.status).toBe(401);
    });
});