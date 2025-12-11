import { Controller, Endpoint, RestResponseSchema } from "@substrant/routeforge/sdk";

@Controller()
export class ApiV1Controller {
    @Endpoint.get("/status")
    public status(ctx: ApiV1Controller.Context["status"]) {
        return {
            success: true,
            data: { message: "OK" }
        };
    }
}
