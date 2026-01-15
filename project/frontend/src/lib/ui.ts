import { writable } from "svelte/store";

export const alertStore = writable({
    isOpen: false,
    message: "",
    title: "Alert",
    type: "alert" as "alert" | "confirm",
    resolve: (val?: any) => {},
});

export function showAlert(message: string, title: string = "Alert"): Promise<void> {
    return new Promise((resolve) => {
        alertStore.set({
            isOpen: true,
            message,
            title,
            type: "alert",
            resolve: () => {
                alertStore.set({ isOpen: false, message: "", title: "", type: "alert", resolve: () => {} });
                resolve();
            },
        });
    });
}

export function showConfirm(message: string, title: string = "Confirm"): Promise<boolean> {
    return new Promise((resolve) => {
        alertStore.set({
            isOpen: true,
            message,
            title,
            type: "confirm",
            resolve: (val: boolean) => {
                alertStore.set({ isOpen: false, message: "", title: "", type: "alert", resolve: () => {} });
                resolve(val);
            },
        });
    });
}
