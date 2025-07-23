import ContextMenu from "@Structures/context-menu";
import TMDB from "@Structures/tmdb";
import {
	ActionRowBuilder,
	ModalBuilder,
	TextInputBuilder,
} from "@discordjs/builders";
import {
	type MessageContextMenuCommandInteraction,
	MessageFlags,
	TextInputStyle,
} from "discord.js";

class EditNoteContextMenu extends ContextMenu<"MESSAGE"> {
	tmdb = new TMDB();
	constructor() {
		super({
			name: "Edit Note",
			description: "Edit or add note to a movie/show",
			type: "MESSAGE",
		});
	}

	async run(interaction: MessageContextMenuCommandInteraction) {
		const message = this.target;
		if (message.interaction?.commandName !== "tmdb-query") {
			await interaction.reply({
				content: "This command can only be used in the TMDB query command",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const embedData = message.embeds[0].data;
		if (!embedData) {
			await interaction.reply({
				content: "No TMDB data found in this message",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const oldNote = this.tmdb.extractNote(embedData);

		const modal = new ModalBuilder()
			.setCustomId("edit-note")
			.setTitle("Edit Note");
		const input = new TextInputBuilder()
			.setCustomId("note")
			.setLabel("Note")
			.setStyle(TextInputStyle.Paragraph)
			.setValue(oldNote ?? "");

		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);

		modal.addComponents(row);
		await interaction.showModal(modal);
		const res = await this.echidna.interactionManager.waitForModalResponse(
			modal.data.custom_id!,
		);

		const note = res.fields.getTextInputValue("note");

		const embed = this.tmdb.updateNote(embedData, note);
		await message.edit({ embeds: [embed] });

		await res.deferUpdate();
	}
}

export default EditNoteContextMenu;
