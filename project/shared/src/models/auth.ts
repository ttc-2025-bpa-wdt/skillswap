import { AUTH_COOKIE_EXPIRY, AUTH_COOKIE_NAME } from "shared/config";

import cookie from "cookie";

import { Security } from "shared/helpers";
import type { IAuthToken } from "shared/schema";

export class Authentication {
    public static issueToken(userId: string, remember: boolean): string | null {
        const payload: IAuthToken = {
            sub: userId,
            iat: Math.floor(Date.now() / 1000),
        };

        if (remember) // Set expiry if "remember me" is checked
            payload.exp = Math.floor(Date.now() / 1000) + AUTH_COOKIE_EXPIRY;

        return Security.encodeToken<IAuthToken>(payload);
    }

    public static validateToken(request: Request): IAuthToken | null {
        const cookies = cookie.parse(request.headers.get("Cookie") || "");

        const token = cookies[AUTH_COOKIE_NAME];
        if (!token) return null;

        return Security.decodeToken<IAuthToken>(token);
    }
}
