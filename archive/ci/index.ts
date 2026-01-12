import { Elysia, t } from "elysia";
import fs from "fs/promises";
import fsync from "fs";
import os from "os";
import { Readable } from "stream";
import crypto from "crypto";

const WORKFLOW_NAME = "Upload Artifact";
const ARTIFACT_NAME = "artifact";
const GITHUB_TOKEN = "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";
const GITHUB_WEBHOOK_SECRET = "testsecret123";

function verifyGitHubSignature(payload: string, signature: string): boolean {
    if (!GITHUB_WEBHOOK_SECRET) {
        console.warn("GITHUB_WEBHOOK_SECRET not set, skipping signature verification");
        return true;
    }

    const hmac = crypto.createHmac("sha256", GITHUB_WEBHOOK_SECRET);
    hmac.update(payload);
    const expectedSignature = `sha256=${hmac.digest("hex")}`;

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

interface Store {
    rawBody: string;
}

new Elysia()
    .get("/", () => "OK")
    .state("rawBody", null as string | null)
    .post(
        "/workflow",
        async ({ headers, body, store }) => {
            const event = headers["x-github-event"];
            const signature = headers["x-hub-signature-256"];

            // Verify that the request is actually from GitHub using the secret
            if (!signature || !verifyGitHubSignature(store.rawBody!, signature)) {
                console.error("Invalid GitHub signature, rejecting request");
                return { status: "unauthorized" };
            }

            console.log("Header dump:", headers);
            console.log("Body dump:", body);

            if (!event || event !== "workflow_run") return { status: "ignored" };

            const { action } = body;
            console.log("Received GitHub workflow event with status:", event);

            if (action !== "completed") return { status: "ignored" };

            const { name, conclusion, artifacts_url: artifactsUrl } = body.workflow_run;
            console.log("Workflow", name, "completed with status:", conclusion);

            if (conclusion !== "success") return { status: "ignored" };

            if (name === WORKFLOW_NAME && conclusion === "success") {
                console.log("Triggering deployment for workflow:", name);

                const artRes: any = await fetch(artifactsUrl, {
                    headers: {
                        ["Authorization"]: `Bearer ${GITHUB_TOKEN}`,
                        ["Accept"]: "application/vnd.github+json",
                        ["X-GitHub-Api-Version"]: "2022-11-28",
                    },
                })
                    .then((res) => res.json() as object)
                    .catch((err) => {
                        console.error("Error fetching artifacts:", err);
                        return {};
                    });
                console.log("Artifacts dump:", artRes);

                const count = artRes.total_count || 0;
                console.log(`Found ${count} artifacts for workflow run.`);

                // Find the artifact with the specified name
                let foundArtifact: any | null = null;

                for (const artifact of artRes.artifacts) {
                    if (artifact.name === ARTIFACT_NAME) {
                        foundArtifact = artifact;
                        break;
                    }
                }

                if (!foundArtifact) return { status: "artifact not found" };

                const downloadUrl = foundArtifact.archive_download_url;
                console.log("Downloading artifact from URL:", downloadUrl);

                const res = await fetch(downloadUrl, {
                    headers: {
                        ["Authorization"]: `Bearer ${GITHUB_TOKEN}`,
                        ["Accept"]: "application/vnd.github+json",
                        ["X-GitHub-Api-Version"]: "2022-11-28",
                    },
                    redirect: "follow",
                });

                console.log("Artifact download response status:", res.status);

                if (res.status !== 200 || !res.body) {
                    console.error("Failed to download artifact");
                    console.log("Artifact dump:", res.body);
                    return { status: "failed to download artifact" };
                }

                // Write the artifact data to a file
                const date = new Date().toISOString().replace(/[:.]/g, "-");
                const path = os.homedir() + `/.ci/artifact-${date}.zip`;

                // make dir
                await fs.mkdir(os.homedir() + `/.ci/`, { recursive: true });

                console.log("Artifact downloading...");
                return await new Promise((resolve, reject) => {
                    console.log("Streaming artifact to file:", path);
                    Readable.fromWeb(res.body as ReadableStream)
                        .pipe(fsync.createWriteStream(path))
                        .on("finish", () => {
                            console.log(`Artifact saved to ${path}`);
                            resolve({ status: "deployment triggered" });
                        })
                        .on("error", (err) => {
                            console.error("Error saving artifact:", err);
                            reject({ status: "error saving artifact" });
                        });
                });
            }
        },
        {
            body: t.Object({
                action: t.String(),
                workflow_run: t.Object({
                    artifacts_url: t.String(),
                    conclusion: t.String(),
                    name: t.String(),
                }),
            }),
            async parse({ request, store, headers }) {
                if (headers["content-type"] !== "application/json") {
                    return { status: "invalid content type" };
                }

                const text = await request.text();
                store.rawBody = text;
                return JSON.parse(text);
            },
        },
    )
    .listen({ hostname: "127.0.0.1", port: 7000 });
