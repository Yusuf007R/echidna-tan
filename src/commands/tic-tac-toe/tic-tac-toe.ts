import { CacheType, CommandInteraction } from 'discord.js';
import { tictactoeCollection } from '../..';

import { Command, options } from '../../structures/command';
import TicTacToe from '../../structures/tic-tac-toe';

export default class TicTacToeCommand extends Command {
  constructor() {
    super({
      name: 'tic-tac-toe',
      description: 'Play tic-tac-toe',
      options: [
        {
          type: 'string',
          name: 'query',
          description: 'query to search or url to play',
          required: true,
        },
      ],
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const tictactoe = await TicTacToe.initGame(interaction);
    if (tictactoe instanceof TicTacToe) tictactoeCollection.set(interaction.id, tictactoe);
  }
}
