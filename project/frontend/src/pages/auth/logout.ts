import type { APIRoute } from "astro";
import { AUTH_COOKIE_NAME } from "shared/config";

export const GET: APIRoute = async ({ request, redirect }): Promise<Response> => {
    // Clear the authentication cookie by setting it with an expired date
    // No clue if an API exists for this or not but this works perfectly fine and won't have any issues
    const expiredCookie = `${AUTH_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`;

    return new Response(null, {
        status: 302,
        headers: {
            "Set-Cookie": expiredCookie,
            Location: "/",
        },
    });
};
