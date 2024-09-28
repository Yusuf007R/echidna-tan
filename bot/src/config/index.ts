import 'dotenv/config';

const requiredEnvVars = [
  'DISCORD_TOKEN',
  'DISCORD_GUILD_ID',
  'DISCORD_OP_USER_ID',
  'DISCORD_BOT_CLIENT_ID',
  'RUNPOD_TOKEN',
  'WAIFU_GENERATOR_ENDPOINT',
  'DANBOORU_ENDPOINT',
  'JWT_SECRET_ACCESS',
  'JWT_SECRET_REFRESH',
  'OPENROUTER_API_KEY',
  'OPENROUTER_URL',
  'DATABASE_URL',
  'OPENAI_API_KEY'
] as const;

type EnvVarKey = (typeof requiredEnvVars)[number];

const config = requiredEnvVars.reduce(
  (acc, envVar) => {
    const value = process.env[envVar];
    if (!value) throw new Error(`No ${envVar} found`);
    acc[envVar] = value;
    return acc;
  },
  {} as Record<EnvVarKey, string>
);

export default config;
