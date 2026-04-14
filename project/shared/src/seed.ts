import "shared/config";

import { db } from "shared/helpers";
import { Security } from "shared/helpers";
import { users, profiles, sessions } from "shared/mock";

const DEFAULT_PASSWORD = "password123";

async function seed() {
    const count = await db.user.count();
    if (count > 0) {
        console.log("Database already seeded, skipping.");
        process.exit(0);
    }

    console.log("Seeding database...");

    await db.$transaction(async (tx) => {
        // Create users with properly hashed passwords
        for (const mockUser of users) {
            const [salt, hash] = await Security.hashPasswd(DEFAULT_PASSWORD);

            const user = await tx.user.create({
                data: {
                    id: mockUser.id,
                    email: mockUser.email,
                    handle: mockUser.handle,
                    firstName: mockUser.firstName,
                    lastName: mockUser.lastName,
                    dob: mockUser.dob,
                    passwordHash: hash,
                    passwordSalt: salt,
                    emailVerified: true,
                    role: mockUser.role,
                },
            });

            // Find matching profile
            const mockProfile = profiles.find((p) => p.userId === mockUser.id);
            if (mockProfile) {
                await tx.profile.create({
                    data: {
                        id: mockProfile.id,
                        userId: user.id,
                        displayName: mockProfile.displayName,
                        avatarUrl: mockProfile.avatarUrl,
                        bio: mockProfile.bio,
                        tags: JSON.stringify(mockProfile.tags),
                        skills: JSON.stringify(mockProfile.skills),
                        sessionCount: mockProfile.stats?.sessionCount ?? 0,
                        studentCount: mockProfile.stats?.studentCount ?? 0,
                        rating: mockProfile.stats?.rating ?? 0,
                    },
                });
            }
        }

        // Create sessions
        for (const mockSession of sessions) {
            await tx.session.create({
                data: {
                    id: mockSession.id,
                    name: mockSession.name,
                    categories: JSON.stringify(mockSession.categories),
                    prereqs: mockSession.prereqs,
                    difficulty: mockSession.difficulty,
                    description: "",
                    meetingUrl: "",
                    duration: 60,
                    createdAt: mockSession.createdAt,
                    eventDate: mockSession.eventDate,
                    userId: mockSession.userId,
                },
            });
        }
    });

    console.log(`Seeded ${users.length} users, ${profiles.length} profiles, ${sessions.length} sessions.`);
    process.exit(0);
}

seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
