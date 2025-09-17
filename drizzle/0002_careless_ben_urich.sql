CREATE TABLE `sessions` (
	`id` blob PRIMARY KEY NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	`revoked` integer NOT NULL
);
