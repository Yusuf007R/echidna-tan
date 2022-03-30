import { create } from 'apisauce';

const danBooruAPI = create({
  baseURL: 'https://danbooru.donmai.us/',
});

export default danBooruAPI;
