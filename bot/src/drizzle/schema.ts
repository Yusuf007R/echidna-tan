import { date, index, integer, pgTable, serial, text, vector } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  discordId: text('discord_id').primaryKey(),
  displayName: text('display_name').notNull(),
  userName: text('user_name').notNull(),
  createdAt: date('created_at').notNull().defaultNow(),
  updatedAt: date('updated_at').notNull().defaultNow()
});

export const memoriesTable = pgTable('memories', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.discordId),
  memory: text('memory').notNull(),
  embed: vector('embed', { dimensions: 1536 }).notNull(),
  memoryLength: integer('memory_length').notNull(),
  createdAt: date('created_at').notNull().defaultNow(),
  updatedAt: date('updated_at').notNull().defaultNow()
});

export const chatsTable = pgTable('chats', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  channelId: text('channel_id').notNull(),
  guildId: text('guild_id'),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.discordId),
  modelId: text('model_id').notNull(),
  promptTemplate: text('prompt_template').notNull(),
  createdAt: date('created_at').notNull().defaultNow(),
  updatedAt: date('updated_at').notNull().defaultNow()
});

export const messagesTable = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    content: text('content').notNull(),
    authorId: text('author_id').notNull(),
    channelId: text('channel_id').notNull(),
    chatId: integer('chat_id').references(() => chatsTable.id),
    messageId: text('message_id').notNull(),
    embeds: vector('embeds', { dimensions: 1536 }),
    createdAt: date('created_at').notNull().defaultNow(),
    updatedAt: date('updated_at').notNull().defaultNow()
  },
  (table) => ({
    embedIndex: index('embed_index').using('hnsw', table.embeds.op('vector_cosine_ops'))
  })
);
