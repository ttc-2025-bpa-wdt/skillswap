import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser, createAdminUser, TEST_PASSWORD } from "../helpers/auth";


let url: string;
let userCookie: string;
let userHandle: string;
let adminCookie: string;
let adminHandle: string;

beforeAll(async () => {
    const result = await startTestServer();
    url = result.url;
});

afterAll(async () => {
    await stopTestServer();
});

beforeEach(async () => {
    await resetDatabase();
    const user = await registerUser(url, { handle: "getuser", email: "getuser@test.com" });
    userCookie = user.cookie;
    userHandle = user.handle;
    const admin = await createAdminUser(url);
    adminCookie = admin.cookie;
    adminHandle = admin.handle;
});

describe("GET /user", () => {
    it("returns user profile when authenticated", async () => {
        const res = await apiFetch(url, "/api/v1/user", { cookie: userCookie });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.data.profile).toBeDefined();
        expect(data.data.profile.displayName).toBeDefined();
    });

    it("returns 401 when unauthenticated", async () => {
        const res = await apiFetch(url, "/api/v1/user");

        expect(res.status).toBe(401);
    });

    it("returns another user's profile by handle", async () => {
        const res = await apiFetch(url, `/api/v1/user?handle=${userHandle}`, { cookie: userCookie });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
    });

    it("returns 404 for nonexistent handle", async () => {
        const res = await apiFetch(url, "/api/v1/user?handle=nonexistent", { cookie: userCookie });

        expect(res.status).toBe(404);
    });
});