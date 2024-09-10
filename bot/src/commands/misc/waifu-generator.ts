import WaifuGenerator from '@AiStructures/waifu-generator';
import { OptionsBuilder } from '@Utils/options-builder';
import { CacheType, CommandInteraction } from 'discord.js';
import { Command } from '../../structures/command';

const options = new OptionsBuilder()
  .addStringOption({
    name: 'prompt',
    description: 'Prompt to generate waifu from'
  })
  .build();

export default class WaifuGeneratorCommand extends Command<typeof options> {
  constructor() {
    super({
      shouldDefer: true,
      name: 'waifu-generator',
      description: 'Generate Waifu using AI',
      cmdType: 'BOTH',
      options
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const prompt = this.options.prompt;
    const waifuGenerator = new WaifuGenerator();
    const config = waifuGenerator.getConfigs({ prompt });
    const { embed, attachment, info } = waifuGenerator.makeEmbed(await waifuGenerator.getImage(config));
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
        await waifuGenerator.upscaleImage(message, info);
        await message.reactions.cache.find((r) => r.emoji.name === '⬆️')?.remove();
      }
    }
  }
}
