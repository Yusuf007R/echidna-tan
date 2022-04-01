import { CacheType, CommandInteraction } from 'discord.js';
import { echidnaClient } from '../..';
import { Command } from '../../structures/command';

export default class DanbooruCommand extends Command {
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
    if (nsfw && !echidnaClient.danbooru.isNsfwAlowed(interaction)) {
      interaction.editReply('NSFW is not allowed in this channel.');
      return;
    }
    try {
      if (tags) {
        const post = await echidnaClient.danbooru.querySinglePost({
          tags: tags.split(' '),
          nsfw: !!nsfw,
        });
        echidnaClient.danbooru.sendMessage(interaction, post);
        return;
      }
      if (postId !== null) {
        const post = await echidnaClient.danbooru.getPostById(postId);
        echidnaClient.danbooru.sendMessage(interaction, post);
        return;
      }
    } catch (error: any) {
      interaction.editReply(error.message ?? 'Internal error, try again later.');
      console.log(error);
      return;
    }
    const post = await echidnaClient.danbooru.querySinglePost({ tags: ['order:rank'], nsfw: !!nsfw });
    echidnaClient.danbooru.sendMessage(interaction, post);
  }
}
