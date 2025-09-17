import { blob, int, sqliteTable } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
    id: blob({ mode: "buffer" }).primaryKey(),
    created: int({ mode: "timestamp" }).notNull(),
    expires: int({ mode: "timestamp" }).notNull(),
    revoked: int({ mode: "boolean" }).notNull(),
});
