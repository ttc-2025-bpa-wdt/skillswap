/**
 * Push Notification Utilities
 * Handles Web Push API subscription and permission management
 */

interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: Record<string, unknown>;
    actions?: Array<{ action: string; title: string; icon?: string }>;
    tag?: string;
    requireInteraction?: boolean;
}

class PushNotificationService {
    private vapidPublicKey: string | null = null;
    private subscription: PushSubscription | null = null;

    /**
     * Initialize push notification service
     */
    async init(): Promise<boolean> {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            console.warn("Push notifications not supported");
            return false;
        }

        // Get VAPID public key from server
        try {
            const response = await fetch("/api/v1/push/vapid-key");
            const data = await response.json();
            this.vapidPublicKey = data.publicKey;
            return true;
        } catch (error) {
            console.error("Failed to get VAPID key:", error);
            return false;
        }
    }

    /**
     * Check current notification permission status
     */
    getPermissionStatus(): NotificationPermission {
        return Notification.permission;
    }

    /**
     * Request notification permission
     */
    async requestPermission(): Promise<NotificationPermission> {
        if (!("Notification" in window)) {
            console.warn("Notifications not supported");
            return "denied";
        }

        const permission = await Notification.requestPermission();
        return permission;
    }

    /**
     * Subscribe to push notifications
     */
    async subscribe(): Promise<PushSubscription | null> {
        if (!this.vapidPublicKey) {
            console.error("VAPID public key not set");
            return null;
        }

        const permission = await this.requestPermission();
        if (permission !== "granted") {
            console.warn("Notification permission denied");
            return null;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
            });

            const subscriptionData: PushSubscription = {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: btoa(
                        String.fromCharCode(
                            ...new Uint8Array(subscription.getKey("p256dh") as ArrayBuffer)
                        )
                    ),
                    auth: btoa(
                        String.fromCharCode(
                            ...new Uint8Array(subscription.getKey("auth") as ArrayBuffer)
                        )
                    ),
                },
            };

            // Send subscription to server
            await fetch("/api/v1/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscriptionData),
            });

            this.subscription = subscriptionData;
            return subscriptionData;
        } catch (error) {
            console.error("Failed to subscribe:", error);
            return null;
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribe(): Promise<boolean> {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
                await fetch("/api/v1/push/unsubscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ endpoint: subscription.endpoint }),
                });
            }

            this.subscription = null;
            return true;
        } catch (error) {
            console.error("Failed to unsubscribe:", error);
            return false;
        }
    }

    /**
     * Convert VAPID key to Uint8Array
     */
    private urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray;
    }

    /**
     * Show in-app notification (used when push fails)
     */
    showInAppNotification(payload: NotificationPayload): Notification | null {
        if (Notification.permission !== "granted") {
            return null;
        }

        return new Notification(payload.title, {
            body: payload.body,
            icon: payload.icon || "/icons/icon-192x192.png",
            badge: payload.badge || "/icons/badge-72x72.png",
            data: payload.data,
            tag: payload.tag,
        });
    }
}

// Export singleton instance
export const pushNotifications = new PushNotificationService();

/**
 * Initialize push notifications on page load
 */
export async function initializePushNotifications(): Promise<void> {
    const initialized = await pushNotifications.init();
    if (!initialized) {
        console.log("Push notifications not available");
        return;
    }

    // Auto-subscribe if permission already granted
    if (Notification.permission === "granted") {
        await pushNotifications.subscribe();
    }
}

export default pushNotifications;