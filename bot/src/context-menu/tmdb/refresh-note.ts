import ContextMenu from "@Structures/context-menu";
import TMDB from "@Structures/tmdb";
import type { MessageContextMenuCommandInteraction } from "discord.js";

class RefreshNoteContextMenu extends ContextMenu<"MESSAGE"> {
	tmdb = new TMDB();
	constructor() {
		super({
			name: "Refresh Note",
			description: "Refresh note from a movie/show",
			type: "MESSAGE",
		});
	}

	async run(interaction: MessageContextMenuCommandInteraction) {
		const message = this.target;
		if (message.interaction?.commandName !== "tmdb-query") {
			await interaction.reply({
				content: "This command can only be used in the TMDB query command",
				ephemeral: true,
			});
			return;
		}

		const embedData = message.embeds[0].data;

		const embed = await this.tmdb.refreshEmbed(embedData);
		if (!embed) {
			await interaction.reply({ ephemeral: true, content: "No note found" });
			return;
		}

		await message.edit({ embeds: [embed] });

		await interaction.reply({ ephemeral: true, content: "Note refreshed" });
	}
}

export default RefreshNoteContextMenu;
