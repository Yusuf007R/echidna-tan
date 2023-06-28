


import { EmbedBuilder } from '@discordjs/builders';
import { CacheType, CommandInteraction, GuildMember } from 'discord.js';
import { Poru } from 'poru';
import { echidnaClient } from '..';
import GetChoices from '../utils/get-choices';
import milisecondsToMinutes from '../utils/seconds-to-minutes';
import EchidnaClient from './echidna-client';
export default class MusicPlayer extends Poru {
  constructor(client: EchidnaClient) {
    super(
      client,
      [
        {
          name: 'local-node',
          host: 'localhost',
          port: 2333,
          password: 'youshallnotpass',
        },
      ],
      {library: 'discord.js'},
    );
    this.on("trackStart", (player, track) => {
      const channel = client.channels.cache.get(player.textChannel);
      if (!channel || !channel.isTextBased()) return;
      return this.nowPlaying(player.guildId);
    });
  }

  async play(interaction:  CommandInteraction<CacheType>) {

    const guildMember = interaction?.member as GuildMember;

    if (!guildMember || !guildMember.voice.channelId || !interaction.guild) return interaction.editReply('No voice channel found');
    
    const query = new GetChoices(interaction.options).getString('query', true)!;
    let player = this.players.get(interaction.guildId!);
    if (!player){
      let temp = interaction as any
      player = this.createConnection({
        guildId: temp.guild.id,
        voiceChannel: temp?.member?.voice?.channelId ,
        textChannel: temp?.channel?.id ,
        deaf: true,
        mute: false,
      });
    }
    const res = await this.resolve({query ,source:"ytsearch",requester:interaction.member,});

    if (res.loadType === "LOAD_FAILED") {
      return interaction.editReply("Failed to load track.");
    } else if (res.loadType === "NO_MATCHES") {
      return interaction.editReply("No source found!");
    }

    if (res.loadType === "PLAYLIST_LOADED") {
      for (const track of res.tracks) {
        track.info.requester = interaction.user;
        player.queue.add(track);
      }
  
      interaction.editReply(
        `${res.playlistInfo.name} has been loaded with ${res.tracks.length}`
      );
    } else {
      const track = res.tracks[0];
      track.info.requester = interaction.user;
      player.queue.add(track);
      interaction.editReply(`Queued Track \n \`${track.info.title}\``)
    }
    if (!player.isPlaying && player.isConnected) player.play();
  }


  async nowPlaying(guildId:string, interaction?: CommandInteraction<CacheType>) {
    try {
      const player = this.players.get(guildId);
      if (!player) return interaction?.editReply('No player found');
      const currentTrack  = player.currentTrack
      const {title, uri, image, length} =currentTrack.info
      const minutes = milisecondsToMinutes(Number(length));

      console.log(currentTrack.info)
      const embed = new EmbedBuilder()
        .setTitle('Now playing: ')
        .setDescription(`[${title}](${uri}/ 'Click to open link.') `)
        .setTimestamp()
        .setFooter({ text: `Duration: ${minutes}` });

      if (image) embed.setThumbnail(image);

      if (interaction) {
        interaction.reply({ embeds: [embed] });
        return;
      }
     const channel =  echidnaClient.channels.cache.get(player.textChannel);
      if (!channel || !channel.isTextBased()) return;
      channel.send({ embeds: [embed] });

    } catch (error) {
      console.error(error);
      // this.internalErrorMessage(error);
    }
  }
}

