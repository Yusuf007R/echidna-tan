import 'dotenv/config';
import z from 'zod';

const envSchema = z.object({
  DISCORD_TOKEN: z.string(),
  DISCORD_GUILD_ID: z.string(),
  DISCORD_OP_USER_ID: z.string(),
  DISCORD_DB_PROFILE: z.string().transform((val) => parseInt(val)),
  DISCORD_BOT_CLIENT_ID: z.string(),
  RUNPOD_TOKEN: z.string(),
  WAIFU_GENERATOR_ENDPOINT: z.string(),
  DANBOORU_ENDPOINT: z.string(),
  OPENROUTER_API_KEY: z.string(),
  OPENROUTER_URL: z.string(),
  OPENAI_API_KEY: z.string(),
  TURSO_DATABASE_URL: z.string(),
  TURSO_AUTH_TOKEN: z.string(),
  SOURCE_COMMIT: z.string().optional()
})

export default envSchema.parse(process.env);
