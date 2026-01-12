import type { APIRoute } from "astro";
import { Authentication, User, UserFilter } from "shared/models";

// Redirect to logged-in user's profile page, or to homepage if not authenticated
export const GET: APIRoute = async ({ request, redirect }): Promise<Response> => {
    const token = Authentication.validateToken(request);
    if (!token) return redirect("/");

    const user = await User.read(token.sub, UserFilter.Id);
    if (!user) return redirect("/");

    return redirect(`/profile/${user.handle}`);
};
