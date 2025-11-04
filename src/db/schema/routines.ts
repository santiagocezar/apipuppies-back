import { relations } from "drizzle-orm";
import { int, numeric, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { pets } from "./pets";
import { users } from "./users";

export const routines = sqliteTable("routines", {
    id: int().primaryKey({ autoIncrement: true }),
    /** objetivo del peso */
    goal: text({ enum: ["decrease", "balance", "increase"] }).notNull(),
    /** en gramos */
    servingSize: int().notNull(),
    /** diario, lista de segundos desde las 00:00 */
    schedule: text({ mode: "json" }).$type<number[]>().notNull(),
    /** zona horaria, diferencia con UTC en segundos */
    utcOffset: int().notNull(),
    ownerId: int().notNull(),
    forPetId: int().notNull(),
});

export const routinesRelations = relations(routines, ({ one, many }) => ({
    pet: one(pets, {
        fields: [routines.forPetId],
        references: [pets.id],
    }),
    owner: one(users, {
        fields: [routines.ownerId],
        references: [users.id],
    }),
    routines: many(routines),
}));

export type RoutineInsert = typeof routines.$inferInsert;
export type RoutineSelect = typeof routines.$inferSelect;
