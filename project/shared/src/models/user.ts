import { DEVELOPMENT_MODE } from "shared/config";
import { Security } from "shared/helpers";
import { users } from "shared/mock";
import type { IUser, IUserCredential } from "shared/schema";
import { Authentication } from "./auth";

export enum UserFilter {
    Id     = 0b001,
    Email  = 0b010,
    Handle = 0b100,
}

export class User {
    static async read(value: string, filter: UserFilter): Promise<IUser | null> {
        const user = Object.values(users).find(user => {
            if (filter & UserFilter.Id && user.id === value) return true;
            if (filter & UserFilter.Email && user.email === value) return true;
            if (filter & UserFilter.Handle && user.handle === value) return true;
            return false;
        });

        return user || null;
    }

    static async verifyPassword({ passwordHash, passwordSalt }: IUserCredential, password: string): Promise<boolean> {
        console.log(`Development mode: ${DEVELOPMENT_MODE}`);
        if (DEVELOPMENT_MODE) return true; // Skip password verification in development mode
        return await Security.verifyPasswd(password, passwordHash, passwordSalt);
    }

    static async authenticate(emailOrHandle: string, password: string, remember: boolean): Promise<string | null> {
        const user = await User.read(emailOrHandle, UserFilter.Email | UserFilter.Handle);
        if (!user) return null;

        const isValid = await User.verifyPassword(user, password);
        if (!isValid) return null;

        return Authentication.issueToken(user.id, remember);
    }

    static async create(email: string, handle: string, password: string): Promise<void> {
        const [ salt, hash ] = await Security.hashPasswd(password);
    }
}
