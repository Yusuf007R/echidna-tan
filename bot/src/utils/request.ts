import config from "@Configs";
import { create } from "apisauce";
import OpenAI from "openai";

const danBooruAPI = create({
	baseURL: config.DANBOORU_ENDPOINT,
});

const waifuGeneratorAPI = create({
	baseURL: config.WAIFU_GENERATOR_ENDPOINT,
	headers: {
		Authorization: `Bearer ${config.RUNPOD_TOKEN}`,
	},
});

const baseAPI = create({ baseURL: "" });

const openRouterAPI = new OpenAI({
	baseURL: config.OPENROUTER_URL,
	apiKey: config.OPENROUTER_API_KEY,
});

const openAI = new OpenAI({
	apiKey: config.OPENAI_API_KEY,
});

waifuGeneratorAPI.axiosInstance.interceptors.request.use((config) => {
	const url = config.url?.toString();
	const method = config.method?.toString();
	config.url = "";
	config.method = "post";
	config.data = {
		input: {
			method,
			endpoint: url,
			data: config.data,
			timeout: 60,
		},
	};

	return config;
});

export { baseAPI, danBooruAPI, openAI, openRouterAPI, waifuGeneratorAPI };
