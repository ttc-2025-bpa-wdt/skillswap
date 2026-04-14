import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import type { Server } from "http";

/**
 * Test setup utilities for backend integration tests.
 *
 * Usage:
 *   import { setupTestServer } from "./helpers/setup";
 *   const { server, url } = await setupTestServer();
 *   // ... run tests against url ...
 *   server.close();
 */

const TEST_PORT = 3099;

export async function setupTestServer(): Promise<{ server: Server; url: string }> {
    const { default: app } = await import("../../src/index.ts");

    return new Promise((resolve, reject) => {
        const server = app.listen(TEST_PORT, () => {
            resolve({ server, url: `http://localhost:${TEST_PORT}` });
        });
        server.on("error", reject);
    });
}

export function teardownTestServer(server: Server): Promise<void> {
    return new Promise((resolve, reject) => {
        server.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

/** Helper to make authenticated requests */
export async function authenticatedFetch(
    url: string,
    path: string,
    options?: RequestInit & { token?: string }
): Promise<Response> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options?.headers as Record<string, string>),
    };

    if (options?.token) {
        headers["Cookie"] = `__sstk=${options.token}`;
    }

    return fetch(`${url}${path}`, {
        ...options,
        headers,
        credentials: "include",
    });
}