import { CacheType, CommandInteraction, MessageEmbed } from 'discord.js';
import { Rating } from '../../DTOs/dan-booru-post';

import { Command } from '../../structures/command';
import DanBooru from '../../structures/dan-booru';

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
          type: 'bool',
          name: 'random',
          description: 'Whether to get a random post',
        },
        {
          type: 'int',
          name: 'post-id',
          description: 'Post ID to search for',
        },
      ],
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    interaction.deferReply();
    const danbooru = new DanBooru();

    const tags = interaction.options.getString('tags');
    const postId = interaction.options.getInteger('post-id');

    const random = interaction.options.getBoolean('random');
    if (tags) {
      const post = await danbooru.querySinglePost({ random: !!random, tags: tags.split(' ') });
      interaction.editReply({ embeds: [danbooru.makeEmbed(post)] });
      return;
    }
    if (postId !== null) {
      const post = await danbooru.getPostById(postId);
      interaction.editReply({ embeds: [danbooru.makeEmbed(post)] });
    }
  }
}
