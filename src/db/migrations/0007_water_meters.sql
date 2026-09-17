ALTER TABLE `gardens` ADD `water_meter_number` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `meter_readings` ADD `kind` text DEFAULT 'strom' NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `meter_readings_kind_idx` ON `meter_readings` (`kind`);
