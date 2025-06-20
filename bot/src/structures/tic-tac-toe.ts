import ButtonComponent from "@Components/button";
import TicTacToeUtils from "@Utils/tic-tac-toe-utils";
import wait from "@Utils/wait";
import { ActionRowBuilder } from "@discordjs/builders";
import {
	type ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type CacheType,
	type CommandInteraction,
	EmbedBuilder,
	type User,
} from "discord.js";
import EchidnaSingleton from "./echidna-singleton";

export enum TurnEnum {
	X = "x",
	O = "o",
}

export type TableItemType = { mark: TurnEnum; round: number } | number;

export type TableType = TableItemType[];

const TABLE: TableType = [0, 1, 2, 3, 4, 5, 6, 7, 8];

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

const TIMEOUT_TIME = 600 * 1000;

export enum TicTacToeStatus {
	Waiting = 0,
	GameTimeout = 1,
	RequestTimeout = 2,
	Declined = 3,
	Playing = 4,
	Finished = 5,
}

export default class TicTacToe extends EchidnaSingleton {
	private table: TableType;

	private turn: TurnEnum = TurnEnum.X;

	private gameID: string;

	private currentInteraction: CommandInteraction<CacheType>;

	private status: TicTacToeStatus = TicTacToeStatus.Waiting;

	private timeOut: NodeJS.Timeout | null = null;

	private round = 0;

	private isAgainAI = false;

	constructor(
		interaction: CommandInteraction<CacheType>,
		id: string,
		private player1: User,
		private player2: User,
		private ultimate = false,
	) {
		super();
		this.gameID = id;
		this.currentInteraction = interaction;
		this.table = [...TABLE];
		this.isAgainAI = this.echidna.user === player2;
		this.resetTimeout(true);
		if (!this.isAgainAI) {
			void this.sendGameRequest();
			return;
		}
		this.status = TicTacToeStatus.Playing;
		this.coinFlipFirstTurn();
		if (this.player1 === this.echidna.user) {
			void this.AiMakeMove();
		}
		void this.drawTable();
		this.resetTimeout();
	}

	static async initGame(
		interaction: CommandInteraction<CacheType>,
		id: string,
		player2: User | undefined,
		ultimate: boolean | undefined,
	) {
		const player1 = interaction.user;

		await interaction.deferReply({ ephemeral: false });
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
		return new TicTacToe(
			interaction,
			id,
			player1,
			player2 ?? TicTacToe.echidna.user!,
			ultimate,
		);
	}

	async startGame(interaction: ButtonInteraction<CacheType>, value: string) {
		if (!this.player2) return;

		interaction.deferUpdate();
		if (value === "yes") {
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
		const options = ["yes", "no"];
		await this.currentInteraction.editReply({
			content: `${this.player1?.toString()} has challenged you to a game of Tic Tac Toe. Do you accept?`,
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					options.map((opt) => {
						const isYes = opt === "yes";
						const customId = `${this.gameID}-request-${opt}`;
						return new ButtonComponent({
							interaction: this.currentInteraction,
							custom_id: customId,
							label: isYes ? "Accept" : "Decline",
							style: isYes ? ButtonStyle.Primary : ButtonStyle.Danger,
						})
							.onFilter(
								(inter) =>
									ButtonComponent.filterByCustomID(inter, customId) &&
									ButtonComponent.filterByUser(inter, this.player2),
							)
							.onAction(async (inter) => {
								await this.startGame(inter, opt);
							})
							.onError(async (err) => {
								console.log(err);
								await this.currentInteraction.editReply("Internal Error");
							})
							.build();
					}),
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

	private switchTurn() {
		this.turn = this.turn === TurnEnum.X ? TurnEnum.O : TurnEnum.X;
	}

	private async drawTable(finished = false) {
		const rows = [
			...[
				...new Array(3)
					.fill(0)
					.map((_, vecIndex) =>
						this.table.slice(vecIndex * 3, vecIndex * 3 + 3),
					),
			].map((row, rowIndex) =>
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					...row.map((column, columnIndex) => {
						const isEmpty = typeof column === "number";
						const isMarkByX = isEmpty ? false : column.mark === TurnEnum.X;
						const getButtonStyle = () => {
							if (isEmpty) return ButtonStyle.Secondary;
							return isMarkByX ? ButtonStyle.Primary : ButtonStyle.Danger;
						};
						const pos = rowIndex * 3 + columnIndex;
						const buttonId = `${this.gameID}-${pos}-${this.round}`;
						const button = new ButtonComponent({
							label: isEmpty ? "-" : isMarkByX ? "X" : "O",
							custom_id: buttonId,
							style: getButtonStyle(),
							disabled: finished || !isEmpty,
							interaction: this.currentInteraction,
						})
							.onFilter((inter) => {
								if (inter.customId !== buttonId) return false;
								const users = [this.player1?.id, this.player2?.id];

								if (!users.includes(inter.user.id)) return false;

								return true;
							})
							.onAction(async (inter) => {
								try {
									await this.handleClick(inter, pos);
								} catch (error) {
									console.log("test", error);
								}
							}, TIMEOUT_TIME + 5)

							.build();

						return button;
					}),
				),
			),
		];

		await this.currentInteraction.editReply({
			content: finished
				? "Game over."
				: `Current turn: ${this.turn === TurnEnum.X ? this.player1.toString() : this.player2.toString()}`,
			components: rows,
		});
	}

	private checkIfCorrectUser(interaction: ButtonInteraction<CacheType>) {
		const { user } = interaction;
		if (user.id === this.player1?.id && this.turn === TurnEnum.O) {
			interaction.reply({ content: "It is not your turn.", ephemeral: true });
			return false;
		}
		if (user.id === this.player2?.id && this.turn === TurnEnum.X) {
			interaction.reply({ content: "It is not your turn.", ephemeral: true });
			return false;
		}
		return true;
	}

	async handleClick(interaction: ButtonInteraction<CacheType>, pos: number) {
		if (this.currentInteraction.id !== interaction.message.interaction?.id)
			return;
		if (!this.checkIfCorrectUser(interaction)) return;
		await interaction.deferUpdate();
		this.resetTimeout();
		this.markPos(pos);
		if (!(await this.didGameEnd())) {
			this.switchTurn();
			if (this.isAgainAI) await this.AiMakeMove();
			await this.drawTable();
		}
	}

	private markPos(pos: number) {
		const { round, table } = TicTacToeUtils.makeMove(
			this.table,
			pos,
			this.round,
			this.turn,
			this.ultimate,
		);
		this.round = round;
		this.table = table;
	}

	private resetTimeout(isRequestType = false) {
		if (this.timeOut) clearTimeout(this.timeOut);
		this.timeOut = setTimeout(() => {
			if (isRequestType) this.status = TicTacToeStatus.RequestTimeout;
			else this.status = TicTacToeStatus.GameTimeout;
			void this.endGame();
		}, TIMEOUT_TIME);
	}

	private async endGame() {
		if (this.timeOut) clearTimeout(this.timeOut);
		if (this.currentInteraction.id)
			EchidnaSingleton.echidna.ticTacToeManager.delete(
				this.currentInteraction.id,
			);
		let content = "";
		switch (this.status) {
			case TicTacToeStatus.Finished:
				await this.drawTable(true);
				break;
			case TicTacToeStatus.Declined:
				content = `${this.player2?.toString()} has declined the game.`;
				break;
			case TicTacToeStatus.GameTimeout:
				content = `Game timed out. ${
					(this.turn === TurnEnum.X
						? this.player2?.toString()
						: this.player1?.toString()) ??
					this.currentInteraction.client.user.toString()
				} won.`;
				break;
			case TicTacToeStatus.RequestTimeout:
				content = `Request timed out, ${this.player2?.toString()} did not accept the game.`;
				break;
			default:
				break;
		}

		if (this.status !== TicTacToeStatus.Finished)
			await this.currentInteraction.editReply({ content, components: [] });
	}

	async didGameEnd() {
		const isWinner = TicTacToeUtils.didWin(this.table, this.turn);
		const isDraw = TicTacToeUtils.didDraw(this.table);
		const embed = new EmbedBuilder()
			.setDescription(
				`Match Between ${this.player1.toString()} and ${this.player2.toString()}`,
			)
			.setTimestamp();
		if (isWinner) {
			embed.setTitle(
				`${this.turn === TurnEnum.X ? this.player1.displayName : this.player2.displayName} won!`,
			);
		}
		if (isDraw && !isWinner) {
			embed.setTitle("Draw!");
		}
		if (isWinner || isDraw) {
			this.switchTurn();
			this.status = TicTacToeStatus.Finished;
			await this.endGame();
			if (
				embed &&
				this.currentInteraction.inGuild() &&
				this.currentInteraction.channel?.isTextBased()
			)
				await this.currentInteraction.channel?.send({ embeds: [embed] });
		}
		return isDraw || isWinner;
	}

	async AiMakeMove() {
		try {
			await wait(100);
			const pos = TicTacToeUtils.getBestMove(
				this.table,
				this.turn,
				this.round,
				this.ultimate,
			);
			this.markPos(pos);
			if (await this.didGameEnd()) return;
			this.switchTurn();
			await this.drawTable(false);
		} catch (error) {
			console.log(error);
		}
	}
}
