import { readFileSync } from "node:fs";
import path from "node:path";
import { baseAPI } from "@Utils/request";
import { EmbedBuilder } from "@discordjs/builders";
import {
	AttachmentBuilder,
	type CacheType,
	type CommandInteraction,
} from "discord.js";
import sharp from "sharp";

export default class ValCrosshair {
	async getCrosshairImage(crosshairId: string) {
		return await baseAPI.get<Buffer>(
			"https://api.henrikdev.xyz/valorant/v1/crosshair/generate",
			{ id: crosshairId },
			{
				responseType: "arraybuffer",
			},
		);
	}

	async addBackgroundToCrosshair(crosshair: Buffer) {
		const crosshairBg = readFileSync(
			path.resolve(__dirname, "../../assets/crosshair-bg.webp"),
		);
		return await sharp(crosshairBg)
			.composite([
				{ input: await sharp(crosshair).resize(256, 256).toBuffer() },
			])
			.toBuffer();
	}

	async getCrosshair(
		interaction: CommandInteraction<CacheType>,
		crosshairId: string,
	) {
		const crosshair = await this.getCrosshairImage(crosshairId);
		if (!crosshair?.data) throw new Error("Internal error, try again later.");
		const crosshairWithBg = await this.addBackgroundToCrosshair(crosshair.data);
		const file = new AttachmentBuilder(crosshairWithBg, {
			name: "crosshair.png",
		});

		const embed = new EmbedBuilder()
			.setTitle("Crosshair")
			.setDescription(`Crosshair ID: ${crosshairId}`)
			.setImage("attachment://crosshair.png")
			.setTimestamp()
			.setFooter({
				text: `Requested by ${interaction.user.username}`,
				iconURL: interaction.user.displayAvatarURL(),
			});
		interaction.editReply({ embeds: [embed], files: [file] });
	}
}
