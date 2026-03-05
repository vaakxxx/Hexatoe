import { HexUtils } from './hexUtils.js';

export class GameLogic {
  constructor() {
    this.reset();
  }

  reset() {
    // Board uses hex coordinates as keys: "q,r"
    this.board = new Map();
    this.currentPlayer = 'X';
    this.movesRemaining = 1; // X starts with 1 move
    this.moveCount = 0;
    this.gameOver = false;
    this.winner = null;
    this.winningLine = null;
  }

  /**
   * Get the board state as a plain object for transmission
   */
  getBoardState() {
    const board = {};
    for (const [key, value] of this.board.entries()) {
      board[key] = value;
    }
    return board;
  }

  /**
   * Load a board state from a plain object
   */
  loadBoardState(boardState) {
    this.board = new Map(Object.entries(boardState));
  }

  /**
   * Make a move at the given hex coordinates
   */
  makeMove(q, r, player) {
    if (this.gameOver) {
      return { success: false, error: 'Game is over' };
    }

    if (player !== this.currentPlayer) {
      return { success: false, error: 'Not your turn' };
    }

    const key = HexUtils.hexToKey(q, r);

    if (this.board.has(key)) {
      return { success: false, error: 'Cell already occupied' };
    }

    // Place the piece
    this.board.set(key, player);
    this.moveCount++;
    this.movesRemaining--;

    // Check for win
    const winResult = this.checkWin(q, r, player);
    if (winResult.winner) {
      this.gameOver = true;
      this.winner = winResult.winner;
      this.winningLine = winResult.line;
      return {
        success: true,
        player,
        currentPlayer: this.currentPlayer,
        movesRemaining: this.movesRemaining,
        board: this.getBoardState(),
        winner: winResult.winner,
        winningLine: winResult.line
      };
    }

    // Check if turn should switch
    if (this.movesRemaining <= 0) {
      this.switchTurn();
    }

    return {
      success: true,
      player,
      currentPlayer: this.currentPlayer,
      movesRemaining: this.movesRemaining,
      board: this.getBoardState()
    };
  }

  /**
   * Switch to the other player's turn
   * Turn order: X once, then alternating two turns each
   */
  switchTurn() {
    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';

    // After the first move (X's single move), both players get 2 moves per turn
    if (this.moveCount >= 1) {
      this.movesRemaining = 2;
    }
  }

  /**
   * Check if the last move created a winning line
   * Win condition: 6 in a row along any of the three hex axes
   */
  checkWin(q, r, player) {
    const axes = HexUtils.getAxesDirections();

    for (const [dir1, dir2] of axes) {
      const line = this.getLineInDirection(q, r, dir1, dir2, player);

      if (line.length >= 6) {
        return { winner: player, line };
      }
    }

    return { winner: null, line: null };
  }

  /**
   * Get all consecutive pieces in a line in both directions
   */
  getLineInDirection(startQ, startR, dir1, dir2, player) {
    const line = [{ q: startQ, r: startR }];

    // Go in first direction
    let q = startQ + dir1.dq;
    let r = startR + dir1.dr;
    while (this.getCell(q, r) === player) {
      line.push({ q, r });
      q += dir1.dq;
      r += dir1.dr;
    }

    // Go in opposite direction
    q = startQ + dir2.dq;
    r = startR + dir2.dr;
    while (this.getCell(q, r) === player) {
      line.push({ q, r });
      q += dir2.dq;
      r += dir2.dr;
    }

    return line;
  }

  /**
   * Get the value of a cell
   */
  getCell(q, r) {
    return this.board.get(HexUtils.hexToKey(q, r));
  }

  /**
   * Check if a cell is occupied
   */
  isCellOccupied(q, r) {
    return this.board.has(HexUtils.hexToKey(q, r));
  }

  /**
   * Get all pieces of a specific player
   */
  getPlayerPieces(player) {
    const pieces = [];
    for (const [key, value] of this.board.entries()) {
      if (value === player) {
        const coords = HexUtils.keyToHex(key);
        pieces.push(coords);
      }
    }
    return pieces;
  }
}
