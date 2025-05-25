import { mapTrack } from "@Api/utils/map-track";
import StringSelectComponent from "@Components/string-select";
import capitalize from "@Utils/capitalize";
import getImageColor from "@Utils/get-image-color";
import milisecondsToReadable from "@Utils/seconds-to-minutes";
import {
	ActionRowBuilder,
	EmbedBuilder,
	type StringSelectMenuBuilder,
} from "@discordjs/builders";
import {
	type BaseInteraction,
	type CacheType,
	Collection,
	type CommandInteraction,
	type GuildMember,
	type StringSelectMenuInteraction,
} from "discord.js";
import {
	type GuildQueue,
	GuildQueueEvent,
	Player,
	type Playlist,
	QueueRepeatMode,
	type Track,
} from "discord-player";
import { YoutubeiExtractor } from "discord-player-youtubei";
import { EventEmitter } from "tseep";
import type EchidnaClient from "./echidna-client";

export type QueueMetadata = {
	interaction: BaseInteraction<CacheType>;
	"image-url-cache": Record<string, any>;
};

const guildEvents = [
	GuildQueueEvent.PlayerStart,
	GuildQueueEvent.PlayerFinish,
	GuildQueueEvent.PlayerSkip,
	GuildQueueEvent.VolumeChange,
	GuildQueueEvent.EmptyQueue,
	GuildQueueEvent.AudioTrackAdd,
	GuildQueueEvent.AudioTracksAdd,
	GuildQueueEvent.AudioTrackRemove,
	GuildQueueEvent.AudioTracksRemove,
] as const;

type GuildEmitter = {
	update: (data: {
		type: (typeof guildEvents)[number];
		queue: GuildQueue<QueueMetadata>;
	}) => void;
};

export default class MusicPlayer extends Player {
	static guildEmiters = new Collection<string, EventEmitter<GuildEmitter>>();
	constructor(echidna: EchidnaClient) {
		super(echidna);
		void this.init();
	}

	async init() {
		await this.loadExtractors();
		this.initEvents();
	}

	async loadExtractors() {
		// await this.extractors.loadDefault();
		await this.extractors.register(YoutubeiExtractor, {});
	}

	initEvents() {
		this.events.on(GuildQueueEvent.PlayerStart, (queue) =>
			this.nowPlaying(queue),
		);
		// this.events.on(GuildQueueEvent.PlayerFinish, (queue) => {
		// 	console.log("playerFinish", queue);
		// });

		for (const event of guildEvents) {
			this.events.on(event, (queue: GuildQueue<QueueMetadata>) => {
				MusicPlayer.guildEmiters.get(queue.guild.id)?.emit("update", {
					type: event,
					queue,
				});
			});
		}
	}

	static getGuildEmitter(guildId: string) {
		if (!MusicPlayer.guildEmiters.has(guildId)) {
			MusicPlayer.guildEmiters.set(guildId, new EventEmitter<GuildEmitter>());
		}
		return MusicPlayer.guildEmiters.get(guildId)!;
	}

	async playCmd(interaction: CommandInteraction<CacheType>, query: string) {
		if (!this.getVoiceChannel(interaction)) {
			await interaction.editReply("You are not connected to a voice channel!");
			return;
		}

		const searchResult = await this.search(query, {
			requestedBy: interaction.user,
		});

		if (!searchResult.hasTracks()) {
			await interaction.editReply("No tracks found");
			return;
		}

		if (searchResult.tracks.length === 1) {
			const track = searchResult.tracks[0];
			this.addTrack(track, interaction);
			await interaction.editReply({
				content: `Added ${track.title} to the queue.`,
				components: [],
			});
			return;
		}

		const firstFiveTracks = searchResult.tracks.slice(0, 5);

		const customId = `${interaction.id}-music`;

		const stringSelectComponent = new StringSelectComponent({
			custom_id: customId,
			interaction,
			options: firstFiveTracks.map((item, index) => ({
				label: item.title,
				value: index.toString(),
			})),
		})
			.onFilter((inter) => {
				return StringSelectComponent.filterByCustomID(inter, customId);
			})
			.onAction(async (interaction) => {
				await this.selectMusic(interaction, firstFiveTracks);
			})
			.onError((error) => {
				console.log(error);
				interaction.editReply({
					content: "No song was selected.",
					components: [],
				});
			})
			.build();

		const row = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
			stringSelectComponent,
		);

		await interaction.editReply({
			content: "Select a song!",
			components: [row],
		});
	}

	async nowPlaying(queue: GuildQueue<QueueMetadata>): Promise<void> {
		const currentTrack = queue.currentTrack;
		if (!currentTrack) {
			queue.channel?.send("Currently not playing a track");
			return;
		}
		const { title, requestedBy, durationMS, url, thumbnail } = currentTrack;
		const minutes = milisecondsToReadable(durationMS);

		const gap = {
			name: "\n",
			value: "\n",
		};

		const repeatMode =
			Object.keys(QueueRepeatMode).find(
				(key) =>
					QueueRepeatMode[key as keyof typeof QueueRepeatMode] ===
					queue.repeatMode,
			) ?? "Unknown";

		const embed = new EmbedBuilder()
			.setTitle(`${title}`)
			.setAuthor({ name: "Now Playing: " })
			.setDescription("Player Info: ")
			.setURL(url ?? "")
			.addFields(
				gap,
				{
					name: "Volume",
					value: `${queue.node.volume}%`,
					inline: true,
				},
				{
					name: "Loop mode",
					value: `${capitalize(repeatMode)}`,
					inline: true,
				},
				gap,
				{
					name: `Queue (${queue.tracks.size})`,
					value: `${
						queue.tracks
							.map((track) => `[${track.title}](${track.url})`)
							.slice(0, 5)
							.join("\n") || "Empty"
					}`,
				},
			);
		if (requestedBy) {
			embed.setFooter({
				text: `Duration: ${minutes} - Requested by: ${requestedBy.displayName}`,
			});
		}
		if (thumbnail) {
			embed.setThumbnail(thumbnail);

			embed.setColor(await this.getTrackDominantColor(queue));
		}

		const interaction = queue.metadata.interaction;

		if (interaction.inGuild() && interaction.channel?.isTextBased()) {
			interaction.channel?.send({ embeds: [embed] });
		}
	}

	async selectMusic(
		interaction: StringSelectMenuInteraction<CacheType>,
		tracks: Track<unknown>[],
	) {
		await interaction.deferUpdate();
		if (!interaction.values.length)
			return interaction.editReply("Nothing selected");

		try {
			const index = Number(interaction.values[0]);
			const track = tracks[index];
			this.addTrack(track, interaction);
			interaction.editReply({
				content: `${track.title} added to the queue.`,
				components: [],
			});
		} catch (error) {
			console.error(error);
			interaction.editReply("Failed to load track");
		}
	}

	getVoiceChannel(interaction: BaseInteraction<CacheType>) {
		const guildMember = interaction?.member as GuildMember;
		return guildMember?.voice?.channel;
	}

	static getPlayerStatus(musicQueue: GuildQueue<QueueMetadata>) {
		const progress = musicQueue.node.getTimestamp() as {
			current: {
				label: string;
				value: number;
			};
			total: {
				label: string;
				value: number;
			};
			progress: number;
		};
		return {
			queue: musicQueue.tracks.map(mapTrack),
			loopMode: musicQueue.repeatMode.toString(),
			shuffle: musicQueue.isShuffling,
			volume: musicQueue.node.volume,
			playing: musicQueue.node.isPlaying(),
			isPaused: musicQueue.node.isPaused(),
			currentTrack: {
				track: musicQueue.currentTrack
					? mapTrack(musicQueue.currentTrack)
					: null,
				progress,
			},
		};
	}

	addTrack(
		track: Track | Track[] | Playlist,
		interaction: BaseInteraction<CacheType>,
	) {
		// we can assume guild is not null because music command can only be use from guilds
		const queue = this.queues.get(interaction.guild!);
		if (!queue) {
			const voiceChannel = this.getVoiceChannel(interaction);
			this.play(voiceChannel!, track, {
				nodeOptions: {
					metadata: {
						interaction: interaction,
					},
				},
			});
			return;
		}
		if (!queue.isPlaying()) return queue.play(track);
		queue.addTrack(track);
	}

	async getTrackDominantColor(
		queue: GuildQueue<QueueMetadata>,
	): Promise<[number, number, number]> {
		const image = queue.currentTrack?.thumbnail;
		if (!image) return [0, 0, 0];
		if (!queue.metadata["image-url-cache"])
			queue.metadata["image-url-cache"] = {};
		const imageCache = queue.metadata["image-url-cache"] as Record<string, any>;
		const imageDominantColorCache = imageCache[image];
		if (!imageDominantColorCache) {
			const color = await getImageColor(image);
			imageCache[image] = color;
			return color;
		}
		return imageDominantColorCache;
	}
}
