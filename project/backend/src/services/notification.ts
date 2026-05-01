/**
 * Notification Service
 * Handles creating, reading, and managing notifications for users
 */

import { db } from "shared/helpers";
import { NotificationType, type INotificationData, type INotificationCreate } from "shared/schema";

export type { INotificationData, INotificationCreate };

/**
 * Create a new notification for a user
 */
export async function createNotification(params: INotificationCreate) {
    const notification = await db.notification.create({
        data: {
            userId: params.userId,
            type: params.type,
            title: params.title,
            body: params.body,
            data: params.data ? JSON.stringify(params.data) : null,
            read: false,
        },
    });

    return notification;
}

/**
 * Get all notifications for a user with pagination
 */
export async function getNotifications(
    userId: string,
    options?: {
        unreadOnly?: boolean;
        limit?: number;
        offset?: number;
    }
) {
    const notifications = await db.notification.findMany({
        where: {
            userId,
            ...(options?.unreadOnly ? { read: false } : {}),
        },
        orderBy: {
            createdAt: "desc",
        },
        take: options?.limit ?? 20,
        skip: options?.offset ?? 0,
    });

    const total = await db.notification.count({
        where: {
            userId,
            ...(options?.unreadOnly ? { read: false } : {}),
        },
    });

    return {
        notifications: notifications.map((n) => ({
            ...n,
            data: n.data ? JSON.parse(n.data) : null,
        })),
        total,
    };
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string) {
    try {
        const notification = await db.notification.update({
            where: {
                id: notificationId,
                userId,
            },
            data: {
                read: true,
            },
        });
        return notification;
    } catch {
        return null;
    }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
    const result = await db.notification.updateMany({
        where: {
            userId,
            read: false,
        },
        data: {
            read: true,
        },
    });

    return result.count;
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, userId: string) {
    await db.notification.deleteMany({
        where: {
            id: notificationId,
            userId,
        },
    });
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string) {
    const count = await db.notification.count({
        where: {
            userId,
            read: false,
        },
    });

    return count;
}

// ============================================
// Notification Helper Functions
// ============================================

/**
 * Notify a user about a new message
 */
export async function notifyNewMessage(
    recipientId: string,
    senderId: string,
    senderHandle: string,
    messagePreview: string
) {
    return createNotification({
        userId: recipientId,
        type: NotificationType.MESSAGE,
        title: `New message from @${senderHandle}`,
        body: messagePreview.length > 100 ? `${messagePreview.slice(0, 100)}...` : messagePreview,
        data: {
            senderId,
            senderHandle,
        },
    });
}

/**
 * Notify a host when someone joins their session
 */
export async function notifySessionJoin(hostId: string, sessionId: string, sessionName: string, joinerHandle: string) {
    return createNotification({
        userId: hostId,
        type: NotificationType.SESSION_JOIN,
        title: `New registration for "${sessionName}"`,
        body: `@${joinerHandle} has registered for your session.`,
        data: {
            sessionId,
            sessionName,
            senderHandle: joinerHandle,
        },
    });
}

/**
 * Remind a user about an upcoming session
 */
export async function notifySessionReminder(userId: string, sessionId: string, sessionName: string, timeUntil: string) {
    return createNotification({
        userId,
        type: NotificationType.SESSION_REMINDER,
        title: `Session starting soon!`,
        body: `"${sessionName}" starts in ${timeUntil}.`,
        data: {
            sessionId,
            sessionName,
        },
    });
}

/**
 * Notify a user when they receive a new review
 */
export async function notifyNewReview(recipientId: string, sessionId: string, sessionName: string, rating: number, reviewerHandle: string) {
    return createNotification({
        userId: recipientId,
        type: NotificationType.NEW_REVIEW,
        title: `New review received!`,
        body: `@${reviewerHandle} gave your session "${sessionName}" a ${rating}-star rating.`,
        data: {
            sessionId,
            sessionName,
            rating,
            senderHandle: reviewerHandle,
        },
    });
}

/**
 * Notify a user when they unlock an achievement
 */
export async function notifyAchievementUnlocked(userId: string, achievementId: string, achievementKey: string, achievementName: string) {
    return createNotification({
        userId,
        type: NotificationType.ACHIEVEMENT_UNLOCKED,
        title: `Achievement Unlocked! 🏆`,
        body: `You've earned the "${achievementName}" badge!`,
        data: {
            achievementId,
            achievementKey,
        },
    });
}

/**
 * Notify about session cancellation
 */
export async function notifySessionCancel(userId: string, sessionId: string, sessionName: string, hostHandle: string) {
    return createNotification({
        userId,
        type: NotificationType.SESSION_CANCEL,
        title: `Session cancelled`,
        body: `"${sessionName}" by @${hostHandle} has been cancelled.`,
        data: {
            sessionId,
            sessionName,
            senderHandle: hostHandle,
        },
    });
}

export default {
    createNotification,
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
    notifyNewMessage,
    notifySessionJoin,
    notifySessionReminder,
    notifyNewReview,
    notifyAchievementUnlocked,
    notifySessionCancel,
};