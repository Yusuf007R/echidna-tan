import { index, integer, pgTable, serial, text, vector } from 'drizzle-orm/pg-core';

export const chats = pgTable('chats', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  guildId: text('guild_id').notNull(),
  channelId: text('channel_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const messages = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    content: text('content').notNull(),
    authorId: text('author_id').notNull(),
    channelId: text('channel_id').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    chatId: integer('chat_id').references(() => chats.id),
    messageId: text('message_id').notNull(),
    embeds: vector('embeds', { dimensions: 1536 })
  },
  (table) => ({
    embedIndex: index('embed_index').using('hnsw', table.embeds.op('vector_cosine_ops'))
  })
);
