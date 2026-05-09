import { Database } from "bun:sqlite";
import { db } from "./src/helpers/db.js";
import { Security } from "./src/helpers/security.js";
import "shared/config";

const sqlite = new Database("D:/projects/tulsa-tech/skillswap/tmp/prod.db", { readonly: true });

const DEFAULT_PASSWORD = "password123";

async function migrate() {
    // Truncate existing data
    await db.$executeRawUnsafe(`
        TRUNCATE TABLE
            "UserAchievement",
            "PushSubscription",
            "Notification",
            "Message",
            "Review",
            "SessionRegistration",
            "Session",
            "Profile",
            "User"
        CASCADE
    `);

    // Seed achievements (skip if module not found - backend will handle it)
    try {
        const { initializeAchievements } = await import("../backend/src/services/achievement.js");
        await initializeAchievements();
    } catch {
        console.log("Skipping achievement seeding (will be handled by backend)");
    }

    const users = sqlite.prepare("SELECT * FROM User").all() as any[];
    const profiles = sqlite.prepare("SELECT * FROM Profile").all() as any[];
    const sessions = sqlite.prepare("SELECT * FROM Session").all() as any[];

    console.log(`Migrating ${users.length} users, ${profiles.length} profiles, ${sessions.length} sessions...`);

    for (const u of users) {
        const [salt, hash] = await Security.hashPasswd(DEFAULT_PASSWORD);
        await db.user.create({
            data: {
                id: u.id,
                email: u.email,
                handle: u.handle,
                passwordHash: hash,
                passwordSalt: salt,
                emailVerified: true,
                role: u.role === "ADMIN" ? "ADMIN" : "USER",
                firstName: u.firstName,
                lastName: u.lastName,
                dob: new Date(u.dob),
                createdAt: new Date(u.createdAt),
            },
        });

        const p = profiles.find((pr) => pr.userId === u.id);
        if (p) {
            await db.profile.create({
                data: {
                    id: p.id,
                    userId: u.id,
                    displayName: p.displayName,
                    avatarUrl: p.avatarUrl,
                    bio: p.bio || "",
                    tags: typeof p.tags === "string" ? p.tags : JSON.stringify(p.tags || []),
                    skills: typeof p.skills === "string" ? p.skills : JSON.stringify(p.skills || []),
                    sessionCount: p.sessionCount ?? 0,
                    studentCount: p.studentCount ?? 0,
                    rating: p.rating ?? 0,
                },
            });
        }
    }

    for (const s of sessions) {
        await db.session.create({
            data: {
                id: s.id,
                name: s.name,
                categories: typeof s.categories === "string" ? s.categories : JSON.stringify(s.categories || []),
                prereqs: s.prereqs || "",
                difficulty: s.difficulty || "beginner",
                description: s.description || "",
                meetingUrl: s.meetingUrl || "",
                duration: s.duration ?? 60,
                createdAt: new Date(s.createdAt),
                eventDate: new Date(s.eventDate),
                userId: s.userId,
            },
        });
    }

    console.log("Migration complete!");
    process.exit(0);
}

migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});