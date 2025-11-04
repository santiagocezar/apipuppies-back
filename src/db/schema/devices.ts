import { relations } from "drizzle-orm";
import { int, numeric, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { pets } from "./pets";
import { users } from "./users";
import { routines } from "./routines";

export const devices = sqliteTable("device", {
    id: int().primaryKey(), // ChipId de la ESP32, no sé cuantos bytes son pero capaz que 8
    plate: int().notNull(),
    tank: int().notNull(), // from 0 to 100
    ownerId: int().notNull(),
    activeRoutineId: int(),
});

export const devicesRelations = relations(devices, ({ one }) => ({
    owner: one(users, {
        fields: [devices.ownerId],
        references: [users.id],
    }),
    routine: one(routines, {
        fields: [devices.activeRoutineId],
        references: [routines.id],
    }),
}));

export type DeviceInsert = typeof devices.$inferInsert;
export type DeviceSelect = typeof devices.$inferSelect;
