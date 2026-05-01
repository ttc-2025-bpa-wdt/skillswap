/**
 * Notification Schema Types
 */

export enum NotificationType {
    MESSAGE = "MESSAGE",
    SESSION_REMINDER = "SESSION_REMINDER",
    SESSION_JOIN = "SESSION_JOIN",
    SESSION_CANCEL = "SESSION_CANCEL",
    NEW_REVIEW = "NEW_REVIEW",
    ACHIEVEMENT_UNLOCKED = "ACHIEVEMENT_UNLOCKED",
    SYSTEM = "SYSTEM",
    FOLLOW = "FOLLOW",
}

export interface INotification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data: INotificationData | null;
    read: boolean;
    createdAt: Date;
}

export interface INotificationData {
    sessionId?: string;
    sessionName?: string;
    senderId?: string;
    senderHandle?: string;
    achievementId?: string;
    achievementKey?: string;
    reviewId?: string;
    rating?: number;
    [key: string]: unknown;
}

export interface INotificationCreate {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: INotificationData;
}

export interface INotificationList {
    notifications: INotification[];
    total: number;
}

export type { INotification as default };