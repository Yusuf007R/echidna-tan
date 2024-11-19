import { DiscordEvent } from "@Structures/discord-events";
import type { CacheType, Interaction } from "discord.js";

export default class InteractionEvent extends DiscordEvent<"interactionCreate"> {
	constructor() {
		super({ eventName: "interactionCreate" });
	}

	async run(interaction: Interaction<CacheType>): Promise<void> {
		try {
			if (interaction.isChatInputCommand()) {
				await this.echidna.commandManager.executeCommand(interaction);
				return;
			}

			if (interaction.isAutocomplete()) {
				await this.echidna.commandManager.executeAutocomplete(interaction);
				return;
			}
		} catch (error: any) {
			if (interaction.isMessageComponent()) {
				interaction.message.reply({
					content: error?.message || "Internal error, try again later.",
				});

				return;
			}
			if (interaction.inGuild() && interaction.channel?.isTextBased())
				interaction.channel?.send(
					error?.message || "Internal error, try again later.",
				);
		}
	}
}
