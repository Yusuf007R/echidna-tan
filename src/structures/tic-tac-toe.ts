import {
  ButtonInteraction,
  CacheType,
  CommandInteraction,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  User,
} from 'discord.js';
import { tictactoeCollection } from '..';

const TABLE = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const WIN_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const TIMEOUT_TIME = 60 * 1000;

export enum TicTacToeStatus {
  Waiting,
  GameTimeout,
  RequestTimeout,
  Declined,
  Playing,
  Finished,
}

export default class TicTacToe {
  private table: ('x' | 'o' | number)[];

  private turn: 'x' | 'o' = 'x';

  private currentInteraction: CommandInteraction<CacheType>;

  private player1: User;

  private player2: User;

  private status: TicTacToeStatus = TicTacToeStatus.Waiting;

  private timeOut: NodeJS.Timeout | null = null;

  constructor(player1: User, player2: User, interaction: CommandInteraction<CacheType>) {
    this.player1 = player1;
    this.player2 = player2;
    this.currentInteraction = interaction;
    this.table = [...TABLE];
    this.resetTimeout(true);
    this.sendGameRequest();
  }

  static initGame(interaction: CommandInteraction<CacheType>) {
    const player1 = interaction.user;
    const player2 = interaction.options.getUser('user');
    if (!player2) return interaction.editReply('You need to specify a user to play with.');
    if (player1.id === player2.id) return interaction.editReply("You can't play with yourself.");
    if (player2.bot) return interaction.editReply("You can't play with a bot.");
    return new TicTacToe(player1, player2, interaction);
  }

  async startGame(interaction: ButtonInteraction<CacheType>, value: string) {
    if (interaction.user.id !== this.player2.id) {
      return interaction.reply({
        content: `You are not ${this.player2.toString()} `,
        ephemeral: true,
      });
    }
    this.status = TicTacToeStatus.Playing;
    interaction.deferUpdate();
    if (value === 'yes') {
      this.coinFlipFirstTurn();
      await this.drawTable();
      this.resetTimeout();
      return;
    }
    this.status = TicTacToeStatus.Declined;
    await this.endGame();
  }

  private async sendGameRequest() {
    await this.currentInteraction.editReply({
      content: `${this.player1.toString()} has challenged you to a game of Tic Tac Toe. Do you accept?`,
      components: [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId('tictactoe-request-yes')
            .setLabel('Accept')
            .setStyle('PRIMARY'),
          new MessageButton()
            .setCustomId('tictactoe-request-no')
            .setLabel('Decline')
            .setStyle('DANGER'),
        ),
      ],
    });
  }

  private coinFlipFirstTurn() {
    const shouldFlip = Math.random() < 0.5;
    if (!shouldFlip) return;
    const temp = this.player1;
    this.player1 = this.player2;
    this.player2 = temp;
  }

  private makeMove(pos: number) {
    if (!Number.isInteger(this.table[pos])) return;
    this.table[pos] = this.turn;
  }

  private switchTurn() {
    this.turn = this.turn === 'x' ? 'o' : 'x';
  }

  static getWinner(table: ('x' | 'o' | number)[], turn: 'x' | 'o') {
    const winner = WIN_COMBINATIONS.some((combination) => combination.every((pos) => table[pos] === turn));
    if (winner) return turn;
    return null;
  }

  private async drawTable(finished = false) {
    const table = [...this.table];

    const rows = [
      ...[...new Array(3).fill(0).map(() => table.splice(0, 3))].map((colum, columIndex) => new MessageActionRow().addComponents(
        ...colum.map((row, rowIndex) => {
          const button = new MessageButton()
            .setLabel(row === 'x' ? 'X' : row === 'o' ? 'O' : '-')
            .setCustomId(`tictactoe-game-${rowIndex + columIndex * 3}`)
            .setStyle('SECONDARY');
          if (!Number.isInteger(row)) {
            button.setDisabled(true);
            if (row === 'x') button.setStyle('PRIMARY');
            if (row === 'o') button.setStyle('DANGER');
          }
          if (finished) button.setDisabled(true);
          return button;
        }),
      )),
    ];

    await this.currentInteraction.editReply({
      content: finished
        ? 'Game over.'
        : `Current turn: ${this.turn === 'x' ? this.player1.toString() : this.player2.toString()}`,
      components: rows,
    });
  }

  private checkIfCorrectUser(interaction: ButtonInteraction<CacheType>) {
    const { user } = interaction;
    if (!(user.id === this.player1.id || user.id === this.player2.id)) {
      interaction.reply({ content: 'You are not a part of this game.', ephemeral: true });
      return false;
    }
    if (user.id === this.player1.id && this.turn === 'o') {
      interaction.reply({ content: 'It is not your turn.', ephemeral: true });
      return false;
    }
    if (user.id === this.player2.id && this.turn === 'x') {
      interaction.reply({ content: 'It is not your turn.', ephemeral: true });
      return false;
    }
    return true;
  }

  async handleClick(interaction: ButtonInteraction<CacheType>, pos: string) {
    if (this.currentInteraction.id !== interaction.message.interaction?.id) return;
    if (!this.checkIfCorrectUser(interaction)) return;
    interaction.deferUpdate();
    this.resetTimeout();
    this.makeMove(Number(pos));
    const winner = TicTacToe.getWinner(this.table, this.turn);
    if (winner) {
      const embed = new MessageEmbed()
        .setTitle(`${winner === 'x' ? this.player1.username : this.player2.username} won!`)
        .setDescription(`Match Between ${this.player1.toString()} and ${this.player2.toString()}`)
        .setTimestamp();
      await this.currentInteraction.channel?.send({ embeds: [embed] });
      this.switchTurn();
      this.status = TicTacToeStatus.Finished;
      this.endGame();
    } else {
      this.switchTurn();
      await this.drawTable();
    }
  }

  private resetTimeout(isRequestType = false) {
    if (this.timeOut) clearTimeout(this.timeOut);
    this.timeOut = setTimeout(() => {
      if (isRequestType) this.status = TicTacToeStatus.RequestTimeout;
      else this.status = TicTacToeStatus.GameTimeout;
      this.endGame();
    }, TIMEOUT_TIME);
  }

  private async endGame() {
    if (this.timeOut) clearTimeout(this.timeOut);
    if (this.currentInteraction.id) tictactoeCollection.delete(this.currentInteraction.id);
    let content: string = '';
    switch (this.status) {
      case TicTacToeStatus.Finished:
        await this.drawTable(true);
        break;
      case TicTacToeStatus.Declined:
        content = `${this.player2.toString()} has declined the game.`;
        break;
      case TicTacToeStatus.GameTimeout:
        content = `Game timed out. ${
          this.turn === 'x' ? this.player2.toString() : this.player1.toString()
        } won.`;
        break;
      case TicTacToeStatus.RequestTimeout:
        content = `Request timed out, ${this.player2.toString()} did not accept the game.`;
        break;
      default:
        break;
    }

    if (this.status !== TicTacToeStatus.Finished) await this.currentInteraction.editReply({ content, components: [] });
  }
}
