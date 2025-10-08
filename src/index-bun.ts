import Elysia from "elysia";
import { api } from "./api";
import { database } from "./lib/dbinstance.dev";
import { keychain } from "./lib/key";
import openapi from "@elysiajs/openapi";
import { fromTypes } from "@elysiajs/openapi/gen";
import * as path from "node:path";
import z from "zod";

export default new Elysia()
    .use(
        openapi({
            // references: fromTypes("dist/index-bun.d.ts"),
            references: fromTypes("src/index-bun.ts", {
                // This is reference from root of the project
                projectRoot: path.join("..", import.meta.dir),
                tsconfigPath: "tsconfig.json",
            }),
            mapJsonSchema: {
                zod: z.toJSONSchema,
            },
        })
    )
    .use(database())
    .use(keychain("localhost"))
    .use(api)
    .listen(3000, ({ hostname, port }) => {
        console.log(`🦊 APIPuppies funcionando en ${hostname}:${port}`);
    });
