import { EmbedBuilder } from '@discordjs/builders';
import { CacheType, CommandInteraction, TextChannel } from 'discord.js';
import { DanBooruError, DanBooruPost } from '../interfaces/dan-booru';
import { danBooruAPI } from '../utils/request';

export type getImageProps = {
  tags?: string[];
  random?: boolean;
  nsfw?: boolean;
};

export default class DanBooru {
  safeMode = false;

  constructor() {}

  async querySinglePost(props: getImageProps) {
    const { tags = [], random = true, nsfw = false } = props;
    if (!nsfw) tags.push('rating:safe');
    if (this.safeMode) tags.push('rating:safe');
    let url = '/posts.json?';
    if (tags.length) url += `tags=${tags.join('+')}&`;
    url += `limit=${random ? 50 : 1}`;
    const response = await danBooruAPI.get<DanBooruPost[] | DanBooruError>(url);
    if (!Array.isArray(response.data)) {
      if (!response.data) throw new Error('Internal error, try again later.');
      throw new Error(response.data.message);
    }
    if (response.data.length === 0) throw new Error('No posts found.');
    const randomIndex = Math.floor(Math.random() * response.data.length);
    const post = random ? response.data[randomIndex] : response.data[0];
    if (post.id === null) throw new Error('Internal error, try again later.');
    return post;
  }

  async getPostById(id: number) {
    const response = await danBooruAPI.get<DanBooruPost>(`/posts/${id}.json`);
    if (!response.data) throw new Error('Post not found.');
    return response.data;
  }

  makeEmbed(post: DanBooruPost) {
    return new EmbedBuilder()
      .setURL(`https://danbooru.donmai.us/posts/${post.id}`)
      .setTitle(`Post #${post.id}`)
      .setImage(post.file_url)
      .setTimestamp()
      .setFooter({ text: `Artist:${post.tag_string_artist}` });
  }

  async sendMessage(interaction: CommandInteraction<CacheType>, post: DanBooruPost) {
    if (post.rating != 's' && !this.isNsfwAlowed(interaction)) {
      interaction.editReply('NSFW is not allowed in this channel.');
      return;
    }
    const embed = this.makeEmbed(post);
    await interaction.editReply({ embeds: [embed] });
  }

  isNsfwAlowed(interaction: CommandInteraction<CacheType>) {
    if (interaction.channel?.isTextBased() && interaction.inGuild()) {
      const channel = interaction.channel as TextChannel;
      return channel.nsfw;
    }
  }
}
