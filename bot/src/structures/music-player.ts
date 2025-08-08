import { mapTrack } from "@Api/utils/map-track";
import StringSelectComponent from "@Components/string-select";
import {
	InteractionContext,
	type ReplyMessage,
} from "@Structures/interaction-context";
import capitalize from "@Utils/capitalize";
import { getBaseDir } from "@Utils/get-dir-name";
import getImageColor from "@Utils/get-image-color";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, rmdir, unlink } from "node:fs/promises";
import path from "node:path";
import {
	ActionRowBuilder,
	EmbedBuilder,
	type StringSelectMenuBuilder,
} from "@discordjs/builders";
import {
	type CacheType,
	Collection,
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
	guildId: string;
	"image-url-cache": Record<string, any>;
	type: PLAYER_TYPE;
	nowPlayingMessage: ReplyMessage | null;
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

			onProgress: (() => {
				// Closure to keep track of last milestone
				let lastMilestone = -1;
				const milestones = [0, 15, 25, 35, 50, 65, 75, 100];
				let message: ReplyMessage | null = null;
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
								await message.edit({ content: text });
							} else {
								try {
									message = await InteractionContext.sendInChannel(text);
								} catch (error) {
									// Ignore if we can't send to channel (context might not be available)
									console.warn(
										"Could not send download progress message:",
										error,
									);
								}
							}
						}
					}
					if (progress.status === "finished") {
						if (message) {
							await message.delete();
						}
					}
				};
			})(),
		});
		await ytdlpStream.pipeAsync(stream);
		return createReadStream(filePath);
	}

	private async cleanUpDownloand(queue: GuildQueue<QueueMetadata>) {
		const guildId = queue.guild.id;
		try {
			const folders = await readdir(TEMP_DIR);
			if (!folders.includes(guildId)) return;
			if (queue.isPlaying()) return;
			const files = await readdir(path.join(TEMP_DIR, guildId));
			for (const file of files) {
				await unlink(path.join(TEMP_DIR, guildId, file));
			}
			await rmdir(path.join(TEMP_DIR, guildId));
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

						try {
							const messages = {
								[PLAYER_TYPE.ASMR_PLAY]: `😴 Your ASMR session has ended after ${minutes} minutes.`,
								[PLAYER_TYPE.MUSIC]: `The music queue ended after ${minutes} minutes.`,
							};
							await InteractionContext.sendInChannel({
								content: messages[queue.metadata.type],
							});
						} catch (error) {
							// Ignore if we can't send to channel (context might not be available)
							console.warn("Could not send timeout message:", error);
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
		// we need to ensure the queue exist this might be redundant but just in case
		if (!queue) return;
		await this.cleanUpDownloand(queue);
		await this.loadExtractors();

		const searchResult = await this.search(query, {
			requestedBy: InteractionContext.user,
		});

		const interaction = InteractionContext.interaction;

		if (!interaction?.isCommand()) {
			return;
		}
		if (!searchResult.hasTracks()) {
			await InteractionContext.sendReply("No tracks found");
			return;
		}

		if (searchResult.tracks.length === 1) {
			const track = searchResult.tracks[0];
			this.addTrack(track, playMode);
			await InteractionContext.editReply({
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
			.onAction(async (selectInteraction) => {
				await this.selectMusic(selectInteraction, firstFiveTracks, playMode);
			})
			.onError(async (error) => {
				console.log(error);
				await InteractionContext.editReply({
					content: "No song was selected.",
					components: [],
				});
			})
			.build();

		const row = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(
			stringSelectComponent,
		);

		await InteractionContext.sendReply({
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
			try {
				await InteractionContext.sendInChannel("Currently not playing a track");
			} catch (error) {
				console.warn("Could not send 'not playing' message:", error);
			}
			return;
		}
		const { title, requestedBy, url, thumbnail, author } = currentTrack;
		const progressBar = queue.node.createProgressBar({ length: 8 });

		const repeatMode =
			Object.keys(QueueRepeatMode).find(
				(key) =>
					QueueRepeatMode[key as keyof typeof QueueRepeatMode] ===
					queue.repeatMode,
			) ?? "Unknown";
		const endTime = queue.metadata.timeout?.minutes
			? Math.floor(
					(Date.now() + queue.metadata.timeout.minutes * 60 * 1000) / 1000,
				)
			: null;
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
				...(endTime
					? [{ name: "Timeouts at", value: `<t:${endTime}:t>` }]
					: []),
				...(progressBar ? [{ name: "Progress", value: progressBar }] : []),
			);

		if (requestedBy) {
			embed.setFooter({
				text: `Requested by: ${requestedBy.displayName}`,
				iconURL: requestedBy.displayAvatarURL(),
			});
		}

		if (thumbnail) {
			embed.setThumbnail(thumbnail);

			embed.setColor(await this.getTrackDominantColor(queue));
		}

		try {
			if (queue.metadata.nowPlayingMessage) {
				await queue.metadata.nowPlayingMessage.delete();
			}
			queue.metadata.nowPlayingMessage = await InteractionContext.sendInChannel(
				{ embeds: [embed] },
			);
		} catch (error) {
			console.warn("Could not send now playing message:", error);
		}
	}

	async getOrCreateQueue(
		type: PLAYER_TYPE,
	): Promise<GuildQueue<QueueMetadata>> {
		const guild = InteractionContext.guild;
		if (!guild) {
			throw new Error("Guild not found");
		}
		const queue = this.queues.get<QueueMetadata>(guild.id);
		if (queue) return queue;
		const voiceChannel = this.getVoiceChannel();
		if (!voiceChannel) {
			await InteractionContext.sendReply(
				"You are not connected to a voice channel!",
			);
			throw new Error("User is not connected to a voice channel");
		}
		const queueMetadata: QueueMetadata = {
			guildId: guild.id,
			type,
			timeout: null,
			nowPlayingMessage: null,
			"image-url-cache": {},
		};
		const newQueue = this.queues.create(guild, {
			metadata: queueMetadata,
			onBeforeCreateStream: async (q) => {
				if (
					(q as Track<TrackMetadata>).metadata?.playMode === PLAY_MODE.download
				) {
					return await this.createDownloadStream(q, guild.id);
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

			this.addTrack(track, playMode);
			interaction.editReply({
				content: `${track.title} added to the queue.`,
				components: [],
			});
		} catch (error) {
			console.error(error);
			interaction.editReply("Failed to load track");
		}
	}

	getVoiceChannel() {
		const interaction = InteractionContext.interaction;
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
		playMode: PLAY_MODE = PLAY_MODE.download,
	) {
		// we can assume guild is not null because music command can only be use from guilds
		const guild = InteractionContext.guild;
		if (!guild) {
			throw new Error("Guild not found");
		}

		const queue = this.queues.get<QueueMetadata>(guild.id);
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
