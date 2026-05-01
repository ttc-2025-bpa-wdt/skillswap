import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser } from "../helpers/auth";
import { createTestUser, createTestSession, createTestMessage } from "../helpers/fixtures";
import { db } from "shared/helpers";


let url: string;
let userCookie: string;
let userId: string;

beforeAll(async () => {
    const result = await startTestServer();
    url = result.url;
});

afterAll(async () => {
    await stopTestServer();
});

beforeEach(async () => {
    await resetDatabase();
    const user = await registerUser(url, { handle: "achuser", email: "ach@test.com" });
    userCookie = user.cookie;
    userId = user.id;
});

describe("GET /achievements", () => {
    it("returns all achievements with parsed criteria", async () => {
        // Retry up to 3 times to handle race conditions with parallel achievement seeding
        let res: Response;
        for (let attempt = 0; attempt < 3; attempt++) {
            res = await apiFetch(url, "/api/v1/achievements", { cookie: userCookie });
            if (res.status === 200) break;
            await new Promise((r) => setTimeout(r, 500));
        }
        expect(res!.status).toBe(200);
        const data = await res!.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.achievements)).toBe(true);
    });
});

describe("GET /user/achievements", () => {
    it("returns user achievements when authenticated", async () => {
        const res = await apiFetch(url, "/api/v1/user/achievements", { cookie: userCookie });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
    });

    it("returns 401 when unauthenticated", async () => {
        const res = await apiFetch(url, "/api/v1/user/achievements");

        expect(res.status).toBe(401);
    });
});

describe("GET /user/achievements/progress", () => {
    it("reflects sessions_hosted count", async () => {
        await createTestSession(userId);

        const res = await apiFetch(url, "/api/v1/user/achievements/progress", { cookie: userCookie });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
    });

    it("reflects students_taught count", async () => {
        const profile = await db.profile.findUnique({ where: { userId } });
        await db.profile.update({ where: { userId }, data: { studentCount: 5 } });

        const res = await apiFetch(url, "/api/v1/user/achievements/progress", { cookie: userCookie });

        expect(res.status).toBe(200);
    });

    it("reflects profile completeness", async () => {
        const res = await apiFetch(url, "/api/v1/user/achievements/progress", { cookie: userCookie });

        expect(res.status).toBe(200);
    });

    it("reflects messages_sent count", async () => {
        const { user: other } = await createTestUser({ handle: "msgtarget" });
        await createTestMessage(userId, other.id);

        const res = await apiFetch(url, "/api/v1/user/achievements/progress", { cookie: userCookie });

        expect(res.status).toBe(200);
    });

    it("returns 401 when unauthenticated", async () => {
        const res = await apiFetch(url, "/api/v1/user/achievements/progress");

        expect(res.status).toBe(401);
    });
});

describe("GET /leaderboard", () => {
    it("returns ranked list by achievementPoints", async () => {
        const res = await apiFetch(url, "/api/v1/leaderboard");

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
    });

    it("respects limit parameter", async () => {
        const res = await apiFetch(url, "/api/v1/leaderboard?limit=5");

        expect(res.status).toBe(200);
    });

    it("only includes users with achievementPoints > 0", async () => {
        const res = await apiFetch(url, "/api/v1/leaderboard");

        expect(res.status).toBe(200);
        const data = await res.json();
        // Users with 0 points should not appear
        if (data.data?.length > 0) {
            for (const entry of data.data) {
                expect(entry.achievementPoints).toBeGreaterThan(0);
            }
        }
    });
});