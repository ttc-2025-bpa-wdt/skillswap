// Since Microsoft graciously decided to improperly handle inotify on WSL2, we have to use
// polling to reliably detect file changes. Not only is this a waste of resources, but it
// also requires a workaround and and additionally makes file watching less responsive.
// What a wonderful world we live in. Thank you, Microsoft.

// The specific NPM script to run
const script = "dev:cold";

/* ------------------------------------------------------------------------------------ */

import { spawn } from "child_process";
import chokidar from "chokidar";

let childProc;

function startApp() {
    return new Promise(resolve => {
        childProc = spawn("bun", ["run", script], { stdio: "inherit" });
        childProc.on("exit", (code) => resolve(code));
    });
}

function stopApp() {
    return new Promise(resolve => {
        if (!childProc) {
            resolve(null);
            return;
        }
    
        // Attempt graceful shutdown
        childProc.kill("SIGINT");

        // Force kill after timeout
        const timeout = setTimeout(() => {
            if (childProc && childProc.exitCode === null)
                childProc.kill("SIGKILL");
        }, 5000);

        childProc.on("exit", (code) => {
            clearTimeout(timeout)
            resolve(code);
        });
        
        childProc = null;
    });
}

const restartApp = () => stopApp().then(() => startApp());

function terminate() {
    const exit = (code => process.exit(code ?? 0));
    stopApp().then(exit).catch(exit);
}

const terminateAll = () => stopApp().then(terminate);

const watcher = chokidar.watch(import.meta.dir, {
    ignored: /(^|[\/\\])(\..|node_modules|watcher.js)/,
    persistent: true,
    usePolling: true,
    interval: 800,
    depth: 5,
    binaryInterval: 1600
});

watcher.on("change", (path) => {
    console.log(`File changed: ${path}`);
    restartApp();
});

// Handle Ctrl+C and graceful termination
process.on("SIGINT", terminateAll);
process.on("SIGTERM", terminateAll);

await startApp();
