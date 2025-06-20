import config from "@Configs";
import type { CivitaiResponse } from "@Interfaces/civitai";
import type { RunpodRes, Txt2img } from "@Interfaces/waifu-generator";
import { waifuGeneratorAPI } from "@Utils/request";
import milisecondsToReadable from "@Utils/seconds-to-minutes";
import { EmbedBuilder } from "@discordjs/builders";
import Civitai from "civitai";
import { AttachmentBuilder, type Message } from "discord.js";

export type getImageProps = {
	prompt: string;
};

export default class WaifuGenerator {
	private get defaultConfigs() {
		return {
			alwayson_scripts: {},
			batch_size: 1,
			cfg_scale: 7,
			denoising_strength: 0.3,
			do_not_save_grid: false,
			do_not_save_samples: false,
			enable_hr: false,
			eta: null,
			hr_upscaler: "R-ESRGAN 4x+ Anime6B",
			firstphase_height: 0,
			firstphase_width: 0,
			width: 512,
			height: 1024,
			hr_resize_x: 0,
			hr_resize_y: 0,
			hr_scale: 2,
			hr_second_pass_steps: 10,
			n_iter: 1,
			negative_prompt:
				"(worst quality, low quality:1.4), (zombie, sketch, interlocked fingers, comic)",
			override_settings: null,
			override_settings_restore_afterwards: true,
			prompt: "",
			restore_faces: false,
			s_churn: 0,
			s_min_uncond: 0,
			s_noise: 1,
			s_tmax: null,
			s_tmin: 0,
			sampler_index: "DPM++ SDE Karras",
			sampler_name: null,
			save_images: false,
			script_args: [],
			script_name: null,
			seed: -1,
			seed_resize_from_h: -1,
			seed_resize_from_w: -1,
			send_images: true,
			steps: 28,
			styles: null,
			subseed: -1,
			subseed_strength: 0,
			tiling: false,
		};
	}

	getConfigs(configs: Partial<typeof this.defaultConfigs>) {
		return { ...this.defaultConfigs, ...configs };
	}

	makeEmbed(res: RunpodRes<Txt2img>) {
		const image = res.output.images[0];
		const attachment = new AttachmentBuilder(Buffer.from(image, "base64"), {
			name: "image.png",
		});
		const info = JSON.parse(res.output.info);
		const fieldsToDisplay = {
			prompt: "Prompt",
			sampler_name: "Sampler",
			steps: "Steps",
			negative_prompt: "Negative Prompt",
			seed: "Seed",
		} as const;
		const embed = new EmbedBuilder()
			.setTitle("Waifu Generator")
			.setImage("attachment://image.png")
			.setFooter({
				text: this.getFooter(res.executionTime),
			})
			.addFields(
				Object.entries(fieldsToDisplay).map(([field, name]) => ({
					name,
					value: info[field].toString(),
				})),
			);

		return { embed, attachment, info };
	}

	async upscaleImage(message: Message<boolean>, info: any) {
		const configs = this.getConfigs(info);
		const reply = await message.reply("Upscaling image...");
		configs.enable_hr = true;
		const res = await this.getImage(configs);
		const {
			data: { type, ...embedData },
		} = message.embeds[0];
		const newEmbed = new EmbedBuilder({
			...embedData,
		})
			.setImage("attachment://image.png")
			.setFooter({
				text: this.getFooter(res.executionTime),
			});
		const newAttachment = new AttachmentBuilder(
			Buffer.from(res.output.images[0], "base64"),
			{
				name: "image.png",
			},
		);

		await message.edit({ embeds: [newEmbed], files: [newAttachment] });
		await reply.delete();
	}

	getFooter(ms: number) {
		return `Execution time: ${milisecondsToReadable(ms)} | Cost: ${((ms / 1000) * 0.0002).toFixed(4)}$`;
	}

	async getImage(configs: Partial<typeof this.defaultConfigs>) {
		const response = await waifuGeneratorAPI.post<RunpodRes<Txt2img>>(
			"sdapi/v1/txt2img",
			configs,
		);
		if (!response.ok || !response?.data?.output?.images)
			throw new Error("Internal error, try again later.");
		return response.data;
	}

	static async getCivitaiImage(prompt: string) {
		const civitai = new Civitai.Civitai({
			auth: config.CIVITAI_API_KEY,
		});

		const response = (await civitai.image.fromText(
			{
				model: "urn:air:sdxl:checkpoint:civitai:827184@1410435",
				additionalNetworks: {
					"urn:air:sdxl:lora:civitai:1147432@1383359": {
						strength: 1,
					},
				},
				params: {
					prompt: `echidna, 1girl, pale skin, long hair, white hair, butterfly hair ornament, hair between eyes, bangs, white eyelashes, medium breasts, black cape, dress, vertical stripes, vertical-striped dress, striped dress, striped, sitting, from above, looking at viewer, smiling, ((selfie)) ${prompt}`,
					negativePrompt:
						"(deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime, mutated hands and fingers:1.4), (deformed, distorted, disfigured:1.3)",
					scheduler: Civitai.Scheduler.EULER_A,
					steps: 30,
					cfgScale: 6.5,
					width: 812,
					height: 1216,
				},
			},
			true,
		)) as CivitaiResponse;

		return response?.jobs.at(0)?.result?.jobs.at(0)?.result?.blobUrl ?? null;
	}
}
