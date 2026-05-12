CREATE TABLE `extractions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`source` text NOT NULL,
	`source_url` text,
	`source_text` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `overlay_rules` (
	`overlay_id` integer NOT NULL,
	`proposed_rule_id` integer NOT NULL,
	FOREIGN KEY (`overlay_id`) REFERENCES `overlays`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`proposed_rule_id`) REFERENCES `proposed_rules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `overlays` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`name` text NOT NULL,
	`version` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `proposed_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`extraction_id` integer NOT NULL,
	`user_id` text DEFAULT 'local' NOT NULL,
	`rule_json` text NOT NULL,
	`source_quote` text,
	`status` text DEFAULT 'proposed' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`extraction_id`) REFERENCES `extractions`(`id`) ON UPDATE no action ON DELETE cascade
);
