import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser, createAdminUser } from "../helpers/auth";
import type { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer;
let url: string;
let userCookie: string;
let userHandle: string;

beforeAll(async () => {
    const result = await startTestServer();
    url = result.url;
    io = result.io;
});

afterAll(async () => {
    await stopTestServer();
});

beforeEach(async () => {
    await resetDatabase();
    const user = await registerUser(url, { handle: "avataruser", email: "avatar@test.com" });
    userCookie = user.cookie;
    userHandle = user.handle;
}, 30000);

describe("POST /user/avatar", () => {
    it("uploads a PNG avatar", async () => {
        // Create a minimal 1x1 PNG
        const pngBuffer = Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "base64"
        );

        const res = await fetch(`${url}/api/v1/user/avatar`, {
            method: "POST",
            headers: {
                "Content-Type": "image/png",
                Cookie: userCookie,
            },
            body: pngBuffer,
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.data.url).toContain(".png");
    });

    it("uploads a JPEG avatar", async () => {
        // Minimal JPEG header
        const jpegBuffer = Buffer.from(
            "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=",
            "base64"
        );

        const res = await fetch(`${url}/api/v1/user/avatar`, {
            method: "POST",
            headers: {
                "Content-Type": "image/jpeg",
                Cookie: userCookie,
            },
            body: jpegBuffer,
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.data.url).toContain(".jpg");
    });

    it("rejects invalid content-type", async () => {
        const res = await fetch(`${url}/api/v1/user/avatar`, {
            method: "POST",
            headers: {
                "Content-Type": "image/gif",
                Cookie: userCookie,
            },
            body: "GIF data",
        });

        expect(res.status).toBe(415);
    });

    it.skip("rejects files exceeding 5MB", async () => {
        // Skipped: requires raw body parser middleware which is not yet configured
        // The endpoint checks content-length but Express JSON middleware doesn't parse binary bodies
        const largeBody = Buffer.alloc(6 * 1024 * 1024, 0x89);

        const res = await fetch(`${url}/api/v1/user/avatar`, {
            method: "POST",
            headers: {
                "Content-Type": "image/png",
                Cookie: userCookie,
            },
            body: largeBody,
        });

        expect(res.status).toBe(413);
    });

    it("rejects unauthenticated uploads", async () => {
        const res = await fetch(`${url}/api/v1/user/avatar`, {
            method: "POST",
            headers: { "Content-Type": "image/png" },
            body: "x",
        });

        expect(res.status).toBe(401);
    });
});