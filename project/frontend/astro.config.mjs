// @ts-check
import { defineConfig } from "astro/config";
import icon from "astro-icon";
import node from "@astrojs/node";

// https://astro.build/config

export default defineConfig({
    output: "server",
    adapter: node({ mode: "standalone" }),
    server: {
        port: 3000,
        allowedHosts: ["frontend.live.skillswap.internal.", "frontend.dev.skillswap.internal."]
    },
    vite: {
        server: { host: "0.0.0.0" }
    },
    integrations: [icon()]
});
