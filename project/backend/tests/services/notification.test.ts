import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase } from "../helpers/setup";
import { createTestUser, createTestNotification } from "../helpers/fixtures";
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

describe("NotificationService", () => {
    it("notifySessionJoin creates SESSION_JOIN notification", async () => {
        const { user: host } = await createTestUser({ handle: "notifhost" });
        const { notifySessionJoin } = await import("../../src/services/notification.ts");

        await notifySessionJoin(host.id, "session-1", "Test Session", "student1");

        const notifs = await db.notification.findMany({ where: { userId: host.id } });
        expect(notifs.length).toBe(1);
        expect(notifs[0].type).toBe("SESSION_JOIN");
    });

    it("notifyNewReview creates NEW_REVIEW notification", async () => {
        const { user: host } = await createTestUser({ handle: "reviewhost" });
        const { notifyNewReview } = await import("../../src/services/notification.ts");

        await notifyNewReview(host.id, "session-1", "Test Session", 5, "reviewerhandle");

        const notifs = await db.notification.findMany({ where: { userId: host.id } });
        expect(notifs.length).toBe(1);
        expect(notifs[0].type).toBe("NEW_REVIEW");
    });

    it("notifyNewMessage creates MESSAGE notification", async () => {
        const { user: recipient } = await createTestUser({ handle: "msgrecipient" });
        const { notifyNewMessage } = await import("../../src/services/notification.ts");

        await notifyNewMessage(recipient.id, "sender1", "senderhandle", "Hello");

        const notifs = await db.notification.findMany({ where: { userId: recipient.id } });
        expect(notifs.length).toBe(1);
        expect(notifs[0].type).toBe("MESSAGE");
    });

    it("notifySessionCancel creates SESSION_CANCEL notification", async () => {
        const { user: student } = await createTestUser({ handle: "cancelstudent" });
        const { notifySessionCancel } = await import("../../src/services/notification.ts");

        await notifySessionCancel(student.id, "session-1", "Cancelled Session");

        const notifs = await db.notification.findMany({ where: { userId: student.id } });
        expect(notifs.length).toBe(1);
        expect(notifs[0].type).toBe("SESSION_CANCEL");
    });

    it("notifyAchievementUnlocked creates ACHIEVEMENT_UNLOCKED notification", async () => {
        const { user: achiever } = await createTestUser({ handle: "achiever" });
        const { notifyAchievementUnlocked } = await import("../../src/services/notification.ts");

        await notifyAchievementUnlocked(achiever.id, "achievement-id", "first-session", "First Session");

        const notifs = await db.notification.findMany({ where: { userId: achiever.id } });
        expect(notifs.length).toBe(1);
        expect(notifs[0].type).toBe("ACHIEVEMENT_UNLOCKED");
    });

    it("markAsRead sets read=true", async () => {
        const { user: u } = await createTestUser({ handle: "markreader" });
        const notif = await createTestNotification(u.id, "SESSION_JOIN", { read: false });
        const { markAsRead } = await import("../../src/services/notification.ts");

        await markAsRead(notif.id, u.id);

        const updated = await db.notification.findUnique({ where: { id: notif.id } });
        expect(updated!.read).toBe(true);
    });

    it("markAllAsRead marks all user notifications", async () => {
        const { user: u } = await createTestUser({ handle: "markallreader" });
        await createTestNotification(u.id, "SESSION_JOIN", { read: false });
        await createTestNotification(u.id, "NEW_REVIEW", { read: false });
        const { markAllAsRead } = await import("../../src/services/notification.ts");

        const count = await markAllAsRead(u.id);

        expect(count).toBe(2);
        const unread = await db.notification.count({ where: { userId: u.id, read: false } });
        expect(unread).toBe(0);
    });

    it("deleteNotification removes notification", async () => {
        const { user: u } = await createTestUser({ handle: "deletenotif" });
        const notif = await createTestNotification(u.id, "SYSTEM");
        const { deleteNotification } = await import("../../src/services/notification.ts");

        await deleteNotification(notif.id, u.id);

        const deleted = await db.notification.findUnique({ where: { id: notif.id } });
        expect(deleted).toBeNull();
    });

    it("getUnreadCount returns correct count", async () => {
        const { user: u } = await createTestUser({ handle: "unreadcounter" });
        await createTestNotification(u.id, "SESSION_JOIN", { read: false });
        await createTestNotification(u.id, "NEW_REVIEW", { read: false });
        await createTestNotification(u.id, "SYSTEM", { read: true });
        const { getUnreadCount } = await import("../../src/services/notification.ts");

        const count = await getUnreadCount(u.id);

        expect(count).toBe(2);
    });
});