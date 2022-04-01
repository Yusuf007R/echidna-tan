import { tableType, TurnEnum, WIN_COMBINATIONS } from '../structures/tic-tac-toe';

export default class TicTacToeUtils {
  static didWin(table: tableType, turn: TurnEnum) {
    return WIN_COMBINATIONS.some((combination) => combination.every((pos) => table[pos].toString() === turn.toString()));
  }

  static didDraw(table: tableType) {
    return this.getEmptyPositions(table).length === 0;
  }

  static getEmptyPositions(table: tableType) {
    return table
      .map((value, index) => (Number.isInteger(value) ? index : null))
      .filter((index) => index !== null) as number[];
  }

  static valueOfTable = (table: tableType, aiSymbol: TurnEnum) => {
    if (this.didWin(table, aiSymbol === TurnEnum.X ? TurnEnum.O : TurnEnum.X)) {
      return -10;
    }
    if (this.didWin(table, aiSymbol)) {
      return 10;
    }
    return 0;
  };

  static getBestMove(table: tableType, turn: TurnEnum) {
    const tableCopy = [...table];
    const emptyIndexes = this.getEmptyPositions(table);
    let bestValue = -Infinity;
    const bestMove = emptyIndexes.reduce((currentBest, emptyIndex) => {
      tableCopy[emptyIndex] = turn;
      const value = this.minimax(tableCopy, 0, true, turn);
      tableCopy[emptyIndex] = emptyIndex;
      if (value > bestValue) {
        bestValue = value;
        return emptyIndex;
      }
      return currentBest;
    }, -1);

    return bestMove;
  }

  static minimax(table: tableType, depth: number, isMaximizing: boolean, aiSymbol: TurnEnum) {
    const score = this.valueOfTable(table, aiSymbol);
    if (score === -10) {
      return score;
    }
    if (score === 10) {
      return score - depth;
    }
    if (this.didDraw(table)) {
      return 0;
    }

    if (!isMaximizing) {
      const bestMaximumValue = table.reduce(
        (currentBest: number, cell: number | TurnEnum, index: number): number => {
          const tableCopy = [...table];
          if (Number.isInteger(cell)) {
            tableCopy[index] = aiSymbol;
            const newValue = this.minimax(tableCopy, depth + 1, true, aiSymbol);
            if (newValue > currentBest) {
              return newValue;
            }
          }
          return currentBest;
        },
        -Infinity,
      );
      return bestMaximumValue;
    }

    const bestMinimunValue = table.reduce(
      (currentBest: number, cell: number | TurnEnum, index: number): number => {
        const tableCopy = [...table];
        if (Number.isInteger(cell)) {
          tableCopy[index] = aiSymbol === TurnEnum.X ? TurnEnum.O : TurnEnum.X;
          const newValue = this.minimax(tableCopy, depth + 1, false, aiSymbol);
          if (newValue < currentBest) {
            return newValue;
          }
        }
        return currentBest;
      },
      Infinity,
    );
    return bestMinimunValue;
  }
}
