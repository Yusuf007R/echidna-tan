import { OptionsBuilder } from '@Utils/options-builder';
import { CacheType, CommandInteraction } from 'discord.js';
import { Command } from '../../structures/command';
import ValCrosshair from '../../structures/val-crosshair';

const options = new OptionsBuilder()
  .addStringOption({
    name: 'crosshair-id',
    description: 'The ID of the crosshair to generate',
    required: true
  })
  .build();

export default class ValCrosshairCommand extends Command<typeof options> {
  constructor() {
    super({
      name: 'val-crosshair',
      description: 'Generate a image of a crosshair for Valorant',
      options
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    await interaction.deferReply();
    const crosshairId = this.options['crosshair-id'];
    return await new ValCrosshair().getCrosshair(interaction, crosshairId);
  }
}
