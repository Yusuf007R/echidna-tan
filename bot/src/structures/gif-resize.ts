import getImageAsBuffer from "@Utils/get-image-from-url";
import wait from "@Utils/wait";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ApiResponse } from "apisauce";
import type { EmbedType, Message } from "discord.js";
import ffmpegStatic from "ffmpeg-static";
import Ffmpeg from "fluent-ffmpeg";
import gifsicle from "gifsicle";
import sharp from "sharp";

if (ffmpegStatic === null) throw new Error("ffmpeg-static path not found");

Ffmpeg.setFfmpegPath(ffmpegStatic);

type gifType = "gif" | "mp4" | "webp";

type gifTypeContent = {
	url: string;
	type: gifType;
	aspectRatio: number;
};

type gifResizeOptions = {
	width: number;
	height?: number;
};

export default class GifResize {
	async getGifs(
		message: Message<boolean>,
		deepness = 0,
	): Promise<gifTypeContent[]> {
		if (deepness > 4) return [];
		const gifs: gifTypeContent[] = [];

		// Handle attachments
		for (const [_, attachment] of message.attachments) {
			if (["image/gif", "image/webp"].includes(attachment.contentType ?? "")) {
				gifs.push({
					url:
						attachment.contentType === "image/webp"
							? attachment.url
							: attachment.proxyURL,
					type: attachment.contentType?.split("/")[1] as gifType,
					aspectRatio: (attachment.height ?? 1) / (attachment.width ?? 1),
				});
			}
		}

		// Handle embeds
		for (const embed of message.embeds) {
			const type = embed.data.type?.toString() as EmbedType | undefined;
			if (!type) continue;

			const validTypes: `${EmbedType}`[] = ["gifv", "image"];
			if (!validTypes.includes(type)) continue;

			if (type === "image" && embed.data.thumbnail?.url) {
				const { url, height, width } = embed.data.thumbnail;
				gifs.push({
					url,
					type: "gif",
					aspectRatio: (height ?? 1) / (width ?? 1),
				});
			}

			if (type === "gifv" && embed.data.video?.proxy_url) {
				const { proxy_url, height, width } = embed.data.video;
				gifs.push({
					url: proxy_url,
					type: "mp4",
					aspectRatio: (height ?? 1) / (width ?? 1),
				});
			}
		}

		if (gifs.length === 0) {
			await wait(500);
			const newMsg = await message.fetch(true);
			return this.getGifs(newMsg, deepness + 1);
		}

		return gifs;
	}

	optimizeGif(inputPath: string, maxSizeMb = 10, compressionLevel = 30) {
		return new Promise<string>((resolve, reject) => {
			const outputPath = this.getTempPath();

			execFile(
				gifsicle,
				[
					"--optimize=3",
					`--lossy=${compressionLevel}`,
					inputPath,
					"-o",
					outputPath,
				],
				async (error) => {
					console.log("error", error);
					if (error) {
						reject(error);
					}
					const stats = await fs.stat(outputPath);
					const sizeInMb = stats.size / 1024 / 1024;
					if (sizeInMb > maxSizeMb) {
						return await this.optimizeGif(
							outputPath,
							maxSizeMb,
							compressionLevel + 5,
						);
					}
					resolve(outputPath);
				},
			);
		});
	}

	async webpToGif(buffer: Buffer) {
		const outputPath = this.getTempPath();
		const inputPath = this.getTempPath();
		await fs.writeFile(inputPath, buffer);
		await sharp(inputPath, { animated: true, pages: -1 })
			.gif({
				loop: 0,
			})
			.toFile(outputPath);
		fs.unlink(inputPath);
		return outputPath;
	}

	async getGifTempPath(gifBuffer: ApiResponse<Buffer, Buffer>) {
		let inputPath = "";
		if (gifBuffer.headers?.["content-type"] === "image/webp") {
			inputPath = await this.webpToGif(gifBuffer.data!);
		} else {
			inputPath = this.getTempPath();
			await fs.writeFile(inputPath, gifBuffer.data!);
		}
		return inputPath;
	}

	getTempPath() {
		const id = randomUUID();
		//create the folder if it doesn't exist
		mkdirSync(join(tmpdir(), "echidna-temps"), { recursive: true });
		return join(tmpdir(), "echidna-temps", `temp-${id}.gif`);
	}

	async resize(gif: gifTypeContent, options: gifResizeOptions) {
		const gifBuffer = await getImageAsBuffer(gif.url);
		if (!gifBuffer.data) throw new Error("Gif not found");

		const { width } = options;
		const height = options.height ?? Math.floor(width * gif.aspectRatio);

		try {
			// Create temporary files
			const outputPath = this.getTempPath();
			const inputPath = await this.getGifTempPath(gifBuffer);
			console.log("inputPath", inputPath);
			console.log("outputPath", outputPath);
			// Write input file

			// Process using ffmpeg
			await new Promise<void>((resolve, reject) => {
				Ffmpeg(inputPath)
					.complexFilter(
						`[0:v] scale=${width}:${height}:flags=lanczos,split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse`,
					)
					.inputFormat(gif.type === "webp" ? "gif" : gif.type)
					.outputFormat("gif")
					.output(outputPath)
					.on("end", () => resolve())
					.on("error", (err) => reject(err))
					.run();
			});

			// Read the output file
			const resultBuffer = await fs.readFile(outputPath);
			fs.unlink(outputPath);
			fs.unlink(inputPath);

			return resultBuffer;
		} catch (error) {
			console.error("Error while resizing gif:", error);
			throw new Error("Error while resizing gif");
		}
	}

	async optimize(gif: gifTypeContent) {
		const gifBuffer = await getImageAsBuffer(gif.url);
		if (!gifBuffer.data) throw new Error("Gif not found");

		const inputPath = await this.getGifTempPath(gifBuffer);

		const optimizedPath = await this.optimizeGif(inputPath);

		const optimizedBuffer = await fs.readFile(optimizedPath);

		try {
			fs.unlink(optimizedPath);
			fs.unlink(inputPath);
		} catch (_error) {}
		return optimizedBuffer;
	}
}
