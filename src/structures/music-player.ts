import {
  AudioPlayer,
  AudioPlayerState,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
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

import ytsr from 'ytsr';
import createYTStream from '../utils/create-yt-stream';
import secondsToMinutes from '../utils/seconds-to-minutes';

export default class MusicPlayer {
  private voiceConnection: VoiceConnection | null = null;

  private queue: ytdl.videoInfo[] = [];

  private audioPlayer: AudioPlayer;

  private currentInteration: CommandInteraction<CacheType> | null = null;

  constructor() {
    this.audioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });
    this.audioPlayer.on('error', (err) => console.log('Audio player error', err));
    // @ts-ignore
    this.audioPlayer.on('stateChange', (_old, _new) => this._audioPlayerStateListener(_old, _new));
  }

  async play(interaction: CommandInteraction<CacheType>) {
    const query = interaction.options.getString('query');
    this.currentInteration = interaction;
    if (!query) return interaction.editReply('No query provided');

    if (ytdl.validateURL(query)) {
      try {
        const video = await ytdl.getInfo(query);
        this.queue.push(video);
        interaction.editReply({ content: `${video.videoDetails.title} added to the queue.` });
        this._play();
      } catch (error) {
        this._internalErrorMessage(error);
      }
    } else {
      await this.youtubeSearch(interaction, query);
    }
  }

  pause(interaction: CommandInteraction<CacheType>) {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Paused) return interaction.editReply('music is already paused.');
    interaction.editReply('Music paused.');
    this.audioPlayer.pause();
  }

  resume(interaction: CommandInteraction<CacheType>) {
    if (this.audioPlayer.state.status === AudioPlayerStatus.Playing) return interaction.editReply('Music is already playing.');
    interaction.editReply('Music resumed.');
    this.audioPlayer.unpause();
  }

  skip(interaction: CommandInteraction<CacheType>) {
    if (this.queue.length <= 1) return interaction.editReply('No more songs in the queue.');
    this.audioPlayer.stop();

    interaction.editReply('Song skipped.');
  }

  async stop(interaction: CommandInteraction<CacheType>) {
    // this.audioPlayer.removeAllListeners();
    this.audioPlayer.stop(true);
    this.queue = [];
    // this.voiceConnection?.removeAllListeners();
    // this.voiceConnection?.destroy();
    // this.voiceConnection = null;
    await interaction.editReply('Stopping the music and disconnecting from the voice channel.');
  }

  private async youtubeSearch(interaction: CommandInteraction<CacheType>, query: string) {
    try {
      const results = await ytsr(query, { limit: 5 });
      const tracks = results.items.filter((item) => item.type === 'video') as ytsr.Video[];

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
      this._internalErrorMessage(error);
    }
  }

  async selectMusic(interaction: SelectMenuInteraction<CacheType>) {
    if (interaction.message.interaction?.id !== this.currentInteration?.id) return interaction.update({ content: 'Wrong interaction', components: [] });
    if (!interaction.values.length) return interaction.editReply('Nothing selected');
    const id = interaction.values[0];

    try {
      const videoInfo = await ytdl.getInfo(id);
      this.queue.push(videoInfo);
      this._play();
      interaction.update({
        content: `${videoInfo.videoDetails.title} added to the queue.`,
        components: [],
      });
    } catch (error) {
      this._internalErrorMessage(error);
    }
  }

  private async _play() {
    try {
      if (!this.queue.length) return;
      if (this.audioPlayer.state.status === AudioPlayerStatus.Playing) return;
      if (!this.voiceConnection) {
        this._connectVoiceChannel();
      }
      const data = this.queue[0];

      const filteredFormats = data.formats
        .filter((item) => !!item.audioBitrate)
        .sort((a, b) => {
          if (!a.audioBitrate || !b.audioBitrate) return 1;
          return b.audioBitrate - a.audioBitrate;
        });

      if (!filteredFormats.length) return this._internalErrorMessage('No audio formats found after filtering');
      const format = filteredFormats[0];
      const buffer = createYTStream(data, format, {});
      const resource = createAudioResource(buffer);
      this.audioPlayer.play(resource);
    } catch (error) {
      this._internalErrorMessage(error);
    }
  }

  private async _connectVoiceChannel() {
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
      console.log('Song ended');
      this.queue.shift();
      if (this.queue.length) return this._play();
      this.currentInteration?.followUp(
        'Music queue is empty, So I will disconnect from the voice channel.',
      );
      this.voiceConnection?.destroy();
      this.voiceConnection = null;
    }

    if (
      oldState.status === AudioPlayerStatus.Buffering
      && newState.status === AudioPlayerStatus.Playing
    ) {
      const {
        title, video_url, thumbnails, lengthSeconds,
      } = this.queue[0].videoDetails;
      const minutes = secondsToMinutes(Number(lengthSeconds));
      const embed = new MessageEmbed()
        .setTitle('Now playing: ')
        .setDescription(`[${title}](${video_url}/ 'Click to open link.') `)
        .setTimestamp()
        .setFooter({ text: `Duration: ${minutes}` });
      if (thumbnails.length) embed.setThumbnail(thumbnails[0].url);
      this.currentInteration?.channel?.send({ embeds: [embed] });
    }
  }

  async _internalErrorMessage(error: unknown) {
    console.error(error);
    if (this.currentInteration) {
      this.currentInteration.editReply('Something went wrong, please try again later.');
    }
  }
}
