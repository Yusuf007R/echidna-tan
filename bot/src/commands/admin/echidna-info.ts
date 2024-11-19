// make a command that sends a message to a specific user

import config from "@Configs";
import IsAdmin from "@EventsValidators/isAdmin";
import { Command } from "@Structures/command";
import getImageAsBuffer from "@Utils/get-image-from-url";
import { OptionsBuilder } from "@Utils/options-builder";
import { baseAPI } from "@Utils/request";
import { EmbedBuilder, type RGBTuple } from "@discordjs/builders";
import {
	ActivityType,
	type CacheType,
	type CommandInteraction,
} from "discord.js";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import db from "src/drizzle";
import { echidnaTable } from "src/drizzle/schema";

const options = new OptionsBuilder().build();

export default class EchidnaInfoCommand extends Command<typeof options> {
	constructor() {
		super({
			name: "echidna-info",
			description: "Get information about the echidna",
			options,
			validators: [IsAdmin],
			cmdType: "BOTH",
		});
	}

	async run(interaction: CommandInteraction<CacheType>) {
		try {
			await interaction.deferReply();
			const echidna = await db.query.echidnaTable.findFirst({
				where: eq(echidnaTable.id, config.DISCORD_DB_PROFILE),
			});
			if (!echidna) {
				interaction.editReply("Echidna not found");
				return;
			}

			const image = this.echidna.user?.displayAvatarURL();

			let color = [0, 0, 0];
			if (image) {
				const imageBuffer = await getImageAsBuffer(image);
				if (imageBuffer) {
					const stats = await sharp(imageBuffer.data).stats();
					color = Object.values(stats.dominant);
				}
			}

			const ip = await baseAPI.get("https://icanhazip.com/");

			console.log(ip.data);

			const embed = new EmbedBuilder()
				.setTitle(`${this.echidna.user?.username}'s Information`)
				.setThumbnail(image ?? null)
				.setColor(color as RGBTuple)
				.setFooter({
					text: `Echidna ID: ${config.DISCORD_DB_PROFILE} - Commit Hash: ${config.SOURCE_COMMIT}`,
				})
				.addFields([
					{
						name: "Name",
						value: this.echidna.user?.username ?? "Unknown",
					},
					{
						name: "Status",
						value: echidna.status,
					},
					{
						name: "Activity Type",
						value: ActivityType[echidna.activityType],
					},
					{
						name: "Activity",
						value: echidna.activity || "No activity set",
					},
					{
						name: "Status Message",
						value: echidna.state || "No status message set",
					},
					{
						name: "Total Commands",
						value: this.echidna.commandManager.commands.size.toString(),
					},
					{
						name: "Total Events",
						value: this.echidna.eventManager.events.size.toString(),
					},
					{
						name: "IP",
						value: (ip.data as string) ?? "Unknown",
					},
				]);

			interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error("[echidna-info] Failed to get echidna info", error);
			interaction.editReply("Failed to get echidna info");
		}
	}
}
