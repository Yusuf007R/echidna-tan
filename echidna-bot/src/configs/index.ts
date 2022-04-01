const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error('No token found');

const guildId = process.env.DISCORD_GUILD_ID;
if (!guildId) throw new Error('No guild id found');

const clientId = process.env.DISCORD_BOT_CLIENT_ID;
if (!clientId) throw new Error('No client id found');

export default { token, guildId, clientId };
