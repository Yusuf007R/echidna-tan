import {ActionRowBuilder} from '@discordjs/builders';
import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  CommandInteraction,
  EmbedBuilder,
  User,
} from 'discord.js';

import TicTacToeUtils from '../utils/tic-tac-toe-utils';
import wait from '../utils/wait';
import EchidnaSingleton from './echidna-singleton';

export enum TurnEnum {
  X = 'x',
  O = 'o',
}

export type tableType = (TurnEnum | number)[];

const TABLE: tableType = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export const WIN_COMBINATIONS = [
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
  private table: tableType;

  private turn: TurnEnum = TurnEnum.X;

  private currentInteraction: CommandInteraction<CacheType>;

  private player1: User | null = null;

  private player2: User | null = null;

  private status: TicTacToeStatus = TicTacToeStatus.Waiting;

  private timeOut: NodeJS.Timeout | null = null;

  constructor(
    interaction: CommandInteraction<CacheType>,
    player1: User,
    player2: User | null = null,
  ) {
    this.player1 = player1;
    this.player2 = player2;
    this.currentInteraction = interaction;
    this.table = [...TABLE];
    this.resetTimeout(true);
    if (player2) {
      this.sendGameRequest();
      return;
    }
    this.status = TicTacToeStatus.Playing;
    this.coinFlipFirstTurn();
    if (!this.player1) {
      this.AiMakeMove();
    }
    this.drawTable();
    this.resetTimeout();
  }

  static async initGame(interaction: CommandInteraction<CacheType>) {
    const player1 = interaction.user;
    const player2 = interaction.options.getUser('user');
    await interaction.deferReply({ephemeral: !player2});
    if (player2) {
      if (player1.id === player2.id) {
        interaction.editReply("You can't play with yourself.");
        return;
      }
      if (player2.bot) {
        interaction.editReply("You can't play with a bot.");
        return;
      }
    }
    return new TicTacToe(interaction, player1, player2);
  }

  async startGame(interaction: ButtonInteraction<CacheType>, value: string) {
    if (!this.player2) return;
    if (interaction.user.id !== this.player2.id) {
      return interaction.reply({
        content: `You are not ${this.player2.toString()} `,
        ephemeral: true,
      });
    }
    interaction.deferUpdate();
    if (value === 'yes') {
      this.status = TicTacToeStatus.Playing;
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
      content: `${this.player1?.toString()} has challenged you to a game of Tic Tac Toe. Do you accept?`,
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('tictactoe-request-yes')
            .setLabel('Accept')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('tictactoe-request-no')
            .setLabel('Decline')
            .setStyle(ButtonStyle.Danger),
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
    this.turn = this.turn === TurnEnum.X ? TurnEnum.O : TurnEnum.X;
  }

  private async drawTable(finished = false) {
    const table = [...this.table];

    const rows = [
      ...[...new Array(3).fill(0).map(() => table.splice(0, 3))].map(
        (colum, columIndex) =>
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            ...colum.map((row, rowIndex) => {
              const button = new ButtonBuilder()
                .setLabel(
                  row === TurnEnum.X ? 'X' : row === TurnEnum.O ? 'O' : '-',
                )
                .setCustomId(`tictactoe-game-${rowIndex + columIndex * 3}`)
                .setStyle(ButtonStyle.Secondary);
              if (!Number.isInteger(row)) {
                button.setDisabled(true);
                if (row === TurnEnum.X) button.setStyle(ButtonStyle.Primary);
                if (row === TurnEnum.O) button.setStyle(ButtonStyle.Danger);
              }
              if (finished) button.setDisabled(true);
              return button;
            }),
          ),
      ),
    ];

    await this.currentInteraction.editReply({
      content: finished
        ? 'Game over.'
        : `Current turn: ${
            this.turn === TurnEnum.X
              ? this.player1
                ? this.player1.toString()
                : 'AI'
              : this.player2
              ? this.player2.toString()
              : 'AI'
          }`,
      components: rows,
    });
  }

  private checkIfCorrectUser(interaction: ButtonInteraction<CacheType>) {
    const {user} = interaction;
    if (!(user.id === this.player1?.id || user.id === this.player2?.id)) {
      interaction.reply({
        content: 'You are not a part of this game.',
        ephemeral: true,
      });
      return false;
    }
    if (user.id === this.player1?.id && this.turn === TurnEnum.O) {
      interaction.reply({content: 'It is not your turn.', ephemeral: true});
      return false;
    }
    if (user.id === this.player2?.id && this.turn === TurnEnum.X) {
      interaction.reply({content: 'It is not your turn.', ephemeral: true});
      return false;
    }
    return true;
  }

  async handleClick(interaction: ButtonInteraction<CacheType>, pos: string) {
    if (this.currentInteraction.id !== interaction.message.interaction?.id)
      return;
    if (!this.checkIfCorrectUser(interaction)) return;
    interaction.deferUpdate();
    this.resetTimeout();
    this.makeMove(Number(pos));
    if (!(await this.didGameEnd())) {
      this.switchTurn();
      if (!this.player2 || !this.player1) this.AiMakeMove();
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
    if (this.currentInteraction.id)
      EchidnaSingleton.echidna.ticTacToeManager.delete(
        this.currentInteraction.id,
      );
    let content: string = '';
    switch (this.status) {
      case TicTacToeStatus.Finished:
        await this.drawTable(true);
        break;
      case TicTacToeStatus.Declined:
        content = `${this.player2?.toString()} has declined the game.`;
        break;
      case TicTacToeStatus.GameTimeout:
        content = `Game timed out. ${
          this.turn === TurnEnum.X
            ? this.player2?.toString()
            : this.player1?.toString()
        } won.`;
        break;
      case TicTacToeStatus.RequestTimeout:
        content = `Request timed out, ${this.player2?.toString()} did not accept the game.`;
        break;
      default:
        break;
    }

    if (this.status !== TicTacToeStatus.Finished)
      await this.currentInteraction.editReply({content, components: []});
  }

  async didGameEnd() {
    const isWinner = TicTacToeUtils.didWin(this.table, this.turn);
    const isDraw = TicTacToeUtils.didDraw(this.table);
    const embed = new EmbedBuilder()
      .setDescription(
        `Match Between ${this.player1 ? this.player1.toString() : 'AI'} and ${
          this.player2 ? this.player2.toString() : 'AI'
        }`,
      )
      .setTimestamp();
    if (isWinner) {
      embed.setTitle(
        `${
          this.turn === TurnEnum.X
            ? this.player1
              ? this.player1.username
              : 'AI'
            : this.player2
            ? this.player2.username
            : 'AI'
        } won!`,
      );
    }
    if (isDraw) {
      embed.setTitle('Draw!');
    }
    if (isWinner || isDraw) {
      this.switchTurn();
      this.status = TicTacToeStatus.Finished;
      await this.endGame();
      if (embed) await this.currentInteraction.channel?.send({embeds: [embed]});
    }
    return isDraw || isWinner;
  }

  async AiMakeMove() {
    await wait(100);
    this.makeMove(TicTacToeUtils.getBestMove(this.table, this.turn));
    if (await this.didGameEnd()) return;
    this.switchTurn();
    await this.drawTable();
  }
}
