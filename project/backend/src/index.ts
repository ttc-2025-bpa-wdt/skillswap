import "shared/config"; // init dotenv

import { createServer } from "http";
import { Server } from "socket.io";

import express from "express";
import path from "path";

import ApiV1Router, { ApiV1Singleton } from "./V1Router";

import { db } from "shared/helpers";
import { DEVELOPMENT_MODE, resolveEnv } from "shared/config";

const isTest = process.env.NODE_ENV === "test";

// verify database connection (skip exit in test mode)
db.$connect()
    .then(() => console.log("Connected to the database successfully."))
    .catch((err) => {
        console.error("Failed to connect to the database:", err);
        if (!isTest) process.exit(1);
    });

export const app = express();

// Middleware
app.use(express.json());

// Routes
app.use("/api/v1", ApiV1Router);
app.use("/images/avatar", express.static(path.resolve(process.cwd(), "public/avatars")));

export function createAppServer() {
    const server = createServer(app);
    const io = new Server(server, {
        cors: {
            origin: DEVELOPMENT_MODE ? "*" : "https://skillswap.bpariverside.org",
            methods: ["GET", "POST"],
        },
    });

    ApiV1Singleton.attachSocket(io);

    return { server, io };
}

if (!isTest) {
    const port = parseInt(resolveEnv("PORT", "3001"));

    const { server, io } = createAppServer();

    server.listen(port, () => {
        console.log(`Backend is running on http://localhost:${port}`);
    });
}