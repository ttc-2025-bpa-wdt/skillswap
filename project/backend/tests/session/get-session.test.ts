import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser } from "../helpers/auth";
import { createTestSession, createTestUser } from "../helpers/fixtures";


let url: string;
let userCookie: string;

beforeAll(async () => {
    const result = await startTestServer();
    url = result.url;
});

afterAll(async () => {
    await stopTestServer();
});

beforeEach(async () => {
    await resetDatabase();
    const user = await registerUser(url, { handle: "getsession", email: "getsession@test.com" });
    userCookie = user.cookie;
});

describe("GET /session", () => {
    it("returns session by id", async () => {
        const { user: host } = await createTestUser({ handle: "sessionhost2" });
        const session = await createTestSession(host.id);

        const res = await apiFetch(url, `/api/v1/session?id=${session.id}`, { cookie: userCookie });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
    });

    it("returns 404 for nonexistent session", async () => {
        const res = await apiFetch(url, "/api/v1/session?id=00000000-0000-0000-0000-000000000000", { cookie: userCookie });

        expect(res.status).toBe(404);
    });

    it("returns 400 without id", async () => {
        const res = await apiFetch(url, "/api/v1/session", { cookie: userCookie });

        expect(res.status).toBe(400);
    });
});