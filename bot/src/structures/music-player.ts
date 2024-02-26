import { EmbedBuilder, SelectMenuBuilder } from '@discordjs/builders';
import {
  ActionRowBuilder,
  CacheType,
  CommandInteraction,
  ComponentType,
  GuildMember,
  StringSelectMenuInteraction,
  User,
} from 'discord.js';
import { Player, Poru } from 'poru';
import sharp from 'sharp';
import { EventEmitter } from 'tseep';
import configs from '../config';
import capitalize from '../utils/capitalize';
import getImageUrl from '../utils/get-image-from-url';
import milisecondsToReadable from '../utils/seconds-to-minutes';
import CustomPlayer from './custom-player';
import EchidnaSingleton from './echidna-singleton';

export default class MusicPlayer extends Poru {
  players: Map<string, CustomPlayer> = new Map();
  methodEmitter = new EventEmitter();
  constructor() {
    super(
      EchidnaSingleton.echidna,
      [
        {
          name: 'local-node',
          host: configs.lavaLinkHost,
          port: 2333,
          password: configs.lavaLinkPassword,
        },
      ],
      {library: 'discord.js', customPlayer: CustomPlayer},
    );
    this.on('trackStart', player => {
      const channel = EchidnaSingleton.echidna.channels.cache.get(
        player.textChannel,
      );
      if (!channel || !channel.isTextBased()) return;
      return this.nowPlaying(player.guildId);
    });
  }

  get(guildId: string): CustomPlayer {
    return super.get(guildId) as CustomPlayer;
  }

  async play(interaction: CommandInteraction<CacheType>, query: string) {
    const guildMember = interaction?.member as GuildMember;

    if (!guildMember || !guildMember.voice.channelId || !interaction.guild)
      return interaction.editReply('No voice channel found');
    let player = this.players.get(interaction.guildId!);
    if (!player) {
      const temp = interaction as any;
      player = this.createConnection({
        guildId: temp.guild.id,
        voiceChannel: temp?.member?.voice?.channelId,
        textChannel: temp?.channel?.id,
        deaf: true,
        mute: false,
      }) as CustomPlayer;
    }
    const res = await this.resolve({
      query,
      source: 'ytsearch',
      requester: interaction.member,
    });

    switch (res.loadType) {
      case 'LOAD_FAILED':
        return interaction.editReply('Failed to load track.');
      case 'NO_MATCHES':
        return interaction.editReply('No source found!');
      case 'PLAYLIST_LOADED':
        for (const track of res.tracks) {
          track.info.requester = interaction.user;
          player.queue.add(track);
        }
        interaction.editReply(
          `${res.playlistInfo.name} has been loaded with ${res.tracks.length}`,
        );
        break;
      case 'TRACK_LOADED':
        {
          const track = res.tracks[0];
          track.info.requester = interaction.user;
          player.queue.add(track);
          interaction.editReply({
            content: `${track.info.title} added to the queue.`,
            components: [],
          });
        }
        break;
      case 'SEARCH_RESULT':
        {
          const row = new ActionRowBuilder<SelectMenuBuilder>().setComponents(
            new SelectMenuBuilder()
              .setCustomId('music')
              .setPlaceholder('Click here to select a music')
              .addOptions(
                res.tracks.slice(0, 5).map(item => ({
                  label: item.info.title,
                  value: `${item.info.identifier}`,
                })),
              ),
          );
          await interaction.editReply({
            content: 'Select a song!',
            components: [row],
          });

          interaction.channel
            ?.awaitMessageComponent({
              componentType: ComponentType.StringSelect,
              time: 60 * 1000,
              filter: i => i.user.id === interaction.user.id,
            })
            .then(async inter => {
              await this.selectMusic(inter);
            })
            .catch(() => {
              interaction.editReply({
                content: 'No song was selected.',
                components: [],
              });
            });
        }
        break;
      default:
        break;
    }
    if (!player.isPlaying && player.isConnected && player.queue.length)
      player.play();
  }

  async selectMusic(interaction: StringSelectMenuInteraction<CacheType>) {
    await interaction.deferUpdate();
    if (!interaction.values.length)
      return interaction.editReply('Nothing selected');
    const id = interaction.values[0];

    try {
      const res = await this.resolve({
        query: id,
        source: 'ytsearch',
        requester: interaction.member,
      });
      if (res.loadType === 'NO_MATCHES')
        return interaction.editReply('No source found');
      const track = res.tracks[0];
      const player = this.players.get(interaction.guildId!);
      if (!player) return interaction.editReply('No player found');
      track.info.requester = interaction.user;
      player.queue.add(track);
      interaction.editReply({
        content: `${track.info.title} added to the queue.`,
        components: [],
      });
      if (!player.isPlaying && player.isConnected) player.play();
    } catch (error) {
      console.error(error);
      interaction.editReply('Failed to load track');
    }
  }

  async nowPlaying(
    guildId: string,
    interaction?: CommandInteraction<CacheType>,
  ) {
    try {
      const player = this.players.get(guildId);
      //!FIX THIS basically here if player doenst exist probably the interaction has not been sent or deferred, need to make some utils for this.
      if (!player) return interaction?.editReply('No player found');
      const {currentTrack} = player;
      const {title, uri, image, length} = currentTrack.info;
      const requester = currentTrack.info.requester as User;
      const minutes = milisecondsToReadable(length);
      const gap = {
        name: '\n',
        value: '\n',
      };
      const embed = new EmbedBuilder()
        .setTitle(`${title}`)
        .setAuthor({name: 'Now Playing: '})
        .setDescription('Player Info: ')
        .setFooter({
          text: `Duration: ${minutes} - Requested by: ${requester.displayName}`,
        })
        .setURL(uri)
        .addFields(
          gap,
          {
            name: 'Volume',
            value: `${player.volume}%`,
            inline: true,
          },
          {
            name: 'Loop mode',
            value: `${capitalize(player.loop)}`,
            inline: true,
          },
          gap,
          {
            name: `Queue (${player.queue.length})`,
            value: `${
              player.queue
                .map(track => `[${track.info.title}](${track.info.uri})`)
                .slice(0, 5)
                .join('\n') || 'Empty'
            }`,
          },
        );

      if (image) {
        embed.setImage(image);
        embed.setColor(await this.getTrackDominantColor(player));
      }
      if (interaction) {
        interaction.reply({embeds: [embed]});
        return;
      }
      const channel = this.getTextChannel(guildId);
      channel?.send({embeds: [embed]});
    } catch (error) {
      console.error(error);
    }
  }

  getTextChannel(guildId: string) {
    const player = this.players.get(guildId);
    if (!player) return;
    const channel = EchidnaSingleton.echidna.channels.cache.get(
      player.textChannel,
    );
    if (!channel || !channel.isTextBased()) return;
    return channel;
  }

  async getTrackDominantColor(
    player: Player,
  ): Promise<[number, number, number]> {
    const {currentTrack} = player;
    const {image} = currentTrack.info;
    if (!image) return [0, 0, 0];
    if (!player.data['image-url-cache']) player.data['image-url-cache'] = {};
    const imageCache = player.data['image-url-cache'] as Record<string, any>;
    const imageDominantColorCache = imageCache[image];
    if (!imageDominantColorCache) {
      const res = await getImageUrl(image);
      if (res && res.ok && res.data) {
        const {dominant} = await sharp(res.data).stats();
        imageCache[image] = Object.values(dominant);
        return imageCache[image];
      }
    }
    return imageDominantColorCache;
  }
}
