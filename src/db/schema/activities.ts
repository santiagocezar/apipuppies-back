import { relations, sql } from "drizzle-orm";
import { int, numeric, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { pets } from "./pets";
import { routines } from "./routines";

export const activities = sqliteTable("activities", {
    id: int()
        .primaryKey()
        .default(sql`(unixepoch('subsec') * 1000)`),
    plateStart: int().notNull(),
    plateFinal: int().notNull(),
    tankStart: int().notNull(),
    tankFinal: int().notNull(),
    routineId: int().notNull(),
    done: int({ mode: "boolean" }).notNull(),
});

export const activitiesRelations = relations(activities, ({ one }) => ({
    routine: one(routines, {
        fields: [activities.routineId],
        references: [routines.id],
    }),
}));

export type ActivityInsert = typeof activities.$inferInsert;
export type ActivitySelect = typeof activities.$inferSelect;
