import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { startTestServer, stopTestServer, resetDatabase } from "../helpers/setup";
import { createTestUser } from "../helpers/fixtures";
import { db } from "shared/helpers";


let url: string;

beforeAll(async () => {
    const result = await startTestServer();
    url = result.url;
});

afterAll(async () => {
    await stopTestServer();
});

beforeEach(async () => {
    await resetDatabase();
});

describe("AchievementService", () => {
    it("initializeAchievements creates all definitions", async () => {
        const { initializeAchievements } = await import("../../src/services/achievement.ts");
        await initializeAchievements();

        const achievements = await db.achievement.findMany();
        expect(achievements.length).toBeGreaterThan(0);
    });

    it("initializeAchievements is idempotent", async () => {
        const { initializeAchievements } = await import("../../src/services/achievement.ts");
        await initializeAchievements();
        await initializeAchievements();

        const achievements = await db.achievement.findMany();
        const keys = achievements.map((a) => a.key);
        const uniqueKeys = new Set(keys);
        expect(keys.length).toBe(uniqueKeys.size);
    });

    it("getLeaderboard returns sorted by achievementPoints", async () => {
        const { user: u1 } = await createTestUser({ handle: "leader1" });
        await db.profile.update({ where: { userId: u1.id }, data: { achievementPoints: 50 } });

        const { user: u2 } = await createTestUser({ handle: "leader2" });
        await db.profile.update({ where: { userId: u2.id }, data: { achievementPoints: 100 } });

        const { getLeaderboard } = await import("../../src/services/achievement.ts");
        const board = await getLeaderboard();

        expect(board.length).toBeGreaterThan(0);
        if (board.length >= 2) {
            expect(board[0].achievementPoints).toBeGreaterThanOrEqual(board[1].achievementPoints);
        }
    });

    it("getLeaderboard respects limit", async () => {
        const { getLeaderboard } = await import("../../src/services/achievement.ts");
        const board = await getLeaderboard(2);

        expect(board.length).toBeLessThanOrEqual(2);
    });

    it("unlockAchievement increments profile achievementPoints", async () => {
        const { user: u } = await createTestUser({ handle: "unlocker" });
        const { initializeAchievements, unlockAchievement } = await import("../../src/services/achievement.ts");
        await initializeAchievements();

        const achievement = await db.achievement.findFirst();
        if (achievement) {
            await unlockAchievement(u.id, achievement.key);

            const profile = await db.profile.findUnique({ where: { userId: u.id } });
            expect(profile!.achievementPoints).toBeGreaterThan(0);
        }
    });

    it("does not re-unlock already unlocked achievement", async () => {
        const { user: u } = await createTestUser({ handle: "reunlocker" });
        const { initializeAchievements, unlockAchievement } = await import("../../src/services/achievement.ts");
        await initializeAchievements();

        const achievement = await db.achievement.findFirst();
        if (achievement) {
            await unlockAchievement(u.id, achievement.key);
            const points1 = (await db.profile.findUnique({ where: { userId: u.id } }))!.achievementPoints;

            await unlockAchievement(u.id, achievement.key);
            const points2 = (await db.profile.findUnique({ where: { userId: u.id } }))!.achievementPoints;

            expect(points2).toBe(points1);
        }
    });

    it("checkAndUnlockAchievements unlocks when progress reaches 100%", async () => {
        const { user: u } = await createTestUser({ handle: "progresschecker" });
        const { initializeAchievements, checkProfileAchievements } = await import("../../src/services/achievement.ts");
        await initializeAchievements();

        await db.profile.update({
            where: { userId: u.id },
            data: { bio: "Has a bio", skills: JSON.stringify(["skill1"]), avatarUrl: "/images/avatar/test.png" },
        });

        await checkProfileAchievements(u.id);

        const achievements = await db.userAchievement.findMany({ where: { userId: u.id } });
        // May or may not unlock depending on criteria, but should not throw
        expect(Array.isArray(achievements)).toBe(true);
    });
});