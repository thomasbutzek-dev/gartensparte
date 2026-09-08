ALTER TABLE `gardens` ADD `attributes` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
UPDATE `gardens`
SET
	`attributes` = '["verwahrlost"]',
	`status` = CASE
		WHEN EXISTS (
			SELECT 1 FROM `tenancies`
			WHERE `tenancies`.`garden_id` = `gardens`.`id` AND `tenancies`.`end_date` IS NULL
		) THEN 'verpachtet'
		ELSE 'frei'
	END
WHERE `status` = 'verwahrlost';
