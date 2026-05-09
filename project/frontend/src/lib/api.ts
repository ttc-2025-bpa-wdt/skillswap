import { showAuthPrompt } from "./ui";

let authPromptActive = false;

export async function apiFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const response = await fetch(input, init);

    if (response.status === 401 && !authPromptActive) {
        authPromptActive = true;
        try {
            const shouldLogin = await showAuthPrompt();
            if (shouldLogin) {
                window.location.href = "/auth/login";
                return new Promise<Response>(() => {});
            }
        } finally {
            authPromptActive = false;
        }
    }

    return response;
}