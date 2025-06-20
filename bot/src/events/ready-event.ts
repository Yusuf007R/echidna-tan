import { DiscordEvent } from "@Structures/discord-events";

export default class ReadyEvent extends DiscordEvent<"ready"> {
	constructor() {
		super({ eventName: "ready", eventType: "once" });
	}

	async run(): Promise<void> {
		await this.echidna.updateEchidna();

		setInterval(
			() => {
				this.echidna.updateEchidna();
			},
			1000 * 60 * 10,
		); // 10 minutes

		console.log(`Logged in as ${this.echidna.user?.tag}`);

		await this.echidna.interactionManager.init();
	}
}
