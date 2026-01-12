export const profileTags: Record<string, ITag> = {
    founder: { name: "Founder", color: "#2C74C4" },
    mentor: { name: "Mentor", color: "#4CAF50" },
    student: { name: "Student", color: "#FF9800" },
};

export interface IUserStats {
    sessionCount: number;
    studentCount: number;
    rating: number;
}

export interface ITag {
    name: string;
    color: string;
}

export interface IProfile {
    id: string;
    userId: string;
    displayName: string;
    avatarUrl: string;
    tags: (keyof typeof profileTags)[];
    skills: string[];
    bio: string;
    stats: IUserStats;
}
