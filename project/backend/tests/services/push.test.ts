import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase } from "../helpers/setup";
import { createTestUser } from "../helpers/fixtures";
import { db } from "shared/helpers";


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

describe("PushService", () => {
    it("subscribeToPush creates row in DB", async () => {
        const { user: u } = await createTestUser({ handle: "pushsub" });
        const { subscribeToPush } = await import("../../src/services/push.ts");

        const subscription = {
            endpoint: "https://fcm.googleapis.com/fcm/send/svctest",
            keys: { p256dh: "testkey", auth: "testauth" },
        };

        await subscribeToPush(u.id, subscription as any);

        const sub = await db.pushSubscription.findFirst({ where: { userId: u.id } });
        expect(sub).not.toBeNull();
        expect(sub!.endpoint).toBe(subscription.endpoint);
    });

    it("unsubscribeFromPush deletes row", async () => {
        const { user: u } = await createTestUser({ handle: "pushunsub" });
        const endpoint = "https://fcm.googleapis.com/fcm/send/unsubtest";
        await db.pushSubscription.create({
            data: { userId: u.id, endpoint, p256dh: "key", auth: "auth" },
        });

        const { unsubscribeFromPush } = await import("../../src/services/push.ts");
        await unsubscribeFromPush(u.id, endpoint);

        const sub = await db.pushSubscription.findFirst({ where: { endpoint } });
        expect(sub).toBeNull();
    });

    it("sendPushNotification with no subscriptions returns sent=0", async () => {
        const { user: u } = await createTestUser({ handle: "nopushsub" });
        const { sendPushNotification } = await import("../../src/services/push.ts");

        const result = await sendPushNotification(u.id, { title: "Test", body: "Body" });
        expect(result.sent).toBe(0);
    });

    it("getUserPushSubscriptions returns formatted objects", async () => {
        const { user: u } = await createTestUser({ handle: "pushgetsub" });
        await db.pushSubscription.create({
            data: {
                userId: u.id,
                endpoint: "https://fcm.googleapis.com/fcm/send/gettest",
                p256dh: "key",
                auth: "auth",
            },
        });

        const { getUserPushSubscriptions } = await import("../../src/services/push.ts");
        const subs = await getUserPushSubscriptions(u.id);

        expect(subs.length).toBe(1);
        expect(subs[0].endpoint).toBeDefined();
    });

    it("removeAllPushSubscriptions deletes all for user", async () => {
        const { user: u } = await createTestUser({ handle: "pushremoveall" });
        await db.pushSubscription.create({
            data: { userId: u.id, endpoint: "https://fcm.test/1", p256dh: "k1", auth: "a1" },
        });
        await db.pushSubscription.create({
            data: { userId: u.id, endpoint: "https://fcm.test/2", p256dh: "k2", auth: "a2" },
        });

        const { removeAllPushSubscriptions } = await import("../../src/services/push.ts");
        await removeAllPushSubscriptions(u.id);

        const count = await db.pushSubscription.count({ where: { userId: u.id } });
        expect(count).toBe(0);
    });

    it("getVapidPublicKey returns a key", async () => {
        const { getVapidPublicKey } = await import("../../src/services/push.ts");
        const key = getVapidPublicKey();
        expect(key).toBeDefined();
        expect(typeof key).toBe("string");
        expect(key.length).toBeGreaterThan(0);
    });
});