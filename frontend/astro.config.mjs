// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
    server: {
        port: 3000,
        allowedHosts: [".bpa.internal"]
    },
    vite: {
        server: {
            host: "0.0.0.0",
            watch: { usePolling: process.env.DOCKER_WSL2 !== undefined }
        }
    }
});
