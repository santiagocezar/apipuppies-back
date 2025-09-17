import "dotenv/config";
import * as schema from "./schema";
import { drizzle } from "drizzle-orm/libsql";
export * from "./schema";

// You can specify any property from the libsql connection options
const db = drizzle({
    connection: { url: process.env.DB_FILE_NAME! },
    schema,
});

export default db;
