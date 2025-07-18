import { mapTrack } from "@Api/utils/map-track";
import StringSelectComponent from "@Components/string-select";
import capitalize from "@Utils/capitalize";
import { baseDir } from "@Utils/dir-name";
import getImageColor from "@Utils/get-image-color";
import milisecondsToReadable from "@Utils/seconds-to-minutes";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
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
	Playlist,
	QueueRepeatMode,
	type Track,
} from "discord-player";
import { YoutubeiExtractor } from "discord-player-youtubei";
import { EventEmitter } from "tseep";
import { YtDlp } from "ytdlp-nodejs";

const TEMP_DIR = path.join(baseDir, "temp", "ytdlp");

const ytdlp = new YtDlp();

export const TIMEOUT_OPTIONS = {
	FADE_OUT_AND_LEAVE: "fade-out-and-leave",
	LEAVE: "leave",
	STOP: "stop",
} as const;

export type TIMEOUT_OPTIONS =
	(typeof TIMEOUT_OPTIONS)[keyof typeof TIMEOUT_OPTIONS];

export const PLAYER_TYPE = {
	MUSIC: "music",
	ASMR_PLAY: "asmr-play",
} as const;

export type PLAYER_TYPE = (typeof PLAYER_TYPE)[keyof typeof PLAYER_TYPE];

export const PLAY_MODE = {
	stream: "stream",
	download: "download",
} as const;

export type PLAY_MODE = (typeof PLAY_MODE)[keyof typeof PLAY_MODE];

export type QueueMetadata = {
	interaction: BaseInteraction<CacheType>;
	guildId: string;
	timeoutId: NodeJS.Timeout | null;
	"image-url-cache": Record<string, any>;
	type: PLAYER_TYPE;
	timeoutOption: TIMEOUT_OPTIONS;
};

export type TrackMetadata = {
	playMode: PLAY_MODE;
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

	async init() {
		await this.loadExtractors();
		this.initEvents();
		this.cleanUpDownloadedStream();
	}

	async loadExtractors() {
		// await this.extractors.loadDefault();

		await this.extractors.register(YoutubeiExtractor, {});
	}

	get youtubeiExtractor() {
		return this.extractors.get(
			YoutubeiExtractor.identifier,
		) as YoutubeiExtractor;
	}

	private async createDownloadStream(q: Track, guildId: string) {
		const dir = path.join(TEMP_DIR, guildId);
		const filePath = path.join(dir, `${q.id}.opus`);
		await mkdir(dir, { recursive: true });
		const stream = createWriteStream(filePath);
		const ytdlpStream = ytdlp.stream(q.url, {
			format: {
				filter: "audioonly",
				quality: 10,
				type: "opus",
			},
			onProgress: (progress) => {
				if (progress.status === "finished") {
					console.log("Stream finished", {
						...progress,
						track: q,
					});
				}
			},
		});
		await ytdlpStream.pipeAsync(stream);
		console.log("Stream created", filePath);
		return createReadStream(filePath);
	}

	private cleanUpDownloadedStream() {
		try {
			setInterval(
				async () => {
					const folders = await readdir(TEMP_DIR);
					for (const folder of folders) {
						const queue = this.queues.get(folder);
						if (!queue || !queue.isPlaying()) {
							await rm(path.join(TEMP_DIR, folder), { recursive: true });
						}
					}
				},
				//every 24 hours
				1000 * 60 * 60 * 24,
			); // 24 hour
		} catch (error) {
			console.log("Failed to clean up downloaded stream", error);
		}
	}

	initEvents() {
		this.events.on(GuildQueueEvent.PlayerStart, (queue) =>
			this.nowPlaying(queue),
		);
		this.events.on(GuildQueueEvent.PlayerFinish, (queue) => {
			console.log("playerFinish", queue);
		});

		for (const event of guildEvents) {
			this.events.on(event, (queue: GuildQueue<QueueMetadata>) => {
				MusicPlayer.guildEmiters.get(queue.guild.id)?.emit("update", {
					type: event,
					queue,
				});
			});
		}
	}

	clearTimeout(queue: GuildQueue<QueueMetadata>) {
		if (queue.metadata.timeoutId) {
			clearTimeout(queue.metadata.timeoutId);
			queue.metadata.timeoutId = null;
		}
	}

	setupTimeout(queue: GuildQueue<QueueMetadata>, minutes: number) {
		this.clearTimeout(queue);
		queue.metadata.timeoutId = setTimeout(
			async () => {
				try {
					switch (queue.metadata.timeoutOption) {
						case TIMEOUT_OPTIONS.FADE_OUT_AND_LEAVE:
							await this.fadeOutAndStop(queue);
							break;
						case TIMEOUT_OPTIONS.LEAVE:
							queue.delete();
							break;
						case TIMEOUT_OPTIONS.STOP:
							queue.node.pause();
							break;
					}
				} catch (error) {
					console.error("[AsmrPlay] Timeout error:", error);
				}
			},
			minutes * 60 * 1000,
		);

		if (
			queue.metadata.interaction?.channel &&
			"send" in queue.metadata.interaction.channel
		) {
			const messages = {
				[PLAYER_TYPE.ASMR_PLAY]: `😴 Sweet dreams! ASMR gently ended after ${minutes} minutes.`,
				[PLAYER_TYPE.MUSIC]: `The queue will end in ${minutes} minutes.`,
			};
			queue.metadata.interaction.channel.send({
				content: messages[queue.metadata.type],
			});
		}
	}

	private async fadeOutAndStop(queue: GuildQueue<QueueMetadata>) {
		const originalVolume = queue.node.volume;
		const fadeSteps = 10;
		const fadeInterval = 2000; // 1 second per step = 10 second fade
		// Gentle fade out to prevent jarring wake-up
		for (let i = fadeSteps; i > 0; i--) {
			if (queue.deleted) return; // Exit if queue was manually stopped

			const newVolume = Math.floor((originalVolume * i) / fadeSteps);
			queue.node.setVolume(Math.max(newVolume, 1)); // Never go to 0 to avoid audio issues
			await new Promise((resolve) => setTimeout(resolve, fadeInterval));
		}

		// Stop the music player after fade
		if (!queue.deleted) {
			queue.delete();
		}
	}

	static getGuildEmitter(guildId: string) {
		if (!MusicPlayer.guildEmiters.has(guildId)) {
			MusicPlayer.guildEmiters.set(guildId, new EventEmitter<GuildEmitter>());
		}
		return MusicPlayer.guildEmiters.get(guildId)!;
	}

	async playCmd({
		interaction,
		query,
		playMode = PLAY_MODE.download,
		timeoutOption = TIMEOUT_OPTIONS.FADE_OUT_AND_LEAVE,
		type = PLAYER_TYPE.MUSIC,
		timeoutMinutes = 0,
		loopMode = QueueRepeatMode.OFF,
	}: {
		interaction: CommandInteraction<CacheType>;
		query: string;
		playMode?: PLAY_MODE;
		timeoutOption?: TIMEOUT_OPTIONS;
		type?: PLAYER_TYPE;
		timeoutMinutes?: number;
		loopMode?: QueueRepeatMode;
	}) {
		await this.loadExtractors();
		if (!this.getVoiceChannel(interaction)) {
			await interaction.editReply("You are not connected to a voice channel!");
			return;
		}
		const queue = await this.getOrCreateQueue(
			interaction,
			type,
			timeoutOption,
			timeoutMinutes,
		);
		queue.setRepeatMode(loopMode);

		const searchResult = await this.search(query, {
			requestedBy: interaction.user,
		});

		if (!searchResult.hasTracks()) {
			await interaction.editReply("No tracks found");
			return;
		}

		if (searchResult.tracks.length === 1) {
			const track = searchResult.tracks[0];
			this.addTrack(track, interaction, playMode);
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
				await this.selectMusic(interaction, firstFiveTracks, playMode);
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

	private appendMetadata(
		track: Track | Track[] | Playlist,
		metadata: Record<string, any>,
	) {
		if (Array.isArray(track)) {
			track.forEach((t) => {
				this.appendMetadata(t, metadata);
			});
			return;
		}
		if (track instanceof Playlist) {
			track.tracks.forEach((t) => {
				this.appendMetadata(t, metadata);
			});
			return;
		}
		const currentMetadata = track.metadata ?? {};
		track.setMetadata({
			...currentMetadata,
			...metadata,
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

	async getOrCreateQueue(
		interaction: BaseInteraction<CacheType>,
		type: PLAYER_TYPE,
		timeoutOption: TIMEOUT_OPTIONS = TIMEOUT_OPTIONS.FADE_OUT_AND_LEAVE,
		timeoutMinutes = 0,
	): Promise<GuildQueue<QueueMetadata>> {
		const queue = this.queues.get<QueueMetadata>(interaction.guild!.id);
		if (queue) return queue;
		const voiceChannel = this.getVoiceChannel(interaction);
		const queueMetadata: QueueMetadata = {
			interaction: interaction,
			timeoutId: null,
			guildId: interaction.guild!.id,
			type,
			timeoutOption,
			"image-url-cache": {},
		};
		const newQueue = this.queues.create(interaction.guild!, {
			metadata: queueMetadata,
			onBeforeCreateStream: async (q) => {
				if (
					(q as Track<TrackMetadata>).metadata?.playMode === PLAY_MODE.download
				) {
					return await this.createDownloadStream(q, interaction.guild!.id);
				}
				return null;
			},
		});
		await newQueue.connect(voiceChannel!);
		if (timeoutMinutes > 0) {
			this.setupTimeout(newQueue, timeoutMinutes);
		}
		return newQueue as GuildQueue<QueueMetadata>;
	}

	async selectMusic(
		interaction: StringSelectMenuInteraction<CacheType>,
		tracks: Track<unknown>[],
		playMode: PLAY_MODE = PLAY_MODE.download,
	) {
		await interaction.deferUpdate();
		if (!interaction.values.length)
			return interaction.editReply("Nothing selected");

		try {
			const index = Number(interaction.values[0]);
			const track = tracks[index];

			this.addTrack(track, interaction, playMode);
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
		playMode: PLAY_MODE = PLAY_MODE.download,
	) {
		// we can assume guild is not null because music command can only be use from guilds

		const queue = this.queues.get<QueueMetadata>(interaction.guild!);
		if (!queue) {
			throw new Error("Queue not found");
		}
		this.appendMetadata(track, {
			playMode: playMode,
		});
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
