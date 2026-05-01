import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase } from "../helpers/setup";
import { createTestUser, createTestMessage } from "../helpers/fixtures";
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

describe("MessageService", () => {
    it("queueMessage creates message with SENT status", async () => {
        const { user: sender } = await createTestUser({ handle: "msgsender" });
        const { user: recipient } = await createTestUser({ handle: "msgrecipient" });
        const { queueMessage } = await import("../../src/services/message.ts");

        await queueMessage(sender.id, recipient.id, "Hello there");

        const msg = await db.message.findFirst({ where: { senderId: sender.id, recipientId: recipient.id } });
        expect(msg).not.toBeNull();
        expect(msg!.content).toBe("Hello there");
        expect(msg!.status).toBe("SENT");
    });

    it("getConversation returns messages between two users", async () => {
        const { user: u1 } = await createTestUser({ handle: "conv1" });
        const { user: u2 } = await createTestUser({ handle: "conv2" });
        await createTestMessage(u1.id, u2.id, "Hi");
        await createTestMessage(u2.id, u1.id, "Hey");

        const { getConversation } = await import("../../src/services/message.ts");
        const messages = await getConversation(u1.id, u2.id);

        expect(messages.length).toBe(2);
    });

    it("getConversations returns deduplicated partners", async () => {
        const { user: u1 } = await createTestUser({ handle: "convo1" });
        const { user: u2 } = await createTestUser({ handle: "convo2" });
        const { user: u3 } = await createTestUser({ handle: "convo3" });
        await createTestMessage(u1.id, u2.id, "To u2");
        await createTestMessage(u1.id, u3.id, "To u3");

        const { getConversations } = await import("../../src/services/message.ts");
        const convos = await getConversations(u1.id);

        expect(convos.length).toBe(2);
    });

    it("getTotalUnreadCount returns correct count", async () => {
        const { user: u1 } = await createTestUser({ handle: "unread1" });
        const { user: u2 } = await createTestUser({ handle: "unread2" });
        await createTestMessage(u2.id, u1.id, "Unread 1");
        await createTestMessage(u2.id, u1.id, "Unread 2");

        const { getTotalUnreadCount } = await import("../../src/services/message.ts");
        const count = await getTotalUnreadCount(u1.id);

        expect(count).toBe(2);
    });

    it("markMessagesDelivered updates status", async () => {
        const { user: u1 } = await createTestUser({ handle: "deliver1" });
        const { user: u2 } = await createTestUser({ handle: "deliver2" });
        const msg = await createTestMessage(u1.id, u2.id, "Deliver me");

        const { markMessagesDelivered } = await import("../../src/services/message.ts");
        await markMessagesDelivered([msg.id]);

        const updated = await db.message.findUnique({ where: { id: msg.id } });
        expect(updated!.status).toBe("DELIVERED");
    });

    it("markMessageRead updates status to READ", async () => {
        const { user: u1 } = await createTestUser({ handle: "read1" });
        const { user: u2 } = await createTestUser({ handle: "read2" });
        const msg = await createTestMessage(u1.id, u2.id, "Read me");

        const { markMessageRead } = await import("../../src/services/message.ts");
        await markMessageRead(msg.id, u2.id);

        const updated = await db.message.findUnique({ where: { id: msg.id } });
        expect(updated!.status).toBe("READ");
    });
});