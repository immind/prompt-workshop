CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`input` text NOT NULL,
	`options` text DEFAULT '{}' NOT NULL,
	`output` text NOT NULL,
	`details` text DEFAULT '{}' NOT NULL,
	`versions` text DEFAULT '[]' NOT NULL,
	`image_key` text,
	`image_type` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `entries_user_created` ON `entries` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `library_prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`author_id` text,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `library_org_created` ON `library_prompts` (`org_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `library_seeds` (
	`org_id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
