import { DiscordEvent } from "@Structures/discord-events";
import { InteractionContext } from "@Structures/interaction-context";
import type { CacheType, Interaction } from "discord.js";

export default class InteractionEvent extends DiscordEvent<"interactionCreate"> {
	constructor() {
		super({ eventName: "interactionCreate" });
	}

	async run(interaction: Interaction<CacheType>): Promise<void> {
		try {
			await InteractionContext.run(interaction, async () => {
				await this.echidna.interactionManager.manageInteraction(interaction);
			});
		} catch (error: any) {
			if (interaction.isMessageComponent()) {
				interaction.message.reply({
					content: error?.message || "Internal error, try again later.",
				});

				return;
			}
			if (interaction.channel && "send" in interaction.channel)
				interaction.channel?.send(
					error?.message || "Internal error, try again later.",
				);
		}
	}
}
