import { PLAY_MODE, TIMEOUT_OPTIONS } from "@Structures/music-player";
import capitalize from "@Utils/capitalize";
import { OptionsBuilder } from "@Utils/options-builder";
import type { CacheType, CommandInteraction } from "discord.js";
import { QueueRepeatMode } from "discord-player";
import { MusicCommand } from "./[wrapper]";

const options = new OptionsBuilder()
	.addStringOption({
		name: "query",
		description: "query to search or url to play",
		required: true,
	})
	.addBoolOption({
		name: "download-play",
		description: "Download the song before playing",
		required: false,
	})
	.addIntOption({
		name: "timeout-minutes",
		description: "Timeout after X minutes",
		required: false,
	})
	.addStringOption({
		name: "timeout-option",
		description: "Type of the play",
		required: false,
		choices: Object.values(TIMEOUT_OPTIONS),
	})
	.addStringOption({
		name: "loop-mode",
		description: "Loop mode for the player",
		required: false,
		choices: Object.keys(QueueRepeatMode).map((opt) => capitalize(opt)),
	})
	.build();

export default class Play extends MusicCommand<typeof options> {
	constructor() {
		super({
			name: "play",
			description: "Play or search a song",
			options,
		});
	}

	async run(interaction: CommandInteraction<CacheType>) {
		const modeOpt = this.options["loop-mode"];
		const mode = modeOpt
			? QueueRepeatMode[modeOpt.toUpperCase() as keyof typeof QueueRepeatMode]
			: QueueRepeatMode.OFF;

		await this.echidna.musicPlayer.playCmd({
			interaction,
			query: this.options.query,
			playMode: this.options["download-play"]
				? PLAY_MODE.download
				: PLAY_MODE.stream,
			timeoutOption: this.options["timeout-option"] as TIMEOUT_OPTIONS,
			timeoutMinutes: this.options["timeout-minutes"],
			loopMode: mode,
		});
	}
}
