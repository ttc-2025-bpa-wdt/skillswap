import { DEVELOPMENT_MODE } from "shared/config";
import { db, Security } from "shared/helpers";
import { users } from "shared/mock";
import type { IUser, IUserCredential } from "shared/schema";
import { Authentication } from "./auth";

export enum UserFilter {
    Id = 0b001,
    Email = 0b010,
    Handle = 0b100,
}

export class User {
    static async read(value: string, filter: UserFilter): Promise<IUser | null> {
        const checks: any[] = [];
        if (filter & UserFilter.Id) checks.push({ id: value });
        if (filter & UserFilter.Email) checks.push({ email: value });
        if (filter & UserFilter.Handle) checks.push({ handle: value });

        if (checks.length === 0) return null;

        const user = await db.user.findFirst({
            where: { OR: checks },
            include: { profile: { select: { id: true } } },
        });

        if (!user) return null;

        return {
            ...user,
            profileId: user.profile?.id || "",
        } as unknown as IUser;
    }

    static async verifyPassword({ passwordHash, passwordSalt }: IUserCredential, password: string): Promise<boolean> {
        return await Security.verifyPasswd(password, passwordHash, passwordSalt);
    }

    static async authenticate(emailOrHandle: string, password: string, remember: boolean): Promise<string | null> {
        const user = await User.read(emailOrHandle, UserFilter.Email | UserFilter.Handle);
        if (!user) return null;

        const isValid = await User.verifyPassword(user, password);
        if (!isValid) return null;

        return Authentication.issueToken(user.id, remember);
    }
}

export class UserMock {
    static async read(value: string, filter: UserFilter): Promise<IUser | null> {
        const user = Object.values(users).find((user) => {
            if (filter & UserFilter.Id && user.id === value) return true;
            if (filter & UserFilter.Email && user.email === value) return true;
            if (filter & UserFilter.Handle && user.handle === value) return true;
            return false;
        });

        return user || null;
    }

    static async verifyPassword({ passwordHash, passwordSalt }: IUserCredential, password: string): Promise<boolean> {
        if (DEVELOPMENT_MODE) return true; // Skip password verification in development mode - for testing only
        return await Security.verifyPasswd(password, passwordHash, passwordSalt);
    }

    static async authenticate(emailOrHandle: string, password: string, remember: boolean): Promise<string | null> {
        const user = await UserMock.read(emailOrHandle, UserFilter.Email | UserFilter.Handle);
        if (!user) return null;

        const isValid = await UserMock.verifyPassword(user, password);
        if (!isValid) return null;

        return Authentication.issueToken(user.id, remember);
    }

    static async create(email: string, handle: string, password: string): Promise<void> {
        const [salt, hash] = await Security.hashPasswd(password);
    }
}
