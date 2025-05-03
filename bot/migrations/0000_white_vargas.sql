CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` integer NOT NULL,
	`type` text NOT NULL,
	`url` text NOT NULL,
	`base64` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`channel_id` text NOT NULL,
	`guild_id` text,
	`user_id` text NOT NULL,
	`model_id` text NOT NULL,
	`prompt_template` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `echidna` (
	`id` integer PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'online' NOT NULL,
	`activity` text DEFAULT 'N/A' NOT NULL,
	`activity_type` integer DEFAULT 4 NOT NULL,
	`state` text DEFAULT 'FEIN FEIN FEIN',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`memory` text NOT NULL,
	`prompt_template` text NOT NULL,
	`memory_type` text NOT NULL,
	`embeds` F32_BLOB(1536),
	`importance` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX `memories_idx` ON `memories` (
	libsql_vector_idx(emb, 'metric=cosine')
);

--> statement-breakpoint
CREATE INDEX `prompt_template_index` ON `memories` (`prompt_template`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`role` text NOT NULL,
	`chat_id` integer NOT NULL,
	`embeds` F32_BLOB(1536),
	`cost` integer DEFAULT 0 NOT NULL,
	`token_usage` integer DEFAULT 0 NOT NULL,
	`was_memory_processed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX `messages_idx` ON `messages` (
	libsql_vector_idx(emb, 'metric=cosine')
);

--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`user_name` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
