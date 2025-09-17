import { relations } from "drizzle-orm";
import { int, numeric, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { pets } from "./pets";

export const routines = sqliteTable("routines", {
    id: int().primaryKey({ autoIncrement: true }),
    /** objetivo del peso */
    goal: text({ enum: ["decrease", "balance", "increase"] }).notNull(),
    /** en gramos */
    servingSize: int().notNull(),
    /** diario, lista de segundos desde las 00:00 */
    schedule: text({ mode: "json" }).$type<number[]>().notNull(),
    petId: int().notNull(),
});

export const routinesRelations = relations(routines, ({ one }) => ({
    pet: one(pets, {
        fields: [routines.petId],
        references: [pets.id],
    }),
}));

export type RoutineInsert = typeof routines.$inferInsert;
export type RoutineSelect = typeof routines.$inferSelect;
