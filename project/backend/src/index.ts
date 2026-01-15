import "shared/config"; // init dotenv

import { createServer } from "http";
import { Server } from "socket.io";

import express from "express";

import ApiV1Router, { ApiV1Singleton } from "./V1Router";

import { db } from "shared/helpers";
import { DEVELOPMENT_MODE, resolveEnv } from "shared/config";

// verify database connection
db.$connect()
    .then(() => console.log("Connected to the database successfully."))
    .catch((err) => {
        console.error("Failed to connect to the database:", err);
        process.exit(1);
    });

/**
 * TODO: Implement with Routeforge (private, decorated driven kit for Elysia).
 *
 * Elysia's documentation is terrible and does not provide function signatures. Something I don't want to work with. It
 * is a great framework, but if they can't tell me the simplest things such as function signatures, then it's not worth
 * the headache. Routeforge is a thin wrapper around Elysia that adds decorators and schema validation, which is
 * something that is desperately needed in this project.
 *
 * Backlog got too large for the other projects I'm working on, so we're stuck with using plain old Express for now.
 * Might refactor this in the future, but right now, it's not a focus. Essentially this would clean up the project
 * significantly and make schemas something that's actually maintainable. Right now, we just validate manually. Best for
 * prototyping, but not great for long-term maintenance.
 *
 * Good news is, the logic is already here. Switching over is trivial and would just involve replacing the manual route
 * definitions with decorated methods. Under the hood, it's the same framework being used.
 *
 * Ideally, it would be compatible with Elysia's "Eden" which makes frontend/backend development share a contract. This
 * would significantly reduce the amount of duplicated code and make it easier to maintain.
 */

const app = express();
const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: DEVELOPMENT_MODE ? "*" : "https://skillswap.bpariverside.org",
        methods: ["GET", "POST"],
    },
});

// Middleware
app.use(express.json());

// Routes
app.use("/api/v1", ApiV1Router);

// socket for live chat
ApiV1Singleton.attachSocket(io);

const port = resolveEnv("PORT", "3001");

server.listen(port, () => {
    console.log(`Backend is running on http://localhost:${port}`);
});
