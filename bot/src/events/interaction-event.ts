import { CacheType, Interaction } from 'discord.js';
import { DiscordEvent } from '../structures/discord-events';

export default class InteractionEvent extends DiscordEvent {
  constructor() {
    super({ eventName: 'interactionCreate' });
  }

  async run(interaction: Interaction<CacheType>): Promise<void> {
    try {
      if (interaction.isCommand()) {
        await this.echidna.commandManager.executeCommand(interaction);
        return;
      }
      if (interaction.isButton()) {
        const [type, action, value] = interaction.customId.split('-');

        switch (type) {
          case 'tictactoe':
            {
              if (!interaction.message.interaction?.id) return;
              const tictactoe = this.echidna.ticTacToeManager.get(interaction.message.interaction.id);
              if (!tictactoe) {
                interaction.reply({
                  content: 'No game found',
                  ephemeral: true
                });
                return;
              }
              switch (action) {
                case 'game':
                  await tictactoe.handleClick(interaction, value);
                  break;
                case 'request':
                  await tictactoe.startGame(interaction, value);
                  break;
                default:
                  break;
              }
            }
            break;
          default:
            break;
        }
      }
    } catch (error: any) {
      if (interaction.isMessageComponent()) {
        interaction.message.reply({
          content: error?.message || 'Internal error, try again later.'
        });

        return;
      }
      interaction.channel?.send(error?.message || 'Internal error, try again later.');
    }
  }
}
