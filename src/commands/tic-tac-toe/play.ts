import { CacheType, CommandInteraction } from 'discord.js';
import { tictactoeCollection } from '../..';

import { Command, options } from '../../structures/command';
import TicTacToeInstance from '../../structures/tic-tac-toe';

export default class TicTacToe implements Command {
  name = 'tictactoe';

  description = 'Play tic tac toe';

  options: options[] = [
    {
      name: 'user',
      type: 'user',
      description: 'tag an user to play with',
      required: true,
    },
  ];

  async run(interaction: CommandInteraction<CacheType>) {
    const tictactoe = await TicTacToeInstance.initGame(interaction);
    if (tictactoe instanceof TicTacToeInstance) tictactoeCollection.set(interaction.id, tictactoe);
  }
}
