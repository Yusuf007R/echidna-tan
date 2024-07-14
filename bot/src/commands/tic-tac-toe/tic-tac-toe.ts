import { CacheType, CommandInteraction } from 'discord.js';

import { randomBytes } from 'crypto';
import { Command } from '../../structures/command';
import TicTacToe from '../../structures/tic-tac-toe';

export default class TicTacToeCommand extends Command {
  constructor() {
    super({
      name: 'tic-tac-toe',
      description: 'Play tic-tac-toe',
      options: [
        {
          type: 'user',
          name: 'user',
          description: 'The user to play with'
        }
      ]
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    const id = randomBytes(6).toString('hex')
    const tictactoe = await TicTacToe.initGame(interaction, id);
    if (!tictactoe) return;

    this.echidna.ticTacToeManager.set(id, tictactoe);
  }
}
