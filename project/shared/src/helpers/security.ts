import type { IAuthToken } from "shared/schema";

import bcrypt from "bcrypt";
import crypto from "crypto";

import jwt from "jsonwebtoken";

export class Security {
    public static randomString(length: number): string {
        return crypto.randomBytes(length).toString("hex");
    }

    public static hmacPasswd(password: string, salt: string | Buffer): string {
        const pepper = Buffer.from(import.meta.env.PASSWORD_PEPPER!, "base64");
        return crypto
            .createHmac("sha256", new Uint8Array(pepper))
            .update(salt + password)
            .digest()
            .toString("base64");
    }

    public static async hashPasswd(password: string): Promise<[string, string]> {
        const hmacSalt = crypto.randomBytes(24);
        const hash = await bcrypt.hash(this.hmacPasswd(password, hmacSalt), 10);
        return [hmacSalt.toString("base64"), hash];
    }

    public static async verifyPasswd(password: string, hash: string, encodedSalt: string): Promise<boolean> {
        const hmacSalt = Buffer.from(encodedSalt, "base64");
        return await bcrypt.compare(this.hmacPasswd(password, hmacSalt), hash);
    }

    public static numericDate(date: Date): number {
        return Math.floor(date.getTime() / 1000);
    }

    // Convert a numeric date (seconds since epoch) to a Date object
    // Note: This is the inverse of numericDate
    //       and is used to convert timestamps from the database to Date objects.
    public static dateFromNumericDate(numeric: number): Date {
        return new Date(numeric * 1000);
    }

    // Get the current date as a numeric date (seconds since epoch)
    public static numericNow(): number {
        return this.numericDate(new Date());
    }

    public static encodeToken<T>(payload: T): string | null {
        try {
            const secret = Buffer.from(import.meta.env.JWT_SECRET!, "base64");
            return jwt.sign(payload as object, secret);
        } catch (e) {
            return null;
        }
    }

    public static decodeToken<T>(token: string): (T & IAuthToken) | null {
        try {
            const secret = Buffer.from(import.meta.env.JWT_SECRET!, "base64");
            return jwt.verify(token, secret) as T & IAuthToken;
        } catch (e) {
            return null;
        }
    }
}

export default Security;
