import { relations } from "drizzle-orm";
import { int, numeric, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { pets } from "./pets";

export const breeds = sqliteTable("breeds", {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull().unique(),
    size: text({ enum: ["sm", "lg"] }),
    /** gramos por kilo */
    gpkg: int(),
});

export const breedsRelations = relations(breeds, ({ many }) => ({
    pets: many(pets),
}));

export type BreedInsert = typeof breeds.$inferInsert;
export type BreedSelect = typeof breeds.$inferSelect;
