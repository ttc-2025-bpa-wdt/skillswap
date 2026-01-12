import ms from "ms";

export const SITE_TITLE                 = "SkillSwap";
export const DEVELOPMENT_MODE           = import.meta.env.NODE_ENV !== "production";

export const AUTH_COOKIE_NAME           = "__sstk";
export const AUTH_COOKIE_EXPIRY         = ms("7d") / 1000;
