import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") }); // load environment variables from .env file

export const resolveEnv = (key: string, defaultValue?: string): string => {
    const value = process.env[key] ?? import.meta.env[key];
    if (value === undefined) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        console.error(`Environment variable ${key} is not set.`);
        process.exit(1);
    }
    return value;
};

import ms from "ms";

export const SITE_TITLE = "SkillSwap";
export const DEVELOPMENT_MODE = resolveEnv("NODE_ENV", "development") !== "production";
export const CORS_ORIGIN = DEVELOPMENT_MODE ? "*" : "skillswap.bpariverside.org";

export const AUTH_COOKIE_NAME = "__sstk";
export const AUTH_COOKIE_EXPIRY = ms("7d") / 1000;

export const LIMITS = {
    HANDLE_MIN: 3,
    HANDLE_MAX: 24,
    NAME_MAX: 64,
    DISPLAY_NAME_MAX: 64,
    BIO_MAX: 500,
    TAG_MAX: 32,
    TAGS_COUNT_MAX: 10,
    SESSION_NAME_MAX: 100,
    SESSION_DESC_MAX: 2000,
    SESSION_PREREQ_MAX: 500,
    MESSAGE_MAX: 2000,
    COMMENT_MAX: 1000,
    CHAT_MSG_MAX: 1000,
};

// Verify that critical environment variables are set at startup

if (!resolveEnv("DATABASE_URL")) {
    console.error("DATABASE_URL environment variable is not set. Please set it to the path of your SQLite database.");
    process.exit(1);
}

if (!resolveEnv("JWT_SECRET")) {
    console.error("JWT_SECRET environment variable is not set. Please set it to a secure random string.");
    process.exit(1);
}

if (!resolveEnv("PASSWORD_PEPPER")) {
    console.error("PASSWORD_PEPPER environment variable is not set. Please set it to a secure random string.");
    process.exit(1);
}
