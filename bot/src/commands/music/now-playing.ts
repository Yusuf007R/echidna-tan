import { InteractionContext } from "@Structures/interaction-context";
import { MusicCommand } from "./[wrapper]";

export default class NowPlaying extends MusicCommand {
	constructor() {
		super({
			name: "now-playing",
			description: "Get current song information.",
		});
	}

	async run() {
		if (!this.player) {
			await InteractionContext.sendReply("Nothing currently playing");
			return;
		}
		await this.echidna.musicPlayer.nowPlaying(this.player);
		await InteractionContext.deleteReply();
	}
}
