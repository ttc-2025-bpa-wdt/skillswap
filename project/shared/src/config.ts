import dotenv from "dotenv";
dotenv.config({ path: "../shared/.env"}); // working path is either frontend/ or backend/

import ms from "ms";

export const SITE_TITLE = "SkillSwap";
export const DEVELOPMENT_MODE = import.meta.env.NODE_ENV !== "production";
export const CORS_ORIGIN = DEVELOPMENT_MODE ? "*" : "skillswap.bpariverside.org";

export const AUTH_COOKIE_NAME = "__sstk";
export const AUTH_COOKIE_EXPIRY = ms("7d") / 1000;

// Verify that critical environment variables are set at startup

if (!import.meta.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set. Please set it to the path of your SQLite database.");
    process.exit(1);
}

if (!import.meta.env.JWT_SECRET) {
    console.error("JWT_SECRET environment variable is not set. Please set it to a secure random string.");
    process.exit(1);
}

if (!import.meta.env.PASSWORD_PEPPER) {
    console.error("PASSWORD_PEPPER environment variable is not set. Please set it to a secure random string.");
    process.exit(1);
}
