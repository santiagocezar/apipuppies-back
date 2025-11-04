import Elysia from "elysia";
import { api } from "./api";
import { database } from "./lib/dbinstance.dev";
import { keychain } from "./lib/key";
import openapi from "@elysiajs/openapi";
import { fromTypes } from "@elysiajs/openapi/gen";
import * as path from "node:path";
import z from "zod";
import { cors } from "@elysiajs/cors";
import { DrizzleError } from "drizzle-orm";
import {} from "drizzle-orm/d1";

console.log(path.join(import.meta.dir, ".."));

export default new Elysia()
    .use(
        openapi({
            documentation: {
                servers: [
                    { url: "https://apipuppies.santiagocezar2013.workers.dev" },
                ],
                info: {
                    title: "API APIPuppies (Puppies 🐶)",
                    version: "No Usar En Producción edition",
                    description:
                        "API para controlar el uso de Comederos Inteligentes APIPuppies (Patente en Trámite)",
                },
            },
            references: fromTypes("src/index-bun.ts", {
                // This is reference from root of the project
                projectRoot: path.join(import.meta.dir, ".."),
                tsconfigPath: "tsconfig.json",
            }),
            mapJsonSchema: {
                zod: z.toJSONSchema,
            },
        })
    )
    .use(cors())
    .use(database())
    .use(keychain("localhost"))
    .onError(({ error, code }) => {
        if (code === "NOT_FOUND") return;

        console.error(error);
    })
    .use(api)
    .listen(3000, ({ hostname, port }) => {
        console.log(`🦊 APIPuppies funcionando en ${hostname}:${port}`);
    });
