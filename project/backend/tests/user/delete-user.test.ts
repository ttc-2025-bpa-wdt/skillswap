import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase, apiFetch } from "../helpers/setup";
import { registerUser, createAdminUser } from "../helpers/auth";
import { db } from "shared/helpers";


let url: string;
let userCookie: string;
let userHandle: string;
let adminCookie: string;

beforeAll(async () => {
    const result = await startTestServer();
    url = result.url;
});

afterAll(async () => {
    await stopTestServer();
});

beforeEach(async () => {
    await resetDatabase();
    const user = await registerUser(url, { handle: "deleteuser", email: "delete@test.com" });
    userCookie = user.cookie;
    userHandle = user.handle;
    const admin = await createAdminUser(url);
    adminCookie = admin.cookie;
});

describe("DELETE /user", () => {
    it("deletes own account", async () => {
        const res = await apiFetch(url, "/api/v1/user", {
            method: "DELETE",
            cookie: userCookie,
        });

        expect(res.status).toBe(200);
        const user = await db.user.findUnique({ where: { handle: userHandle } });
        expect(user).toBeNull();
    });

    it("allows admin to delete another user", async () => {
        const res = await apiFetch(url, `/api/v1/user?handle=${userHandle}`, {
            method: "DELETE",
            cookie: adminCookie,
        });

        expect(res.status).toBe(200);
    });

    it("forbids non-admin from deleting another user", async () => {
        await registerUser(url, { handle: "targetuser", email: "target@test.com" });

        const res = await apiFetch(url, "/api/v1/user?handle=targetuser", {
            method: "DELETE",
            cookie: userCookie,
        });

        expect(res.status).toBe(403);
    });

    it("returns error for nonexistent user", async () => {
        const res = await apiFetch(url, "/api/v1/user?handle=ghostuser", {
            method: "DELETE",
            cookie: adminCookie,
        });

        // Deleting nonexistent user should fail (500 or 404)
        expect([404, 500]).toContain(res.status);
    });
});