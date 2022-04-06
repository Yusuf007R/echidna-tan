import { echidnaClient } from '../..';
import { CustomException } from '../utils/exception';

import { middleware } from './dto';

const getGuildPlayer: middleware = function (req, res, next) {
  const guildId = req.headers['guild-id'];

  if (!guildId) throw new CustomException('Guild ID is required', 400);
  if (Array.isArray(guildId)) throw new CustomException('Guild ID should be a string', 400);

  const player = echidnaClient.musicManager.get(guildId);
  if (!player) throw new CustomException('Guild player not found', 404);
  req.guildPlayer = player;
  next();
};

export default getGuildPlayer;
