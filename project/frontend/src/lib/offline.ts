/**
 * Offline Storage Utilities
 * Handles IndexedDB storage for offline data and pending actions
 */

const DB_NAME = "skillswap_offline";
const DB_VERSION = 1;

// Store names
const STORES = {
    PENDING_MESSAGES: "pending_messages",
    PENDING_ACTIONS: "pending_actions",
    CACHED_USERS: "cached_users",
    CACHED_SESSIONS: "cached_sessions",
    USER_DATA: "user_data",
};

interface PendingMessage {
    id?: number;
    recipientId: string;
    content: string;
    sessionName?: string;
    createdAt: Date;
}

interface PendingAction {
    id?: number;
    type: "session_register" | "session_unregister" | "review_submit" | "profile_update";
    data: Record<string, unknown>;
    createdAt: Date;
    retryCount: number;
}

interface CachedData {
    key: string;
    data: unknown;
    cachedAt: Date;
    expiresAt: Date;
}

class OfflineStorage {
    private db: IDBDatabase | null = null;
    private dbPromise: Promise<IDBDatabase> | null = null;

    /**
     * Initialize IndexedDB
     */
    async init(): Promise<IDBDatabase> {
        if (this.db) return this.db;
        if (this.dbPromise) return this.dbPromise;

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error("Failed to open IndexedDB:", request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create stores
                if (!db.objectStoreNames.contains(STORES.PENDING_MESSAGES)) {
                    db.createObjectStore(STORES.PENDING_MESSAGES, {
                        keyPath: "id",
                        autoIncrement: true,
                    });
                }

                if (!db.objectStoreNames.contains(STORES.PENDING_ACTIONS)) {
                    const store = db.createObjectStore(STORES.PENDING_ACTIONS, {
                        keyPath: "id",
                        autoIncrement: true,
                    });
                    store.createIndex("type", "type", { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.CACHED_USERS)) {
                    db.createObjectStore(STORES.CACHED_USERS, { keyPath: "key" });
                }

                if (!db.objectStoreNames.contains(STORES.CACHED_SESSIONS)) {
                    db.createObjectStore(STORES.CACHED_SESSIONS, { keyPath: "key" });
                }

                if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
                    db.createObjectStore(STORES.USER_DATA, { keyPath: "key" });
                }
            };
        });

        return this.dbPromise;
    }

    /**
     * Save a pending message for later delivery
     */
    async savePendingMessage(message: PendingMessage): Promise<number> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.PENDING_MESSAGES, "readwrite");
            const store = transaction.objectStore(STORES.PENDING_MESSAGES);
            const request = store.add({
                ...message,
                createdAt: new Date(),
            });

            request.onsuccess = () => resolve(request.result as number);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all pending messages
     */
    async getPendingMessages(): Promise<PendingMessage[]> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.PENDING_MESSAGES, "readonly");
            const store = transaction.objectStore(STORES.PENDING_MESSAGES);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Remove a pending message after successful delivery
     */
    async removePendingMessage(id: number): Promise<void> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.PENDING_MESSAGES, "readwrite");
            const store = transaction.objectStore(STORES.PENDING_MESSAGES);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save a pending action for later sync
     */
    async savePendingAction(action: Omit<PendingAction, "id" | "createdAt" | "retryCount">): Promise<number> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.PENDING_ACTIONS, "readwrite");
            const store = transaction.objectStore(STORES.PENDING_ACTIONS);
            const request = store.add({
                ...action,
                createdAt: new Date(),
                retryCount: 0,
            });

            request.onsuccess = () => resolve(request.result as number);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all pending actions
     */
    async getPendingActions(): Promise<PendingAction[]> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.PENDING_ACTIONS, "readonly");
            const store = transaction.objectStore(STORES.PENDING_ACTIONS);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Remove a pending action after successful sync
     */
    async removePendingAction(id: number): Promise<void> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.PENDING_ACTIONS, "readwrite");
            const store = transaction.objectStore(STORES.PENDING_ACTIONS);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update retry count for a pending action
     */
    async updateRetryCount(id: number): Promise<void> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORES.PENDING_ACTIONS, "readwrite");
            const store = transaction.objectStore(STORES.PENDING_ACTIONS);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const action = getRequest.result;
                if (action) {
                    action.retryCount += 1;
                    store.put(action);
                }
                resolve();
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Cache generic data with expiration
     */
    async cacheData(storeName: string, key: string, data: unknown, ttlMinutes: number = 60): Promise<void> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const now = new Date();
            const expiresAt = new Date(now.getTime() + ttlMinutes * 60000);

            const request = store.put({
                key,
                data,
                cachedAt: now,
                expiresAt,
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get cached data if not expired
     */
    async getCachedData(storeName: string, key: string): Promise<unknown | null> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result as CachedData | undefined;
                if (!result) {
                    resolve(null);
                    return;
                }

                // Check expiration
                if (new Date() > new Date(result.expiresAt)) {
                    resolve(null);
                    return;
                }

                resolve(result.data);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all cached data for a store
     */
    async clearStore(storeName: string): Promise<void> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get count of pending items
     */
    async getPendingCount(): Promise<{ messages: number; actions: number }> {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(
                [STORES.PENDING_MESSAGES, STORES.PENDING_ACTIONS],
                "readonly"
            );

            const messagesStore = transaction.objectStore(STORES.PENDING_MESSAGES);
            const actionsStore = transaction.objectStore(STORES.PENDING_ACTIONS);

            const messagesRequest = messagesStore.count();
            const actionsRequest = actionsStore.count();

            let messagesCount = 0;
            let actionsCount = 0;

            messagesRequest.onsuccess = () => {
                messagesCount = messagesRequest.result;
                if (actionsCount !== undefined) {
                    resolve({ messages: messagesCount, actions: actionsCount });
                }
            };

            actionsRequest.onsuccess = () => {
                actionsCount = actionsRequest.result;
                if (messagesCount !== undefined) {
                    resolve({ messages: messagesCount, actions: actionsCount });
                }
            };

            transaction.onerror = () => reject(transaction.error);
        });
    }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();

/**
 * Sync pending messages when online
 */
export async function syncPendingMessages(): Promise<void> {
    const messages = await offlineStorage.getPendingMessages();

    for (const message of messages) {
        try {
            const response = await fetch("/api/v1/contact/host", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipientId: message.recipientId,
                    content: message.content,
                    sessionName: message.sessionName,
                }),
            });

            if (response.ok && message.id) {
                await offlineStorage.removePendingMessage(message.id);
            }
        } catch (error) {
            console.error("Failed to sync message:", error);
        }
    }
}

/**
 * Sync all pending actions
 */
export async function syncPendingActions(): Promise<void> {
    const actions = await offlineStorage.getPendingActions();

    for (const action of actions) {
        if (action.retryCount >= 3) {
            // Remove after 3 retries
            if (action.id) await offlineStorage.removePendingAction(action.id);
            continue;
        }

        try {
            let response: Response;

            switch (action.type) {
                case "session_register":
                    response = await fetch("/api/v1/session/register", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(action.data),
                    });
                    break;

                case "session_unregister":
                    response = await fetch("/api/v1/session/register", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(action.data),
                    });
                    break;

                case "review_submit":
                    response = await fetch("/api/v1/session/rate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(action.data),
                    });
                    break;

                case "profile_update":
                    response = await fetch("/api/v1/user", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(action.data),
                    });
                    break;

                default:
                    continue;
            }

            if (response.ok && action.id) {
                await offlineStorage.removePendingAction(action.id);
            } else if (action.id) {
                await offlineStorage.updateRetryCount(action.id);
            }
        } catch (error) {
            console.error("Failed to sync action:", error);
            if (action.id) {
                await offlineStorage.updateRetryCount(action.id);
            }
        }
    }
}

/**
 * Initialize offline storage and sync listeners
 */
export function initializeOfflineSupport(): void {
    // Sync when online
    window.addEventListener("online", () => {
        console.log("Back online, syncing pending data...");
        syncPendingMessages();
        syncPendingActions();
    });

    // Listen for background sync (if supported)
    if ("serviceWorker" in navigator && "SyncManager" in window) {
        navigator.serviceWorker.ready.then((registration) => {
            // Register sync events
            registration.sync.register("sync-pending-requests").catch((err) => {
                console.error("Failed to register sync:", err);
            });
        });
    }
}

export default offlineStorage;