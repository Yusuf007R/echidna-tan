import { CacheType, CommandInteraction } from 'discord.js';
import { echidnaClient } from '../..';
import { Command } from '../../structures/command';
import GetChoices from '../../utils/get-choices';

export default class WaifuGeneratorCommand extends Command {
  constructor() {
    super({
      shouldDefer: true,
      name: 'waifu-generator',
      description: 'Generate Waifu using AI',
      options: [
        {
          type: 'string',
          name: 'prompt',
          description: 'Prompt to generate waifu from',
        },
      ],
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const choices = new GetChoices(interaction.options);
    const prompt = choices.getString('prompt', true)!;
    const config = echidnaClient.waifuGenerator.getConfigs({prompt});
    const {embed, attachment, info} = echidnaClient.waifuGenerator.makeEmbed(
      await echidnaClient.waifuGenerator.getImage(config),
    );
    const message = await interaction.editReply({
      embeds: [embed],
      files: [attachment],
    });
    await message.react('⬆️');
    message
      .awaitReactions({
        filter: (reaction, user) => {
          return (
            reaction.emoji.name === '⬆️' &&
            user.id === interaction.user.id &&
            !user.bot
          );
        },
        time: 2400000,
        max: 1,
        errors: ['time'],
      })
      .then(async reaction => {
        if (reaction.first()?.emoji.name === '⬆️') {
          await echidnaClient.waifuGenerator.upscaleImage(message, info);
          await message.reactions.cache
            .find(r => r.emoji.name === '⬆️')
            ?.remove();
        }
      })
      .catch(error => console.log(error));
  }
}
