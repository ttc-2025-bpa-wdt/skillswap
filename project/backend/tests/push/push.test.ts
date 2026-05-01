import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser } from "../helpers/auth";
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
    const user = await registerUser(url, { handle: "pushuser", email: "push@test.com" });
    userCookie = user.cookie;
    userId = user.id;
});

describe("GET /push/vapid-key", () => {
    it("returns VAPID public key", async () => {
        const res = await apiFetch(url, "/api/v1/push/vapid-key", { cookie: userCookie });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.publicKey).toBeDefined();
        expect(typeof data.publicKey).toBe("string");
    });

    it("returns key even without env vars (ephemeral)", async () => {
        // The test env has empty VAPID keys, so it should use ephemeral
        const res = await apiFetch(url, "/api/v1/push/vapid-key", { cookie: userCookie });

        expect(res.status).toBe(200);
    });

    it("returns key without authentication", async () => {
        const res = await apiFetch(url, "/api/v1/push/vapid-key");

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
    });
});

describe("POST /push/subscribe", () => {
    it("subscribes with valid data", async () => {
        const res = await apiFetch(url, "/api/v1/push/subscribe", {
            method: "POST",
            cookie: userCookie,
            body: JSON.stringify({
                endpoint: "https://fcm.googleapis.com/fcm/send/test123",
                keys: { p256dh: "key123", auth: "auth123" },
            }),
        });

        expect(res.status).toBe(200);
        const sub = await db.pushSubscription.findFirst({ where: { userId } });
        expect(sub).not.toBeNull();
    });

    it("rejects missing endpoint", async () => {
        const res = await apiFetch(url, "/api/v1/push/subscribe", {
            method: "POST",
            cookie: userCookie,
            body: JSON.stringify({
                keys: { p256dh: "key", auth: "auth" },
            }),
        });

        expect(res.status).toBe(400);
    });

    it("rejects unauthenticated request", async () => {
        const res = await apiFetch(url, "/api/v1/push/subscribe", {
            method: "POST",
            body: JSON.stringify({
                endpoint: "https://fcm.googleapis.com/fcm/send/test",
                keys: { p256dh: "key", auth: "auth" },
            }),
        });

        expect(res.status).toBe(401);
    });
});

describe("POST /push/unsubscribe", () => {
    it("unsubscribes with valid endpoint", async () => {
        const endpoint = "https://fcm.googleapis.com/fcm/send/unsub123";
        await db.pushSubscription.create({
            data: {
                userId,
                endpoint,
                p256dh: "key",
                auth: "auth",
            },
        });

        const res = await apiFetch(url, "/api/v1/push/unsubscribe", {
            method: "POST",
            cookie: userCookie,
            body: JSON.stringify({ endpoint }),
        });

        expect(res.status).toBe(200);
        const sub = await db.pushSubscription.findFirst({ where: { endpoint } });
        expect(sub).toBeNull();
    });

    it("rejects missing endpoint", async () => {
        const res = await apiFetch(url, "/api/v1/push/unsubscribe", {
            method: "POST",
            cookie: userCookie,
            body: JSON.stringify({}),
        });

        expect(res.status).toBe(400);
    });

    it("rejects unauthenticated request", async () => {
        const res = await apiFetch(url, "/api/v1/push/unsubscribe", {
            method: "POST",
            body: JSON.stringify({ endpoint: "https://fcm.googleapis.com/test" }),
        });

        expect(res.status).toBe(401);
    });
});