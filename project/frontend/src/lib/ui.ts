import { writable } from "svelte/store";

interface AlertState {
    isOpen: boolean;
    message: string;
    title: string;
    type: "alert" | "confirm";
    confirmLabel?: string;
    cancelLabel?: string;
    resolve: (val?: any) => void;
}

const defaultState: AlertState = {
    isOpen: false,
    message: "",
    title: "Alert",
    type: "alert",
    confirmLabel: undefined,
    cancelLabel: undefined,
    resolve: () => {},
};

export const alertStore = writable<AlertState>({ ...defaultState });

function close() {
    alertStore.set({ ...defaultState });
}

export function showAlert(message: string, title: string = "Alert"): Promise<void> {
    return new Promise((resolve) => {
        alertStore.set({ isOpen: true, message, title, type: "alert", resolve: () => { close(); resolve(); } });
    });
}

export function showConfirm(
    message: string,
    title: string = "Confirm",
    options?: { confirmLabel?: string; cancelLabel?: string },
): Promise<boolean> {
    return new Promise((resolve) => {
        alertStore.set({
            isOpen: true,
            message,
            title,
            type: "confirm",
            confirmLabel: options?.confirmLabel,
            cancelLabel: options?.cancelLabel,
            resolve: (val: boolean) => { close(); resolve(val); },
        });
    });
}

export function showAuthPrompt(): Promise<boolean> {
    return showConfirm(
        "Sign in or create an account to continue.",
        "Login Required",
        { confirmLabel: "Log In", cancelLabel: "Maybe Later" },
    );
}