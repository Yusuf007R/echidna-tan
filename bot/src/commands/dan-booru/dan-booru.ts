import {CacheType, CommandInteraction} from 'discord.js';
import {Command} from '../../structures/command';

export default class DanbooruCommand extends Command {
  constructor() {
    super({
      name: 'dan-booru',
      description: 'Dan booru commands',
      cmdType: 'BOTH',
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
    const tags = this.choices.getString('tags');
    const postId = this.choices.getNumber('post-id');
    const nsfw = this.choices.getBoolean('nsfw');
    if (nsfw && !this.echidna.danbooru.isNsfwAlowed(interaction)) {
      interaction.editReply('NSFW is not allowed in this channel.');
      return;
    }
    try {
      if (tags) {
        const post = await this.echidna.danbooru.querySinglePost({
          tags: tags.split(' '),
          nsfw: !!nsfw,
        });
        this.echidna.danbooru.sendMessage(interaction, post);
        return;
      }
      if (postId) {
        const post = await this.echidna.danbooru.getPostById(postId);
        this.echidna.danbooru.sendMessage(interaction, post);
        return;
      }
    } catch (error: any) {
      interaction.editReply(
        error.message ?? 'Internal error, try again later.',
      );
      console.log(error);
      return;
    }
    const post = await this.echidna.danbooru.querySinglePost({
      tags: ['order:rank'],
      nsfw: !!nsfw,
    });
    await this.echidna.danbooru.sendMessage(interaction, post);
  }
}
