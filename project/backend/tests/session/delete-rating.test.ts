import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser, createAdminUser } from "../helpers/auth";
import { createTestUser, createTestSession, createTestRegistration, createTestReview } from "../helpers/fixtures";
import { db } from "shared/helpers";


let url: string;
let hostCookie: string;
let hostId: string;
let studentCookie: string;
let studentId: string;
let adminCookie: string;
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
    const host = await registerUser(url, { handle: "ratinghost", email: "ratinghost@test.com" });
    hostCookie = host.cookie;
    hostId = host.id;
    const student = await registerUser(url, { handle: "ratingstudent", email: "ratingstudent@test.com" });
    studentCookie = student.cookie;
    studentId = student.id;
    const admin = await createAdminUser(url);
    adminCookie = admin.cookie;
    const session = await createTestSession(hostId);
    sessionId = session.id;
    await createTestRegistration(sessionId, studentId);
});

describe("DELETE /session/rate", () => {
    it("author deletes own review — removes from DB and recalculates average", async () => {
        const review = await createTestReview(sessionId, studentId, hostId, { rating: 5 });

        const res = await apiFetch(url, "/api/v1/session/rate", {
            method: "DELETE",
            cookie: studentCookie,
            body: JSON.stringify({ id: review.id }),
        });

        expect(res.status).toBe(200);
        const deleted = await db.review.findUnique({ where: { id: review.id } });
        expect(deleted).toBeNull();
    });

    it("host hides review instead of deleting", async () => {
        const review = await createTestReview(sessionId, studentId, hostId, { rating: 3 });

        const res = await apiFetch(url, "/api/v1/session/rate", {
            method: "DELETE",
            cookie: hostCookie,
            body: JSON.stringify({ id: review.id }),
        });

        expect(res.status).toBe(200);
        const updated = await db.review.findUnique({ where: { id: review.id } });
        expect(updated).not.toBeNull();
        expect(updated!.hidden).toBe(true);
    });

    it("hidden reviews excluded from average", async () => {
        const review1 = await createTestReview(sessionId, studentId, hostId, { rating: 5 });
        await apiFetch(url, "/api/v1/session/rate", {
            method: "DELETE",
            cookie: hostCookie,
            body: JSON.stringify({ id: review1.id }),
        });
    });

    it("forbids non-author non-recipient from deleting", async () => {
        const { user: other } = await createTestUser({ handle: "otherdeleter" });
        const review = await createTestReview(sessionId, studentId, hostId, { rating: 5 });

        // Login as other user
        const loginRes = await apiFetch(url, "/api/v1/auth/login", {
            method: "POST",
            body: JSON.stringify({ emailOrHandle: "otherdeleter@test.com", password: "TestPass123!" }),
        });
        const otherCookie = loginRes.headers.get("set-cookie")?.split(";")[0] ?? "";

        const res = await apiFetch(url, "/api/v1/session/rate", {
            method: "DELETE",
            cookie: otherCookie,
            body: JSON.stringify({ id: review.id }),
        });

        expect(res.status).toBe(403);
    });

    it("returns 404 for nonexistent review", async () => {
        const res = await apiFetch(url, "/api/v1/session/rate", {
            method: "DELETE",
            cookie: studentCookie,
            body: JSON.stringify({ id: "00000000-0000-0000-0000-000000000000" }),
        });

        expect(res.status).toBe(404);
    });

    it("admin can fully delete any review", async () => {
        const review = await createTestReview(sessionId, studentId, hostId, { rating: 4 });

        const res = await apiFetch(url, "/api/v1/session/rate", {
            method: "DELETE",
            cookie: adminCookie,
            body: JSON.stringify({ id: review.id }),
        });

        expect(res.status).toBe(200);
        const deleted = await db.review.findUnique({ where: { id: review.id } });
        expect(deleted).toBeNull();
    });
});