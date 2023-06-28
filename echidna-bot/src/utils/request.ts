import { create } from 'apisauce';

const danBooruAPI = create({
  baseURL: 'https://danbooru.donmai.us/',
});

const valorantAPI = create({
  baseURL: 'https://api.henrikdev.xyz/valorant/',
});

export { danBooruAPI, valorantAPI };

