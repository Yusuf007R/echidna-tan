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
  CacheType,
  CommandInteraction,
  GuildMember,
  MessageActionRow,
  MessageEmbed,
  MessageSelectMenu,
  SelectMenuInteraction,
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

export enum LoopState {
  NONE = 'none',
  SINGLE = 'single',
  ALL = 'all',
}

export default class MusicPlayer {
  voiceConnection: VoiceConnection | null = null;

  queue: Track[] = [];

  audioPlayer: AudioPlayer | null = null;

  currentInteration: CommandInteraction<CacheType> | null = null;

  currentTrack: Track | null = null;

  volume = 1;

  private ignoreNextNowPlaying = false;

  loop: LoopState = LoopState.NONE;

  events = new MusicPlayerEventEmitter();

  constructor() {}

  async play(interaction: CommandInteraction<CacheType>) {
    const query = interaction.options.getString('query');
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
        const playlist = await ytpl(trimedQuery, { limit: Infinity });
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
    this.events.emit('pause');
    interaction.reply('Music paused.');
  }

  resume(interaction: CommandInteraction<CacheType>) {
    if (!this.audioPlayer) return interaction.reply('No music is playing.');
    if (this.audioPlayer?.state.status === AudioPlayerStatus.Playing) return interaction.reply('Music is already playing.');
    this.audioPlayer?.unpause();
    this.events.emit('resume');
    interaction.reply('Music resumed.');
  }

  skip(interaction: CommandInteraction<CacheType>) {
    if (!this.audioPlayer) return interaction.reply('No music is playing.');
    if (this.queue.length <= 1) return interaction.reply('No more songs in the queue.');
    this.audioPlayer?.stop();
    this.events.emit('skip');
    interaction.reply('Song skipped.');
  }

  async seek(interaction: CommandInteraction<CacheType>) {
    if (!this.audioPlayer) return interaction.reply('No music is playing.');
    if (!this.currentTrack) return interaction.reply('No track is playing.');
    const time = interaction.options.getInteger('time');
    if (time == null) return interaction.reply('No time provided');
    this.ignoreNextNowPlaying = true;
    this.audioPlayer.play(await this.currentTrack.getStream(time));
    this.events.emit('seek', time);
    interaction.reply(`Seeking to ${secondsToMinutes(time)}`);
  }

  async stop(interaction: CommandInteraction<CacheType>) {
    if (!this.audioPlayer) return interaction.reply('No music is playing.');
    this._stop();
    this.events.emit('stop');
    await interaction.reply('Stopping the music and disconnecting from the voice channel.');
  }

  async shuffle(interaction: CommandInteraction<CacheType>) {
    if (!this.audioPlayer) return interaction.reply('No music is playing.');
    console.log(this.queue);
    this.queue = shuffle(this.queue);
    console.log(this.queue);
    this.events.emit('queue', await queueToSocketQueue(this.queue));
    await interaction.reply('Queue shuffled.');
  }

  async setVolume(interaction: CommandInteraction<CacheType>) {
    if (!this.audioPlayer) return interaction.reply('No music is playing.');
    const volume = interaction.options.getInteger('volume');
    if (volume == null) return interaction.reply('No volume provided');
    this.currentTrack?.volumenTransformer?.setVolume(volume / 100);
    this.volume = volume / 100;
    this.events.emit('volume', volume);
    interaction.reply(`Volume set to ${volume}%`);
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
      const embed = new MessageEmbed()
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
    this.events.emit('loop', this.loop);
    const mode = interaction.options.getString('mode');
    if (!mode) return interaction.reply('No mode provided');
    switch (mode) {
      case 'none':
        interaction.reply('Loop mode set to none.');
        this.loop = LoopState.NONE;
        break;
      case 'single':
        interaction.reply('Loop mode set to single.');
        this.loop = LoopState.SINGLE;
        break;
      case 'all':
        interaction.reply('Loop mode set to all.');
        this.loop = LoopState.ALL;
        break;
      default:
        break;
    }
  }

  private async youtubeSearch(interaction: CommandInteraction<CacheType>, query: string) {
    try {
      const results = await ytsr(query, { limit: 5 });
      const tracks = results.items.filter((item) => item.type === 'video') as ytsr.Video[];
      if (!tracks.length) return interaction.editReply('No results found');
      const row = new MessageActionRow().addComponents(
        new MessageSelectMenu()
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

  async selectMusic(interaction: SelectMenuInteraction<CacheType>) {
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
    if (Array.isArray(track)) {
      this.queue.push(...track);
      return;
    }
    this.queue.push(track);
    this.events.emit('queue', await queueToSocketQueue(this.queue));
  }

  private async _play() {
    try {
      if (!this.queue.length) return;
      if (this.audioPlayer?.state.status === AudioPlayerStatus.Playing) return;
      if (!this.voiceConnection) {
        this._connectVoiceChannel();
      }

      this.currentTrack = this.queue.shift()!;
      this.events.emit('queue', await queueToSocketQueue(this.queue));

      this.audioPlayer?.play(await this.currentTrack.getStream(0, this.volume));
      this.events.emit('play', await this.currentTrack.toSocketTrack());
    } catch (error) {
      this.internalErrorMessage(error);
    }
  }

  private _stop() {
    if (!this.currentInteration?.guildId) return;
    this.audioPlayer?.removeAllListeners();
    this.queue = [];
    this.audioPlayer?.stop(true);
    this.voiceConnection?.removeAllListeners();
    this.voiceConnection?.destroy();
    this.voiceConnection = null;
    echidnaClient.musicManager.delete(this.currentInteration.guildId);
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
    if (
      oldState.status === AudioPlayerStatus.Playing
      && newState.status === AudioPlayerStatus.Idle
    ) {
      if (!this.currentTrack) return;
      console.log('Song ended');
      switch (this.loop) {
        case LoopState.SINGLE:
          this.pushTrack(this.currentTrack);
          this.loop = LoopState.NONE;
          break;
        case LoopState.ALL:
          this.pushTrack(this.currentTrack);
          break;
        default:
          break;
      }

      if (this.queue.length) return this._play();
      this.currentInteration?.followUp(
        'Music queue is empty, So I will disconnect from the voice channel.',
      );

      this._stop();
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
}
