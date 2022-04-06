import {create} from 'apisauce';

export const playerRequest = create({
  // @ts-ignore
  baseURL: `${import.meta.env.VITE_API_URL}/player`,
  headers: {
    'Guild-Id': import.meta.env.VITE_GUILD_ID,
  },
});
