import { Elysia } from "elysia";
import { breedsApp } from "./routes/breeds";
import { petsApp } from "./routes/pets";
import { authApp } from "./routes/auth";
import { openapi } from "@elysiajs/openapi";
import { deviceApp } from "./routes/device";

export const api = new Elysia({ prefix: "/api" })
    // .use(openapi())
    .onError(({ error, code }) => {
        if (code === "NOT_FOUND") return;

        console.error(error);
    })
    .use(authApp)
    .use(breedsApp)
    .use(petsApp)
    .use(deviceApp);
