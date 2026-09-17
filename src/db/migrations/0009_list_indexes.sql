CREATE INDEX IF NOT EXISTS `members_status_idx` ON `members` (`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `events_status_date_idx` ON `events` (`status`,`date`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `news_status_idx` ON `news` (`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `inquiries_is_read_idx` ON `inquiries` (`is_read`);
