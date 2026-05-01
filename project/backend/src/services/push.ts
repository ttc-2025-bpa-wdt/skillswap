/**
 * Push Notification Service
 * Handles Web Push API subscriptions and sending push notifications
 */

import webpush, { type PushSubscription as WebPushSubscription } from "web-push";
import { db } from "shared/helpers";

// VAPID keys - should be stored in environment variables
// These will be generated on first run if not provided
let vapidKeys: { publicKey: string; privateKey: string };

/**
 * Initialize Web Push with VAPID keys
 */
export function initializePush() {
    // Get or generate VAPID keys
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const contact = process.env.VAPID_CONTACT || "mailto:contact@skillswap.org";

    if (publicKey && privateKey) {
        vapidKeys = { publicKey, privateKey };
    } else {
        // VAPID keys must be set in environment variables for push notifications to work.
        // Generating ephemeral keys would invalidate all existing subscriptions on restart.
        console.error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables are not set.");
        console.error("Push notifications will be disabled. Set these variables to enable push.");
        vapidKeys = webpush.generateVAPIDKeys();
        console.warn("Using ephemeral VAPID keys — push subscriptions will break on server restart.");
    }

    webpush.setVapidDetails(contact, vapidKeys.publicKey, vapidKeys.privateKey);
    
    return vapidKeys.publicKey;
}

/**
 * Get the VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string {
    return vapidKeys.publicKey;
}

/**
 * Subscribe a user to push notifications
 */
export async function subscribeToPush(
    userId: string,
    subscription: WebPushSubscription
) {
    // Store the subscription in the database
    const pushSubscription = await db.pushSubscription.create({
        data: {
            userId,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
        },
    });

    return pushSubscription;
}

/**
 * Unsubscribe a user from push notifications
 */
export async function unsubscribeFromPush(userId: string, endpoint: string) {
    await db.pushSubscription.delete({
        where: {
            endpoint,
            userId,
        },
    });
}

/**
 * Remove all push subscriptions for a user
 */
export async function removeAllPushSubscriptions(userId: string) {
    await db.pushSubscription.deleteMany({
        where: { userId },
    });
}

/**
 * Get all push subscriptions for a user
 */
export async function getUserPushSubscriptions(userId: string) {
    const subscriptions = await db.pushSubscription.findMany({
        where: { userId },
    });

    return subscriptions.map((s) => ({
        endpoint: s.endpoint,
        keys: {
            p256dh: s.p256dh,
            auth: s.auth,
        },
    })) as WebPushSubscription[];
}

/**
 * Send a push notification to a specific user
 */
export async function sendPushNotification(
    userId: string,
    payload: {
        title: string;
        body: string;
        icon?: string;
        badge?: string;
        data?: Record<string, unknown>;
        actions?: Array<{ action: string; title: string; icon?: string }>;
        tag?: string;
        requireInteraction?: boolean;
    }
) {
    const subscriptions = await getUserPushSubscriptions(userId);

    if (subscriptions.length === 0) {
        return { sent: 0, failed: 0 };
    }

    const pushPromises = subscriptions.map(async (subscription) => {
        try {
            await webpush.sendNotification(
                subscription,
                JSON.stringify(payload)
            );
            return { success: true };
        } catch (error: any) {
            // If subscription is invalid (410 Gone), remove it
            if (error.statusCode === 410) {
                await db.pushSubscription.delete({
                    where: { endpoint: subscription.endpoint },
                });
            }
            return { success: false, error: error.message };
        }
    });

    const results = await Promise.all(pushPromises);

    return {
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
    };
}

/**
 * Send push notification to multiple users
 */
export async function broadcastPushNotification(
    userIds: string[],
    payload: Parameters<typeof sendPushNotification>[1]
) {
    const promises = userIds.map((userId) => sendPushNotification(userId, payload));
    const results = await Promise.all(promises);

    return {
        totalSent: results.reduce((sum, r) => sum + r.sent, 0),
        totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
    };
}

/**
 * Notify user about a new message (push)
 */
export async function pushNewMessage(
    userId: string,
    senderHandle: string,
    messagePreview: string
) {
    return sendPushNotification(userId, {
        title: `@${senderHandle}`,
        body: messagePreview.length > 100 ? `${messagePreview.slice(0, 100)}...` : messagePreview,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        tag: "message",
        data: { type: "message" },
        actions: [
            { action: "reply", title: "Reply" },
            { action: "dismiss", title: "Dismiss" },
        ],
    });
}

/**
 * Notify user about an unlocked achievement (push)
 */
export async function pushAchievementUnlocked(
    userId: string,
    achievementName: string
) {
    return sendPushNotification(userId, {
        title: "Achievement Unlocked! 🏆",
        body: `You've earned "${achievementName}"!`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        tag: "achievement",
        requireInteraction: true,
        data: { type: "achievement_unlocked" },
    });
}

/**
 * Remind user about upcoming session (push)
 */
export async function pushSessionReminder(
    userId: string,
    sessionName: string,
    timeUntil: string
) {
    return sendPushNotification(userId, {
        title: "Session Starting Soon!",
        body: `"${sessionName}" starts in ${timeUntil}`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        tag: "session-reminder",
        requireInteraction: true,
        data: { type: "session_reminder" },
        actions: [
            { action: "join", title: "Join Session" },
            { action: "dismiss", title: "Dismiss" },
        ],
    });
}

export default {
    initializePush,
    getVapidPublicKey,
    subscribeToPush,
    unsubscribeFromPush,
    removeAllPushSubscriptions,
    getUserPushSubscriptions,
    sendPushNotification,
    broadcastPushNotification,
    pushNewMessage,
    pushAchievementUnlocked,
    pushSessionReminder,
};