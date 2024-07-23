import capitalize from '@Utils/capitalize';
import getImageUrl from '@Utils/get-image-from-url';
import milisecondsToReadable from '@Utils/seconds-to-minutes';
import { ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } from '@discordjs/builders';
import { GuildQueue, Player, Playlist, QueueRepeatMode, Track } from 'discord-player';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { BaseInteraction, CacheType, CommandInteraction, GuildMember, StringSelectMenuInteraction } from 'discord.js';
import sharp from 'sharp';
import StringSelectComponent from '../components/string-select';
import EchidnaClient from './echidna-client';

export type QueueMetadata = {
  interaction: BaseInteraction<CacheType>;
  'image-url-cache': Record<string, any>;
};

export default class MusicPlayer extends Player {
  constructor(echidna: EchidnaClient) {
    super(echidna);
    this.init();
  }

  init() {
    this.loadExtractors();
    this.listenForEvents();
  }

  async loadExtractors() {
    // await this.extractors.loadDefault();
    await this.extractors.register(YoutubeiExtractor, {});
  }

  listenForEvents() {
    // the arrow function is needed so `newPlaying` doesn't get the event scope
    this.events.on('playerStart', (queue) => this.nowPlaying(queue));
    this.on('debug', async (message) => {
      console.log(`General player debug event: ${message}`);
    });

    this.events.on('debug', async (queue, message) => {
      console.log(`Player debug event: ${message} - ${queue.guild.name}`);
    });
  }

  async playCmd(interaction: CommandInteraction<CacheType>, query: string) {
    if (!this.getVoiceChannel(interaction)) {
      await interaction.editReply('You are not connected to a voice channel!');
      return;
    }

    const searchResult = await this.search(query, { requestedBy: interaction.user });

    if (!searchResult.hasTracks()) {
      await interaction.editReply('No tracks found');
      return;
    }

    if (searchResult.tracks.length === 1) {
      const track = searchResult.tracks[0];
      this.addTrack(track, interaction);
      return;
    }

    const firstFiveTracks = searchResult.tracks.slice(0, 5);

    const customId = `${interaction.id}-music`;

    const stringSelectComponent = new StringSelectComponent({
      custom_id: customId,
      interaction,
      options: firstFiveTracks.map((item, index) => ({
        label: item.title,
        value: index.toString()
      }))
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
          content: 'No song was selected.',
          components: []
        });
      })
      .build();

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().setComponents(stringSelectComponent);

    await interaction.editReply({
      content: 'Select a song!',
      components: [row]
    });
  }

  async nowPlaying(queue: GuildQueue<QueueMetadata>): Promise<void> {
    const currentTrack = queue.currentTrack;
    if (!currentTrack) {
      queue.channel?.send('Currently not playing a track');
      return;
    }
    const { title, requestedBy, durationMS, url, thumbnail } = currentTrack;
    const minutes = milisecondsToReadable(durationMS);

    const gap = {
      name: '\n',
      value: '\n'
    };
    const embed = new EmbedBuilder()
      .setTitle(`${title}`)
      .setAuthor({ name: 'Now Playing: ' })
      .setDescription('Player Info: ')
      .setURL(url ?? '')
      .addFields(
        gap,
        {
          name: 'Volume',
          value: `${queue.node.volume}%`,
          inline: true
        },
        {
          name: 'Loop mode',
          value: `${capitalize(QueueRepeatMode[queue.repeatMode])}`,
          inline: true
        },
        gap,
        {
          name: `Queue (${queue.tracks.size})`,
          value: `${
            queue.tracks
              .map((track) => `[${track.title}](${track.url})`)
              .slice(0, 5)
              .join('\n') || 'Empty'
          }`
        }
      );
    if (requestedBy) {
      embed.setFooter({
        text: `Duration: ${minutes} - Requested by: ${requestedBy.displayName}`
      });
    }
    if (thumbnail) {
      embed.setImage(thumbnail);
      embed.setColor(await this.getTrackDominantColor(queue));
    }
    queue.metadata.interaction.channel?.send({ embeds: [embed] });
  }

  async selectMusic(interaction: StringSelectMenuInteraction<CacheType>, tracks: Track<unknown>[]) {
    await interaction.deferUpdate();
    if (!interaction.values.length) return interaction.editReply('Nothing selected');

    try {
      const index = Number(interaction.values[0]);
      const track = tracks[index];
      this.addTrack(track, interaction);
      interaction.editReply({
        content: `${track.title} added to the queue.`,
        components: []
      });
    } catch (error) {
      console.error(error);
      interaction.editReply('Failed to load track');
    }
  }

  getVoiceChannel(interaction: BaseInteraction<CacheType>) {
    const guildMember = interaction?.member as GuildMember;
    return guildMember?.voice?.channel;
  }

  addTrack(track: Track | Track[] | Playlist, interaction: BaseInteraction<CacheType>) {
    // we can assume guild is not null because music command can only be use from guilds
    const queue = this.queues.get(interaction.guild!);
    if (!queue) {
      const voiceChannel = this.getVoiceChannel(interaction);
      this.play(voiceChannel!, track, {
        nodeOptions: {
          metadata: {
            interaction: interaction
          }
        }
      });
      return;
    }
    if (!queue.isPlaying()) return queue.play(track);
    queue.addTrack(track);
  }

  async getTrackDominantColor(queue: GuildQueue<QueueMetadata>): Promise<[number, number, number]> {
    const image = queue.currentTrack?.thumbnail;
    if (!image) return [0, 0, 0];
    if (!queue.metadata['image-url-cache']) queue.metadata['image-url-cache'] = {};
    const imageCache = queue.metadata['image-url-cache'] as Record<string, any>;
    const imageDominantColorCache = imageCache[image];
    if (!imageDominantColorCache) {
      const res = await getImageUrl(image);
      if (res && res.ok && res.data) {
        const { dominant } = await sharp(res.data).stats();
        imageCache[image] = Object.values(dominant);
        return imageCache[image];
      }
    }
    return imageDominantColorCache;
  }
}
