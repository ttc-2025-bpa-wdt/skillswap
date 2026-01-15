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
} from "shared/schema";
import validator from "validator";

import { Authentication } from "shared/models";
import { AUTH_COOKIE_EXPIRY, AUTH_COOKIE_NAME, DEVELOPMENT_MODE } from "shared/config";
import { Security } from "shared/helpers";

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
        router.post("/session", this.expressExceptionWrap(this.createSession.bind(this)));
        router.post("/session/register", this.expressExceptionWrap(this.registerForSession.bind(this)));
        router.delete("/session/register", this.expressExceptionWrap(this.unregisterFromSession.bind(this)));
        router.post("/session/rate", this.expressExceptionWrap(this.rateSession.bind(this)));
        router.delete("/session/rate", this.expressExceptionWrap(this.deleteRating.bind(this)));
        router.delete("/message", this.expressExceptionWrap(this.deleteMessage.bind(this)));
        router.patch("/session", this.expressExceptionWrap(this.updateSession.bind(this)));
        router.delete("/session", this.expressExceptionWrap(this.deleteSession.bind(this)));

        router.post("/contact/host", this.expressExceptionWrap(this.contactHost.bind(this)));

        this.startCleanupTask();
    }

    protected startCleanupTask() {
        const cleanup = async () => {
            try {
                const oneDayAgo = new Date();
                oneDayAgo.setDate(oneDayAgo.getDate() - 1);

                const result = await db.session.deleteMany({
                    where: {
                        eventDate: {
                            lt: oneDayAgo,
                        },
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

    protected async authUser(req: ExpressRequest): Promise<RequestUser | null> {
        const token_str = req.cookies[AUTH_COOKIE_NAME];
        if (!token_str) return null;

        const token = Security.decodeToken<IAuthToken>(token_str);
        if (!token) return null;

        const user = await db.user.findUnique({
            where: { id: token.sub },
            select: { handle: true },
        });

        if (!user) return null;
        return { handle: user.handle };
    }

    protected getUserTargetHandle(req: ExpressRequest, res: ExpressResponse, reqUser: RequestUser): string | null {
        let targetHandle = (req.query.handle as string) ?? req.body.handle ?? reqUser.handle;
        if (!targetHandle) {
            // server error; shouldnt happen unless invalid tokens were generated
            res.status(500).json({ success: false, error: "Invalid token: no subject" });
            return null;
        }

        return validator.escape(validator.trim(targetHandle));
    }

    protected async checkUserRole(handle: string, requiredRole: string): Promise<boolean> {
        const user = await db.user.findUnique({
            where: { handle },
            select: { role: true },
        });

        return user?.role === requiredRole;
    }

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

    /* User management and administration endpoints */

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

    public async deleteUser(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const reqUser = await this.authUser(req);
        if (!reqUser) return res.status(401).json({ success: false, error: "Unauthorized" });

        const targetHandle = this.getUserTargetHandle(req, res, reqUser);
        if (!targetHandle) return;

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

    public async uploadAvatar(req: ExpressRequest, res: ExpressResponse) {
        const reqUser = await this.authUser(req);
        if (!reqUser) return res.status(401).json({ success: false, error: "Unauthorized" });

        const contentLength = parseInt(req.headers["content-length"] || "0");
        if (contentLength > 5 * 1024 * 1024) {
            return res.status(413).json({ success: false, error: "File too large (max 5MB)" });
        }

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

    public async updateUserSettings(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const reqUser = await this.authUser(req);
        if (!reqUser) return res.status(401).json({ success: false, error: "Unauthorized" });

        const targetHandle = this.getUserTargetHandle(req, res, reqUser);
        if (!targetHandle) return;

        if (targetHandle !== reqUser.handle) {
            if (!(await this.checkUserRole(reqUser.handle, "admin")))
                return res.status(403).json({ success: false, error: "Forbidden" });
        }

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

        // dont load images that arent uploaded to the server
        if (avatarUrl && !avatarUrl.startsWith("/images/avatar/")) {
            return res.status(400).json({ success: false, error: "Invalid avatar URL" });
        }

        const sanitizeList = (list: any) => {
            if (Array.isArray(list)) {
                return list.map((item) => (typeof item === "string" ? validator.escape(validator.trim(item)) : item));
            }
            return [];
        };

        await db.profile.update({
            where: { userId },
            data: {
                displayName,
                avatarUrl: avatarUrl || (currentProfile?.avatarUrl ?? "/images/avatar/default.png"),
                bio,
                tags: JSON.stringify(sanitizeList(req.body.tags)),
                skills: JSON.stringify(sanitizeList(req.body.skills)),
            },
        });

        // Clean up old avatar if it changed
        if (avatarUrl && currentProfile?.avatarUrl && currentProfile.avatarUrl !== avatarUrl) {
            this.deleteAvatarFile(currentProfile.avatarUrl);
        }

        return res.json({ success: true });
    }

    /* Authentication and session management endpoints */

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

        const existing = await db.user.findFirst({
            where: { OR: [{ email: sEmail }, { handle: sHandle }] },
        });

        if (existing) return res.status(409).json({ success: false, error: "User already exists" });

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
            secure: import.meta.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: req.query.remember ? AUTH_COOKIE_EXPIRY : undefined,
        });

        return res.redirect("/dashboard");
    }

    public async sendFeedback(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }

        console.log(`[FEEDBACK] From: ${name} <${email}>`);
        console.log(`[FEEDBACK] Message: ${message}`);

        return res.json({ success: true });
    }

    /* Session management endpoints */

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

        if (session.user.handle !== reqUser.handle) {
            if (!(await this.checkUserRole(reqUser.handle, "admin")))
                return res.status(403).json({ success: false, error: "Forbidden" });
        }

        const name = validator.escape(validator.trim(String(req.body.name || "")));
        const prereqs = validator.escape(validator.trim(String(req.body.prereqs || "")));
        const difficulty = validator.trim(String(req.body.difficulty || ""));
        let categories = req.body.categories;
        if (Array.isArray(categories)) {
            categories = categories.map((c: any) => (typeof c === "string" ? validator.escape(validator.trim(c)) : c));
        } else {
            categories = [];
        }

        const description = validator.escape(validator.trim(String(req.body.description || "")));
        const meetingUrl = validator.trim(String(req.body.meetingUrl || ""));

        if (!validator.isURL(meetingUrl) || !meetingUrl.includes("zoom.us")) {
            return res.status(400).json({ success: false, error: "Invalid meeting URL. Must be a valid Zoom link." });
        }

        const duration = parseInt(String(req.body.duration || "60"));

        await db.session.update({
            where: { id },
            data: {
                name,
                categories: JSON.stringify(categories),
                prereqs,
                difficulty,
                description,
                meetingUrl,
                duration,
                eventDate: new Date(req.body.eventDate),
            },
        });

        return res.json({ success: true });
    }

    public async createSession(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const reqUser = await this.authUser(req);
        if (!reqUser) return res.status(401).json({ success: false, error: "Unauthorized" });

        const user = await db.user.findUnique({
            where: { handle: reqUser.handle },
            select: { id: true },
        });

        if (!user?.id) return res.status(404).json({ success: false, error: "User not found" });

        const name = validator.escape(validator.trim(String(req.body.name || "")));
        const prereqs = validator.escape(validator.trim(String(req.body.prereqs || "")));
        const difficulty = validator.trim(String(req.body.difficulty || ""));
        let categories = req.body.categories;
        if (Array.isArray(categories)) {
            categories = categories.map((c: any) => (typeof c === "string" ? validator.escape(validator.trim(c)) : c));
        } else {
            categories = [];
        }

        if (!difficultyTags[difficulty])
            return res.status(400).json({ success: false, error: "Invalid difficulty level" });

        const description = validator.escape(validator.trim(String(req.body.description || "")));
        const meetingUrl = validator.trim(String(req.body.meetingUrl || ""));

        if (!validator.isURL(meetingUrl) || !meetingUrl.includes("zoom.us")) {
            return res.status(400).json({ success: false, error: "Invalid meeting URL. Must be a valid Zoom link." });
        }

        const duration = parseInt(String(req.body.duration || "60"));

        const session = await db.session.create({
            data: {
                name,
                categories: JSON.stringify(categories),
                prereqs,
                difficulty,
                description,
                meetingUrl,
                duration,
                eventDate: new Date(req.body.eventDate),
                userId: user.id,
            },
        });

        return res.json({ success: true, data: { id: session.id } });
    }

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

        await db.session.delete({
            where: { id },
        });

        return res.json({ success: true });
    }

    protected async registerForSession(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const tokenStr = req.cookies[AUTH_COOKIE_NAME];
        if (!tokenStr) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const token = Security.decodeToken<IAuthToken>(tokenStr);
        if (!token) {
            res.status(401).json({ success: false, error: "Invalid token" });
            return;
        }

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

        res.json({ success: true });
    }

    protected async unregisterFromSession(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const tokenStr = req.cookies[AUTH_COOKIE_NAME];
        if (!tokenStr) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const token = Security.decodeToken<IAuthToken>(tokenStr);
        if (!token) {
            res.status(401).json({ success: false, error: "Invalid token" });
            return;
        }

        const { sessionId } = req.body;
        if (!sessionId) {
            res.status(400).json({ success: false, error: "Missing sessionId" });
            return;
        }

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

        res.json({ success: true });
    }

    protected async contactHost(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const tokenStr = req.cookies[AUTH_COOKIE_NAME];
        if (!tokenStr) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const token = Security.decodeToken<IAuthToken>(tokenStr);
        if (!token) {
            res.status(401).json({ success: false, error: "Invalid token" });
            return;
        }

        const { sessionId, hostId, message } = req.body;

        if (!message) {
            res.status(400).json({ success: false, error: "Message is required" });
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
                content: message,
                senderId: token.sub,
                recipientId: targetHostId,
                sessionName: session ? session.name : null,
            },
        });

        // Optionally emit to socket?
        // this.emitMessage(...) // TODO if we want real-time

        res.json({ success: true });
    }

    protected async rateSession(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const tokenStr = req.cookies[AUTH_COOKIE_NAME];
        if (!tokenStr) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const token = Security.decodeToken<IAuthToken>(tokenStr);
        if (!token) {
            res.status(401).json({ success: false, error: "Invalid token" });
            return;
        }

        const { sessionId, rating, comment } = req.body;

        if (!sessionId || !rating) {
            res.status(400).json({ success: false, error: "Missing sessionId or rating" });
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
                    comment: comment !== undefined ? comment : undefined,
                },
            });
        } else {
            await db.review.create({
                data: {
                    sessionId: session.id,
                    authorId: token.sub,
                    recipientId: session.userId,
                    rating: parseInt(rating),
                    comment: comment || "",
                },
            });
        }

        // Update average rating
        const ratings = await db.review.findMany({
            where: { recipientId: session.userId, rating: { gt: 0 } },
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

        res.json({ success: true });
    }

    protected async deleteRating(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const tokenStr = req.cookies[AUTH_COOKIE_NAME];
        if (!tokenStr) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const token = Security.decodeToken<IAuthToken>(tokenStr);
        if (!token) {
            res.status(401).json({ success: false, error: "Invalid token" });
            return;
        }

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

        // Allow deletion if user is the author OR the recipient
        if (review.authorId !== token.sub && review.recipientId !== token.sub) {
            res.status(403).json({ success: false, error: "Forbidden" });
            return;
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

        // Recalculate average rating for recipient
        const ratings = await db.review.findMany({
            where: { recipientId: review.recipientId, rating: { gt: 0 } },
            select: { rating: true },
        });

        const avg = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;

        await db.profile.update({
            where: { userId: review.recipientId },
            data: { rating: avg },
        });

        res.json({ success: true });
    }

    protected async deleteMessage(req: ExpressRequest, res: ExpressResponse) {
        if (!this.ensureJson(req, res)) return;

        const tokenStr = req.cookies[AUTH_COOKIE_NAME];
        if (!tokenStr) {
            res.status(401).json({ success: false, error: "Unauthorized" });
            return;
        }

        const token = Security.decodeToken<IAuthToken>(tokenStr);
        if (!token) {
            res.status(401).json({ success: false, error: "Invalid token" });
            return;
        }

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

    /* Socket endpoints */

    public async chatConnect(socket: SocketIO.Socket) {
        // 1. Authenticate the socket connection
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

    public chatMessage(socket: SocketIO.Socket, message: ChatMessage, senderHandle: string) {
        const targetSocket = this.userSockets.get(message.handle);

        if (targetSocket) {
            targetSocket.emit("message", {
                handle: senderHandle,
                content: message.content,
            });
        } else {
            // TODO: Store offline messages
            socket.emit("error", { error: "User is offline" });
        }
    }

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
