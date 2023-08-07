import { create } from 'apisauce';

const danBooruAPI = create({
  baseURL: 'https://danbooru.donmai.us/',
});

const waifuGeneratorAPI = create({
  baseURL: 'https://api.runpod.ai/v2/tg9unsqf6rbd3r/runsync',
  headers:{
    Authorization:`Bearer ${process.env.RUNPOD_TOKEN}`
  }
});

const baseAPI = create({baseURL: ''});

waifuGeneratorAPI.axiosInstance.interceptors.request.use(config => {
  const url = config.url?.toString();
  const method = config.method?.toString();
  config.url = '';
  config.method = 'post';
  config.data = {
    input: {
      method: method,
      endpoint: url,
      data: config.data,
    },
  };

  return config;
});

export { baseAPI, danBooruAPI, waifuGeneratorAPI };

