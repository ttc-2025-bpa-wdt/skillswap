import { DEVELOPMENT_MODE, resolveEnv } from "shared/config"; // load config


// @ts-check
import { defineConfig } from "astro/config";
import svelte, { vitePreprocess } from "@astrojs/svelte";
import node from "@astrojs/node";

// https://astro.build/config

export default defineConfig({
    output: "server",
    adapter: node({ mode: "standalone" }),
    server: {
        port: parseInt(resolveEnv("PORT", "3000")),
        allowedHosts: true,
    },
    devToolbar: {
        enabled: false,
    },
    vite: {
        server: {
            host: "0.0.0.0",
            proxy: {
                "/api": {
                    target: process.env.BACKEND_URL || "http://localhost:3001",
                    changeOrigin: true,
                },
            },
        },
    },
    integrations: [
        svelte({
            extensions: [".svelte"],
            preprocess: vitePreprocess(),
        }),
    ],
    scopedStyleStrategy: "attribute",
    // PWA Configuration - site URL for manifest generation
    // In production, nginx handles SSL termination so internal traffic is HTTP
    site: DEVELOPMENT_MODE ? "http://localhost:3000" : "http://skillswap.bpariverside.org",
});
