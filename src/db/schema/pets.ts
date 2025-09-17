import { relations } from "drizzle-orm";
import { int, numeric, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { routines } from "./routines";
import { breeds } from "./breeds";
import { users } from "./users";

export const pets = sqliteTable("pets", {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    img: text(),
    birthday: int({ mode: "timestamp" }),
    weight: numeric({ mode: "number" }).notNull(),
    sex: text({
        enum: ["f", "m"],
    }).notNull(),
    exercise: int().notNull(),

    breedId: int().notNull(),
    ownerId: int(),
    activeRoutineId: int(),
});

export const petsRelations = relations(pets, ({ one, many }) => ({
    owner: one(users, {
        fields: [pets.ownerId],
        references: [users.id],
    }),
    breed: one(breeds, {
        fields: [pets.breedId],
        references: [breeds.id],
    }),
    activeRoutine: one(routines, {
        fields: [pets.breedId],
        references: [routines.id],
    }),
    routine: many(routines),
}));

export type PetInsert = typeof pets.$inferInsert;
export type PetSelect = typeof pets.$inferSelect;
