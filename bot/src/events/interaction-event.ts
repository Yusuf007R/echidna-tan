import { DiscordEvent } from "@Structures/discord-events";
import type { CacheType, Interaction } from "discord.js";

export default class InteractionEvent extends DiscordEvent<"interactionCreate"> {
	constructor() {
		super({ eventName: "interactionCreate" });
	}

	async run(interaction: Interaction<CacheType>): Promise<void> {
		try {
			if (
				interaction.isChatInputCommand() ||
				interaction.isAutocomplete() ||
				interaction.isContextMenuCommand()
			) {
				await this.echidna.interactionManager.manageInteraction(interaction);
				return;
			}

			if (interaction.isButton()) {
				console.log(interaction);
				return;
			}

			if (interaction.isModalSubmit()) {
				this.echidna.modalManager.processModalResponse(interaction);
				return;
			}
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
