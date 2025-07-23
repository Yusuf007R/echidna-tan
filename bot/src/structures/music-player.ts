import { mapTrack } from "@Api/utils/map-track";
import StringSelectComponent from "@Components/string-select";
import capitalize from "@Utils/capitalize";
import { getBaseDir } from "@Utils/get-dir-name";
import getImageColor from "@Utils/get-image-color";
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
	type ChatInputCommandInteraction,
	Collection,
	type GuildMember,
	type Message,
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

const TEMP_DIR = path.join(getBaseDir(), "temp", "ytdlp");

const ytdlp = new YtDlp();

export const TIMEOUT_OPTIONS = {
	FADE_OUT: "fade-out",
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
	"image-url-cache": Record<string, any>;
	type: PLAYER_TYPE;
	timeout: {
		minutes: number;
		option: TIMEOUT_OPTIONS;
		timeoutId: NodeJS.Timeout;
		startedAt: number;
	} | null;
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
		const queue = this.queues.get(guildId) as GuildQueue<QueueMetadata> | null;
		const interaction = queue?.metadata?.interaction;

		const ytdlpStream = ytdlp.stream(q.url, {
			format: {
				filter: "audioonly",
				quality: 10,
				type: "opus",
			},
			onProgress: (() => {
				// Closure to keep track of last milestone
				let lastMilestone = -1;
				const milestones = [0, 25, 50, 75, 100];
				let message: Message | null = null;
				return async (progress) => {
					if (progress.status === "downloading" && progress.percentage) {
						const percent = Number.parseInt(progress.percentage.toString(), 10);
						const nextMilestone = milestones.find(
							(m) => percent === m && lastMilestone < m,
						);
						if (nextMilestone !== undefined) {
							lastMilestone = nextMilestone;
							const text = `Downloading stream... ${nextMilestone}% - ${progress.downloaded_str} / ${progress.total_str} - ${progress.eta_str}`;
							if (message) {
								message.edit({ content: text });
							} else if (
								interaction?.channel?.isTextBased() &&
								"send" in interaction.channel
							) {
								message = await interaction?.channel?.send(text);
							}
						}
					}
					if (progress.status === "finished") {
						if (message) {
							message.delete();
						}
					}
				};
			})(),
		});
		await ytdlpStream.pipeAsync(stream);
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
		this.events.on(GuildQueueEvent.PlayerError, (queue, error) => {
			console.log("playerError", queue, error);
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
		if (queue.metadata.timeout?.timeoutId) {
			clearTimeout(queue.metadata.timeout.timeoutId);
			queue.metadata.timeout = null;
		}
	}

	setupTimeout(
		queue: GuildQueue<QueueMetadata>,
		minutes: number,
		timeoutOption: TIMEOUT_OPTIONS = TIMEOUT_OPTIONS.FADE_OUT_AND_LEAVE,
	) {
		this.clearTimeout(queue);
		queue.metadata.timeout = {
			minutes,
			option: timeoutOption,
			timeoutId: setTimeout(
				async () => {
					try {
						switch (timeoutOption) {
							case TIMEOUT_OPTIONS.FADE_OUT_AND_LEAVE:
								await this.fadeOut(queue);
								queue.delete();
								break;
							case TIMEOUT_OPTIONS.FADE_OUT:
								await this.fadeOut(queue);
								queue.node.pause();
								break;
							case TIMEOUT_OPTIONS.LEAVE:
								queue.delete();
								break;
							case TIMEOUT_OPTIONS.STOP:
								queue.node.pause();
								break;
						}

						if (
							queue.metadata.interaction?.channel &&
							"send" in queue.metadata.interaction.channel
						) {
							const messages = {
								[PLAYER_TYPE.ASMR_PLAY]: `😴 Your ASMR session has ended after ${minutes} minutes.`,
								[PLAYER_TYPE.MUSIC]: `The music queue ended after ${minutes} minutes.`,
							};
							queue.metadata.interaction.channel.send({
								content: messages[queue.metadata.type],
							});
						}
					} catch (error) {
						console.error("[MusicPlayer] Timeout error:", error);
					}
				},
				minutes * 60 * 1000,
			),
			startedAt: Date.now(),
		};
	}

	private async fadeOut(queue: GuildQueue<QueueMetadata>) {
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
	}

	static getGuildEmitter(guildId: string) {
		if (!MusicPlayer.guildEmiters.has(guildId)) {
			MusicPlayer.guildEmiters.set(guildId, new EventEmitter<GuildEmitter>());
		}
		return MusicPlayer.guildEmiters.get(guildId)!;
	}

	async playCmd({
		queue,
		query,
		playMode = PLAY_MODE.download,
	}: {
		queue: GuildQueue<QueueMetadata>;
		query: string;
		playMode?: PLAY_MODE;
	}) {
		await this.loadExtractors();

		const searchResult = await this.search(query, {
			requestedBy: queue.metadata.interaction.user,
		});

		const interaction = queue.metadata.interaction;

		if (!interaction.isCommand()) {
			return;
		}
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
		const { title, requestedBy, url, thumbnail, author } = currentTrack;
		const progressBar = queue.node.createProgressBar();

		const repeatMode =
			Object.keys(QueueRepeatMode).find(
				(key) =>
					QueueRepeatMode[key as keyof typeof QueueRepeatMode] ===
					queue.repeatMode,
			) ?? "Unknown";

		const embed = new EmbedBuilder()

			.setAuthor({
				name: "Now Playing",
				iconURL: "https://www.iconsdb.com/icons/preview/white/music-2-xxl.png",
			})
			.setTitle(title)
			.setURL(url)

			.addFields(
				{ name: "Artist", value: author, inline: true },
				{ name: "Volume", value: `${queue.node.volume}%`, inline: true },
				{ name: "Loop Mode", value: `${capitalize(repeatMode)}`, inline: true },
				...(progressBar ? [{ name: "Progress", value: progressBar }] : []),
			);

		const remainingTime = queue.metadata.timeout
			? queue.metadata.timeout.minutes -
				Math.round((Date.now() - queue.metadata.timeout.startedAt) / 60000)
			: null;

		if (requestedBy) {
			embed.setFooter({
				text: `Requested by: ${
					requestedBy.displayName
				} ${queue.metadata.timeout ? `• Timeout in ${remainingTime ?? 0} minutes` : ""}`,
				iconURL: requestedBy.displayAvatarURL(),
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
		interaction: ChatInputCommandInteraction<CacheType>,
		type: PLAYER_TYPE,
	): Promise<GuildQueue<QueueMetadata>> {
		const queue = this.queues.get<QueueMetadata>(interaction.guild!.id);
		if (queue) return queue;
		const voiceChannel = this.getVoiceChannel(interaction);
		if (!voiceChannel) {
			await interaction.editReply("You are not connected to a voice channel!");
			throw new Error("User is not connected to a voice channel");
		}
		const queueMetadata: QueueMetadata = {
			interaction: interaction,
			guildId: interaction.guild!.id,
			type,
			timeout: null,
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
