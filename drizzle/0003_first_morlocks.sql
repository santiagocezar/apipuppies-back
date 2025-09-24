PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sessions` (
	`id` blob PRIMARY KEY NOT NULL,
	`created` integer NOT NULL,
	`refresh` text NOT NULL,
	`revoked` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_sessions`("id", "created", "refresh", "revoked") SELECT "id", "created", "refresh", "revoked" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;