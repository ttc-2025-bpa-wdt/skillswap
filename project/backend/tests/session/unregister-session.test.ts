import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser } from "../helpers/auth";
import { createTestUser, createTestSession, createTestRegistration } from "../helpers/fixtures";
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
    const host = await registerUser(url, { handle: "unreghost", email: "unreghost@test.com" });
    hostCookie = host.cookie;
    hostId = host.id;
    const student = await registerUser(url, { handle: "unregstudent", email: "unregstudent@test.com" });
    studentCookie = student.cookie;
    studentId = student.id;
    const session = await createTestSession(hostId);
    sessionId = session.id;
    await createTestRegistration(sessionId, studentId);
});

describe("DELETE /session/register", () => {
    it("unregisters and decrements studentCount", async () => {
        const res = await apiFetch(url, "/api/v1/session/register", {
            method: "DELETE",
            cookie: studentCookie,
            body: JSON.stringify({ sessionId }),
        });

        expect(res.status).toBe(200);
        const reg = await db.sessionRegistration.findFirst({ where: { sessionId, userId: studentId } });
        expect(reg).toBeNull();

        const hostProfile = await db.profile.findUnique({ where: { userId: hostId } });
        expect(hostProfile!.studentCount).toBe(0);
    });

    it("rejects unregistration when not registered", async () => {
        const { user: other } = await createTestUser({ handle: "notregistered" });
        const otherCookie = (await apiFetch(url, "/api/v1/auth/login", {
            method: "POST",
            body: JSON.stringify({ emailOrHandle: "notregistered@test.com", password: "TestPass123!" }),
        })).headers.get("set-cookie") ?? "";

        const res = await apiFetch(url, "/api/v1/session/register", {
            method: "DELETE",
            cookie: otherCookie,
            body: JSON.stringify({ sessionId }),
        });

        expect(res.status).toBe(404);
    });

    it("rejects unauthenticated request", async () => {
        const res = await apiFetch(url, "/api/v1/session/register", {
            method: "DELETE",
            body: JSON.stringify({ sessionId }),
        });

        expect(res.status).toBe(401);
    });
});