import { TableItemType, TableType, TurnEnum, WIN_COMBINATIONS } from '../structures/tic-tac-toe';

export default class TicTacToeUtils {
  static didWin(table: TableType, turn: TurnEnum) {
    return WIN_COMBINATIONS.some((combination) =>
      combination.every((pos) => table[pos].toString() === turn.toString())
    );
  }

  static didDraw(table: TableType) {
    return this.getEmptyPositions(table).length === 0;
  }

  static getEmptyPositions(table: TableType) {
    return table
      .map((value, index) => (Number.isInteger(value) ? index : null))
      .filter((index) => index !== null) as number[];
  }

  static valueOfTable = (table: TableType, aiSymbol: TurnEnum) => {
    if (this.didWin(table, aiSymbol === TurnEnum.X ? TurnEnum.O : TurnEnum.X)) {
      return -10;
    }
    if (this.didWin(table, aiSymbol)) {
      return 10;
    }
    return 0;
  };

  static getBestMove(table: TableType, turn: TurnEnum, round: number) {
    const tableCopy = [...table];
    const emptyIndexes = this.getEmptyPositions(table);
    let bestValue = -Infinity;
    const bestMove = emptyIndexes.reduce((currentBest, emptyIndex) => {
      tableCopy[emptyIndex] = { round, mark: turn };
      const value = this.minimax(tableCopy, 0, true, turn, round);
      tableCopy[emptyIndex] = emptyIndex;
      if (value > bestValue) {
        bestValue = value;
        return emptyIndex;
      }
      return currentBest;
    }, -1);

    return bestMove;
  }

  static minimax(table: TableType, depth: number, isMaximizing: boolean, aiSymbol: TurnEnum, round: number): number {
    round++;
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
      const bestMaximumValue = table.reduce((currentBest: number, cell: TableItemType, index: number): number => {
        const tableCopy = [...table];
        if (Number.isInteger(cell)) {
          tableCopy[index] = { round, mark: aiSymbol };
          const newValue = this.minimax(tableCopy, depth + 1, true, aiSymbol, round);
          if (newValue > currentBest) {
            return newValue;
          }
        }
        return currentBest;
      }, -Infinity);
      return bestMaximumValue as number;
    }

    const bestMinimunValue = table.reduce((currentBest: number, cell: TableItemType, index: number): number => {
      const tableCopy = [...table];
      if (Number.isInteger(cell)) {
        tableCopy[index] = { mark: aiSymbol === TurnEnum.X ? TurnEnum.O : TurnEnum.X, round };
        const newValue = this.minimax(tableCopy, depth + 1, false, aiSymbol, round);
        if (newValue < currentBest) {
          return newValue;
        }
      }
      return currentBest;
    }, Infinity as number);
    return bestMinimunValue as number;
  }
}
