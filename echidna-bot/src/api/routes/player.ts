import {RequestHandler, Router} from 'express';

import {LoopState} from '../../../../common/DTOs/music-player-socket';
import errorHandler from '../middlewares/error-handler';
import getGuildPlayer from '../middlewares/guild-player';
import {CustomException} from '../utils/exception';

const player = Router();

player.use(getGuildPlayer);

const wrapper = (cb: RequestHandler<{test:number}, number, any>) => {
  return cb;
};

// player.post(
//   '/test',
//   wrapper((req, res) => {

//     const test = req.body.
//   }),
// );

player.post('/pause', (req, res) => {
  const {guildPlayer} = req;
  guildPlayer.audioPlayer?.pause();

  res.sendStatus(200);
});

player.post('/resume', (req, res) => {
  const {guildPlayer} = req;

  guildPlayer.audioPlayer?.unpause();

  res.sendStatus(200);
});

player.post('/volume/:volume', (req, res) => {
  const {guildPlayer} = req;

  const volume = Number(req.params.volume);
  if (volume > 100 || volume < 0)
    throw new CustomException('Volume must be between 0 and 100', 400);

  guildPlayer._setVolume(volume);

  res.sendStatus(200);
});

player.post('/seek/:time', (req, res) => {
  const {guildPlayer} = req;

  const time = Number(req.params.time);
  if (time < 0) throw new CustomException('Time must be greater than 0', 400);

  guildPlayer._seek(time);

  res.sendStatus(200);
});

player.post('/loop/:loopMode', (req, res) => {
  const {guildPlayer} = req;

  const loopMode = req.params.loopMode as LoopState;
  if (!LoopState[loopMode])
    throw new CustomException('Loop mode must be none, all or single', 400);
  guildPlayer._setLoop(loopMode);
  res.sendStatus(200);
});

player.get('/data', async (req, res) => {
  const {guildPlayer} = req;
  const data = await guildPlayer.getDataToSocket();
  res.status(200).json(data);
});

export default player;
