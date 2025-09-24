import { blob, int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
    id: blob({ mode: "buffer" }).primaryKey(),
    created: int({ mode: "timestamp" }).notNull(),
    refresh: text().notNull(),
    active: int({ mode: "boolean" }).notNull(),
});
