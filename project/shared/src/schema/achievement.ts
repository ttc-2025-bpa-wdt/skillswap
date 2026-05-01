/**
 * Achievement Schema Types
 */

export interface IAchievement {
    id: string;
    key: string;
    name: string;
    description: string;
    iconUrl: string;
    category: string;
    criteria: IAchievementCriteria;
    points: number;
    hidden: boolean;
    createdAt: Date;
}

export interface IAchievementCriteria {
    type: "sessions_hosted" | "students_taught" | "rating" | "sessions_attended" | "reviews_given" | "messages_sent" | "profile_complete" | "early_adopter";
    value?: number;
    minReviews?: number;
}

export interface IUserAchievement {
    id: string;
    userId: string;
    achievementId: string;
    achievement: IAchievement;
    unlockedAt: Date;
}

export interface IAchievementProgress {
    key: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    points: number;
    unlocked: boolean;
    unlockedAt?: Date;
    progress: number; // 0-100 percentage
    currentValue: number;
    targetValue: number;
}

export interface IAchievementLeaderboardEntry {
    rank: number;
    userId: string;
    handle: string;
    displayName: string;
    avatarUrl: string;
    achievementPoints: number;
}

export type { IAchievement as default };