import { db } from "shared/helpers";
import { Security } from "shared/helpers/security";
import type { IAuthToken } from "shared/schema";

/** Create a user directly in the DB, bypassing the registration endpoint */
export async function createTestUser(overrides: Partial<{
    handle: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    dob: string;
    role: string;
    emailVerified: boolean;
}> = {}) {
    const handle = overrides.handle ?? `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const email = overrides.email ?? `${handle}@test.com`;
    const password = overrides.password ?? "TestPass123!";
    const [salt, hash] = await Security.hashPasswd(password);

    const user = await db.user.create({
        data: {
            handle,
            email,
            passwordHash: hash,
            passwordSalt: salt,
            emailVerified: overrides.emailVerified ?? true,
            role: overrides.role ?? "USER",
            firstName: overrides.firstName ?? "Fixture",
            lastName: overrides.lastName ?? "User",
            dob: new Date(overrides.dob ?? "1990-01-01"),
            profile: {
                create: {
                    displayName: overrides.firstName ?? "Fixture",
                    avatarUrl: "/images/avatar/default.png",
                    bio: "",
                    tags: "[]",
                    skills: "[]",
                    sessionCount: 0,
                    studentCount: 0,
                    rating: 0,
                    achievementPoints: 0,
                },
            },
        },
        include: { profile: true },
    });

    return { user, profile: user.profile, password };
}

/** Create a session directly in the DB */
export async function createTestSession(
    hostUserId: string,
    overrides: Partial<{
        name: string;
        description: string;
        categories: string[];
        difficulty: string;
        meetingUrl: string;
        duration: number;
        eventDate: Date;
        prereqs: string;
    }> = {}
) {
    return db.session.create({
        data: {
            name: overrides.name ?? `Test Session ${Date.now()}`,
            description: overrides.description ?? "A test session",
            categories: JSON.stringify(overrides.categories ?? ["testing"]),
            difficulty: overrides.difficulty ?? "beginner",
            meetingUrl: overrides.meetingUrl ?? "https://zoom.us/j/123456789",
            duration: overrides.duration ?? 60,
            eventDate: overrides.eventDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
            prereqs: overrides.prereqs ?? "",
            userId: hostUserId,
        },
    });
}

/** Create a session registration directly in the DB */
export async function createTestRegistration(sessionId: string, userId: string) {
    const reg = await db.sessionRegistration.create({
        data: { sessionId, userId },
    });

    // Increment host's studentCount
    const session = await db.session.findUnique({ where: { id: sessionId }, select: { userId: true } });
    if (session) {
        await db.profile.update({
            where: { userId: session.userId },
            data: { studentCount: { increment: 1 } },
        });
    }

    return reg;
}

/** Create a review directly in the DB */
export async function createTestReview(
    sessionId: string,
    authorId: string,
    recipientId: string,
    overrides: Partial<{ rating: number; comment: string; hidden: boolean }> = {}
) {
    return db.review.create({
        data: {
            sessionId,
            authorId,
            recipientId,
            rating: overrides.rating ?? 5,
            comment: overrides.comment ?? "",
            hidden: overrides.hidden ?? false,
        },
    });
}

/** Create a notification directly in the DB */
export async function createTestNotification(
    userId: string,
    type: string,
    overrides: Partial<{ title: string; body: string; data: string; read: boolean }> = {}
) {
    return db.notification.create({
        data: {
            userId,
            type: type as any,
            title: overrides.title ?? "Test Notification",
            body: overrides.body ?? "Test notification body",
            data: overrides.data,
            read: overrides.read ?? false,
        },
    });
}

/** Create a message directly in the DB */
export async function createTestMessage(
    senderId: string,
    recipientId: string,
    content: string = "Test message",
    overrides: Partial<{ status: string; sessionName: string }> = {}
) {
    return db.message.create({
        data: {
            senderId,
            recipientId,
            content,
            status: (overrides.status ?? "SENT") as any,
            sessionName: overrides.sessionName,
        },
    });
}