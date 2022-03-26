import {
  ButtonInteraction,
  CacheType,
  CommandInteraction,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  User,
} from 'discord.js';

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

export default class TicTacToe {
  private table: {id: number; value: 'o' | 'x' | null}[];

  private turn: 'x' | 'o' = 'x';

  private currentInteraction: CommandInteraction<CacheType> | null = null;

  private player1: User | null = null;

  private player2: User | null = null;

  private isGameOver: boolean = false;

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
    this.drawTable();
  }

  static startGame(interaction: CommandInteraction<CacheType>) {
    const player1 = interaction.user;
    const player2 = interaction.options.getUser('user');
    if (!player2) return interaction.editReply('You need to specify a user to play with.');
    if (player1.id === player2.id) return interaction.editReply("You can't play with yourself.");
    if (player2.bot) return interaction.editReply("You can't play with a bot.");
    return new TicTacToe(player1, player2, interaction);
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
            .setCustomId(row.id.toString())
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

  async handleClick(interaction: ButtonInteraction<CacheType>): Promise<boolean> {
    if (this.currentInteraction?.id !== interaction.message.interaction?.id) return this.isGameOver;
    if (!this.checkIfCorrectUser(interaction)) return this.isGameOver;
    interaction.deferUpdate();
    const pos = Number(interaction.customId);
    this.makeMove(pos);

    const winner = this.getWinner();
    if (winner) {
      this.isGameOver = true;
      const embed = new MessageEmbed()
        .setTitle(`${winner} won!`)
        .setDescription(`Match Between ${this.player1?.toString()} and ${this.player2?.toString()}`)
        .setTimestamp();

      await this.currentInteraction?.channel?.send({ embeds: [embed] });
    }
    this.switchTurn();
    await this.drawTable();
    return this.isGameOver;
  }
}
