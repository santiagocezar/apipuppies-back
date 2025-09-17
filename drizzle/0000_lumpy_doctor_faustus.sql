CREATE TABLE `breeds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`size` text,
	`gpkg` integer
);
--> statement-breakpoint
CREATE TABLE `pets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`img` text,
	`birthday` integer,
	`weight` numeric NOT NULL,
	`sex` text NOT NULL,
	`exercise` integer NOT NULL,
	`breedId` integer NOT NULL,
	`ownerId` integer,
	`activeRoutineId` integer
);
--> statement-breakpoint
CREATE TABLE `routines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal` text NOT NULL,
	`servingSize` integer NOT NULL,
	`schedule` text NOT NULL,
	`petId` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`displayName` text,
	`username` text NOT NULL,
	`password` text NOT NULL
);
