import { sqliteTable, AnySQLiteColumn, uniqueIndex, integer, text, numeric, blob } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const breeds = sqliteTable("breeds", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text().notNull(),
	size: text(),
	gpkg: integer(),
},
(table) => [
	uniqueIndex("breeds_name_unique").on(table.name),
]);

export const pets = sqliteTable("pets", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text().notNull(),
	img: text(),
	birthday: integer(),
	weight: numeric().notNull(),
	sex: text().notNull(),
	exercise: integer().notNull(),
	breedId: integer().notNull(),
	ownerId: integer(),
	activeRoutineId: integer(),
});

export const routines = sqliteTable("routines", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	goal: text().notNull(),
	servingSize: integer().notNull(),
	schedule: text().notNull(),
	petId: integer().notNull(),
});

export const users = sqliteTable("users", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	displayName: text(),
	username: text().notNull(),
	password: text().notNull(),
});

export const sessions = sqliteTable("sessions", {
	id: blob().primaryKey().notNull(),
	created: integer().notNull(),
	refresh: text().notNull(),
	active: integer().notNull(),
});

