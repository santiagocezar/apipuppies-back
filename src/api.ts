import { Elysia } from "elysia";
import { breedsRoute } from "./routes/breeds";
import { petsRoute } from "./routes/pets";
import { authRoute } from "./routes/auth";
import { routinesRoute } from "./routes/routines";
import { adminRoute } from "./routes/admin";

export const api = new Elysia({ prefix: "/api" })
    .use(authRoute)
    .use(breedsRoute)
    .use(petsRoute)
    .use(routinesRoute)
    .use(adminRoute);
