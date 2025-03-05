import { relations, sql } from "drizzle-orm";

import {
	customType,
	index,
	integer,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

export const echidnaStatus = ["online", "idle", "dnd", "invisible"] as const;

const float32Array = customType<{
	data: number[];
	config: { dimensions: number };
	configRequired: true;
	driverData: Buffer;
}>({
	dataType(config) {
		return `F32_BLOB(${config.dimensions})`;
	},
	fromDriver(value: Buffer) {
		return Array.from(new Float32Array(value.buffer));
	},
	toDriver(value: number[]) {
		return sql`vector32(${JSON.stringify(value)})`;
	},
});

const baseDates = {
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`)
		.$onUpdate(() => new Date()),
};

export const echidnaTable = sqliteTable("echidna", {
	id: integer("id").primaryKey(),
	status: text("status", { enum: echidnaStatus }).notNull().default("online"),
	activity: text("activity").notNull().default("N/A"),
	activityType: integer("activity_type").notNull().default(4),
	state: text("state").default("FEIN FEIN FEIN"),
	...baseDates,
});

export const userTable = sqliteTable("user", {
	id: text("id").primaryKey(),
	displayName: text("display_name").notNull(),
	userName: text("user_name").notNull(),
	isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
	...baseDates,
});

export const userRelations = relations(userTable, ({ many }) => ({
	sessions: many(sessionTable),
	memories: many(memoriesTable),
	chats: many(chatsTable),
	messages: many(messagesTable),
}));

export const sessionTable = sqliteTable("session", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => userTable.id),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

export const sessionsRelations = relations(sessionTable, ({ one }) => ({
	user: one(userTable, {
		fields: [sessionTable.userId],
		references: [userTable.id],
	}),
}));

export const memoriesTable = sqliteTable(
	"memories",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		userId: text("user_id")
			.notNull()
			.references(() => userTable.id),
		memory: text("memory").notNull(),
		prompt: text("prompt").notNull(),
		embeds: float32Array("embeds", { dimensions: 1536 }),
		memoryLength: integer("memory_length").notNull(),
		...baseDates,
	},
	(t) => ({
		promptIndex: index("prompt_index").on(t.prompt),
	}),
);

export const memoryRelations = relations(memoriesTable, ({ one }) => ({
	user: one(userTable, {
		fields: [memoriesTable.userId],
		references: [userTable.id],
	}),
}));

export const chatsTable = sqliteTable("chats", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	channelId: text("channel_id").notNull(),
	guildId: text("guild_id"),
	userId: text("user_id")
		.notNull()
		.references(() => userTable.id),
	modelId: text("model_id").notNull(),
	promptTemplate: text("prompt_template").notNull(),
	...baseDates,
});

export const chatRelations = relations(chatsTable, ({ one, many }) => ({
	user: one(userTable, {
		fields: [chatsTable.userId],
		references: [userTable.id],
	}),
	messages: many(messagesTable),
}));

export const messagesTable = sqliteTable("messages", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	content: text("content").notNull(),
	authorId: text("author_id").notNull(),
	chatId: integer("chat_id")
		.notNull()
		.references(() => chatsTable.id),
	messageId: text("message_id").notNull(),
	embeds: float32Array("embeds", { dimensions: 1536 }),
	...baseDates,
});

export const messageRelations = relations(messagesTable, ({ one }) => ({
	chat: one(chatsTable, {
		fields: [messagesTable.chatId],
		references: [chatsTable.id],
	}),
}));
