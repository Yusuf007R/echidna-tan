import 'dotenv/config';
const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error('No token found');

const guildId = process.env.DISCORD_GUILD_ID;
if (!guildId) throw new Error('No guild id found');

const clientId = process.env.DISCORD_BOT_CLIENT_ID;
if (!clientId) throw new Error('No client id found');

const lavaLinkPassword = process.env.LAVA_LINK_PASSWORD;
if (!lavaLinkPassword) throw new Error('No lava link password found');

const lavaLinkHost = process.env.LAVA_LINK_HOST;
if (!lavaLinkHost) throw new Error('No lava link host found');

const runpodToken = process.env.RUNPOD_TOKEN;
if (!runpodToken) throw new Error('No runpod token found');

const waifuGeneratorEndpoint = process.env.WAIFU_GENERATOR_ENDPOINT;
if (!waifuGeneratorEndpoint) throw new Error('No runpod endpoint found');

const danbooruEndpoint = process.env.DANBOORU_ENDPOINT;
if (!danbooruEndpoint) throw new Error('No danbooru endpoint found');

const jwtSecretAccess = process.env.JWT_SECRET_ACCESS;
if (!jwtSecretAccess) throw new Error('No jwt secret found');

const jwtSecretRefresh = process.env.JWT_SECRET_REFRESH;
if (!jwtSecretRefresh) throw new Error('No jwt secret found');

const config = {
  token,
  guildId,
  clientId,
  lavaLinkPassword,
  lavaLinkHost,
  runpodToken,
  waifuGeneratorEndpoint,
  danbooruEndpoint,
  jwtSecretAccess,
  jwtSecretRefresh
};
export default config;
