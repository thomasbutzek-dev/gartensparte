CREATE TABLE `work_exemptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`year` integer NOT NULL,
	`reason` text NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_exemptions_member_year` ON `work_exemptions` (`member_id`,`year`);
