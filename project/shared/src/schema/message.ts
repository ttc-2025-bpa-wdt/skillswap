/**
 * Message Schema Types
 */

export enum MessageStatus {
    SENT = "SENT",
    DELIVERED = "DELIVERED",
    READ = "READ",
}

export interface IMessage {
    id: string;
    senderId: string;
    recipientId: string;
    content: string;
    status: MessageStatus;
    deliveredAt: Date | null;
    readAt: Date | null;
    sessionName?: string;
    createdAt: Date;
}

export interface IMessageCreate {
    recipientId: string;
    content: string;
    sessionName?: string;
}

export interface IConversation {
    partner: {
        id: string;
        handle: string;
        displayName?: string;
        avatarUrl?: string;
    };
    lastMessage: {
        content: string;
        createdAt: Date;
        isSent: boolean;
        status: MessageStatus;
        readAt?: Date;
    };
}

export type { IMessage as default };