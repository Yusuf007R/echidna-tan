import { MessageEmbed } from 'discord.js';
import { DanBooruPost } from '../DTOs/dan-booru-post';
import danBooruAPI from '../utils/request';

export type getImageProps = {
  tags?: string[];
  random?: boolean;
};

export default class DanBooru {
  safeMode = false;

  constructor() {}

  async querySinglePost(props: getImageProps) {
    const response = await danBooruAPI.get<DanBooruPost[]>(this.makeUrl(props));
    if (!response.data?.length) throw new Error('No post');
    const post = response.data[0];
    if (post.id === null) throw new Error('No post');
    return post;
  }

  async getPostById(id: number) {
    const response = await danBooruAPI.get<DanBooruPost>(`/posts/${id}.json`);
    if (!response.data) throw new Error('No post');
    return response.data;
  }

  makeUrl(props: getImageProps) {
    const { tags = [], random = false } = props;
    if (random) tags.push('order:random');
    if (this.safeMode) tags.push('rating:safe');
    let url = '/posts.json?';
    if (tags.length) url += `tags=${tags.join('+')}&`;
    url += `limit=${1}`;
    return url;
  }

  makeEmbed(post: DanBooruPost) {
    return new MessageEmbed()
      .setURL(`https://danbooru.donmai.us/posts/${post.id}`)
      .setTitle(`Post #${post.id}`)
      .setImage(post.file_url)
      .setTimestamp()
      .setFooter({ text: `Artist:${post.tag_string_artist}` });
  }
}
