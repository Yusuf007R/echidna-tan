import { TableType, TurnEnum } from '../structures/tic-tac-toe';

export const WIN_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

type CacheKeyType = string;

class TicTacToeUtils {
  private static memoizationCache: Map<CacheKeyType, number> = new Map();

  static didWin(table: TableType, turn: TurnEnum): boolean {
    return WIN_COMBINATIONS.some((combo) =>
      combo.every((pos) => typeof table[pos] !== 'number' && table[pos].mark === turn)
    );
  }

  static didDraw(table: TableType): boolean {
    return table.every((cell) => typeof cell !== 'number');
  }

  static makeMove(
    table: TableType,
    pos: number,
    round: number,
    turn: TurnEnum,
    ultimate: boolean
  ): { table: TableType; round: number } {
    if (typeof table[pos] !== 'number') return { table, round };

    const newTable = [...table];
    round++;
    if (ultimate && round > 6) {
      let oldestPos = -1;
      let oldestRound = Infinity;
      let markCount = 0;

      for (let i = 0; i < newTable.length; i++) {
        const cell = newTable[i];
        if (typeof cell === 'number' || cell.mark !== turn) continue;
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
      if (typeof table[i] !== 'number') continue;
      emptyPositions.push(i);
    }
    return emptyPositions;
  }

  static evaluateBoard(table: TableType, aiSymbol: TurnEnum): number {
    const opponentSymbol = aiSymbol === TurnEnum.X ? TurnEnum.O : TurnEnum.X;

    if (this.didWin(table, aiSymbol)) return 10;
    if (this.didWin(table, opponentSymbol)) return -10;

    let score = 0;
    for (const combo of WIN_COMBINATIONS) {
      const [a, b, c] = combo;
      const line = [table[a], table[b], table[c]];
      const aiCount = line.filter((cell) => typeof cell !== 'number' && cell.mark === aiSymbol).length;
      const opponentCount = line.filter((cell) => typeof cell !== 'number' && cell.mark === opponentSymbol).length;

      if (aiCount === 2 && opponentCount === 0) score += 5;
      if (aiCount === 1 && opponentCount === 0) score += 1;
      if (opponentCount === 2 && aiCount === 0) score -= 5;
      if (opponentCount === 1 && aiCount === 0) score -= 1;
    }
    return score;
  }

  static getBestMove(table: TableType, turn: TurnEnum, round: number, ultimate: boolean): number {
    if (round === 0) {
      const bestFirstMoves = [0, 2, 4, 6, 8];
      return bestFirstMoves[Math.floor(Math.random() * bestFirstMoves.length)];
    }

    const emptyPositions = this.getEmptyPositions(table);
    let bestScore = -Infinity;
    let bestMove = -1;

    for (const pos of emptyPositions) {
      const { table: newTable, round: newRound } = this.makeMove(table, pos, round, turn, ultimate);
      const score = this.minimax(newTable, 0, false, turn, newRound, ultimate, -Infinity, Infinity);
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
    beta: number
  ): number {
    const MAX_DEPTH = ultimate ? 8 : Infinity;
    const key = JSON.stringify(table) + depth + isMaximizing + aiSymbol + round;

    if (this.memoizationCache.has(key)) {
      return this.memoizationCache.get(key)!;
    }

    if (depth >= MAX_DEPTH) {
      const evalScore = this.evaluateBoard(table, aiSymbol);
      this.memoizationCache.set(key, evalScore);
      return evalScore;
    }

    const currentPlayer = isMaximizing ? aiSymbol : aiSymbol === TurnEnum.X ? TurnEnum.O : TurnEnum.X;

    if (this.didWin(table, currentPlayer)) {
      const winScore = isMaximizing ? 4 - depth : -10 + depth;
      this.memoizationCache.set(key, winScore);
      return winScore;
    }
    if (this.didDraw(table)) {
      this.memoizationCache.set(key, 0);
      return 0;
    }

    const emptyPositions = this.getEmptyPositions(table);
    let bestScore = isMaximizing ? -Infinity : Infinity;

    for (const pos of emptyPositions) {
      const { table: newTable, round: newRound } = this.makeMove(table, pos, round, currentPlayer, ultimate);
      const score = this.minimax(newTable, depth + 1, !isMaximizing, aiSymbol, newRound, ultimate, alpha, beta);
      bestScore = isMaximizing ? Math.max(score, bestScore) : Math.min(score, bestScore);

      if (isMaximizing) {
        alpha = Math.max(alpha, bestScore);
      } else {
        beta = Math.min(beta, bestScore);
      }

      if (beta <= alpha) {
        break;
      }
    }

    this.memoizationCache.set(key, bestScore);
    return bestScore;
  }
}

export default TicTacToeUtils;
