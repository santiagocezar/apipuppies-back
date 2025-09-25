import { drizzle, DrizzleD1Database, type AnyD1Database } from "drizzle-orm/d1";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import Elysia, { status } from "elysia";

export type Database = DrizzleD1Database;
export const database = (d1?: AnyD1Database) => {
    return new Elysia({ name: "database" })
        .derive(async () => {
            if (!d1)
                return status(
                    500,
                    "Internal Server Error (missing DB conecction)"
                );

            const db: Database = drizzle(d1);

            return {
                db,
            };
        })
        .as("global");
};
