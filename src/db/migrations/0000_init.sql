CREATE TABLE `applicants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`desired_size` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'offen' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`garden_id` integer,
	FOREIGN KEY (`garden_id`) REFERENCES `gardens`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`category` text DEFAULT 'sonstiges' NOT NULL,
	`file_name` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`uploaded_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`end_date` text,
	`location` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'entwurf' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `garden_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`garden_id` integer NOT NULL,
	`category` text DEFAULT 'sonstiges' NOT NULL,
	`file_name` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`uploaded_at` text NOT NULL,
	`uploaded_by` integer,
	FOREIGN KEY (`garden_id`) REFERENCES `gardens`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `garden_documents_garden_idx` ON `garden_documents` (`garden_id`);--> statement-breakpoint
CREATE TABLE `garden_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`garden_id` integer NOT NULL,
	`date` text NOT NULL,
	`author_id` integer,
	`text` text NOT NULL,
	FOREIGN KEY (`garden_id`) REFERENCES `gardens`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `garden_notes_garden_idx` ON `garden_notes` (`garden_id`);--> statement-breakpoint
CREATE TABLE `gardens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` integer NOT NULL,
	`size_sqm` real,
	`status` text DEFAULT 'frei' NOT NULL,
	`meter_number` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`polygon` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gardens_number_unique` ON `gardens` (`number`);--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`subject` text DEFAULT '' NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `letter_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `letter_templates_type_unique` ON `letter_templates` (`type`);--> statement-breakpoint
CREATE TABLE `letters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`number` text,
	`member_id` integer,
	`garden_id` integer,
	`subject` text NOT NULL,
	`file_name` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by` integer,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`garden_id`) REFERENCES `gardens`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `letters_member_idx` ON `letters` (`member_id`);--> statement-breakpoint
CREATE INDEX `letters_garden_idx` ON `letters` (`garden_id`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`street` text DEFAULT '' NOT NULL,
	`zip` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`member_since` text,
	`status` text DEFAULT 'aktiv' NOT NULL,
	`left_at` text,
	`note` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meter_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`garden_id` integer NOT NULL,
	`date` text NOT NULL,
	`value` real NOT NULL,
	`read_by` integer,
	`note` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`garden_id`) REFERENCES `gardens`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`read_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `meter_readings_garden_idx` ON `meter_readings` (`garden_id`);--> statement-breakpoint
CREATE TABLE `news` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'entwurf' NOT NULL,
	`published_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`garden_id` integer,
	`year` integer NOT NULL,
	`type` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`amount_cents` integer NOT NULL,
	`due_date` text,
	`paid_cents` integer DEFAULT 0 NOT NULL,
	`paid_at` text,
	`dunning_level` integer DEFAULT 0 NOT NULL,
	`dunned_at` text,
	`letter_id` integer,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`garden_id`) REFERENCES `gardens`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `payments_member_idx` ON `payments` (`member_id`);--> statement-breakpoint
CREATE INDEX `payments_year_idx` ON `payments` (`year`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`assignee` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'offen' NOT NULL,
	`due_date` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tenancies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`garden_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	FOREIGN KEY (`garden_id`) REFERENCES `gardens`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `tenancies_garden_idx` ON `tenancies` (`garden_id`);--> statement-breakpoint
CREATE INDEX `tenancies_member_idx` ON `tenancies` (`member_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `work_hours` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`date` text NOT NULL,
	`hours` real NOT NULL,
	`activity` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `work_hours_member_idx` ON `work_hours` (`member_id`);