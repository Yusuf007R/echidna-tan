const url = import.meta.env.VITE_API_URL;

if (!url || typeof url !== 'string')
  throw new Error('VITE_API_URL is not defined');

const guildId = import.meta.env.VITE_GUILD_ID;

if (!guildId || typeof guildId !== 'string')
  throw new Error('VITE_GUILD_ID is not defined');

const config = {
  url,
  guildId,
};

export default config;
