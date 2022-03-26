import { CacheType, CommandInteraction } from 'discord.js';
import { tictactoeCollection } from '../..';

import { Command, options } from '../../structures/command';
import TicTacToe from '../../structures/tic-tac-toe';

export default class TicTacToeCommand implements Command {
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
    const tictactoe = await TicTacToe.startGame(interaction);
    if (tictactoe instanceof TicTacToe) tictactoeCollection.set(interaction.id, tictactoe);
  }
}
