import Jikan from "jikan4.js";

import { type APIEmbedField, EmbedBuilder, type RestOrArray } from "discord.js";

export default class AnimeManager {
	static animeClient = new Jikan.Client();

	static async getRandomAnime() {
		return AnimeManager.animeClient.anime.random();
	}

	static async searchForAnimeByTerm(term: string, maxCount = 8) {
		return AnimeManager.animeClient.anime.search(
			term,
			undefined,
			undefined,
			maxCount,
		);
	}

	static async getAnimeByID(id: string | number) {
		return AnimeManager.animeClient.anime.get(Number(id));
	}

	static getAnimeEmbed(animeData: Jikan.Anime) {
		const fields: RestOrArray<APIEmbedField> = [];

		fields.push(
			...[
				{
					name: "Studio",
					value: animeData.studios.at(0)?.name || "Unknown",
					inline: true,
				},
				{
					name: "Year",
					value: animeData.year?.toString() || "Unknown",
					inline: true,
				},
				{
					name: "Genres",
					value: animeData.genres.map((g) => g.name).join(", ") || "Unknown",
				},
				{
					name: "Synopsis",
					value: animeData.synopsis?.slice(0, 1024) || "No synopsis available.",
				},
				{ name: "Score", value: animeData.score?.toString() || "Unknown" },
			],
		);

		const embed = new EmbedBuilder()
			.setTitle(animeData.title.default)
			.addFields(fields)
			.setColor("#0099ff")
			.setURL(animeData.url.toString())
			.setFooter({ text: `MAL ID: ${animeData.id}` });

		if (animeData.image.jpg?.default) {
			embed.setImage(animeData.image.jpg.default.toString());
		}

		return embed;
	}
}
