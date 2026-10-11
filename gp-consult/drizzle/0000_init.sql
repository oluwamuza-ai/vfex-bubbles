CREATE TABLE `card_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`proposed_body` text NOT NULL,
	`proposed_guideline_date` text NOT NULL,
	`summary` text NOT NULL,
	`has_changes` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `condition_cards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `case_files` (
	`id` text PRIMARY KEY NOT NULL,
	`condition_id` text NOT NULL,
	`tier` integer NOT NULL,
	`data` text NOT NULL,
	`model` text NOT NULL,
	`created_at` integer NOT NULL,
	`used_at` integer,
	FOREIGN KEY (`condition_id`) REFERENCES `condition_cards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clinic_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`consultation_ids` text NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `condition_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`specialty` text NOT NULL,
	`tags` text NOT NULL,
	`body` text NOT NULL,
	`guideline_date` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `consultations` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`condition_id` text NOT NULL,
	`specialty` text NOT NULL,
	`tier` integer NOT NULL,
	`clinic_session_id` text,
	`status` text NOT NULL,
	`timed` integer DEFAULT false NOT NULL,
	`transcript` text NOT NULL,
	`exams` text NOT NULL,
	`investigations` text NOT NULL,
	`plan` text,
	`grade` text,
	`overall_score` integer,
	`rating_before` real,
	`rating_after` real,
	`xp_awarded` integer,
	`started_at` integer NOT NULL,
	`submitted_at` integer,
	`graded_at` integer,
	FOREIGN KEY (`case_id`) REFERENCES `case_files`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mastery` (
	`condition_id` text PRIMARY KEY NOT NULL,
	`rating` real NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`reps` integer DEFAULT 0 NOT NULL,
	`ease` real DEFAULT 2.5 NOT NULL,
	`interval_days` real DEFAULT 0 NOT NULL,
	`due_at` integer NOT NULL,
	`last_score` integer,
	`last_seen_at` integer
);
--> statement-breakpoint
CREATE TABLE `rapid_fire_items` (
	`id` text PRIMARY KEY NOT NULL,
	`condition_id` text,
	`vignette` text NOT NULL,
	`answer` text NOT NULL,
	`rationale` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rapid_fire_rounds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`correct` integer NOT NULL,
	`answered` integer NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `specialty_mastery` (
	`specialty` text PRIMARY KEY NOT NULL,
	`rating` real NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `xp_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`day` text NOT NULL,
	`at` integer NOT NULL
);
