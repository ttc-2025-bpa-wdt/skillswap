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
        port: resolveEnv("PORT", "3000"),
        allowedHosts: [DEVELOPMENT_MODE ? "skillswap.bpariverside.org" : "localhost"],
    },
    devToolbar: {
        enabled: false,
    },
    vite: {
        server: {
            host: "0.0.0.0",
            proxy: {
                "/api": {
                    target: "http://localhost:3000",
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
});
