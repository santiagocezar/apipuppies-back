import { drizzle, DrizzleD1Database, type AnyD1Database } from "drizzle-orm/d1";
import Elysia, { status } from "elysia";
import * as schema from "@db/schema";

export type Database = DrizzleD1Database<typeof schema>;
export const database = (d1?: AnyD1Database) => {
    return new Elysia({ name: "database" })
        .derive(async () => {
            if (!d1)
                return status(
                    500,
                    "Internal Server Error (missing DB conecction)"
                );

            const db: Database = drizzle<typeof schema>(d1);

            return {
                db,
            };
        })
        .as("global");
};
