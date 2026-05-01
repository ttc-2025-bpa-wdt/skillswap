import type { Server } from "http";
import type { Server as SocketIOServer } from "socket.io";

import { db } from "shared/helpers";

// Shared singleton server — started once, never stopped between test files.
// Process exit cleans up everything.
let sharedServer: { server: Server; io: SocketIOServer; url: string } | null = null;

export async function startTestServer(): Promise<{ server: Server; url: string; io: SocketIOServer }> {
    process.env.NODE_ENV = "test";

    if (sharedServer) {
        return sharedServer;
    }

    await db.$connect();

    const { createAppServer } = await import("../../src/index.ts");
    const { server, io } = createAppServer();

    return new Promise((resolve, reject) => {
        server.listen(0, () => {
            const addr = server.address();
            if (!addr || typeof addr === "string") {
                reject(new Error("Failed to get server address"));
                return;
            }
            const url = `http://localhost:${addr.port}`;
            sharedServer = { server, io, url };
            resolve(sharedServer);
        });
        server.on("error", reject);
    });
}

export async function stopTestServer(): Promise<void> {
    // No-op: the shared server persists for the entire test run.
    // Process exit handles cleanup.
}

export async function resetDatabase(): Promise<void> {
    // Use raw SQL TRUNCATE with CASCADE to avoid FK ordering issues
    // and race conditions with async achievement checks
    await db.$executeRawUnsafe(`
        TRUNCATE TABLE
            "UserAchievement",
            "PushSubscription",
            "Notification",
            "Message",
            "Review",
            "SessionRegistration",
            "Session",
            "Profile",
            "User"
        CASCADE
    `);
    // Re-seed achievements after truncating
    await seedAchievements();
}

export async function seedAchievements(): Promise<void> {
    const { initializeAchievements } = await import("../../src/services/achievement.ts");
    await initializeAchievements();
}

/** Make an HTTP request to the test server */
export async function apiFetch(
    url: string,
    path: string,
    options: RequestInit & { cookie?: string } = {}
): Promise<Response> {
    const { cookie, ...fetchOptions } = options;
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
    };

    if (cookie) {
        headers["Cookie"] = cookie;
    }

    if (fetchOptions.headers) {
        const existing = fetchOptions.headers as Record<string, string>;
        Object.assign(headers, existing);
    }

    return fetch(`${url}${path}`, {
        ...fetchOptions,
        headers,
    });
}