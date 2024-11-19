import { type TableType, TurnEnum } from "@Structures/tic-tac-toe";

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

type CacheKeyType = string;

class TicTacToeUtils {
	private static memoizationCache: Map<CacheKeyType, number> = new Map();

	static didWin(table: TableType, turn: TurnEnum): boolean {
		return WIN_COMBINATIONS.some((combo) =>
			combo.every((pos) => {
				const cell = table[pos];
				return typeof cell !== "number" && cell.mark === turn;
			}),
		);
	}

	static didDraw(table: TableType): boolean {
		return table.every((cell) => typeof cell !== "number");
	}

	static makeMove(
		table: TableType,
		pos: number,
		round: number,
		turn: TurnEnum,
		ultimate: boolean,
	): { table: TableType; round: number } {
		if (typeof table[pos] !== "number") return { table, round };

		const newTable = [...table];
		// biome-ignore lint/style/noParameterAssign: is used for memoization
		round++;
		if (ultimate && round > 6) {
			let oldestPos = -1;
			let oldestRound = Number.POSITIVE_INFINITY;
			let markCount = 0;

			for (let i = 0; i < newTable.length; i++) {
				const cell = newTable[i];
				if (typeof cell === "number" || cell.mark !== turn) continue;
				markCount++;
				if (cell.round > oldestRound) continue;
				oldestRound = cell.round;
				oldestPos = i;
			}

			if (markCount > 2) {
				newTable[oldestPos] = oldestPos;
			}
		}
		newTable[pos] = { mark: turn, round };
		return { table: newTable, round };
	}

	static getEmptyPositions(table: TableType): number[] {
		const emptyPositions: number[] = [];
		for (let i = 0; i < table.length; i++) {
			if (typeof table[i] !== "number") continue;
			emptyPositions.push(i);
		}
		return emptyPositions;
	}

	static evaluateBoard(table: TableType, aiSymbol: TurnEnum): number {
		const opponentSymbol = aiSymbol === TurnEnum.X ? TurnEnum.O : TurnEnum.X;

		if (TicTacToeUtils.didWin(table, aiSymbol)) return 10;
		if (TicTacToeUtils.didWin(table, opponentSymbol)) return -10;

		let score = 0;
		for (const combo of WIN_COMBINATIONS) {
			const [a, b, c] = combo;
			const line = [table[a], table[b], table[c]];
			const aiCount = line.filter(
				(cell) => typeof cell !== "number" && cell.mark === aiSymbol,
			).length;
			const opponentCount = line.filter(
				(cell) => typeof cell !== "number" && cell.mark === opponentSymbol,
			).length;

			if (aiCount === 2 && opponentCount === 0) score += 5;
			if (aiCount === 1 && opponentCount === 0) score += 1;
			if (opponentCount === 2 && aiCount === 0) score -= 5;
			if (opponentCount === 1 && aiCount === 0) score -= 1;
		}
		return score;
	}

	static getBestMove(
		table: TableType,
		turn: TurnEnum,
		round: number,
		ultimate: boolean,
	): number {
		if (round === 0) {
			const bestFirstMoves = [0, 2, 4, 6, 8];
			return bestFirstMoves[Math.floor(Math.random() * bestFirstMoves.length)];
		}

		const emptyPositions = TicTacToeUtils.getEmptyPositions(table);
		let bestScore = Number.NEGATIVE_INFINITY;
		let bestMove = -1;

		for (const pos of emptyPositions) {
			const { table: newTable, round: newRound } = TicTacToeUtils.makeMove(
				table,
				pos,
				round,
				turn,
				ultimate,
			);
			const score = TicTacToeUtils.minimax(
				newTable,
				0,
				false,
				turn,
				newRound,
				ultimate,
				Number.NEGATIVE_INFINITY,
				Number.POSITIVE_INFINITY,
			);
			if (score > bestScore) {
				bestScore = score;
				bestMove = pos;
			}
		}
		return bestMove;
	}

	static minimax(
		table: TableType,
		depth: number,
		isMaximizing: boolean,
		aiSymbol: TurnEnum,
		round: number,
		ultimate: boolean,
		alpha: number,
		beta: number,
	): number {
		const MAX_DEPTH = ultimate ? 8 : Number.POSITIVE_INFINITY;
		const key = JSON.stringify(table) + depth + isMaximizing + aiSymbol + round;

		if (TicTacToeUtils.memoizationCache.has(key)) {
			return TicTacToeUtils.memoizationCache.get(key)!;
		}

		if (depth >= MAX_DEPTH) {
			const evalScore = TicTacToeUtils.evaluateBoard(table, aiSymbol);
			TicTacToeUtils.memoizationCache.set(key, evalScore);
			return evalScore;
		}

		const currentPlayer = isMaximizing
			? aiSymbol
			: aiSymbol === TurnEnum.X
				? TurnEnum.O
				: TurnEnum.X;

		if (TicTacToeUtils.didWin(table, currentPlayer)) {
			const winScore = isMaximizing ? 4 - depth : -10 + depth;
			TicTacToeUtils.memoizationCache.set(key, winScore);
			return winScore;
		}
		if (TicTacToeUtils.didDraw(table)) {
			TicTacToeUtils.memoizationCache.set(key, 0);
			return 0;
		}

		const emptyPositions = TicTacToeUtils.getEmptyPositions(table);
		let bestScore = isMaximizing
			? Number.NEGATIVE_INFINITY
			: Number.POSITIVE_INFINITY;

		for (const pos of emptyPositions) {
			const { table: newTable, round: newRound } = TicTacToeUtils.makeMove(
				table,
				pos,
				round,
				currentPlayer,
				ultimate,
			);
			const score = TicTacToeUtils.minimax(
				newTable,
				depth + 1,
				!isMaximizing,
				aiSymbol,
				newRound,
				ultimate,
				alpha,
				beta,
			);
			bestScore = isMaximizing
				? Math.max(score, bestScore)
				: Math.min(score, bestScore);

			if (isMaximizing) {
				// biome-ignore lint/style/noParameterAssign: is used for memoization
				alpha = Math.max(alpha, bestScore);
			} else {
				// biome-ignore lint/style/noParameterAssign: is used for memoization
				beta = Math.min(beta, bestScore);
			}

			if (beta <= alpha) {
				break;
			}
		}

		TicTacToeUtils.memoizationCache.set(key, bestScore);
		return bestScore;
	}
}

export default TicTacToeUtils;
