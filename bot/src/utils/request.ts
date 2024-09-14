import config from '@Configs';
import { create } from 'apisauce';

const danBooruAPI = create({
  baseURL: config.DANBOORU_ENDPOINT
});

const waifuGeneratorAPI = create({
  baseURL: config.WAIFU_GENERATOR_ENDPOINT,
  headers: {
    Authorization: `Bearer ${config.RUNPOD_TOKEN}`
  }
});

const baseAPI = create({ baseURL: '' });

waifuGeneratorAPI.axiosInstance.interceptors.request.use((config) => {
  const url = config.url?.toString();
  const method = config.method?.toString();
  config.url = '';
  config.method = 'post';
  config.data = {
    input: {
      method,
      endpoint: url,
      data: config.data,
      timeout: 60
    }
  };

  return config;
});

export { baseAPI, danBooruAPI, waifuGeneratorAPI };
