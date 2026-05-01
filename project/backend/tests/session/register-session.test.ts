import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser } from "../helpers/auth";
import { createTestUser, createTestSession } from "../helpers/fixtures";
import { db } from "shared/helpers";


let url: string;
let hostCookie: string;
let studentCookie: string;
let hostId: string;
let studentId: string;
let sessionId: string;

beforeAll(async () => {
    const result = await startTestServer();
    url = result.url;
});

afterAll(async () => {
    await stopTestServer();
});

beforeEach(async () => {
    await resetDatabase();
    const host = await registerUser(url, { handle: "reghost", email: "reghost@test.com" });
    hostCookie = host.cookie;
    hostId = host.id;
    const student = await registerUser(url, { handle: "regstudent", email: "regstudent@test.com" });
    studentCookie = student.cookie;
    studentId = student.id;
    const session = await createTestSession(hostId);
    sessionId = session.id;
});

describe("POST /session/register", () => {
    it("registers for a session and increments host studentCount", async () => {
        const res = await apiFetch(url, "/api/v1/session/register", {
            method: "POST",
            cookie: studentCookie,
            body: JSON.stringify({ sessionId }),
        });

        expect(res.status).toBe(200);
        const reg = await db.sessionRegistration.findFirst({ where: { sessionId, userId: studentId } });
        expect(reg).not.toBeNull();

        const hostProfile = await db.profile.findUnique({ where: { userId: hostId } });
        expect(hostProfile!.studentCount).toBe(1);
    });

    it("rejects registering for own session", async () => {
        const res = await apiFetch(url, "/api/v1/session/register", {
            method: "POST",
            cookie: hostCookie,
            body: JSON.stringify({ sessionId }),
        });

        expect(res.status).toBe(400);
    });

    it("rejects double registration", async () => {
        await apiFetch(url, "/api/v1/session/register", {
            method: "POST",
            cookie: studentCookie,
            body: JSON.stringify({ sessionId }),
        });

        const res = await apiFetch(url, "/api/v1/session/register", {
            method: "POST",
            cookie: studentCookie,
            body: JSON.stringify({ sessionId }),
        });

        expect(res.status).toBe(400);
    });

    it("rejects nonexistent session", async () => {
        const res = await apiFetch(url, "/api/v1/session/register", {
            method: "POST",
            cookie: studentCookie,
            body: JSON.stringify({ sessionId: "00000000-0000-0000-0000-000000000000" }),
        });

        expect(res.status).toBe(404);
    });

    it("rejects unauthenticated request", async () => {
        const res = await apiFetch(url, "/api/v1/session/register", {
            method: "POST",
            body: JSON.stringify({ sessionId }),
        });

        expect(res.status).toBe(401);
    });

    it("sends SESSION_JOIN notification to host", async () => {
        await apiFetch(url, "/api/v1/session/register", {
            method: "POST",
            cookie: studentCookie,
            body: JSON.stringify({ sessionId }),
        });

        const notifications = await db.notification.findMany({ where: { userId: hostId } });
        expect(notifications.length).toBeGreaterThan(0);
        expect(notifications[0].type).toBe("SESSION_JOIN");
    });
});