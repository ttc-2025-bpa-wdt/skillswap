import { db } from "shared/helpers";
import { sessions } from "shared/mock";
import { type ISession } from "shared/schema";
import { Profile, ProfileFilter, User, UserFilter } from "shared/models";

export enum SessionFilter {
    Id = 0b01,
    Name = 0b10,
}

export class Session {
    static async read(value: string, filter: SessionFilter): Promise<ISession | null> {
        const orConditions: any[] = [];
        if (filter & SessionFilter.Id) orConditions.push({ id: value });
        if (filter & SessionFilter.Name) orConditions.push({ name: value });

        if (orConditions.length === 0) return null;

        const session = await db.session.findFirst({
            where: { OR: orConditions }
        });

        if (!session) return null;

        return {
            ...session,
            categories: JSON.parse(session.categories)
        } as unknown as ISession;
    }

    static async search(query: string): Promise<ISession[]> {
        // Search by name, categories, user handle, display name
        // Categories is stored as JSON string "['Music', 'Art']"
        // Searching inside JSON string with 'contains' usually works for simple cases, though not robust
        
        const sessions = await db.session.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { categories: { contains: query } },
                    { user: { handle: { contains: query } } },
                    { user: { profile: { displayName: { contains: query } } } }
                ]
            }
        });

        return sessions.map(s => ({
            ...s,
            categories: JSON.parse(s.categories)
        } as unknown as ISession));
    }
}

export class SessionMock {
    static async read(value: string, filter: SessionFilter): Promise<ISession | null> {
        for (const session of Object.values(sessions)) {
            if (filter & SessionFilter.Id && session.id === value) return session;
            if (filter & SessionFilter.Name && session.name === value) return session;
        }
        return null;
    }

    static async search(query: string): Promise<ISession[]> {
        const results: ISession[] = [];
        const lowerQuery = query.toLowerCase();

        for (const session of Object.values(sessions)) {
            const user = await User.read(session.userId, UserFilter.Id);
            const profile = user ? await Profile.read(user.profileId, ProfileFilter.Id) : null;

            if (
                profile?.displayName.toLowerCase().includes(lowerQuery) ||
                user?.handle.toLowerCase().includes(lowerQuery) ||
                session.name.toLowerCase().includes(lowerQuery) ||
                session.categories.some((category) => category.toLowerCase().includes(lowerQuery))
            ) {
                results.push(session);
            }
        }

        return results;
    }

    static async create(sessionData: Omit<ISession, "id">): Promise<ISession> {
        const newId = sessions.length.toString();
        const newSession: ISession = { id: newId, ...sessionData };

        sessions.push(newSession);
        return newSession;
    }

    static async update(id: string, sessionData: Partial<Omit<ISession, "id">>): Promise<ISession | null> {
        const session = await this.read(id, SessionFilter.Id);
        if (!session) return null;

        Object.assign(session, sessionData);
        return session;
    }

    static async delete(id: string): Promise<boolean> {
        const index = sessions.findIndex((session) => session.id === id);
        if (index === -1) return false;

        sessions.splice(index, 1);
        return true;
    }
}

export default Session;
