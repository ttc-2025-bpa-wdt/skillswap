import express, { type Request as ExpressRequest, type Response as ExpressResponse, Router } from "express";
import cookieParser from "cookie-parser";
import { parse } from "cookie";
import * as SocketIO from "socket.io";
import fs from "fs";
import path from "path";
import crypto from "crypto";

import { db } from "shared/helpers";

import {
    type IUser,
    type IProfile,
    type ISession,
    type IEmailVerificationToken,
    difficultyTags,
    type IAuthToken,
    NotificationType,
    MessageStatus,
} from "shared/schema";
import validator from "validator";

import { Authentication } from "shared/models";
import { AUTH_COOKIE_EXPIRY, AUTH_COOKIE_NAME, DEVELOPMENT_MODE, LIMITS } from "shared/config";
import { Security } from "shared/helpers";
import NotificationService from "./services/notification";
import AchievementService from "./services/achievement";
import PushService from "./services/push";
import MessageService from "./services/message";

// TODO (optimization): Currently using synchronous filesystem APIs. This really isn't a problem unless we have
// thousands of concurrent users, but it's something to keep in mind for future impl.

interface ChatMessage {
    handle: string;
    content: string;
}

interface RequestUser {
    handle: string;
}

class ApiV1Endpoints {
    protected socket: SocketIO.Server | null = null;
    protected userSockets: Map<string, SocketIO.Socket> = new Map();

    /** Attaches the socket.io server instance and sets up connection listeners. */
    public attachSocket(io: SocketIO.Server) {
        this.socket = io;
        this.socket.on("connection", (socket) => {
            try {
                this.chatConnect(socket);
            } catch (err) {
                console.error("Error in chatConnect:", err);
            }
        });
    }

    /** Wraps an async express handler to catch errors and send a 500 response. */
    protected expressExceptionWrap(handler: (req: ExpressRequest, res: ExpressResponse) => Promise<unknown>) {
        return async (req: ExpressRequest, res: ExpressResponse) => {
            try {
                await handler(req, res);
            } catch (err) {
                res.status(500).json({ success: false, error: "Internal Server Error" });
                console.error("Error handling request:", err); // TODO: Basic logging for now. Don't need anything crazy unless we're enterprise
            }
        };
    }

    /** Initializes the router with all API endpoints and starts background tasks. */
    public constructor(router: Router) {
        /* User management and administration endpoints */
        router.use(cookieParser());

        router.get("/user", this.expressExceptionWrap(this.getUserInfo.bind(this)));
        router.put("/user", this.expressExceptionWrap(this.updateUserSettings.bind(this)));
        router.delete("/user", this.expressExceptionWrap(this.deleteUser.bind(this)));
        router.post("/user/avatar", this.expressExceptionWrap(this.uploadAvatar.bind(this)));

        /* Authentication endpoints */

        router.post("/auth/login", this.expressExceptionWrap(this.login.bind(this)));
        router.post("/auth/register", this.expressExceptionWrap(this.register.bind(this)));
        router.get("/auth/verify-email", this.expressExceptionWrap(this.verifyEmail.bind(this)));

        /* Feedback endpoints */
        router.post("/feedback", this.expressExceptionWrap(this.sendFeedback.bind(this)));

        /* Session management endpoints */

        router.get("/session", this.expressExceptionWrap(this.getSessionInfo.bind(this)));
        router.get("/session/search", this.expressExceptionWrap(this.searchSessions.bind(this)));
        router.post("/session", this.expressExceptionWrap(this.createSession.bind(this)));
        router.post("/session/register", this.expressExceptionWrap(this.registerForSession.bind(this)));
        router.delete("/session/register", this.expressExceptionWrap(this.unregisterFromSession.bind(this)));
        router.post("/session/rate", this.expressExceptionWrap(this.rateSession.bind(this)));
        router.delete("/session/rate", this.expressExceptionWrap(this.deleteRating.bind(this)));
        router.delete("/message", this.expressExceptionWrap(this.deleteMessage.bind(this)));
        router.patch("/session", this.expressExceptionWrap(this.updateSession.bind(this)));
        router.delete("/session", this.expressExceptionWrap(this.deleteSession.bind(this)));

        router.post("/contact/host", this.expressExceptionWrap(this.contactHost.bind(this)));

        /* Notification endpoints */
        router.get("/notifications", this.expressExceptionWrap(this.getNotifications.bind(this)));
        router.patch("/notifications/:id", this.expressExceptionWrap(this.markNotificationRead.bind(this)));
        router.patch("/notifications/read-all", this.expressExceptionWrap(this.markAllNotificationsRead.bind(this)));
        router.delete("/notifications/:id", this.expressExceptionWrap(this.deleteNotification.bind(this)));
        router.get("/notifications/unread-count", this.expressExceptionWrap(this.getUnreadNotificationCount.bind(this)));

        /* Achievement endpoints */
        router.get("/achievements", this.expressExceptionWrap(this.getAchievements.bind(this)));
        router.get("/user/achievements", this.expressExceptionWrap(this.getUserAchievements.bind(this)));
        router.get("/user/achievements/progress", this.expressExceptionWrap(this.getAchievementProgress.bind(this)));
        router.get("/leaderboard", this.expressExceptionWrap(this.getLeaderboard.bind(this)));

        /* Push notification endpoints */
        router.get("/push/vapid-key", this.expressExceptionWrap(this.getVapidKey.bind(this)));
        router.post("/push/subscribe", this.expressExceptionWrap(this.subscribeToPush.bind(this)));
        router.post("/push/unsubscribe", this.expressExceptionWrap(this.unsubscribeFromPush.bind(this)));

        /* Message endpoints */
        router.get("/messages", this.expressExceptionWrap(this.getMessages.bind(this)));
        router.get("/messages/unread", this.expressExceptionWrap(this.getUnreadMessages.bind(this)));

        this.startCleanupTask();
        this.initializeServices();
    }

    /** Initialize backend services */
    protected async initializeServices() {
        try {
            // Initialize achievements in database
            await AchievementService.initializeAchievements();
            // Initialize push notification service
            PushService.initializePush();
            console.log("Services initialized successfully");
        } catch (err) {
            console.error("Error initializing services:", err);
        }
    }

    /** Starts a periodic task to remove expired sessions from the database. */
    protected startCleanupTask() {
        const cleanup = async () => {
            try {
                const oneDayAgo = new Date();
                oneDayAgo.setDate(oneDayAgo.getDate() - 1);

                // Only delete expired sessions that have no registrations
                // Sessions with registrations/reviews should be preserved
                const result = await db.session.deleteMany({
                    where: {
                        eventDate: { lt: oneDayAgo },
                        registrations: { none: {} },
                    },
                });

                if (result.count > 0) {
                    console.log(`Cleaned up ${result.count} expired sessions.`);
                }
            } catch (err) {
                console.error("Error during session cleanup:", err);
            }
        };

        cleanup();
        setInterval(cleanup, 1000 * 60 * 60);
    }

    /** Validates that the request has the correct Content-Type and Accept headers for JSON. */
    protected ensureJson(req: ExpressRequest, res: ExpressResponse): boolean {
        if (req.method !== "GET" && !req.is("application/json")) {
            res.status(415).json({ success: false, error: "Unsupported Media Type" });
            return false;
        }

        if (!req.accepts("application/json")) {
            res.status(406).json({ success: false, error: "Not Acceptable" });
            return false;
        }

        return true;
    }

    /** Authenticates the user from the request cookies and returns the user handle. */
    protected async authUser(req: ExpressRequest): Promise<RequestUser | null> {
        const token = this.getAuthToken(req);
        if (!token) return null;

        const user = await db.user.findUnique({
            where: { id: token.sub },
            select: { handle: true },
        });

        if (!user) return null;
        return { handle: user.handle };
    }

    /** Determines the target user handle from the request query, body, or authenticated user. */
    protected getUserTargetHandle(req: ExpressRequest, res: ExpressResponse, reqUser: RequestUser): string | null {
        let targetHandle = (req.query.handle as string) ?? req.body?.handle ?? reqUser.handle;
        if (!targetHandle) {
            // server error; shouldnt happen unless invalid tokens were generated
            res.status(500).json({ success: false, error: "Invalid token: no subject" });
            return null;
        }

        return validator.escape(validator.trim(targetHandle));
    }

    /** Checks if a user has a specific role. */
    protected async checkUserRole(handle: string, requiredRole: string): Promise<boolean> {
        const user = await db.user.findUnique({
            where: { handle },
            select: { role: true },
        });

        return user?.role.toUpperCase() === requiredRole.toUpperCase();
    }

    /** Deletes a user's avatar file from the filesystem. */
    protected deleteAvatarFile(url: string) {
        if (!url || !url.startsWith("/images/avatar/")) return;
        let filename = url.replace("/images/avatar/", "");

        // Remove query params if any
        filename = filename.split("?")[0] as string;

        if (filename === "default.png" || !filename) return; // Never delete default or empty

        // ensure only alphanumeric/dots/dashes (uuid + ext)
        if (!/^[a-zA-Z0-9\.\-]+$/.test(filename)) return;

        const frontendPath = path.resolve(process.cwd(), "../frontend/public/images/avatar");
        const filePath = path.join(frontendPath, filename);

        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                console.log(`Deleted avatar: ${filePath}`);
            } catch (err) {
                console.error(`Failed to delete avatar ${filePath}:`, err);
            }
        }
    }

    protected getAuthToken(req: ExpressRequest): IAuthToken | null {
        const tokenStr = req.cookies[AUTH_COOKIE_NAME];
        if (!tokenStr) return null;
        return Security.decodeToken<IAuthToken>(tokenStr);
    }

    protected sanitizeTags(list: any): string[] {
        if (Array.isArray(list)) {
            if (list.length > LIMITS.TAGS_COUNT_MAX) list.length = LIMITS.TAGS_COUNT_MAX;
            return list.map((item) => {
                let s = typeof item === "string" ? validator.escape(validator.trim(item)) : "";
                if (s.length > LIMITS.TAG_MAX) s = s.substring(0, LIMITS.TAG_MAX);
                return s;
            });
        }
        return [];
    }

    protected validateSessionData(body: any) {
        const name = validator.escape(validator.trim(String(body.name || "")));
        const prereqs = validator.escape(validator.trim(String(body.prereqs || "")));
        const difficulty = validator.trim(String(body.difficulty || ""));
        const description = validator.escape(validator.trim(String(body.description || "")));
        const meetingUrl = validator.trim(String(body.meetingUrl || ""));
        const duration = parseInt(String(body.duration || "60"));

        if (!name)
            return { error: "Session name is required" };
        if (name.length > LIMITS.SESSION_NAME_MAX)
            return { error: `Session name cannot exceed ${LIMITS.SESSION_NAME_MAX} characters` };
        if (prereqs.length > LIMITS.SESSION_PREREQ_MAX)
            return { error: `Prerequisites cannot exceed ${LIMITS.SESSION_PREREQ_MAX} characters` };
        if (description.length > LIMITS.SESSION_DESC_MAX)
            return { error: `Description cannot exceed ${LIMITS.SESSION_DESC_MAX} characters` };

        if (!validator.isURL(meetingUrl) || !meetingUrl.includes("zoom.us"))
            return { error: "Invalid meeting URL. Must be a valid Zoom link." };

        if (!difficultyTags[difficulty]) return { error: "Invalid difficulty level" };

        return {
            data: {
                name,
                prereqs,
                difficulty,
                description,
                meetingUrl,
                duration,
                categories: JSON.stringify(this.sanitizeTags(body.categories)),
                eventDate: new Date(body.eventDate),
            },
        };
    }

    /* User management and administration endpoints */

    /** Retrieves public profile information for a specific user. */
    public async getUserInfo(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const reqUser = await this.authUser(req);
        if (!reqUser) return res.status(401).json({ success: false, error: "Unauthorized" });

        const targetHandle = this.getUserTargetHandle(req, res, reqUser);
        if (!targetHandle) return;

        const dbRes = await db.user.findUnique({
            where: { handle: targetHandle },
            select: {
                handle: true,
                profile: {
                    select: {
                        displayName: true,
                        avatarUrl: true,
                        bio: true,
                        tags: true,
                        skills: true,
                        sessionCount: true,
                        studentCount: true,
                        rating: true,
                    },
                },
            },
        });

        if (!dbRes) return res.status(404).json({ success: false, error: "User not found" });

        return res.json({
            success: true,
            data: {
                profile: {
                    displayName: dbRes.profile?.displayName,
                    avatarUrl: dbRes.profile?.avatarUrl,
                    bio: dbRes.profile?.bio,
                    tags: dbRes.profile?.tags ? JSON.parse(dbRes.profile?.tags) : undefined,
                    skills: dbRes.profile?.skills ? JSON.parse(dbRes.profile?.skills) : undefined,
                    sessionCount: dbRes.profile?.sessionCount,
                    studentCount: dbRes.profile?.studentCount,
                    rating: dbRes.profile?.rating,
                },
            },
        });
    }

    /** Deletes a user account and associated data. */
    public async deleteUser(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const reqUser = await this.authUser(req);
        if (!reqUser) return res.status(401).json({ success: false, error: "Unauthorized" });

        const targetHandle = this.getUserTargetHandle(req, res, reqUser);
        if (!targetHandle) return;

        // Only allow users to delete their own account, unless they are an admin
        if (targetHandle !== reqUser.handle) {
            if (!(await this.checkUserRole(reqUser.handle, "admin")))
                return res.status(403).json({ success: false, error: "Forbidden" });
        }

        const user = await db.user.findUnique({
            where: { handle: targetHandle },
            select: { profile: { select: { id: true, avatarUrl: true } } },
        });

        await db.user.delete({
            where: { handle: targetHandle },
        });

        if (user?.profile) {
            if (user.profile.avatarUrl) {
                this.deleteAvatarFile(user.profile.avatarUrl);
            }

            // Cleanup any remaining files for this user ID
            const frontendPath = path.resolve(process.cwd(), "../frontend/public/images/avatar");
            if (fs.existsSync(frontendPath)) {
                try {
                    const files = fs.readdirSync(frontendPath);
                    for (const file of files) {
                        if (file.startsWith(targetHandle)) {
                            try {
                                fs.unlinkSync(path.join(frontendPath, file));
                            } catch (e) {}
                        }
                    }
                } catch (e) {}
            }
        }

        return res.json({ success: true });
    }

    /** Handles avatar image upload and saves it to the public directory. */
    public async uploadAvatar(req: ExpressRequest, res: ExpressResponse) {
        const reqUser = await this.authUser(req);
        if (!reqUser) return res.status(401).json({ success: false, error: "Unauthorized" });

        // Limit file size to 5MB
        const contentLength = parseInt(req.headers["content-length"] || "0");
        if (contentLength > 5 * 1024 * 1024) {
            return res.status(413).json({ success: false, error: "File too large (max 5MB)" });
        }

        // Basic content type check
        const mime = req.headers["content-type"];
        let ext = "";
        if (mime === "image/png") ext = "png";
        else if (mime === "image/jpeg") ext = "jpg";
        else return res.status(415).json({ success: false, error: "Only PNG and JPEG allowed" });

        const user = await db.user.findUnique({
            where: { handle: reqUser.handle },
            select: { profile: { select: { id: true, avatarUrl: true } } },
        });

        if (!user?.profile?.id) {
            return res.status(404).json({ success: false, error: "Profile not found" });
        }

        // Generate a unique filename using the user's handle and a random suffix
        const filename = `${reqUser.handle}.${ext}`;
        const frontendPath = path.resolve(process.cwd(), "../frontend/public/images/avatar");
        const filePath = path.join(frontendPath, filename);

        // Directory check
        if (!fs.existsSync(frontendPath)) {
            fs.mkdirSync(frontendPath, { recursive: true });
        }

        // Cleanup other extension if exists (e.g. uploading jpg when png exists)
        const otherExt = ext === "png" ? "jpg" : "png";
        const otherFile = path.join(frontendPath, `${reqUser.handle}.${otherExt}`);
        if (fs.existsSync(otherFile)) {
            try {
                fs.unlinkSync(otherFile);
            } catch (e) {
                console.error("Failed to cleanup old avatar ext", e);
            }
        }

        const fileStream = fs.createWriteStream(filePath);

        req.pipe(fileStream);

        await new Promise((resolve, reject) => {
            fileStream.on("finish", resolve);
            fileStream.on("error", reject);
        });

        return res.json({ success: true, data: { url: `/images/avatar/${filename}` } });
    }

    /** Updates a user's profile information and settings. */
    public async updateUserSettings(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const reqUser = await this.authUser(req);
        if (!reqUser) return res.status(401).json({ success: false, error: "Unauthorized" });

        const targetHandle = this.getUserTargetHandle(req, res, reqUser);
        if (!targetHandle) return;

        // If the user is trying to update someone else's profile, they must be an admin
        if (targetHandle !== reqUser.handle) {
            if (!(await this.checkUserRole(reqUser.handle, "admin")))
                return res.status(403).json({ success: false, error: "Forbidden" });
        }

        // Get user ID for the target handle
        const userId = await db.user
            .findUnique({
                where: { handle: targetHandle },
                select: { id: true },
            })
            .then((user) => user?.id);

        if (!userId) return res.status(404).json({ success: false, error: "User not found" });

        // Retrieve current profile to check for avatar changes
        const currentProfile = await db.profile.findUnique({
            where: { userId },
            select: { avatarUrl: true },
        });

        // Sanitize inputs
        const displayName = req.body.displayName ? validator.escape(validator.trim(String(req.body.displayName))) : "";
        const avatarUrl = req.body.avatarUrl ? validator.trim(String(req.body.avatarUrl)) : "";
        const bio = req.body.bio ? validator.escape(validator.trim(String(req.body.bio))) : "";

        if (displayName.length > LIMITS.DISPLAY_NAME_MAX)
            return res
                .status(400)
                .json({ success: false, error: `Display name cannot exceed ${LIMITS.DISPLAY_NAME_MAX} characters` });
        if (bio.length > LIMITS.BIO_MAX)
            return res.status(400).json({ success: false, error: `Bio cannot exceed ${LIMITS.BIO_MAX} characters` });

        // dont load images that arent uploaded to the server
        if (avatarUrl && !avatarUrl.startsWith("/images/avatar/")) {
            return res.status(400).json({ success: false, error: "Invalid avatar URL" });
        }

        await db.profile.update({
            where: { userId },
            data: {
                displayName,
                avatarUrl: avatarUrl || (currentProfile?.avatarUrl ?? "/images/avatar/default.png"),
                bio,
                tags: JSON.stringify(this.sanitizeTags(req.body.tags)),
                skills: JSON.stringify(this.sanitizeTags(req.body.skills)),
            },
        });

        // Clean up old avatar if it changed
        if (avatarUrl && currentProfile?.avatarUrl && currentProfile.avatarUrl !== avatarUrl) {
            this.deleteAvatarFile(currentProfile.avatarUrl);
        }

        // Check profile achievements
        AchievementService.checkProfileAchievements(userId).catch((err) =>
            console.error("Achievement check failed:", err)
        );

        return res.json({ success: true });
    }

    /* Authentication and session management endpoints */

    /** Authenticates a user and issues a session cookie. */
    public async login(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;
        const { emailOrHandle, password, remember } = req.body;

        if (!emailOrHandle || !password) return res.status(400).json({ success: false, error: "Missing credentials" });

        const sanitizedLogin = validator.trim(String(emailOrHandle));
        const user = await db.user.findFirst({
            where: {
                OR: [{ email: sanitizedLogin }, { handle: sanitizedLogin }],
            },
        });

        if (!user || !(await Security.verifyPasswd(password, user.passwordHash, user.passwordSalt)))
            return res.status(401).json({ success: false, error: "Invalid credentials" });

        const token = Authentication.issueToken(user.id, !!remember);
        res.cookie(AUTH_COOKIE_NAME, token, {
            path: "/",
            httpOnly: true,
            secure: !DEVELOPMENT_MODE,
            sameSite: "lax",
            maxAge: remember ? AUTH_COOKIE_EXPIRY : undefined,
        });

        return res.json({ success: true });
    }

    /** Creates a new user account with the provided details. */
    public async register(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const { email, password, firstName, lastName, handle, dob, registrationKey } = req.body;

        if (!email || !password || !firstName || !lastName || !handle || !dob || !registrationKey)
            return res.status(400).json({ success: false, error: "Missing required fields" });

        if (registrationKey !== process.env.REGISTRATION_KEY)
            return res.status(403).json({ success: false, error: "Invalid registration key" });

        const sEmail = validator.trim(String(email));
        const sHandle = validator.escape(validator.trim(String(handle)));
        const sFirstName = validator.escape(validator.trim(String(firstName)));
        const sLastName = validator.escape(validator.trim(String(lastName)));

        if (!validator.isEmail(sEmail)) return res.status(400).json({ success: false, error: "Invalid email format" });

        // Handles must be alphanumeric with optional underscores/dashes, and between 3-24 chars
        if (sHandle.length < LIMITS.HANDLE_MIN || sHandle.length > LIMITS.HANDLE_MAX)
            return res.status(400).json({
                success: false,
                error: `Handle must be between ${LIMITS.HANDLE_MIN} and ${LIMITS.HANDLE_MAX} characters`,
            });

        // Check for invalid characters in handle
        if (sFirstName.length > LIMITS.NAME_MAX || sLastName.length > LIMITS.NAME_MAX)
            return res.status(400).json({ success: false, error: `Name cannot exceed ${LIMITS.NAME_MAX} characters` });

        const existing = await db.user.findFirst({
            where: { OR: [{ email: sEmail }, { handle: sHandle }] },
        });

        if (existing) return res.status(409).json({ success: false, error: "User already exists" });

        // Hash the password with a unique salt and create db entry
        const [salt, hash] = await Security.hashPasswd(password);

        await db.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: sEmail,
                    handle: sHandle,
                    firstName: sFirstName,
                    lastName: sLastName,
                    dob: new Date(dob),
                    passwordHash: hash,
                    passwordSalt: salt,
                    emailVerified: false,
                },
            });

            await tx.profile.create({
                data: {
                    userId: user.id,
                    displayName: `${sFirstName} ${sLastName}`,
                    avatarUrl: "/images/avatar/default.png",
                    bio: "",
                    tags: "[]",
                    skills: "[]",
                },
            });
        });

        return res.json({ success: true });
    }

    /** Verifies a user's email address using a token. */
    public async verifyEmail(req: ExpressRequest, res: ExpressResponse) {
        const { email } = Security.decodeToken<IEmailVerificationToken>(req.query.token as string) || {};
        if (!email) return res.status(400).json({ success: false, error: "Email is required" });

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        await db.user.update({
            where: { email },
            data: { emailVerified: true },
        });

        // Issue an auth token and redirect to dashboard
        const authToken = Authentication.issueToken(user.id, !!req.query.remember); // if truthy
        res.cookie(AUTH_COOKIE_NAME, authToken, {
            path: "/",
            httpOnly: true,
            secure: !DEVELOPMENT_MODE,
            sameSite: "lax",
            maxAge: req.query.remember ? AUTH_COOKIE_EXPIRY : undefined,
        });

        return res.redirect("/dashboard");
    }

    /** Accepts user feedback and logs it (or sends via email). */
    public async sendFeedback(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }

        // Basic sanitization and validation
        if (message.length > LIMITS.MESSAGE_MAX)
            return res
                .status(400)
                .json({ success: false, error: `Message cannot exceed ${LIMITS.MESSAGE_MAX} characters` });

        console.log(`[FEEDBACK] From: ${name} <${email}>`);
        console.log(`[FEEDBACK] Message: ${message}`);

        return res.json({ success: true });
    }

    /* Session management endpoints */

    /** Retrieves details for a specific session. */
    public async getSessionInfo(req: ExpressRequest, res: ExpressResponse) {
        let { id } = req.query;
        if (!id || typeof id !== "string")
            return res.status(400).json({ success: false, error: "Session ID is required" });

        id = validator.trim(id);

        const session = await db.session.findUnique({
            where: { id: id as string },
            include: { user: { select: { handle: true, profile: true } } },
        });

        if (!session) return res.status(404).json({ success: false, error: "Session not found" });

        return res.json({
            success: true,
            data: {
                id: session.id,
                name: session.name,
                categories: JSON.parse(session.categories),
                prereqs: session.prereqs,
                difficulty: session.difficulty,
                description: session.description,
                duration: session.duration,
                meetingUrl: session.meetingUrl,
                createdAt: session.createdAt,
                eventDate: session.eventDate,
            },
        });
    }

    /** Search sessions by name, description, or category. */
    protected async searchSessions(req: ExpressRequest, res: ExpressResponse) {
        const q = validator.trim(String(req.query.q || ""));
        const limit = Math.min(parseInt(String(req.query.limit)) || 20, 100);
        const offset = parseInt(String(req.query.offset)) || 0;

        if (!q) return res.json({ success: true, sessions: [], total: 0 });

        const sessions = await db.session.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { description: { contains: q, mode: "insensitive" } },
                    { categories: { contains: q, mode: "insensitive" } },
                ],
            },
            include: { user: { select: { handle: true, profile: true } } },
            orderBy: { eventDate: "asc" },
            take: limit,
            skip: offset,
        });

        const total = await db.session.count({
            where: {
                OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { description: { contains: q, mode: "insensitive" } },
                    { categories: { contains: q, mode: "insensitive" } },
                ],
            },
        });

        return res.json({
            success: true,
            sessions: sessions.map((s) => ({
                id: s.id,
                name: s.name,
                categories: JSON.parse(s.categories),
                difficulty: s.difficulty,
                description: s.description,
                duration: s.duration,
                eventDate: s.eventDate,
                host: s.user.handle,
            })),
            total,
        });
    }

    /** Updates an existing session's details. */
    public async updateSession(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const reqUser = await this.authUser(req);
        if (!reqUser) return res.status(401).json({ success: false, error: "Unauthorized" });

        let { id } = req.body;
        if (!id || typeof id !== "string")
            return res.status(400).json({ success: false, error: "Session ID is required" });

        id = validator.trim(id);

        const session = await db.session.findUnique({
            where: { id },
            include: { user: { select: { handle: true } } },
        });

        if (!session) return res.status(404).json({ success: false, error: "Session not found" });

        // Only allow session hosts to update their sessions, unless the requester is an admin
        if (session.user.handle !== reqUser.handle) {
            if (!(await this.checkUserRole(reqUser.handle, "admin")))
                return res.status(403).json({ success: false, error: "Forbidden" });
        }

        const valid = this.validateSessionData(req.body);
        if (valid.error || !valid.data) return res.status(400).json({ success: false, error: valid.error });

        await db.session.update({
            where: { id },
            data: valid.data,
        });

        return res.json({ success: true });
    }

    /** Creates a new session hosted by the authenticated user. */
    public async createSession(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const reqUser = await this.authUser(req);
        if (!reqUser) return res.status(401).json({ success: false, error: "Unauthorized" });

        const user = await db.user.findUnique({
            where: { handle: reqUser.handle },
            select: { id: true },
        });

        if (!user?.id) return res.status(404).json({ success: false, error: "User not found" });

        const valid = this.validateSessionData(req.body);
        if (valid.error || !valid.data) return res.status(400).json({ success: false, error: valid.error });

        const session = await db.session.create({
            data: {
                ...valid.data,
                userId: user.id,
            },
        });

        // Check session-hosting achievements
        AchievementService.checkSessionAchievements(user.id).catch((err) =>
            console.error("Achievement check failed:", err)
        );

        return res.json({ success: true, data: { id: session.id } });
    }

    /** Deletes a session. */
    public async deleteSession(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const reqUser = await this.authUser(req);
        if (!reqUser) return res.status(401).json({ success: false, error: "Unauthorized" });

        let { id } = req.body;
        if (!id || typeof id !== "string")
            return res.status(400).json({ success: false, error: "Session ID is required" });

        id = validator.trim(id);

        const session = await db.session.findUnique({
            where: { id },
            include: { user: { select: { handle: true } } },
        });

        if (!session) return res.status(404).json({ success: false, error: "Session not found" });

        if (session.user.handle !== reqUser.handle) {
            if (!(await this.checkUserRole(reqUser.handle, "admin")))
                return res.status(403).json({ success: false, error: "Forbidden" });
        }

        // Notify registered users about cancellation before deleting
        const registrations = await db.sessionRegistration.findMany({
            where: { sessionId: id },
            select: { userId: true },
        });

        await db.session.delete({
            where: { id },
        });

        // Send cancellation notifications to all registered users
        for (const reg of registrations) {
            await NotificationService.notifySessionCancel(
                reg.userId, id, session.name, session.user.handle
            );
        }

        return res.json({ success: true });
    }

    /** Registers the authenticated user for a specific session. */
    protected async registerForSession(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const token = this.getAuthToken(req);
        if (!token) return res.status(401).json({ success: false, error: "Unauthorized" });

        const { sessionId } = req.body;
        if (!sessionId) {
            res.status(400).json({ success: false, error: "Missing sessionId" });
            return;
        }

        const session = await db.session.findUnique({ where: { id: sessionId } });
        if (!session) {
            res.status(404).json({ success: false, error: "Session not found" });
            return;
        }

        if (session.userId === token.sub) {
            res.status(400).json({ success: false, error: "Cannot register for your own session" });
            return;
        }

        const existing = await db.sessionRegistration.findUnique({
            where: {
                sessionId_userId: {
                    sessionId,
                    userId: token.sub,
                },
            },
        });

        if (existing) {
            res.status(400).json({ success: false, error: "Already registered" });
            return;
        }

        await db.sessionRegistration.create({
            data: {
                sessionId,
                userId: token.sub,
            },
        });

        // Increment the host's student count
        await db.profile.update({
            where: { userId: session.userId },
            data: { studentCount: { increment: 1 } },
        });

        // Notify the host about the new registration
        const joiner = await db.user.findUnique({
            where: { id: token.sub },
            select: { handle: true },
        });
        if (joiner) {
            await NotificationService.notifySessionJoin(session.userId, sessionId, session.name, joiner.handle);
        }

        // Check achievements for both host and student
        AchievementService.checkStudentAchievements(session.userId, token.sub).catch((err) =>
            console.error("Achievement check failed:", err)
        );

        res.json({ success: true });
    }

    /** Unregisters the authenticated user from a session. */
    protected async unregisterFromSession(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const token = this.getAuthToken(req);
        if (!token) return res.status(401).json({ success: false, error: "Unauthorized" });

        const { sessionId } = req.body;
        if (!sessionId) {
            res.status(400).json({ success: false, error: "Missing sessionId" });
            return;
        }

        const session = await db.session.findUnique({ where: { id: sessionId } });

        try {
            await db.sessionRegistration.delete({
                where: {
                    sessionId_userId: {
                        sessionId,
                        userId: token.sub,
                    },
                },
            });
        } catch (e) {
            res.status(404).json({ success: false, error: "Not registered for this session" });
            return;
        }

        // Decrement the host's student count
        if (session) {
            await db.profile.update({
                where: { userId: session.userId },
                data: { studentCount: { decrement: 1 } },
            });
        }

        res.json({ success: true });
    }

    /** Sends a direct message from the authenticated user to a session host. */
    protected async contactHost(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const token = this.getAuthToken(req);
        if (!token) return res.status(401).json({ success: false, error: "Unauthorized" });

        const { sessionId, hostId, message } = req.body;

        if (!message) {
            res.status(400).json({ success: false, error: "Message is required" });
            return;
        }

        // Sanitize message content
        const sanitizedMessage = validator.escape(validator.trim(String(message)));

        if (sanitizedMessage.length > LIMITS.MESSAGE_MAX) {
            res.status(400).json({ success: false, error: `Message cannot exceed ${LIMITS.MESSAGE_MAX} characters` });
            return;
        }

        let targetHostId = hostId;
        let session = null;

        if (sessionId) {
            session = await db.session.findUnique({ where: { id: sessionId } });
        }

        if (!targetHostId && session) {
            targetHostId = session.userId;
        }

        if (!targetHostId) {
            res.status(400).json({ success: false, error: "Missing hostId or valid sessionId" });
            return;
        }

        if (targetHostId === token.sub) {
            res.status(400).json({ success: false, error: "Cannot message yourself" });
            return;
        }

        // Create Message
        await db.message.create({
            data: {
                content: sanitizedMessage,
                senderId: token.sub,
                recipientId: targetHostId,
                sessionName: session ? session.name : null,
            },
        });

        // Notify the host about the new message
        const sender = await db.user.findUnique({
            where: { id: token.sub },
            select: { handle: true },
        });
        if (sender) {
            await NotificationService.notifyNewMessage(targetHostId, token.sub, sender.handle, sanitizedMessage);
            // Send push notification if available
            PushService.pushNewMessage(targetHostId, sender.handle, sanitizedMessage).catch(() => {});
        }

        // Emit to socket if host is online
        const hostHandle = (await db.user.findUnique({ where: { id: targetHostId }, select: { handle: true } }))?.handle;
        if (hostHandle) {
            const hostSocket = this.userSockets.get(hostHandle);
            if (hostSocket) {
                hostSocket.emit("message", {
                    handle: sender?.handle ?? "unknown",
                    content: sanitizedMessage,
                });
            }
        }

        // Check message achievements for sender
        AchievementService.checkMessageAchievements(token.sub).catch((err) =>
            console.error("Achievement check failed:", err)
        );

        res.json({ success: true });
    }

    /** Submits a rating and review for a session. */
    protected async rateSession(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const token = this.getAuthToken(req);
        if (!token) return res.status(401).json({ success: false, error: "Unauthorized" });

        const { sessionId, rating, comment } = req.body;

        if (!sessionId || !rating) {
            res.status(400).json({ success: false, error: "Missing sessionId or rating" });
            return;
        }

        if (comment && comment.length > LIMITS.COMMENT_MAX) {
            res.status(400).json({ success: false, error: `Comment cannot exceed ${LIMITS.COMMENT_MAX} characters` });
            return;
        }

        const session = await db.session.findUnique({ where: { id: sessionId } });
        if (!session) {
            res.status(404).json({ success: false, error: "Session not found" });
            return;
        }

        if (session.userId === token.sub) {
            res.status(400).json({ success: false, error: "Cannot rate your own session" });
            return;
        }

        // Upsert review (manual implementation to handle potentially nullable fields if strictly typed, though we require sessionId here)
        const existingReview = await db.review.findFirst({
            where: {
                sessionId: session.id,
                authorId: token.sub,
            },
        });

        if (existingReview) {
            await db.review.update({
                where: { id: existingReview.id },
                data: {
                    rating: parseInt(rating),
                    comment: comment !== undefined ? validator.escape(String(comment)) : undefined,
                },
            });
        } else {
            await db.review.create({
                data: {
                    sessionId: session.id,
                    authorId: token.sub,
                    recipientId: session.userId,
                    rating: parseInt(rating),
                    comment: comment ? validator.escape(String(comment)) : "",
                },
            });
        }

        // Update average rating (exclude hidden reviews)
        const ratings = await db.review.findMany({
            where: { recipientId: session.userId, rating: { gt: 0 }, hidden: false },
            select: { rating: true },
        });

        if (ratings.length > 0) {
            const total = ratings.reduce((sum, r) => sum + r.rating, 0);
            const avg = total / ratings.length;

            await db.profile.update({
                where: { userId: session.userId },
                data: { rating: avg },
            });
        }

        // Notify the session host about the new review
        const reviewer = await db.user.findUnique({
            where: { id: token.sub },
            select: { handle: true },
        });
        if (reviewer) {
            await NotificationService.notifyNewReview(
                session.userId, session.id, session.name, parseInt(rating), reviewer.handle
            );
        }

        // Check achievements for reviewer (reviews_given) and recipient (rating)
        AchievementService.checkAndUnlockAchievements(token.sub).catch((err) =>
            console.error("Achievement check failed:", err)
        );
        AchievementService.checkRatingAchievements(session.userId).catch((err) =>
            console.error("Achievement check failed:", err)
        );

        res.json({ success: true });
    }

    /** Deletes a session rating/review. */
    protected async deleteRating(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const reqUser = await this.authUser(req);
        if (!reqUser) return res.status(401).json({ success: false, error: "Unauthorized" });

        const token = this.getAuthToken(req)!;

        const { id } = req.body;
        if (!id) {
            res.status(400).json({ success: false, error: "Missing review id" });
            return;
        }

        const review = await db.review.findUnique({
            where: { id },
        });

        if (!review) {
            res.status(404).json({ success: false, error: "Review not found" });
            return;
        }

        // Allow deletion if user is the author, the recipient, or an admin
        const isAdmin = await this.checkUserRole(reqUser.handle, "admin");
        if (review.authorId !== token.sub && review.recipientId !== token.sub && !isAdmin) {
            res.status(403).json({ success: false, error: "Forbidden" });
            return;
        }

        // Admin can fully delete any review
        if (isAdmin) {
            await db.review.delete({ where: { id } });
            return res.json({ success: true });
        }

        // If the recipient is deleting, just hide it
        if (review.recipientId === token.sub) {
            await db.review.update({
                where: { id },
                data: { hidden: true },
            });
            return res.json({ success: true });
        }

        await db.review.delete({
            where: { id },
        });

        // Recalculate average rating for recipient (exclude hidden reviews)
        const ratings = await db.review.findMany({
            where: { recipientId: review.recipientId, rating: { gt: 0 }, hidden: false },
            select: { rating: true },
        });

        const avg = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;

        await db.profile.update({
            where: { userId: review.recipientId },
            data: { rating: avg },
        });

        res.json({ success: true });
    }

    /** Deletes a message. */
    protected async deleteMessage(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const token = this.getAuthToken(req);
        if (!token) return res.status(401).json({ success: false, error: "Unauthorized" });

        const { id } = req.body;
        if (!id) {
            res.status(400).json({ success: false, error: "Missing message id" });
            return;
        }

        const message = await db.message.findUnique({
            where: { id },
        });

        if (!message) {
            res.status(404).json({ success: false, error: "Message not found" });
            return;
        }

        // Allow deletion if user is the sender OR the recipient
        if (message.senderId !== token.sub && message.recipientId !== token.sub) {
            res.status(403).json({ success: false, error: "Forbidden" });
            return;
        }

        await db.message.delete({
            where: { id },
        });

        res.json({ success: true });
    }

    /* Notification endpoints */

    /** Get notifications for the authenticated user */
    protected async getNotifications(req: ExpressRequest, res: ExpressResponse) {
        const user = await this.authUser(req);
        if (!user) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const userData = await db.user.findUnique({
            where: { handle: user.handle },
            select: { id: true },
        });

        if (!userData) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }

        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;
        const unreadOnly = req.query.unread === "true";

        const result = await NotificationService.getNotifications(userData.id, {
            limit,
            offset,
            unreadOnly,
        });

        res.json({ success: true, ...result });
    }

    /** Mark a notification as read */
    protected async markNotificationRead(req: ExpressRequest, res: ExpressResponse) {
        const user = await this.authUser(req);
        if (!user) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const userData = await db.user.findUnique({
            where: { handle: user.handle },
            select: { id: true },
        });

        if (!userData) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }

        const { id } = req.params;
        await NotificationService.markAsRead(id, userData.id);

        res.json({ success: true });
    }

    /** Mark all notifications as read */
    protected async markAllNotificationsRead(req: ExpressRequest, res: ExpressResponse) {
        const user = await this.authUser(req);
        if (!user) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const userData = await db.user.findUnique({
            where: { handle: user.handle },
            select: { id: true },
        });

        if (!userData) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }

        const count = await NotificationService.markAllAsRead(userData.id);

        res.json({ success: true, count });
    }

    /** Delete a notification */
    protected async deleteNotification(req: ExpressRequest, res: ExpressResponse) {
        const user = await this.authUser(req);
        if (!user) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const userData = await db.user.findUnique({
            where: { handle: user.handle },
            select: { id: true },
        });

        if (!userData) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }

        const { id } = req.params;
        await NotificationService.deleteNotification(id, userData.id);

        res.json({ success: true });
    }

    /** Get unread notification count */
    protected async getUnreadNotificationCount(req: ExpressRequest, res: ExpressResponse) {
        const user = await this.authUser(req);
        if (!user) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const userData = await db.user.findUnique({
            where: { handle: user.handle },
            select: { id: true },
        });

        if (!userData) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }

        const count = await NotificationService.getUnreadCount(userData.id);
        res.json({ success: true, count });
    }

    /* Achievement endpoints */

    /** Get all achievements */
    protected async getAchievements(req: ExpressRequest, res: ExpressResponse) {
        const achievements = await db.achievement.findMany({
            orderBy: [{ category: "asc" }, { points: "asc" }],
        });

        res.json({
            success: true,
            achievements: achievements.map((a) => ({
                ...a,
                criteria: JSON.parse(a.criteria),
            })),
        });
    }

    /** Get user's unlocked achievements */
    protected async getUserAchievements(req: ExpressRequest, res: ExpressResponse) {
        const user = await this.authUser(req);
        if (!user) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const userData = await db.user.findUnique({
            where: { handle: user.handle },
            select: { id: true },
        });

        if (!userData) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }

        const achievements = await AchievementService.getUserAchievements(userData.id);

        res.json({ success: true, achievements });
    }

    /** Get achievement progress for the user */
    protected async getAchievementProgress(req: ExpressRequest, res: ExpressResponse) {
        const user = await this.authUser(req);
        if (!user) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const userData = await db.user.findUnique({
            where: { handle: user.handle },
            select: { id: true },
        });

        if (!userData) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }

        const progress = await AchievementService.getAchievementProgress(userData.id);

        res.json({ success: true, progress });
    }

    /** Get leaderboard */
    protected async getLeaderboard(req: ExpressRequest, res: ExpressResponse) {
        const limit = parseInt(req.query.limit as string) || 10;
        const leaderboard = await AchievementService.getLeaderboard(limit);

        res.json({ success: true, leaderboard });
    }

    /* Push notification endpoints */

    /** Get VAPID public key for client subscription */
    protected getVapidKey(req: ExpressRequest, res: ExpressResponse) {
        const publicKey = PushService.getVapidPublicKey();
        res.json({ success: true, publicKey });
    }

    /** Subscribe to push notifications */
    protected async subscribeToPush(req: ExpressRequest, res: ExpressResponse) {
        const user = await this.authUser(req);
        if (!user) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const userData = await db.user.findUnique({
            where: { handle: user.handle },
            select: { id: true },
        });

        if (!userData) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }

        const { endpoint, keys } = req.body;
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            res.status(400).json({ success: false, error: "Invalid subscription data" });
            return;
        }

        await PushService.subscribeToPush(userData.id, {
            endpoint,
            keys,
        });

        res.json({ success: true });
    }

    /** Unsubscribe from push notifications */
    protected async unsubscribeFromPush(req: ExpressRequest, res: ExpressResponse) {
        const user = await this.authUser(req);
        if (!user) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const userData = await db.user.findUnique({
            where: { handle: user.handle },
            select: { id: true },
        });

        if (!userData) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }

        const { endpoint } = req.body;
        if (!endpoint) {
            res.status(400).json({ success: false, error: "Endpoint required" });
            return;
        }

        await PushService.unsubscribeFromPush(userData.id, endpoint);

        res.json({ success: true });
    }

    /* Message endpoints */

    /** Get messages (conversations or conversation with specific user) */
    protected async getMessages(req: ExpressRequest, res: ExpressResponse) {
        const user = await this.authUser(req);
        if (!user) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const userData = await db.user.findUnique({
            where: { handle: user.handle },
            select: { id: true },
        });

        if (!userData) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }

        const otherUserId = req.query.user as string;
        const limit = parseInt(req.query.limit as string) || 50;
        const before = req.query.before as string;

        if (otherUserId) {
            // Get conversation with specific user
            const messages = await MessageService.getConversation(userData.id, otherUserId, {
                limit,
                before,
            });
            res.json({ success: true, messages });
        } else {
            // Get all conversations
            const conversations = await MessageService.getConversations(userData.id);
            res.json({ success: true, conversations });
        }
    }

    /** Get unread message count */
    protected async getUnreadMessages(req: ExpressRequest, res: ExpressResponse) {
        const user = await this.authUser(req);
        if (!user) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const userData = await db.user.findUnique({
            where: { handle: user.handle },
            select: { id: true },
        });

        if (!userData) {
            res.status(404).json({ success: false, error: "User not found" });
            return;
        }

        const count = await MessageService.getTotalUnreadCount(userData.id);
        res.json({ success: true, count });
    }

    /* Socket endpoints */

    /** Handles a new socket connection and authenticates the user. */
    public async chatConnect(socket: SocketIO.Socket) {
        const cookies = parse(socket.handshake.headers.cookie || "");
        const tokenStr = cookies[AUTH_COOKIE_NAME];

        if (!tokenStr) {
            socket.disconnect(true);
            return;
        }

        const token = Security.decodeToken<IAuthToken>(tokenStr);
        if (!token) {
            socket.disconnect(true);
            return;
        }

        const user = await db.user.findUnique({
            where: { id: token.sub },
            select: { handle: true },
        });

        if (!user) {
            socket.disconnect(true);
            return;
        }

        const handle = user.handle;
        this.userSockets.set(handle, socket);
        console.log(`Socket connected: ${handle} (${socket.id})`);

        socket.on("message", (message: ChatMessage) => {
            try {
                this.chatMessage(socket, message, handle);
            } catch (err) {
                console.error("Error in chatMessage:", err);
            }
        });

        socket.on("disconnect", () => {
            try {
                this.chatDisconnect(socket, handle);
            } catch (err) {
                console.error("Error in chatDisconnect:", err);
            }
        });
    }

    /** Processes and routes a chat message to the target user. */
    public async chatMessage(socket: SocketIO.Socket, message: ChatMessage, senderHandle: string) {
        if (!message.content || message.content.length > LIMITS.CHAT_MSG_MAX) {
            return;
        }

        const sanitizedContent = validator.escape(message.content);
        const targetSocket = this.userSockets.get(message.handle);

        if (targetSocket) {
            targetSocket.emit("message", {
                handle: senderHandle,
                content: sanitizedContent,
            });
        } else {
            // Queue message for offline delivery — look up recipient ID by handle
            const recipient = await db.user.findUnique({
                where: { handle: message.handle },
                select: { id: true },
            });

            const senderId = (Security.decodeToken<IAuthToken>(
                parse(socket.handshake.headers.cookie || "")[AUTH_COOKIE_NAME]
            ))?.sub;

            if (senderId && recipient) {
                await MessageService.queueMessage(senderId, recipient.id, sanitizedContent);
            }
            socket.emit("message_queued", { handle: message.handle });
        }
    }

    /** Handles user disconnection and cleans up the socket map. */
    public chatDisconnect(socket: SocketIO.Socket, handle: string) {
        if (this.userSockets.get(handle)?.id === socket.id) {
            this.userSockets.delete(handle);
            console.log(`Socket disconnected: ${handle}`);
        }
    }
}

export const ApiV1Router = Router();
export const ApiV1Singleton = new ApiV1Endpoints(ApiV1Router);

export default ApiV1Router;
