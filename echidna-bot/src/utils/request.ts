import { create } from 'apisauce';

const danBooruAPI = create({
  baseURL: 'https://danbooru.donmai.us/',
});

const baseAPI = create({baseURL: ''});



export { baseAPI, danBooruAPI };

