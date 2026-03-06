/**
 * Hexatoe - Hexagonal Tic-Tac-Toe Client
 * Main orchestrator that brings together all modules
 */

import { SocketClient } from './core/socketClient.js';
import { GameState } from './core/gameState.js';
import { UIManager } from './ui/uiManager.js';
import { ChatManager } from './ui/chatManager.js';
import { LobbyManager } from './ui/lobbyManager.js';
import { InputHandler } from './input/inputHandler.js';
import { Renderer } from './rendering/renderer.js';
import { CursorManager } from './rendering/cursorManager.js';

class HexatoeClient {
  constructor() {
    // Initialize core modules
    this.state = new GameState();
    this.socket = new SocketClient();
    this.ui = new UIManager(this.state);
    this.chat = new ChatManager(this.socket, this.state);
    this.lobby = new LobbyManager(this.socket, this.state);

    // Canvas and rendering
    this.canvas = null;
    this.renderer = null;
    this.input = null;
    this.cursors = null;

    this.init();
  }

  init() {
    // Initialize canvas
    this.canvas = document.getElementById('game-canvas');

    // Initialize input and rendering modules
    this.cursors = new CursorManager(this.canvas);
    this.input = new InputHandler(this.canvas, this.state, this.socket);
    this.renderer = new Renderer(this.canvas, this.state, this.input, this.cursors);

    // Setup event listeners
    this.setupEventListeners();

    // Global Enter key handler
    this.setupGlobalKeyboardHandler();

    // Connect to server
    this.socket.connect();

    // Setup socket event handlers
    this.setupSocketHandlers();

    // Load saved player name from localStorage
    this.lobby.loadSavedName();

    // Load games list
    this.lobby.loadGamesList();

    // Setup canvas resize handler
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();

    // Start render loop
    this.renderer.startRenderLoop(() => this.renderer.render());
  }

  setupGlobalKeyboardHandler() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();

        const lobbyScreen = document.getElementById('lobby-screen');
        if (!lobbyScreen.classList.contains('hidden')) {
          document.getElementById('player-name')?.focus();
        }

        const gameScreen = document.getElementById('game-screen');
        if (!gameScreen.classList.contains('hidden')) {
          document.getElementById('chat-input')?.focus();
        }
      }
    });
  }

  setupEventListeners() {
    // UI event listeners
    this.ui.setupEventListeners({
      onLeaveGame: () => this.leaveGame(),
      onCloseModal: () => this.ui.closeModal(),
      onRematch: () => this.requestRematch()
    });

    // Chat event listeners
    this.chat.setupEventListeners();

    // Lobby event listeners
    this.lobby.setupEventListeners();

    // Lobby error callback
    this.lobby.onError = (msg) => this.ui.showMessage(msg, 'error');

    // Input event listeners
    this.input.setupEventListeners({
      onError: (msg) => this.ui.showMessage(msg, 'error'),
      onInputUpdate: () => this.renderer.render()
    });
  }

  setupSocketHandlers() {
    this.socket.on('disconnect', () => {
      this.ui.showMessage('Disconnected from server', 'error');
    });

    this.socket.on('gameCreated', (data) => {
      this.state.setGameInfo({
        ...data,
        socketId: this.socket.getSocketId()
      });
      this.ui.updateLobbyTitle();
      this.ui.showGameScreen();
      this.ui.showMessage('Waiting for opponent...', 'success');
      this.handleResize();
    });

    this.socket.on('gameJoined', (data) => {
      this.state.setGameInfo({
        ...data,
        socketId: this.socket.getSocketId()
      });
      this.ui.updateLobbyTitle();
      this.ui.showGameScreen();
      this.handleResize();
    });

    this.socket.on('gameStart', (data) => {
      this.state.setPlayers(data.players);
      this.ui.showMessage('Game started!', 'success');
      this.ui.updateUI();
      this.handleResize();
    });

    this.socket.on('moveMade', (data) => {
      this.state.updateBoard(data);
      this.ui.updateUI();
      this.renderer.render();
    });

    this.socket.on('gameOver', (data) => {
      this.state.winningLine = data.winningLine;
      this.renderer.render();
      this.ui.showModal(
        'Game Over!',
        `${this.state.playerNames[data.winner] || data.winner} wins!`
      );
      this.ui.showRematchButton();
    });

    this.socket.on('rematchAccepted', (data) => {
      this.state.prepareForRematch(data);
      this.ui.hideRematchButton();
      this.ui.showMessage('Rematch! Roles have been flipped!', 'success');
      this.ui.updateUI();
      this.renderer.render();
      this.chat.addMessage('System', 'Rematch started! Roles have been flipped.', 'system');
    });

    this.socket.on('moveError', (data) => {
      this.ui.showMessage(data.message, 'error');
    });

    this.socket.on('joinError', (data) => {
      this.ui.showMessage(data.message, 'error');
    });

    this.socket.on('playerLeft', (data) => {
      if (data.socketId) {
        this.cursors.removeCursor(data.socketId);
        this.renderer.render();
      }
      this.chat.addMessage('System', 'Your opponent has left the game.', 'system');
      this.ui.showMessage('Opponent disconnected', 'error');
    });

    this.socket.on('chatMessage', (data) => {
      this.chat.addMessage(data.sender, data.message);
    });

    this.socket.on('gameState', (data) => {
      this.state.updateBoard(data);
      this.ui.updateUI();
      this.renderer.render();
    });

    this.socket.on('mousePosition', (data) => {
      this.cursors.updateOpponentCursor(data, this.state.player);
    });
  }

  handleResize() {
    this.renderer.resize();
    this.renderer.render();
  }

  requestRematch() {
    if (!this.state.isInGame()) return;
    this.socket.requestRematch(this.state.gameId);
    this.ui.hideRematchButton();
    this.ui.showMessage('Rematch requested!', 'success');
  }

  leaveGame() {
    if (this.state.gameId) {
      this.socket.leaveGame(this.state.gameId);
    }

    // Reset state
    this.state.reset();
    this.input.reset();
    this.cursors.clearAll();

    this.ui.hideRematchButton();
    this.ui.showLobbyScreen();
  }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new HexatoeClient();
});
