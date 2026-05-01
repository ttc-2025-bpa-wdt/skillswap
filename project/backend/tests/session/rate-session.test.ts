import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser } from "../helpers/auth";
import { createTestUser, createTestSession, createTestRegistration } from "../helpers/fixtures";
import { db } from "shared/helpers";
import { LIMITS } from "shared/config";


let url: string;
let hostCookie: string;
let hostId: string;
let studentCookie: string;
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
    const host = await registerUser(url, { handle: "ratehost", email: "ratehost@test.com" });
    hostCookie = host.cookie;
    hostId = host.id;
    const student = await registerUser(url, { handle: "ratestudent", email: "ratestudent@test.com" });
    studentCookie = student.cookie;
    studentId = student.id;
    const session = await createTestSession(hostId);
    sessionId = session.id;
    await createTestRegistration(sessionId, studentId);
});

describe("POST /session/rate", () => {
    it("rates a session as attendee", async () => {
        const res = await apiFetch(url, "/api/v1/session/rate", {
            method: "POST",
            cookie: studentCookie,
            body: JSON.stringify({ sessionId, rating: 5, comment: "Great session!" }),
        });

        expect(res.status).toBe(200);
        const review = await db.review.findFirst({ where: { sessionId, authorId: studentId } });
        expect(review).not.toBeNull();
        expect(review!.rating).toBe(5);
    });

    it("rejects rating own session", async () => {
        const res = await apiFetch(url, "/api/v1/session/rate", {
            method: "POST",
            cookie: hostCookie,
            body: JSON.stringify({ sessionId, rating: 5, comment: "Self review" }),
        });

        expect(res.status).toBe(400);
    });

    it("rejects rating nonexistent session", async () => {
        const res = await apiFetch(url, "/api/v1/session/rate", {
            method: "POST",
            cookie: studentCookie,
            body: JSON.stringify({ sessionId: "00000000-0000-0000-0000-000000000000", rating: 5 }),
        });

        expect(res.status).toBe(404);
    });

    it("rejects comment exceeding COMMENT_MAX", async () => {
        const res = await apiFetch(url, "/api/v1/session/rate", {
            method: "POST",
            cookie: studentCookie,
            body: JSON.stringify({ sessionId, rating: 5, comment: "x".repeat(LIMITS.COMMENT_MAX + 1) }),
        });

        expect(res.status).toBe(400);
    });

    it("rejects unauthenticated request", async () => {
        const res = await apiFetch(url, "/api/v1/session/rate", {
            method: "POST",
            body: JSON.stringify({ sessionId, rating: 5 }),
        });

        expect(res.status).toBe(401);
    });

    it("upserts second rating for same session", async () => {
        await apiFetch(url, "/api/v1/session/rate", {
            method: "POST",
            cookie: studentCookie,
            body: JSON.stringify({ sessionId, rating: 3 }),
        });

        const res = await apiFetch(url, "/api/v1/session/rate", {
            method: "POST",
            cookie: studentCookie,
            body: JSON.stringify({ sessionId, rating: 5 }),
        });

        expect(res.status).toBe(200);
        const reviews = await db.review.findMany({ where: { sessionId, authorId: studentId } });
        expect(reviews.length).toBe(1);
    });

    it("sanitizes XSS in comment", async () => {
        const res = await apiFetch(url, "/api/v1/session/rate", {
            method: "POST",
            cookie: studentCookie,
            body: JSON.stringify({ sessionId, rating: 5, comment: "<script>alert(1)</script>" }),
        });

        expect(res.status).toBe(200);
        const review = await db.review.findFirst({ where: { sessionId, authorId: studentId } });
        expect(review!.comment).not.toContain("<script>");
    });

    it("recalculates host average after rating", async () => {
        await apiFetch(url, "/api/v1/session/rate", {
            method: "POST",
            cookie: studentCookie,
            body: JSON.stringify({ sessionId, rating: 5 }),
        });

        const profile = await db.profile.findUnique({ where: { userId: hostId } });
        expect(profile!.rating).toBe(5);
    });

    it("sends NEW_REVIEW notification to host", async () => {
        await apiFetch(url, "/api/v1/session/rate", {
            method: "POST",
            cookie: studentCookie,
            body: JSON.stringify({ sessionId, rating: 5 }),
        });

        const notifications = await db.notification.findMany({ where: { userId: hostId } });
        const reviewNotif = notifications.find((n) => n.type === "NEW_REVIEW");
        expect(reviewNotif).toBeDefined();
    });
});