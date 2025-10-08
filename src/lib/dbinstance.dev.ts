import { drizzle } from "drizzle-orm/bun-sqlite";
import Elysia, { status } from "elysia";
import { Database } from "bun:sqlite";

// export type Database = BunSQLiteDatabase;
export const database = () => {
    return new Elysia({ name: "database" })
        .derive(async () => {
            const path = process.env.DB_FILE_NAME!.slice(5);
            console.log({ path });
            const sqlite = new Database(path);
            const db = drizzle(sqlite);

            return {
                db,
            };
        })
        .as("global");
};
