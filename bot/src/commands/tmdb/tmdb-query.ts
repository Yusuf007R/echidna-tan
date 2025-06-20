import { Command } from "@Structures/command";
import TMDB from "@Structures/tmdb";
import { OptionsBuilder } from "@Utils/options-builder";
import type {
	ApplicationCommandOptionChoiceData,
	AutocompleteInteraction,
	CacheType,
	CommandInteraction,
} from "discord.js";

const options = new OptionsBuilder()
	.addStringOption({
		name: "tmdb-query",
		description: "The movie or TV show to search for",
		required: true,
		autocomplete: true,
	})
	.build();

export default class TMDBQueryCommand extends Command<typeof options> {
	private tmdb: TMDB;

	constructor() {
		super({
			name: "tmdb-query",
			description: "Search for movies and TV shows",
			options,
			cmdType: "BOTH",
		});

		this.tmdb = new TMDB();
	}

	async handleAutocomplete(interaction: AutocompleteInteraction<CacheType>) {
		const query = interaction.options.getFocused();

		try {
			const results =
				(await this.tmdb.search(query)).results?.filter(
					(result) =>
						result.media_type === "movie" || result.media_type === "tv",
				) || [];
			const mappedResults = results
				.slice(0, 8)
				.map((result) => {
					const name =
						result.media_type === "movie" ? result.title : result.name;
					const value = `${result.media_type}:${result.id}`;
					if (!name || !value) return null;
					return {
						name,
						value,
					};
				})
				.filter(Boolean) as ApplicationCommandOptionChoiceData<string>[];

			await interaction.respond(mappedResults);
		} catch (error) {
			console.error("[tmdb-query] Search error:", error);
		}
	}

	async run(interaction: CommandInteraction<CacheType>) {
		await interaction.deferReply();

		try {
			const [type, id] = this.options["tmdb-query"].split(":");

			if (!type || !id) {
				await interaction.editReply("Invalid selection. Please try again.");
				return;
			}

			const result =
				type === "movie"
					? await this.tmdb.getMovie(id)
					: await this.tmdb.getTV(id);

			const info = this.tmdb.getInfo(result);

			const embed = await this.tmdb.generateEmbed(info);

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error("[tmdb-query] Error fetching details:", error);
			await interaction.editReply(
				"An error occurred while fetching the details. Please try again later.",
			);
		}
	}
}
