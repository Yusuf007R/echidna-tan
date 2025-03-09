import { relations, sql } from "drizzle-orm";

import {
	customType,
	index,
	integer,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

export const echidnaStatus = ["online", "idle", "dnd", "invisible"] as const;

export const messageType = ["user", "assistant", "system"] as const;

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
		promptTemplate: text("prompt_template").notNull(),
		memoryType: text("memory_type", {
			enum: ["user", "assistant"] as const,
		}).notNull(),
		messageId: integer("message_id")
			.notNull()
			.references(() => messagesTable.id),
		embeds: float32Array("embeds", { dimensions: 1536 }),
		importance: integer("importance", { mode: "number" }).notNull().default(0),
		...baseDates,
	},
	(t) => ({
		promptTemplateIndex: index("prompt_template_index").on(t.promptTemplate),
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
	role: text("role", { enum: messageType }).notNull(),
	chatId: integer("chat_id")
		.notNull()
		.references(() => chatsTable.id),
	embeds: float32Array("embeds", { dimensions: 1536 }),
	cost: integer("cost").notNull().default(0),
	tokenUsage: integer("token_usage").notNull().default(0),
	...baseDates,
});

export const messageRelations = relations(messagesTable, ({ one }) => ({
	chat: one(chatsTable, {
		fields: [messagesTable.chatId],
		references: [chatsTable.id],
	}),
}));
