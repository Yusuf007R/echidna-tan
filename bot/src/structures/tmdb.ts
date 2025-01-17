import {
	type Genre,
	MovieDb,
	type MovieResponse,
	type ShowResponse,
} from "moviedb-promise";

import config from "@Configs";
import getImageColor from "@Utils/get-image-color";
import { EmbedBuilder } from "@discordjs/builders";

export interface infoTMDB {
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
		return this.moviedb.searchMulti({ query });
	}

	async getTV(id: string) {
		return this.moviedb.tvInfo(id);
	}

	async getMovie(id: string) {
		return this.moviedb.movieInfo(id);
	}

	getInfo(result: MovieResponse | ShowResponse): infoTMDB {
		if ("title" in result) {
			return {
				name: result.title!,
				original_name: result.original_title!,
				release_date: result.release_date!,
				runtime: result.runtime!,
				type: "movie",
				number_of_episodes: null,
				overview: result.overview!,
				poster_path: result.poster_path!,
				genres: result.genres!,
			};
		}
		if ("name" in result) {
			return {
				name: result.name!,
				original_name: result.original_name!,
				release_date: result.first_air_date!,
				runtime:
					result.episode_run_time?.reduce((acc, curr, _, arr) => {
						const count = arr.filter((x) => x === curr).length;
						return count > arr.filter((x) => x === acc).length ? curr : acc;
					}, result.episode_run_time?.[0] || 0) || 0,
				type: "tv",
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
		};
	}

	async getEmbed(info: infoTMDB) {
		const embed = new EmbedBuilder()
			.setTitle(info.name)
			.setDescription(info.overview || "No description available")
			.addFields([
				{
					name: "Original Name",
					value: info.original_name,
					inline: true,
				},
				{
					name: "Release Date",
					value: info.release_date || "Unknown",
					inline: true,
				},
				{
					name: info.type === "movie" ? "Runtime" : "Episodes",
					value:
						info.type === "movie"
							? `${info.runtime} minutes`
							: `${info.number_of_episodes || "Unknown"} episodes of ${info.runtime} minutes`,
					inline: true,
				},
			]);

		if (info.poster_path) {
			const url = `https://image.tmdb.org/t/p/w500${info.poster_path}`;
			embed.setColor(await getImageColor(url));
			embed.setImage(url);
		}

		if (info.genres?.length) {
			embed.addFields({
				name: "Genres",
				value: info.genres.map((g) => g.name).join(", "),
			});
		}

		return embed;
	}
}
