// @ts-check
import { defineConfig } from "astro/config";
import icon from "astro-icon";

// https://astro.build/config

export default defineConfig({
    server: {
        port: 3000,
        allowedHosts: ["frontend.live.skillswap.internal.", "frontend.dev.skillswap.internal."]
    },
    vite: {
        server: { host: "0.0.0.0" }
    },
    integrations: [icon()]
});
