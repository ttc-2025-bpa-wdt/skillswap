import { type ITag } from "shared/schema";

export const difficultyTags: Record<string, ITag> = {
    beginner: { name: "Beginner", color: "#4CAF50" },
    intermediate: { name: "Intermediate", color: "#FF9800" },
    advanced: { name: "Advanced", color: "#F44336" },
};

export interface ISession {
    id: string;
    userId: string;
    name: string;
    categories: string[];
    prereqs: string;
    difficulty: keyof typeof difficultyTags;
    createdAt: Date;
    eventDate: Date;
}
