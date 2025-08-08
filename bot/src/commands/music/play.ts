import { PLAY_MODE, PLAYER_TYPE } from "@Structures/music-player";
import { OptionsBuilder } from "@Utils/options-builder";
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
	.build();

export default class Play extends MusicCommand<typeof options> {
	constructor() {
		super({
			name: "play",
			description: "Play or search a song",
			options,
		});
	}

	async run() {
		const queue = await this.echidna.musicPlayer.getOrCreateQueue(
			PLAYER_TYPE.MUSIC,
		);

		await this.echidna.musicPlayer.playCmd({
			queue,
			query: this.options.query,
			playMode: this.options["download-play"]
				? PLAY_MODE.download
				: PLAY_MODE.stream,
		});
	}
}
