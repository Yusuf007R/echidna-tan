import { OptionsBuilder } from "@Utils/options-builder";
import type { CacheType, CommandInteraction } from "discord.js";
import { QueueRepeatMode } from "discord-player";
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
		const timeoutMinutes = this.options.timeout;
		const loopMode = this.options["loop-mode"] ?? "Track";

		try {
			// Check for existing queue and handle appropriately
			const existingQueue = this.echidna.musicPlayer.nodes.get(
				interaction.guild!,
			);
			if (existingQueue) {
				await this.handleExistingQueue(existingQueue, interaction);
			}

			// Start playing with download enabled
			await this.echidna.musicPlayer.playCmd(
				interaction,
				query,
				true, // downloadPlay = true for streaming logic
			);

			// Wait a bit for the queue to be created
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Set up the new ASMR queue
			const queue = this.echidna.musicPlayer.nodes.get<any>(interaction.guild!);
			if (queue) {
				// Mark this queue as ASMR type with metadata
				queue.metadata.queueType = "ASMR";
				queue.metadata.startedAt = new Date();
				queue.metadata.startedBy = interaction.user.id;

				const repeatMode =
					QueueRepeatMode[
						loopMode.toUpperCase() as keyof typeof QueueRepeatMode
					];
				queue.setRepeatMode(repeatMode);

				// Set up timeout if specified
				if (timeoutMinutes) {
					this.setupTimeout(interaction, timeoutMinutes, queue);
				}

				const timeoutText = timeoutMinutes
					? ` Auto-stop in ${timeoutMinutes} minutes.`
					: "";
				await interaction.editReply({
					content: `😴 ASMR session started with ${loopMode.toLowerCase()} loop mode.${timeoutText}`,
				});
			}
		} catch (error) {
			console.error("[AsmrPlay] Failed to start ASMR playback:", error);
			await interaction.editReply({
				content: "Failed to start ASMR playback. Please try again.",
			});
		}
	}

	private async handleExistingQueue(
		existingQueue: any,
		interaction: CommandInteraction<CacheType>,
	) {
		const queueType = existingQueue.metadata?.queueType;
		const isAsmrQueue = queueType === "ASMR";

		if (isAsmrQueue) {
			// Clear existing ASMR timeout if present
			if (existingQueue.metadata.asmrTimeout) {
				clearTimeout(existingQueue.metadata.asmrTimeout);
			}

			await interaction.followUp({
				content: "🔄 Replacing current ASMR session with new selection...",
				ephemeral: true,
			});
		} else {
			// It's a music queue or unknown type
			await interaction.followUp({
				content: "🎵➡️😴 Stopping music and starting ASMR session for sleep...",
				ephemeral: true,
			});
		}

		// Stop the existing queue gracefully
		existingQueue.delete();
	}

	private setupTimeout(
		interaction: CommandInteraction<CacheType>,
		minutes: number,
		queue: any,
	) {
		// Clear any existing timeout stored in queue metadata
		if (queue.metadata.asmrTimeout) {
			clearTimeout(queue.metadata.asmrTimeout);
		}

		// Set new timeout and store it in queue metadata
		const timeoutId = setTimeout(
			async () => {
				try {
					// Gradually fade out volume over 10 seconds for gentle wake-up prevention
					await this.fadeOutAndStop(queue, interaction, minutes);
				} catch (error) {
					console.error("[AsmrPlay] Timeout error:", error);
				}
			},
			minutes * 60 * 1000,
		); // Convert minutes to milliseconds

		// Store timeout in queue metadata (automatically cleaned up when queue is destroyed)
		queue.metadata.asmrTimeout = timeoutId;
	}

	private async fadeOutAndStop(
		queue: any,
		interaction: CommandInteraction<CacheType>,
		minutes: number,
	) {
		const originalVolume = queue.node.volume;
		const fadeSteps = 10;
		const fadeInterval = 2000; // 1 second per step = 10 second fade

		// Gentle fade out to prevent jarring wake-up
		for (let i = fadeSteps; i > 0; i--) {
			if (queue.deleted) return; // Exit if queue was manually stopped

			const newVolume = Math.floor((originalVolume * i) / fadeSteps);
			queue.node.setVolume(Math.max(newVolume, 1)); // Never go to 0 to avoid audio issues
			await new Promise((resolve) => setTimeout(resolve, fadeInterval));
		}

		// Stop the music player after fade
		if (!queue.deleted) {
			queue.delete();
		}

		// Send gentle notification
		if (interaction.channel?.isTextBased() && "send" in interaction.channel) {
			await interaction.channel.send({
				content: `😴 Sweet dreams! ASMR gently ended after ${minutes} minutes.`,
			});
		}
	}
}
