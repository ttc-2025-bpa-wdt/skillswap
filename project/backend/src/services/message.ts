/**
 * Message Service
 * Handles offline message queuing and delivery for chat
 */

import { db } from "shared/helpers";
import { MessageStatus } from "shared/schema";

/**
 * Queue a message for offline delivery
 */
export async function queueMessage(
    senderId: string,
    recipientId: string,
    content: string,
    sessionName?: string
) {
    const message = await db.message.create({
        data: {
            senderId,
            recipientId,
            content,
            sessionName,
            status: MessageStatus.SENT,
        },
    });

    return message;
}

/**
 * Get undelivered messages for a user
 */
export async function getUndeliveredMessages(userId: string) {
    const messages = await db.message.findMany({
        where: {
            recipientId: userId,
            status: MessageStatus.SENT,
        },
        orderBy: {
            createdAt: "asc",
        },
        include: {
            sender: {
                select: {
                    id: true,
                    handle: true,
                    profile: {
                        select: {
                            displayName: true,
                            avatarUrl: true,
                        },
                    },
                },
            },
        },
    });

    return messages;
}

/**
 * Mark messages as delivered
 */
export async function markMessagesDelivered(messageIds: string[]) {
    const result = await db.message.updateMany({
        where: {
            id: { in: messageIds },
        },
        data: {
            status: MessageStatus.DELIVERED,
            deliveredAt: new Date(),
        },
    });

    return result.count;
}

/**
 * Mark a message as read
 */
export async function markMessageRead(messageId: string, userId: string) {
    const message = await db.message.update({
        where: {
            id: messageId,
            recipientId: userId,
        },
        data: {
            status: MessageStatus.READ,
            readAt: new Date(),
        },
    });

    return message;
}

/**
 * Get conversation between two users
 */
export async function getConversation(
    userId: string,
    otherUserId: string,
    options?: { limit?: number; before?: string }
) {
    const messages = await db.message.findMany({
        where: {
            OR: [
                { senderId: userId, recipientId: otherUserId },
                { senderId: otherUserId, recipientId: userId },
            ],
            ...(options?.before ? { id: { lt: options.before } } : {}),
        },
        orderBy: {
            createdAt: "desc",
        },
        take: options?.limit ?? 50,
        include: {
            sender: {
                select: {
                    id: true,
                    handle: true,
                    profile: {
                        select: {
                            displayName: true,
                            avatarUrl: true,
                        },
                    },
                },
            },
        },
    });

    return messages.reverse(); // Return in chronological order
}

/**
 * Get all conversations for a user (list of conversation partners)
 */
export async function getConversations(userId: string) {
    // Get all unique conversation partners with their last message
    const sentMessages = await db.message.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: "desc" },
        include: {
            recipient: {
                select: {
                    id: true,
                    handle: true,
                    profile: {
                        select: {
                            displayName: true,
                            avatarUrl: true,
                        },
                    },
                },
            },
        },
    });

    const receivedMessages = await db.message.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: "desc" },
        include: {
            sender: {
                select: {
                    id: true,
                    handle: true,
                    profile: {
                        select: {
                            displayName: true,
                            avatarUrl: true,
                        },
                    },
                },
            },
        },
    });

    // Combine and deduplicate by partner ID
    const conversationMap = new Map();

    for (const msg of [...sentMessages, ...receivedMessages]) {
        const partnerId = msg.senderId === userId ? msg.recipientId : msg.senderId;
        const partner = msg.senderId === userId ? msg.recipient : msg.sender;

        if (!conversationMap.has(partnerId)) {
            conversationMap.set(partnerId, {
                partner,
                lastMessage: {
                    content: msg.content,
                    createdAt: msg.createdAt,
                    isSent: msg.senderId === userId,
                    status: msg.status,
                    readAt: msg.readAt,
                },
            });
        }
    }

    // Convert to array and sort by last message date
    return Array.from(conversationMap.values()).sort(
        (a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime()
    );
}

/**
 * Get unread message count per sender
 */
export async function getUnreadMessageCounts(userId: string) {
    const messages = await db.message.groupBy({
        by: ["senderId"],
        where: {
            recipientId: userId,
            status: { not: MessageStatus.READ },
        },
        _count: true,
    });

    return messages.reduce(
        (acc, m) => {
            acc[m.senderId] = m._count;
            return acc;
        },
        {} as Record<string, number>
    );
}

/**
 * Get total unread message count
 */
export async function getTotalUnreadCount(userId: string) {
    const count = await db.message.count({
        where: {
            recipientId: userId,
            status: { not: MessageStatus.READ },
        },
    });

    return count;
}

export default {
    queueMessage,
    getUndeliveredMessages,
    markMessagesDelivered,
    markMessageRead,
    getConversation,
    getConversations,
    getUnreadMessageCounts,
    getTotalUnreadCount,
};