import { Hono } from "hono";
import { createFactory } from "hono/factory";
import type { JwtVariables } from "hono/jwt";
import { LibsqlError } from "@libsql/client";
import { HTTPException } from "hono/http-exception";

import breedsApp from "./routes/breeds";
import petsApp from "./routes/pets";
import authApp from "./routes/auth";
import { Scalar } from "@scalar/hono-api-reference";
import { openAPIRouteHandler } from "hono-openapi";

type Variables = JwtVariables;

const app = new Hono<{ Variables: Variables }>()
    .use(async (c, next) => {
        await next();
        const err = c.error;
        if (err) {
            if (err.cause instanceof LibsqlError) {
                if (err.cause.code == "SQLITE_CONSTRAINT_UNIQUE") {
                    throw new HTTPException(409, {
                        message: "El elemento ya existe",
                        cause: c.error,
                    });
                }
            }
        }
    })
    .route("/api/breeds", breedsApp)
    .route("/api/pets", petsApp)
    .route("/api/auth", authApp);

app.get(
    "/openapi",
    openAPIRouteHandler(app, {
        documentation: {
            info: {
                title: "Hono API",
                version: "1.0.0",
                description: "Greeting API",
            },
            servers: [
                {
                    url: "http://localhost:3000",
                    description: "Local Server",
                },
            ],
        },
    })
);
app.get("/scalar", Scalar({ url: "/openapi" }));

export default app;
