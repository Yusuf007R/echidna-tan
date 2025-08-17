import { InteractionContext } from "@Structures/interaction-context";
import {
	PLAY_MODE,
	PLAYER_TYPE,
	type QueueMetadata,
	TIMEOUT_OPTIONS,
} from "@Structures/music-player";
import capitalize from "@Utils/capitalize";
import { OptionsBuilder } from "@Utils/options-builder";
import { type GuildQueue, QueueRepeatMode } from "discord-player";
import type { CacheType, ChatInputCommandInteraction } from "discord.js";
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
		choices: Object.keys(QueueRepeatMode).map((opt) => capitalize(opt)),
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

	async run(
		interaction: ChatInputCommandInteraction<CacheType>,
	): Promise<void> {
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

			const queue = await this.echidna.musicPlayer.getOrCreateQueue(
				PLAYER_TYPE.ASMR_PLAY,
			);

			if (this.options["loop-mode"]) {
				const mode =
					QueueRepeatMode[
						this.options[
							"loop-mode"
						].toUpperCase() as keyof typeof QueueRepeatMode
					];
				queue.setRepeatMode(mode);
			}

			if (this.options.timeout) {
				this.echidna.musicPlayer.setupTimeout(
					queue,
					this.options.timeout,
					TIMEOUT_OPTIONS.FADE_OUT_AND_LEAVE,
				);
			}

			// Start playing with download enabled
			await this.echidna.musicPlayer.playCmd({
				queue,
				query,
				playMode: PLAY_MODE.download,
			});
		} catch (error) {
			console.error("[AsmrPlay] Failed to start ASMR playback:", error);
			await InteractionContext.sendReply(
				"Failed to start ASMR playback. Please try again.",
			);
		}
	}
}
