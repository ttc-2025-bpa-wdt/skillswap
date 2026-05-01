/**
 * Achievement Service
 * Handles achievement unlocking, progress tracking, and badge management
 */

import { db } from "shared/helpers";
import type { IAchievementProgress } from "shared/schema";

// Achievement criteria definitions
export const ACHIEVEMENT_DEFINITIONS = [
    // Teaching achievements
    { key: "first-session", name: "First Steps", description: "Host your first session", category: "teaching", points: 10, icon: "mdi:school", criteria: { type: "sessions_hosted", value: 1 } },
    { key: "five-sessions", name: "Getting Started", description: "Host 5 sessions", category: "teaching", points: 25, icon: "mdi:presentation", criteria: { type: "sessions_hosted", value: 5 } },
    { key: "ten-sessions", name: "Seasoned Mentor", description: "Host 10+ sessions", category: "teaching", points: 50, icon: "mdi:star", criteria: { type: "sessions_hosted", value: 10 } },
    { key: "twenty-five-sessions", name: "Master Teacher", description: "Host 25+ sessions", category: "teaching", points: 100, icon: "mdi:trophy", criteria: { type: "sessions_hosted", value: 25 } },
    
    // Student achievements
    { key: "first-student", name: "Welcome Wagon", description: "Get your first student", category: "teaching", points: 10, icon: "mdi:account-plus", criteria: { type: "students_taught", value: 1 } },
    { key: "five-students", name: "Growing Community", description: "Teach 5+ students", category: "teaching", points: 25, icon: "mdi:account-group", criteria: { type: "students_taught", value: 5 } },
    { key: "ten-students", name: "Popular Teacher", description: "Teach 10+ students", category: "teaching", points: 50, icon: "mdi:account-multiple", criteria: { type: "students_taught", value: 10 } },
    { key: "twenty-five-students", name: "Beloved Mentor", description: "Teach 25+ students", category: "teaching", points: 100, icon: "mdi:crown", criteria: { type: "students_taught", value: 25 } },
    
    // Rating achievements
    { key: "highly-rated", name: "Rising Star", description: "Achieve a 4.5+ average rating with 3+ reviews", category: "teaching", points: 30, icon: "mdi:thumb-up", criteria: { type: "rating", value: 4.5, minReviews: 3 } },
    { key: "top-rated", name: "Exceptional Educator", description: "Achieve a 4.8+ average rating with 5+ reviews", category: "teaching", points: 75, icon: "mdi:medal", criteria: { type: "rating", value: 4.8, minReviews: 5 } },
    
    // Learning achievements
    { key: "first-registration", name: "Curious Mind", description: "Register for your first session", category: "learning", points: 5, icon: "mdi:book-open", criteria: { type: "sessions_attended", value: 1 } },
    { key: "five-registrations", name: "Eager Learner", description: "Register for 5 sessions", category: "learning", points: 25, icon: "mdi:book-multiple", criteria: { type: "sessions_attended", value: 5 } },
    { key: "ten-registrations", name: "Committed Student", description: "Register for 10+ sessions", category: "learning", points: 50, icon: "mdi:graduation-cap", criteria: { type: "sessions_attended", value: 10 } },
    
    // Review achievements
    { key: "first-review", name: "Voice Your Opinion", description: "Leave your first review", category: "community", points: 5, icon: "mdi:message-star", criteria: { type: "reviews_given", value: 1 } },
    { key: "five-reviews", name: "Trusted Voice", description: "Leave 5+ reviews", category: "community", points: 25, icon: "mdi:comment-star", criteria: { type: "reviews_given", value: 5 } },
    
    // Profile achievements
    { key: "profile-complete", name: "Identity Established", description: "Complete your profile (avatar, bio, skills)", category: "special", points: 15, icon: "mdi:account-check", criteria: { type: "profile_complete" } },
    
    // Social achievements
    { key: "first-message", name: "Breaking the Ice", description: "Send your first message", category: "community", points: 5, icon: "mdi:message-text", criteria: { type: "messages_sent", value: 1 } },
    
    // Special achievements
    { key: "early-adopter", name: "Pioneer", description: "Join SkillSwap during the beta period", category: "special", points: 20, icon: "mdi:rocket-launch", criteria: { type: "early_adopter" }, hidden: true },
];

export type { IAchievementProgress };

/**
 * Initialize achievements in the database if they don't exist
 */
export async function initializeAchievements() {
    for (const def of ACHIEVEMENT_DEFINITIONS) {
        try {
            await db.achievement.upsert({
                where: { key: def.key },
                update: {},
                create: {
                    key: def.key,
                    name: def.name,
                    description: def.description,
                    iconUrl: def.icon,
                    category: def.category,
                    criteria: JSON.stringify(def.criteria),
                    points: def.points,
                    hidden: def.hidden ?? false,
                },
            });
        } catch {
            // Already exists — safe to ignore
        }
    }
}

/**
 * Get all achievements with unlock status for a user
 */
export async function getUserAchievements(userId: string) {
    const achievements = await db.achievement.findMany({
        orderBy: [{ category: "asc" }, { points: "asc" }],
    });

    const userAchievements = await db.userAchievement.findMany({
        where: { userId },
    });

    const unlockedMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua.unlockedAt]));

    return achievements.map((a) => ({
        ...a,
        criteria: JSON.parse(a.criteria),
        unlocked: unlockedMap.has(a.id),
        unlockedAt: unlockedMap.get(a.id),
    }));
}

/**
 * Get achievement progress for a user
 */
export async function getAchievementProgress(userId: string): Promise<IAchievementProgress[]> {
    const achievements = await db.achievement.findMany({
        where: { hidden: false },
        orderBy: [{ category: "asc" }, { points: "asc" }],
    });

    const userAchievements = await db.userAchievement.findMany({
        where: { userId },
    });

    // Get user stats
    const profile = await db.profile.findUnique({
        where: { userId },
    });

    const sessionsHosted = await db.session.count({
        where: { userId },
    });

    const registrations = await db.sessionRegistration.count({
        where: { userId },
    });

    const reviewsGiven = await db.review.count({
        where: { authorId: userId },
    });

    const reviewsReceived = await db.review.count({
        where: { recipientId: userId },
    });

    const messagesSent = await db.message.count({
        where: { senderId: userId },
    });

    const unlockedSet = new Set(userAchievements.map((ua) => ua.achievementId));
    const unlockedAtMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua.unlockedAt]));

    return achievements.map((a) => {
        const criteria = JSON.parse(a.criteria);
        let currentValue = 0;
        let targetValue = criteria.value ?? 1;
        let progress = 0;
        let unlocked = unlockedSet.has(a.id);

        switch (criteria.type) {
            case "sessions_hosted":
                currentValue = sessionsHosted;
                progress = Math.min(100, (currentValue / targetValue) * 100);
                break;
            case "students_taught":
                currentValue = profile?.studentCount ?? 0;
                progress = Math.min(100, (currentValue / targetValue) * 100);
                break;
            case "rating":
                currentValue = profile?.rating ?? 0;
                targetValue = criteria.value;
                // For rating, progress is based on meeting the threshold
                progress = currentValue >= targetValue ? 100 : Math.min(100, (currentValue / targetValue) * 100);
                // Also check minimum reviews
                if (reviewsReceived < (criteria.minReviews ?? 0)) {
                    progress = Math.min(progress, (reviewsReceived / criteria.minReviews) * 100);
                    unlocked = false; // Can't unlock without minimum reviews
                }
                break;
            case "sessions_attended":
                currentValue = registrations;
                progress = Math.min(100, (currentValue / targetValue) * 100);
                break;
            case "reviews_given":
                currentValue = reviewsGiven;
                progress = Math.min(100, (currentValue / targetValue) * 100);
                break;
            case "messages_sent":
                currentValue = messagesSent;
                progress = Math.min(100, (currentValue / targetValue) * 100);
                break;
            case "profile_complete":
                // Check if profile is complete
                const isComplete = profile?.avatarUrl && profile?.bio && profile?.skills;
                progress = isComplete ? 100 : 0;
                currentValue = isComplete ? 1 : 0;
                targetValue = 1;
                break;
            default:
                progress = unlocked ? 100 : 0;
        }

        return {
            key: a.key,
            name: a.name,
            description: a.description,
            icon: a.iconUrl,
            category: a.category,
            points: a.points,
            unlocked,
            unlockedAt: unlockedAtMap.get(a.id),
            progress: Math.round(progress),
            currentValue,
            targetValue,
        };
    });
}

/**
 * Check and unlock achievements for a user based on their stats
 */
export async function checkAndUnlockAchievements(userId: string): Promise<string[]> {
    const progress = await getAchievementProgress(userId);
    const unlockedKeys: string[] = [];

    for (const ach of progress) {
        if (!ach.unlocked && ach.progress >= 100) {
            await unlockAchievement(userId, ach.key);
            unlockedKeys.push(ach.key);
        }
    }

    return unlockedKeys;
}

/**
 * Unlock a specific achievement for a user
 */
export async function unlockAchievement(userId: string, achievementKey: string) {
    const achievement = await db.achievement.findUnique({
        where: { key: achievementKey },
    });

    if (!achievement) {
        console.error(`Achievement not found: ${achievementKey}`);
        return null;
    }

    // Check if already unlocked
    const existing = await db.userAchievement.findUnique({
        where: {
            userId_achievementId: {
                userId,
                achievementId: achievement.id,
            },
        },
    });

    if (existing) {
        return existing; // Already unlocked
    }

    // Unlock the achievement
    const userAchievement = await db.userAchievement.upsert({
        where: {
            userId_achievementId: {
                userId,
                achievementId: achievement.id,
            },
        },
        update: {},
        create: {
            userId,
            achievementId: achievement.id,
        },
    });

    // Update user's achievement points
    await db.profile.update({
        where: { userId },
        data: {
            achievementPoints: {
                increment: achievement.points,
            },
        },
    });

    return userAchievement;
}

/**
 * Get leaderboard by achievement points
 */
export async function getLeaderboard(limit: number = 10) {
    const profiles = await db.profile.findMany({
        where: {
            achievementPoints: { gt: 0 },
        },
        orderBy: {
            achievementPoints: "desc",
        },
        take: limit,
        include: {
            user: {
                select: {
                    handle: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
    });

    return profiles.map((p, index) => ({
        rank: index + 1,
        userId: p.userId,
        handle: p.user.handle,
        displayName: p.displayName || `${p.user.firstName} ${p.user.lastName}`,
        avatarUrl: p.avatarUrl,
        achievementPoints: p.achievementPoints,
    }));
}

/**
 * Check session-related achievements
 * Call this after a session is created
 */
export async function checkSessionAchievements(userId: string) {
    return checkAndUnlockAchievements(userId);
}

/**
 * Check student-related achievements
 * Call this after someone registers for a session
 */
export async function checkStudentAchievements(hostId: string, studentId: string) {
    const results = await Promise.all([
        checkAndUnlockAchievements(hostId), // Check host achievements
        checkAndUnlockAchievements(studentId), // Check student achievements
    ]);
    return results.flat();
}

/**
 * Check rating achievements
 * Call this after a review is submitted
 */
export async function checkRatingAchievements(recipientId: string) {
    return checkAndUnlockAchievements(recipientId);
}

/**
 * Check profile achievements
 * Call this after a profile is updated
 */
export async function checkProfileAchievements(userId: string) {
    return checkAndUnlockAchievements(userId);
}

/**
 * Check message achievements
 * Call this after a message is sent
 */
export async function checkMessageAchievements(senderId: string) {
    return checkAndUnlockAchievements(senderId);
}

export default {
    initializeAchievements,
    getUserAchievements,
    getAchievementProgress,
    checkAndUnlockAchievements,
    unlockAchievement,
    getLeaderboard,
    checkSessionAchievements,
    checkStudentAchievements,
    checkRatingAchievements,
    checkProfileAchievements,
    checkMessageAchievements,
};