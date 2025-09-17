import { relations } from "drizzle-orm";
import { int, numeric, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { routines } from "./routines";
import { breeds } from "./breeds";
import { pets } from "./pets";

export const users = sqliteTable("users", {
    id: int().primaryKey({ autoIncrement: true }),
    displayName: text(),
    username: text().notNull(),
    password: text().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
    pets: many(pets),
}));

export type UserInsert = typeof users.$inferInsert;
export type UserSelect = typeof users.$inferSelect;
