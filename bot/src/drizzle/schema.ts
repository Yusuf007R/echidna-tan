import { sql } from 'drizzle-orm';

import { customType, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const echidnaStatus = ['online', 'idle', 'dnd', 'invisible'] as const;


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
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date())
};

export const echidnaTable = sqliteTable('echidna', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  status: text('status', { enum: echidnaStatus }).notNull().default('online'),
  activity: text('activity').notNull().default('N/A'),
  activityType: integer('activity_type').notNull().default(4),
  state: text('state'),
  ...baseDates
});

export const usersTable = sqliteTable('users', {
  discordId: text('discord_id').primaryKey(),
  displayName: text('display_name').notNull(),
  userName: text('user_name').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  ...baseDates
});

export const memoriesTable = sqliteTable('memories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.discordId),
  memory: text('memory').notNull(),
  embeds: float32Array("embeds", { dimensions: 1536 }), 
  memoryLength: integer('memory_length').notNull(),
  ...baseDates
});

export const chatsTable = sqliteTable('chats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  channelId: text('channel_id').notNull(),
  guildId: text('guild_id'),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.discordId),
  modelId: text('model_id').notNull(),
  promptTemplate: text('prompt_template').notNull(),
  ...baseDates
});

export const messagesTable = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  authorId: text('author_id').notNull(),
  channelId: text('channel_id').notNull(),
  chatId: integer('chat_id').references(() => chatsTable.id),
  messageId: text('message_id').notNull(),
  embeds: float32Array("embeds", { dimensions: 1536 }), 
  ...baseDates
});
