import {
	type Genre,
	MovieDb,
	type MovieResponse,
	type MovieResult,
	type ShowResponse,
	type TvResult,
} from "moviedb-promise";

import config from "@Configs";
import getImageColor from "@Utils/get-image-color";
import { EmbedBuilder } from "@discordjs/builders";
import type { APIEmbed } from "discord.js";

export interface infoTMDB {
	id: number;
	name: string;
	original_name: string;
	release_date: string;
	runtime: number;
	type: string;
	number_of_episodes: number | null;
	overview: string;
	poster_path: string;
	genres: Genre[];
}

export default class TMDB {
	private moviedb: MovieDb;

	constructor() {
		this.moviedb = new MovieDb(config.TMDB_API_KEY);
	}

	async search(query: string) {
		return await this.moviedb.searchMulti({ query });
	}

	async getTV(id: string) {
		return await this.moviedb.tvInfo(id);
	}

	async getMovie(id: string) {
		return await this.moviedb.movieInfo(id);
	}

	async getByName(name: string): Promise<MovieResult | TvResult | null> {
		const result = await this.search(name);
		const filtered = result.results?.filter(
			(item) => item.media_type === "movie" || item.media_type === "tv",
		);

		return filtered?.[0] || (null as any);
	}

	getInfo(result: MovieResponse | ShowResponse): infoTMDB {
		if ("title" in result) {
			return {
				id: result.id!,
				name: result.title!,
				original_name: result.original_title!,
				release_date: result.release_date!,
				runtime: result.runtime!,
				type: "MOVIE",
				number_of_episodes: 1,
				overview: result.overview!,
				poster_path: result.poster_path!,
				genres: result.genres!,
			};
		}
		if ("name" in result) {
			return {
				id: result.id!,
				name: result.name!,
				original_name: result.original_name!,
				release_date: result.first_air_date!,
				runtime:
					result.episode_run_time?.reduce((acc, curr, _, arr) => {
						const count = arr.filter((x) => x === curr).length;
						return count > arr.filter((x) => x === acc).length ? curr : acc;
					}, result.episode_run_time?.[0] || 0) || 0,
				type: "SERIE",
				number_of_episodes: result.number_of_episodes!,
				overview: result.overview!,
				poster_path: result.poster_path!,
				genres: result.genres!,
			};
		}

		return {
			name: "Unknown",
			original_name: "Unknown",
			release_date: "Unknown",
			runtime: 0,
			type: "Unknown",
			number_of_episodes: 0,
			overview: "Unknown",
			poster_path: "Unknown",
			genres: [],
			id: 0,
		};
	}

	async generateEmbed(info: infoTMDB, note?: string) {
		const fields = [
			{
				name: "Release Date",
				value: info.release_date || "Unknown",
				inline: true,
			},
			{
				name: info.type === "MOVIE" ? "Runtime" : "Episodes",
				value:
					info.type === "MOVIE"
						? `${info.runtime} minutes`
						: `${info.number_of_episodes || "Unknown"} episodes of ${info.runtime} minutes`,
				inline: true,
			},
		];

		if (info.original_name !== info.name) {
			fields.unshift({
				name: "Original Name",
				value: info.original_name,
				inline: true,
			});
		}

		const embed = new EmbedBuilder()
			.setTitle(info.name)
			.setDescription(info.overview || "No description available")
			.addFields(fields);

		if (info.poster_path) {
			const url = `https://image.tmdb.org/t/p/w500${info.poster_path}`;
			embed.setColor(await getImageColor(url));
			embed.setImage(url);
			embed.setFooter({
				text: `TMDB ID: ${info.id} - ${info.type}`,
			});
		}

		if (info.genres?.length) {
			embed.addFields({
				name: "Genres",
				value: info.genres.map((g) => g.name).join(", "),
			});
		}

		if (note) {
			embed.addFields({
				name: "Note",
				value: note,
			});
		}

		return embed;
	}

	async getEmbed(id: number, type: string, note?: string) {
		const result =
			type === "movie"
				? await this.getMovie(id.toString())
				: await this.getTV(id.toString());

		const info = this.getInfo(result);
		return this.generateEmbed(info, note);
	}

	parseFooter(str: string): {
		type: string;
		id: number;
	} {
		const [id, type] = str.replace("TMDB ID: ", "").trim().split(" - ");
		return {
			type,
			id: Number.parseInt(id),
		};
	}

	extractNote(embed: APIEmbed) {
		const note = embed.fields?.find((field) => field.name === "Note")?.value;
		return note;
	}

	updateNote(embed: APIEmbed, note?: string) {
		const fields = embed.fields?.filter((field) => field.name !== "Note");
		if (note) {
			fields?.push({
				name: "Note",
				value: note,
			});
		}
		embed.fields = fields;
		return embed;
	}

	async refreshEmbed(embed: APIEmbed, note?: string) {
		const oldNote = this.extractNote(embed);
		const newNote = note ?? oldNote;
		const item = await (async () => {
			if (embed.footer?.text) {
				const { type, id } = this.parseFooter(embed.footer.text);
				return { type: type === "MOVIE" ? "movie" : "tv", id };
			}

			if (embed.title) {
				const item = await this.getByName(embed.title);
				if (!item) return null;
				return { type: item.media_type, id: item.id! };
			}

			return null;
		})();

		if (!item) return;

		const result =
			item.type === "movie"
				? await this.getMovie(item.id!.toString())
				: await this.getTV(item.id!.toString());

		const info = this.getInfo(result);
		const newEmbed = await this.generateEmbed(info, newNote);
		return newEmbed;
	}
}
