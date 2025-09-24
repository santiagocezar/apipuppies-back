CREATE TABLE `activities` (
	`id` integer PRIMARY KEY DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`plateStart` integer NOT NULL,
	`plateFinal` integer NOT NULL,
	`tankStart` integer NOT NULL,
	`tankFinal` integer NOT NULL,
	`routineId` integer NOT NULL,
	`done` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `device` (
	`id` integer PRIMARY KEY NOT NULL,
	`plate` integer NOT NULL,
	`tank` integer NOT NULL,
	`petId` integer,
	`activeRoutineId` integer
);
--> statement-breakpoint
ALTER TABLE `routines` ADD `utcOffset` integer NOT NULL;