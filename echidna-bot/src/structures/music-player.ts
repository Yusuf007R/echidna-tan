import {
  AudioPlayer,
  AudioPlayerState,
  AudioPlayerStatus,
  createAudioPlayer,
  joinVoiceChannel,
  NoSubscriberBehavior,
  VoiceConnection,
} from '@discordjs/voice';
import {
  ActionRow,
  CacheType,
  CommandInteraction,
  GuildMember,
} from 'discord.js';

import ytdl from 'ytdl-core';
import ytpl from 'ytpl';

import ytsr from 'ytsr';
import { echidnaClient } from '..';
import queueToSocketQueue from '../utils/queue-to-socket-queue';

import secondsToMinutes from '../utils/seconds-to-minutes';
import shuffle from '../utils/shuffle';
import { MusicPlayerEventEmitter } from '../DTOs/music-player.event-emitter';
import Track from './track';
import { LoopState, MusicSocketData } from '../../../common/DTOs/music-player-socket';
import { ActionRowBuilder, EmbedBuilder, SelectMenuBuilder } from '@discordjs/builders';
import GetChoices from '../utils/get-choices';
import { StringSelectMenuInteraction } from 'discord.js';

export default class MusicPlayer {
  voiceConnection: VoiceConnection | null = null;

  queue: Track[] = [];

  audioPlayer: AudioPlayer | null = null;

  currentInteration: CommandInteraction<CacheType> | null = null;

  currentTrack: Track | null = null;

  volume = 100;

  private ignoreNextNowPlaying = false;

  loop: LoopState = LoopState.None;

  events = new MusicPlayerEventEmitter();

  alReadyInitalized = false;

  constructor() {}

  async play(interaction: CommandInteraction<CacheType>) {
    const query = new GetChoices(interaction.options).getString('query');
    this.currentInteration = interaction;
    if (!query) return interaction.editReply('No query provided');
    const trimedQuery = query.trim();
    if (ytdl.validateURL(trimedQuery) || ytdl.validateID(trimedQuery)) {
      try {
        const track = new Track(trimedQuery);
        this.pushTrack(track);
        interaction.editReply({ content: `${(await track.getInfo()).title} added to the queue.` });
        this._play();
      } catch (error) {
        this.internalErrorMessage(error);
      }
      return;
    }
    if (ytpl.validateID(trimedQuery)) {
      try {
        const playlist = await ytpl(trimedQuery, { limit: 30 });
        if (playlist.estimatedItemCount > 30) interaction.channel?.send('Only the first 30 songs will be added to the queue.');
        this.pushTrack([...playlist.items.map((item) => new Track(item.shortUrl))]);
        interaction.editReply({
          content: `${playlist.items.length} songs have been added to the Queue.`,
        });
        this._play();
      } catch (error) {
        this.internalErrorMessage(error);
      }
      return;
    }
    await this.youtubeSearch(interaction, trimedQuery);
  }

  pause(interaction: CommandInteraction<CacheType>) {
    if (!this.audioPlayer) return interaction.reply('No music is playing.');
    if (this.audioPlayer.state.status === AudioPlayerStatus.Paused) return interaction.reply('music is already paused.');
    this.audioPlayer?.pause();
    this.events.emit('status', this.audioPlayer.state.status);
    interaction.reply('Music paused.');
  }

  resume(interaction: CommandInteraction<CacheType>) {
    if (!this.audioPlayer) return interaction.reply('No music is playing.');
    if (this.audioPlayer?.state.status === AudioPlayerStatus.Playing) return interaction.reply('Music is already playing.');
    this.audioPlayer?.unpause();
    this.events.emit('status', this.audioPlayer.state.status);
    interaction.reply('Music resumed.');
  }

  skip(interaction: CommandInteraction<CacheType>) {
    if (!this.audioPlayer) return interaction.reply('No music is playing.');
    if (!this.queue.length) return interaction.reply('No more songs in the queue.');
    this.audioPlayer?.stop();

    interaction.reply('Song skipped.');
  }

  async seek(interaction: CommandInteraction<CacheType>) {
    if (!this.audioPlayer) return interaction.reply('No music is playing.');
    if (!this.currentTrack) return interaction.reply('No track is playing.');
    const time = new GetChoices(interaction.options).getNumber('time');
    if (time == null) return interaction.reply('No time provided');
    this._seek(time);

    interaction.reply(`Seeking to ${secondsToMinutes(time)}`);
  }

  async _seek(time: number) {
    if (!this.audioPlayer || !this.currentTrack) return;
    this.ignoreNextNowPlaying = true;
    this.audioPlayer.play(await this.currentTrack.getStream(time, this.volume / 100));
  }

  async stop(interaction: CommandInteraction<CacheType>) {
    if (!this.audioPlayer) return interaction.reply('No music is playing.');
    if (!this.currentInteration?.guildId) return;
    this._stop(this.currentInteration?.guildId);
    this.events.emit('stop');
    await interaction.reply('Stopping the music and disconnecting from the voice channel.');
  }

  async shuffle(interaction: CommandInteraction<CacheType>) {
    if (!this.audioPlayer) return interaction.reply('No music is playing.');

    this.queue = shuffle(this.queue);

    this.events.emit('queue', await queueToSocketQueue(this.queue));
    await interaction.reply('Queue shuffled.');
  }

  async setVolume(interaction: CommandInteraction<CacheType>) {
    if (!this.audioPlayer) return interaction.reply('No music is playing.');
    const volume = new GetChoices(interaction.options).getNumber('volume');
    if (volume == null) return interaction.reply('No volume provided');
    this._setVolume(volume);
    this.events.emit('volume', volume);
    interaction.reply(`Volume set to ${volume}%`);
  }

  _setVolume(volume: number) {
    if (!this.audioPlayer) return;
    this.volume = volume;
    this.currentTrack?.volumenTransformer?.setVolume(this.volume / 100);
    this.events.emit('volume', volume);
  }

  _setLoop(loop: LoopState) {
    this.loop = loop;
    this.events.emit('loop', loop);
  }

  async nowPlaying(interaction?: CommandInteraction<CacheType>) {
    try {
      if (!this.currentTrack) return this.internalErrorMessage('Current track not found');

      if (this.ignoreNextNowPlaying) return (this.ignoreNextNowPlaying = false);
      const {
        title, video_url, thumbnails, lengthSeconds,
      } = await this.currentTrack.getInfo();
      thumbnails.sort((a, b) => b.width + b.height - (a.width + a.height));
      const minutes = secondsToMinutes(Number(lengthSeconds));
      const embed = new EmbedBuilder()
        .setTitle('Now playing: ')
        .setDescription(`[${title}](${video_url}/ 'Click to open link.') `)
        .setTimestamp()
        .setFooter({ text: `Duration: ${minutes}` });

      if (thumbnails.length) embed.setThumbnail(thumbnails[0].url);

      if (interaction) {
        interaction.reply({ embeds: [embed] });
        return;
      }
      this.currentInteration?.channel?.send({ embeds: [embed] });
    } catch (error) {
      this.internalErrorMessage(error);
    }
  }

  async setLoopMode(interaction: CommandInteraction<CacheType>) {
    const mode =  new GetChoices(interaction.options).getString('mode');
    if (!mode) return interaction.reply('No mode provided');
    switch (mode) {
      case 'none':
        interaction.reply('Loop mode set to none.');
        this.loop = LoopState.None;
        break;
      case 'single':
        interaction.reply('Loop mode set to single.');
        this.loop = LoopState.Single;
        break;
      case 'all':
        interaction.reply('Loop mode set to all.');
        this.loop = LoopState.All;
        break;
      default:
        break;
    }
    this.events.emit('loop', this.loop);
  }

  private async youtubeSearch(interaction: CommandInteraction<CacheType>, query: string) {
    try {
      const results = await ytsr(query, { limit: 5 });
      const tracks = results.items.filter((item) => item.type === 'video') as ytsr.Video[];
      if (!tracks.length) return interaction.editReply('No results found');
      const row =  new ActionRowBuilder<SelectMenuBuilder>().setComponents(
        new SelectMenuBuilder()
          .setCustomId('music')
          .setPlaceholder('Click here to select a music')
          .addOptions(
            tracks.map((item) => ({
              label: item.title,
              value: `${item.id}`,
            })),
          ),
      );
      this.currentInteration = interaction;
      await interaction.editReply({ content: 'Select a song!', components: [row] });
    } catch (error) {
      this.internalErrorMessage(error);
    }
  }

  async selectMusic(interaction: StringSelectMenuInteraction<CacheType>) {
    await interaction.deferUpdate();
    if (interaction.message.interaction?.id !== this.currentInteration?.id) return interaction.editReply({ content: 'Wrong interaction', components: [] });
    if (!interaction.values.length) return interaction.editReply('Nothing selected');
    const id = interaction.values[0];

    try {
      const track = new Track(id);
      this.pushTrack(track);
      this._play();
      interaction.editReply({
        content: `${(await track.getInfo()).title} added to the queue.`,
        components: [],
      });
    } catch (error) {
      this.internalErrorMessage(error);
    }
  }

  async pushTrack(track: Track | Track[]) {
    if (Array.isArray(track)) this.queue.push(...track);
    else this.queue.push(track);
    this.events.emit(
      'trackAdded',
      Array.isArray(track) ? await queueToSocketQueue(track) : await track.toSocketTrack(),
    );
  }

  private async _play() {
    try {
      if (!this.queue.length) return;
      if (this.audioPlayer?.state.status === AudioPlayerStatus.Playing) return;
      if (!this.voiceConnection) {
        this._connectVoiceChannel();
      }

      this.currentTrack = this.queue.shift()!;
      this.events.emit('trackRemoved', await this.currentTrack.toSocketTrack());

      this.audioPlayer?.play(await this.currentTrack.getStream(0, this.volume / 100));
      this.events.emit('currentTrack', await this.currentTrack.toSocketTrack());

      if (!this.alReadyInitalized) {
        this.events.emit('data', await this.getDataToSocket());
        this.alReadyInitalized = true;
      }
    } catch (error) {
      this.internalErrorMessage(error);
    }
  }

  _stop(guildId: string) {
    this.audioPlayer?.removeAllListeners();
    this.queue = [];
    this.audioPlayer?.stop(true);
    this.voiceConnection?.removeAllListeners();
    this.voiceConnection?.destroy();
    this.voiceConnection = null;
    this.events.removeAllListeners();
    echidnaClient.musicManager.remove(guildId);
  }

  private async _connectVoiceChannel() {
    if (!this.audioPlayer) {
      this.audioPlayer = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play,
        },
      });
      this.audioPlayer.on('error', (err) => console.log('Audio player error', err));
      // @ts-ignore
      this.audioPlayer.on('stateChange', (_old, _new) => this._audioPlayerStateListener(_old, _new));
    }

    const guildMember = this.currentInteration?.member as GuildMember;

    if (this.voiceConnection || !guildMember || !guildMember.voice.channelId) return this.currentInteration?.editReply('No voice channel found');
    this.voiceConnection = joinVoiceChannel({
      channelId: guildMember.voice.channelId,
      guildId: guildMember.guild.id,
      adapterCreator: guildMember.guild.voiceAdapterCreator,
    });
    this.voiceConnection.on('error', (err) => console.log('Connection error', err));

    this.voiceConnection.subscribe(this.audioPlayer);
  }

  private async _audioPlayerStateListener(oldState: AudioPlayerState, newState: AudioPlayerState) {
    if (newState.status != AudioPlayerStatus.Buffering) this.events.emit('status', newState.status);

    if (
      oldState.status === AudioPlayerStatus.Playing
      && newState.status === AudioPlayerStatus.Idle
    ) {
      if (!this.currentTrack) return;
      console.log('Song ended');
      switch (this.loop) {
        case LoopState.Single:
          this.pushTrack(this.currentTrack);
          this.loop = LoopState.None;
          break;
        case LoopState.All:
          this.pushTrack(this.currentTrack);
          break;
        default:
          break;
      }

      if (this.queue.length) return this._play();
      this.currentInteration?.followUp(
        'Music queue is empty, So I will disconnect from the voice channel.',
      );
      if (!this.currentInteration?.guildId) return;
      this._stop(this.currentInteration?.guildId);
    }

    if (
      oldState.status === AudioPlayerStatus.Buffering
      && newState.status === AudioPlayerStatus.Playing
    ) {
      this.nowPlaying();
    }
  }

  private async internalErrorMessage(error: unknown) {
    console.error(error);
    if (this.currentInteration) {
      this.currentInteration.editReply('Something went wrong, please try again later.');
    }
  }

  async getDataToSocket(): Promise<MusicSocketData> {
    return {
      queue: await queueToSocketQueue(this.queue),
      currentTrack: (await this.currentTrack?.toSocketTrack()) ?? null,
      loop: this.loop,
      volume: this.volume,
      status: this.audioPlayer?.state.status ?? AudioPlayerStatus.Idle,
      currentTime: this.currentTrack?.getCurrentTime() ?? 0,
    };
  }
}
