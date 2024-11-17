// make a command that sends a message to a specific user

import IsAdmin from '@EventsValidators/isAdmin';
import { Command } from '@Structures/command';
import { OptionsBuilder } from '@Utils/options-builder';
import { CacheType, CommandInteraction } from 'discord.js';

const options = new OptionsBuilder()
  .addStringOption({
    name: 'user-id',
    description: 'The ID of the user to send the message to',
    required: true
  })
  .addStringOption({
    name: 'message',
    description: 'The message to send to the user',
    required: true
  })
  .build();

export default class SendMessageToCommand extends Command<typeof options> {
  constructor() {
    super({
      name: 'send-message-to',
      description: 'Send a message to a specific user',
      options,
      validators: [IsAdmin],
      cmdType: 'BOTH'
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    try {
      await interaction.deferReply();
      const userId = this.options['user-id'];
      const message = this.options['message'];

      const user = await interaction.client.users.fetch(userId);
      await user.send(message);

      interaction.editReply('Message sent');
    } catch (error) {
      console.error('[send-message-to] Failed to send message', error);
      interaction.editReply('Failed to send message');
    }
  }
}
