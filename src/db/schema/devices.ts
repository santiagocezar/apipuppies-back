import { relations } from "drizzle-orm";
import { int, numeric, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { pets } from "./pets";

export const devices = sqliteTable("device", {
    id: int().primaryKey(), // ChipId de la ESP32, no sé cuantos bytes son pero capaz que 8
    plate: int().notNull(),
    tank: int().notNull(), // from 0 to 100
    petId: int(),
    activeRoutineId: int(),
});

export const devicesRelations = relations(devices, ({ one, many }) => ({
    pet: one(pets, {
        fields: [devices.petId],
        references: [pets.id],
    }),
}));

export type DeviceInsert = typeof devices.$inferInsert;
export type DeviceSelect = typeof devices.$inferSelect;
