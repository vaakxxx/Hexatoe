/**
 * Socket.io client wrapper for game communication
 */

export class SocketClient {
  constructor() {
    this.socket = null;
    this.handlers = new Map();
  }

  /**
   * Connect to the server
   */
  connect() {
    this.socket = io();

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this._emit('connect');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this._emit('disconnect');
    });

    // Set up default game event handlers
    this._setupGameHandlers();
  }

  /**
   * Set up default game event handlers
   */
  _setupGameHandlers() {
    this.socket.on('gameCreated', (data) => this._emit('gameCreated', data));
    this.socket.on('gameJoined', (data) => this._emit('gameJoined', data));
    this.socket.on('gameStart', (data) => this._emit('gameStart', data));
    this.socket.on('moveMade', (data) => this._emit('moveMade', data));
    this.socket.on('gameOver', (data) => this._emit('gameOver', data));
    this.socket.on('rematchAccepted', (data) => this._emit('rematchAccepted', data));
    this.socket.on('moveError', (data) => this._emit('moveError', data));
    this.socket.on('joinError', (data) => this._emit('joinError', data));
    this.socket.on('playerLeft', (data) => this._emit('playerLeft', data));
    this.socket.on('chatMessage', (data) => this._emit('chatMessage', data));
    this.socket.on('gameState', (data) => this._emit('gameState', data));
    this.socket.on('mousePosition', (data) => this._emit('mousePosition', data));
  }

  /**
   * Emit to internal handlers
   */
  _emit(event, data) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(handler);
  }

  /**
   * Remove event handler
   */
  off(event, handler) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Create a new game
   */
  createGame(playerName, lobbyName) {
    this.socket.emit('createGame', { playerName, lobbyName });
  }

  /**
   * Join an existing game
   */
  joinGame(gameId, playerName) {
    this.socket.emit('joinGame', { gameId, playerName });
  }

  /**
   * Make a move
   */
  makeMove(gameId, q, r) {
    this.socket.emit('makeMove', { gameId, q, r });
  }

  /**
   * Request a rematch
   */
  requestRematch(gameId) {
    this.socket.emit('requestRematch', { gameId });
  }

  /**
   * Send a chat message
   */
  sendChatMessage(gameId, message) {
    this.socket.emit('chatMessage', { gameId, message });
  }

  /**
   * Send mouse position
   */
  sendMousePosition(gameId, x, y) {
    this.socket.emit('mousePosition', { gameId, x, y });
  }

  /**
   * Leave a game
   */
  leaveGame(gameId) {
    this.socket.emit('leaveGame', { gameId });
  }

  /**
   * Request game state
   */
  getGameState(gameId) {
    this.socket.emit('getGameState', { gameId });
  }

  /**
   * Get the socket id
   */
  getSocketId() {
    return this.socket?.id;
  }
}
