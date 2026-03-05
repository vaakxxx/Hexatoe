import { GameLogic } from './gameLogic.js';

export class GameManager {
  constructor() {
    this.games = new Map(); // gameId -> game state
    this.playerGames = new Map(); // socketId -> gameId
  }

  /**
   * Generate a unique game ID
   */
  generateGameId() {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new game
   */
  createGame(socketId, playerName, lobbyName = null) {
    const gameId = this.generateGameId();
    const game = {
      id: gameId,
      lobbyName: lobbyName || null,
      logic: new GameLogic(),
      players: {
        X: { socketId, name: playerName, connected: true },
        O: null
      },
      status: 'waiting', // waiting, playing, finished
      createdAt: Date.now()
    };

    this.games.set(gameId, game);
    this.playerGames.set(socketId, gameId);

    return game;
  }

  /**
   * Join an existing game
   */
  joinGame(gameId, socketId, playerName) {
    const game = this.games.get(gameId);

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== 'waiting') {
      return { success: false, error: 'Game already started' };
    }

    if (game.players.O !== null) {
      return { success: false, error: 'Game is full' };
    }

    // Add the second player
    game.players.O = { socketId, name: playerName, connected: true };
    game.status = 'playing';

    this.playerGames.set(socketId, gameId);

    return { success: true, game };
  }

  /**
   * Make a move in a game
   */
  makeMove(gameId, socketId, coords) {
    const game = this.games.get(gameId);

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.status !== 'playing') {
      return { success: false, error: 'Game is not in progress' };
    }

    // Determine which player is making the move
    const player = this.getPlayerRole(game, socketId);

    if (!player) {
      return { success: false, error: 'You are not in this game' };
    }

    // Make the move using game logic
    const result = game.logic.makeMove(coords.q, coords.r, player);

    if (result.success) {
      return {
        ...result,
        currentPlayer: game.logic.currentPlayer,
        movesRemaining: game.logic.movesRemaining,
        board: game.logic.getBoardState()
      };
    }

    return result;
  }

  /**
   * Request a rematch - flips the roles so O becomes X and goes first
   */
  requestRematch(gameId, socketId) {
    const game = this.games.get(gameId);

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    // Only allow rematch if game is finished
    if (game.status !== 'finished') {
      return { success: false, error: 'Game is not finished yet' };
    }

    // Determine which player is requesting
    const player = this.getPlayerRole(game, socketId);

    if (!player) {
      return { success: false, error: 'You are not in this game' };
    }

    // Reset the game logic
    game.logic = new GameLogic();

    // Swap the players: X becomes O, O becomes X
    const oldX = game.players.X;
    const oldO = game.players.O;

    game.players.X = oldO; // O goes first now!
    game.players.O = oldX;

    game.status = 'playing';

    // Return new role for the requesting player
    const newRole = (player === 'X') ? 'O' : 'X';

    return {
      success: true,
      game,
      currentPlayer: game.logic.currentPlayer, // Should be 'X' (the former O)
      movesRemaining: game.logic.movesRemaining,
      newRole
    };
  }

  /**
   * Get the role (X or O) of a player in a game
   */
  getPlayerRole(game, socketId) {
    if (game.players.X?.socketId === socketId) return 'X';
    if (game.players.O?.socketId === socketId) return 'O';
    return null;
  }

  /**
   * Get the name of a player
   */
  getPlayerName(gameId, socketId) {
    const game = this.games.get(gameId);
    if (!game) return null;

    if (game.players.X?.socketId === socketId) return game.players.X.name;
    if (game.players.O?.socketId === socketId) return game.players.O.name;
    return null;
  }

  /**
   * Get the current game state for a player
   */
  getGameState(gameId, socketId) {
    const game = this.games.get(gameId);

    if (!game) {
      return null;
    }

    const player = this.getPlayerRole(game, socketId);

    if (!player) {
      return null;
    }

    return {
      gameId: game.id,
      player,
      players: game.players,
      status: game.status,
      currentPlayer: game.logic.currentPlayer,
      movesRemaining: game.logic.movesRemaining,
      board: game.logic.getBoardState(),
      winner: game.logic.winner,
      winningLine: game.logic.winningLine
    };
  }

  /**
   * Get available games for the lobby
   */
  getAvailableGames() {
    const games = [];

    for (const game of this.games.values()) {
      if (game.status === 'waiting') {
        games.push({
          id: game.id,
          hostName: game.players.X.name,
          lobbyName: game.lobbyName,
          createdAt: game.createdAt
        });
      }
    }

    return games;
  }

  /**
   * End a game
   */
  endGame(gameId) {
    const game = this.games.get(gameId);
    if (game) {
      game.status = 'finished';
    }
  }

  /**
   * Remove a player from a game
   */
  removePlayerFromGame(gameId, socketId) {
    const game = this.games.get(gameId);
    if (!game) return;

    const player = this.getPlayerRole(game, socketId);
    if (player) {
      game.players[player].connected = false;
    }

    this.playerGames.delete(socketId);

    // If both players are disconnected, clean up the game after a delay
    if (!game.players.X?.connected && !game.players.O?.connected) {
      setTimeout(() => {
        if (game.status === 'finished' ||
            (!game.players.X?.connected && !game.players.O?.connected)) {
          this.games.delete(gameId);
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
  }

  /**
   * Handle a player disconnecting
   */
  handleDisconnect(socketId) {
    const gameId = this.playerGames.get(socketId);

    if (gameId) {
      this.removePlayerFromGame(gameId, socketId);
    }
  }

  /**
   * Reconnect a player to their game
   */
  reconnectPlayer(gameId, socketId) {
    const game = this.games.get(gameId);

    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    const player = this.getPlayerRole(game, socketId);

    if (player) {
      game.players[player].connected = true;
      this.playerGames.set(socketId, gameId);
      return { success: true, game, player };
    }

    return { success: false, error: 'Not a player in this game' };
  }
}
