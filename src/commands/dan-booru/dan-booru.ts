import {
  CacheType, CommandInteraction
} from 'discord.js';
import { Command } from '../../structures/command';
import DanBooru from '../../structures/dan-booru';

const danbooru = new DanBooru();
export default class DanBooruCommand extends Command {
  constructor() {
    super({
      name: 'dan-booru',
      description: 'Dan booru commands',
      options: [
        {
          type: 'string',
          name: 'tags',
          description: 'Tags to search for',
        },
        {
          type: 'int',
          name: 'post-id',
          description: 'Post ID to search for',
        },
        {
          type: 'bool',
          name: 'nsfw',
          description: 'Whether to search for NSFW posts',
        },
      ],
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    await interaction.deferReply();
    const tags = interaction.options.getString('tags');
    const postId = interaction.options.getInteger('post-id');
    const nsfw = interaction.options.getBoolean('nsfw');
    if (nsfw && !danbooru.isNsfwAlowed(interaction)) {
      interaction.editReply('NSFW is not allowed in this channel.');
      return;
    }
    try {
      if (tags) {
        const post = await danbooru.querySinglePost({ tags: tags.split(' '), nsfw: !!nsfw });
        danbooru.sendMessage(interaction, post);
        return;
      }
      if (postId !== null) {
        const post = await danbooru.getPostById(postId);
        danbooru.sendMessage(interaction, post);
        return;
      }
    } catch (error: any) {
      interaction.editReply(error.message ?? 'Internal error, try again later.');
      console.log(error);
      return;
    }
    const post = await danbooru.querySinglePost({ tags: ['order:rank'], nsfw: !!nsfw });
    danbooru.sendMessage(interaction, post);
  }
}
