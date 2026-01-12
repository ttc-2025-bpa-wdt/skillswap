import { type ITag } from "shared/schema";

export const difficultyTags: Record<string, ITag> = {
    "beginner": { name: "Beginner", color: "#4CAF50" }, // Green
    "intermediate": { name: "Intermediate", color: "#FF9800" }, // Orange
    "advanced": { name: "Advanced", color: "#F44336" }, // Red
};

export interface ISession {
    id: string;
    userId: string;
    name: string;
    prereqs: string;
    difficulty: keyof typeof difficultyTags;
    createdAt: Date;
    eventDate: Date;
}
