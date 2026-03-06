/**
 * Game state management
 */

export class GameState {
  constructor() {
    this.reset();
  }

  /**
   * Reset game state
   */
  reset() {
    this.gameId = null;
    this.lobbyName = null;
    this.player = null;
    this.playerName = '';
    this.board = {};
    this.currentPlayer = 'X';
    this.movesRemaining = 1;
    this.players = null;
    this.playerNames = { X: '', O: '' };
    this.winningLine = null;
    this.gridRadius = 20;
    this.hexSize = 30;
  }

  /**
   * Set game info after creation/join
   */
  setGameInfo(data) {
    this.gameId = data.gameId;
    this.lobbyName = data.lobbyName;
    this.player = data.player;
    this.playerName = data.playerName;
    if (data.playerName) {
      this.playerNames[this.player] = data.playerName;
    }
  }

  /**
   * Set players info
   */
  setPlayers(players) {
    this.players = players;
    this.playerNames.X = players.X?.name || 'Player X';
    this.playerNames.O = players.O?.name || 'Player O';
  }

  /**
   * Update board state
   */
  updateBoard(data) {
    this.board = data.board;
    this.currentPlayer = data.currentPlayer;
    this.movesRemaining = data.movesRemaining;
    if (data.winningLine !== undefined) {
      this.winningLine = data.winningLine;
    }
  }

  /**
   * Check if it's the current player's turn
   */
  isMyTurn() {
    return this.currentPlayer === this.player;
  }

  /**
   * Get current player name
   */
  getCurrentPlayerName() {
    return this.playerNames[this.currentPlayer] || this.currentPlayer;
  }

  /**
   * Get opponent info
   */
  getOpponent() {
    if (!this.players) return null;
    return this.player === 'X' ? 'O' : 'X';
  }

  /**
   * Get opponent name
   */
  getOpponentName() {
    const opponent = this.getOpponent();
    return this.playerNames[opponent] || 'Opponent';
  }

  /**
   * Check if cell is occupied
   */
  isCellOccupied(q, r) {
    const key = `${q},${r}`;
    return !!this.board[key];
  }

  /**
   * Check if game is active
   */
  isInGame() {
    return !!this.gameId;
  }

  /**
   * Prepare for rematch
   */
  prepareForRematch(data) {
    this.board = {};
    this.currentPlayer = data.currentPlayer;
    this.movesRemaining = data.movesRemaining;
    this.winningLine = null;
    this.player = data.newRole;
    this.playerNames.X = data.players.X.name;
    this.playerNames.O = data.players.O.name;
    this.players = data.players;
  }
}
