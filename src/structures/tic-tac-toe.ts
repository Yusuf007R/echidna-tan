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

const TIMEOUT_TIME = 3 * 1000;

export default class TicTacToeInstance {
  private table: {id: number; value: 'o' | 'x' | null}[];

  private turn: 'x' | 'o' = 'x';

  private currentInteraction: CommandInteraction<CacheType> | null = null;

  private player1: User | null = null;

  private player2: User | null = null;

  private isGameOver: boolean = false;

  private timeOut: NodeJS.Timeout | null = null;

  private gameConfirmed: boolean = false;

  constructor(player1: User, player2: User, interaction: CommandInteraction<CacheType>) {
    this.player1 = player1;
    this.player2 = player2;
    this.currentInteraction = interaction;
    this.table = [
      { id: 0, value: null },
      { id: 1, value: null },
      { id: 2, value: null },
      { id: 3, value: null },
      { id: 4, value: null },
      { id: 5, value: null },
      { id: 6, value: null },
      { id: 7, value: null },
      { id: 8, value: null },
    ];
    this.resetTimeout();
    this.sendGameRequest();
  }

  static initGame(interaction: CommandInteraction<CacheType>) {
    const player1 = interaction.user;
    const player2 = interaction.options.getUser('user');
    if (!player2) return interaction.editReply('You need to specify a user to play with.');
    if (player1.id === player2.id) return interaction.editReply("You can't play with yourself.");
    if (player2.bot) return interaction.editReply("You can't play with a bot.");

    return new TicTacToeInstance(player1, player2, interaction);
  }

  async startGame(interaction: ButtonInteraction<CacheType>, value: string) {
    if (interaction.user.id !== this.player2?.id) {
      return interaction.reply({
        content: `You are not ${this.player2?.toString()} `,
        ephemeral: true,
      });
    }
    this.gameConfirmed = true;
    interaction.deferUpdate();
    if (value === 'yes') {
      await this.drawTable();
      this.resetTimeout();
      return;
    }
    await this.endGame();
  }

  async sendGameRequest() {
    await this.currentInteraction?.editReply({
      content: `${this.player1?.toString()} has challenged you to a game of Tic Tac Toe. Do you accept?`,
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

  private makeMove(pos: number) {
    if (this.table[pos].value) return;
    this.table[pos].value = this.turn;
  }

  private switchTurn() {
    this.turn = this.turn === 'x' ? 'o' : 'x';
  }

  private getWinner() {
    const winner = WIN_COMBINATIONS.some((combination) => combination.every((pos) => this.table[pos].value === this.turn));
    if (winner) return this.turn === 'x' ? this.player1?.username : this.player2?.username;
    return null;
  }

  private async drawTable() {
    const table = [...this.table];

    const rows = [
      ...[...new Array(3).fill(0).map(() => table.splice(0, 3))].map((colum) => new MessageActionRow().addComponents(
        ...colum.map((row) => {
          const button = new MessageButton()
            .setLabel(row.value || '-')
            .setCustomId(`tictactoe-game-${row.id}`)
            .setStyle('SECONDARY');
          if (row.value) {
            button.setDisabled(true);
            if (row.value === 'x') button.setStyle('PRIMARY');
            if (row.value === 'o') button.setStyle('DANGER');
          }

          if (this.isGameOver) button.setDisabled(true);

          return button;
        }),
      )),
    ];

    await this.currentInteraction?.editReply({
      content: this.isGameOver
        ? 'Game over.'
        : `Current turn: ${
          this.turn === 'x' ? this.player1?.toString() : this.player2?.toString()
        }`,
      components: rows,
    });
  }

  checkIfCorrectUser(interaction: ButtonInteraction<CacheType>) {
    const { user } = interaction;
    if (!(user.id === this.player1?.id || user.id === this.player2?.id)) {
      interaction.reply({ content: 'You are not a part of this game.', ephemeral: true });
      return false;
    }
    if (user.id === this.player1?.id && this.turn === 'o') {
      interaction.reply({ content: 'It is not your turn.', ephemeral: true });
      return false;
    }
    if (user.id === this.player2?.id && this.turn === 'x') {
      interaction.reply({ content: 'It is not your turn.', ephemeral: true });
      return false;
    }
    return true;
  }

  async handleClick(interaction: ButtonInteraction<CacheType>, pos: string) {
    if (this.currentInteraction?.id !== interaction.message.interaction?.id) return;
    if (!this.checkIfCorrectUser(interaction)) return;
    interaction.deferUpdate();

    this.resetTimeout();
    this.makeMove(Number(pos));
    const winner = this.getWinner();
    if (winner) {
      const embed = new MessageEmbed()
        .setTitle(`${winner} won!`)
        .setDescription(`Match Between ${this.player1?.toString()} and ${this.player2?.toString()}`)
        .setTimestamp();
      await this.currentInteraction?.channel?.send({ embeds: [embed] });
      this.switchTurn();
      this.endGame();
    } else {
      this.switchTurn();
      await this.drawTable();
    }
  }

  resetTimeout() {
    if (this.timeOut) clearTimeout(this.timeOut);
    this.timeOut = setTimeout(() => {
      this.endGame();
    }, TIMEOUT_TIME);
  }

  async endGame() {
    this.isGameOver = true;
    if (this.timeOut) clearTimeout(this.timeOut);
    if (this.currentInteraction?.id) tictactoeCollection.delete(this.currentInteraction.id);
    if (!this.gameConfirmed) return this.currentInteraction?.editReply({ content: 'Game declined.', components: [] });
    await this.drawTable();
  }
}
