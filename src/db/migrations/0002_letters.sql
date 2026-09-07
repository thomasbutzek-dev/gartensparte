ALTER TABLE `letter_templates` ADD `name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `letter_templates` ADD `letter_group` text DEFAULT 'sonstiges' NOT NULL;--> statement-breakpoint
ALTER TABLE `letter_templates` ADD `effect` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `letter_templates` ADD `locked` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `letters` ADD `body` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `letters` ADD `status` text DEFAULT 'fertig' NOT NULL;
