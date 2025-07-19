import { PLAY_MODE, type QueueMetadata } from "@Structures/music-player";
import { OptionsBuilder } from "@Utils/options-builder";
import type { CacheType, CommandInteraction } from "discord.js";
import type { GuildQueue } from "discord-player";
import { MusicCommand } from "./[wrapper]";

const options = new OptionsBuilder()
	.addStringOption({
		name: "query",
		description: "ASMR content to search or URL to play",
		required: true,
	})
	.addIntOption({
		name: "timeout",
		description: "Auto-stop timeout in minutes (optional)",
		required: false,
		min_value: 1,
		max_value: 480, // 8 hours max
	})
	.addStringOption({
		name: "loop-mode",
		description: "Loop mode for ASMR playback",
		required: false,
		choices: ["Track", "Queue"],
	})
	.build();

export default class AsmrPlay extends MusicCommand<typeof options> {
	constructor() {
		super({
			name: "asmr-play",
			description:
				"Play ASMR content with download streaming, loop, and auto-timeout",
			options,
			cmdType: "GUILD",
			shouldDefer: true,
		});
	}

	async run(interaction: CommandInteraction<CacheType>): Promise<void> {
		const query = this.options.query;

		try {
			// Check for existing queue and handle appropriately
			const existingQueue = this.echidna.musicPlayer.nodes.get(
				interaction.guild!,
			) as GuildQueue<QueueMetadata>;
			if (existingQueue) {
				this.echidna.musicPlayer.clearTimeout(existingQueue);
				existingQueue.delete();
			}

			// Start playing with download enabled
			await this.echidna.musicPlayer.playCmd({
				queue: existingQueue,
				query,
				playMode: PLAY_MODE.download,
			});
		} catch (error) {
			console.error("[AsmrPlay] Failed to start ASMR playback:", error);
			await interaction.editReply({
				content: "Failed to start ASMR playback. Please try again.",
			});
		}
	}
}
