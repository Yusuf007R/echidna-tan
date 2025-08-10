import ContextMenu from "@Structures/context-menu";
import { InteractionContext } from "@Structures/interaction-context";
import TMDB from "@Structures/tmdb";

class DeleteNoteContextMenu extends ContextMenu<"MESSAGE"> {
	tmdb = new TMDB();
	constructor() {
		super({
			name: "Delete Note",
			description: "Delete note from a movie/show",
			type: "MESSAGE",
		});
	}

	async run() {
		const message = this.target;
		if (message.interaction?.commandName !== "tmdb-query") {
			await InteractionContext.sendReply({
				content: "This command can only be used in the TMDB query command",
				ephemeral: true,
			});
			return;
		}

		const embedData = message.embeds[0].data;

		const embed = this.tmdb.updateNote(embedData, undefined);
		await message.edit({ embeds: [embed] });

		await InteractionContext.sendReply({
			ephemeral: true,
			content: "Note deleted",
		});
	}
}

export default DeleteNoteContextMenu;
