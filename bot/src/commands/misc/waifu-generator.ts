import { CacheType, CommandInteraction } from 'discord.js';
import { Command } from '../../structures/command';

export default class WaifuGeneratorCommand extends Command {
  constructor() {
    super({
      shouldDefer: true,
      name: 'waifu-generator',
      description: 'Generate Waifu using AI',
      cmdType: 'BOTH',
      options: [
        {
          type: 'string',
          name: 'prompt',
          description: 'Prompt to generate waifu from'
        }
      ]
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const prompt = this.choices.getString('prompt', true);
    const config = this.echidna.waifuGenerator.getConfigs({ prompt });
    const { embed, attachment, info } = this.echidna.waifuGenerator.makeEmbed(
      await this.echidna.waifuGenerator.getImage(config)
    );
    const message = await interaction.editReply({
      embeds: [embed],
      files: [attachment],
      options: {
        fetchReply: true
      }
    });

    const channel = message.channel || (await message.client.channels.fetch(message.channelId));
    if (message && channel) {
      await message.react('⬆️');
      const reactions = await message.awaitReactions({
        filter: (reaction, user) => {
          return reaction.emoji.name === '⬆️' && user.id === interaction.user.id && !user.bot;
        },
        time: 2400000,
        max: 1,
        errors: ['time']
      });

      if (reactions.first()?.emoji.name === '⬆️') {
        await this.echidna.waifuGenerator.upscaleImage(message, info);
        await message.reactions.cache.find((r) => r.emoji.name === '⬆️')?.remove();
      }
    }
  }
}
