import { io as ioClient, type Socket } from "socket.io-client";

/** Connect a Socket.IO client with an auth cookie */
export async function connectSocket(
    serverUrl: string,
    cookie: string,
): Promise<{ socket: Socket; disconnect: () => void }> {
    const socket = ioClient(serverUrl, {
        path: "/socket.io/",
        transports: ["websocket"],
        extraHeaders: {
            Cookie: cookie,
        },
    });

    await new Promise<void>((resolve) => {
        socket.on("connect", () => resolve());
    });

    return {
        socket,
        disconnect: () => {
            socket.disconnect();
        },
    };
}

/** Connect without auth to verify rejection */
export async function connectUnauthenticated(
    serverUrl: string,
): Promise<{ socket: Socket; disconnect: () => void }> {
    const socket = ioClient(serverUrl, {
        path: "/socket.io/",
        transports: ["websocket"],
    });

    return {
        socket,
        disconnect: () => {
            socket.disconnect();
        },
    };
}

/** Wait for a specific event from the socket, with timeout */
export function waitForEvent<T = any>(socket: Socket, event: string, timeout: number = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for event "${event}" after ${timeout}ms`));
        }, timeout);

        socket.on(event, (data: T) => {
            clearTimeout(timer);
            resolve(data);
        });
    });
}