import {create} from 'apisauce';
import config from '../configs';

export const playerRequest = create({
  baseURL: `${config.url}/player`,
  headers: {
    'Guild-Id': config.guildId,
  },
});
