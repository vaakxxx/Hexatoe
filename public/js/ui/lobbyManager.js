/**
 * Lobby manager for game lobby functionality
 */

import { DomHelpers } from '../utils/domHelpers.js';

export class LobbyManager {
  constructor(socketClient, gameState) {
    this.socket = socketClient;
    this.state = gameState;
    this.STORAGE_KEY = 'hexatoe_player_name';
    this.games = [];
    this.timerInterval = null;
  }

  /**
   * Load saved player name from localStorage
   */
  loadSavedName() {
    const savedName = localStorage.getItem(this.STORAGE_KEY);
    if (savedName) {
      DomHelpers.setValue('player-name', savedName);
    }
  }

  /**
   * Save player name to localStorage
   */
  saveName(name) {
    if (name) {
      localStorage.setItem(this.STORAGE_KEY, name);
    }
  }

  /**
   * Load the list of available games
   */
  async loadGamesList() {
    try {
      const res = await fetch('/api/lobby');
      const data = await res.json();
      this.displayGamesList(data.games);
    } catch (err) {
      console.error('Error loading games:', err);
    }
  }

  /**
   * Display the list of available games
   */
  displayGamesList(games) {
    const container = DomHelpers.getElement('games-container');
    if (!container) return;

    // Store games and start/refresh timer
    this.games = games;
    this.startTimer();

    DomHelpers.clear('games-container');

    if (games.length === 0) {
      container.innerHTML = '<p style="color: #a0a0a0;">No games available. Create one!</p>';
      return;
    }

    games.forEach(game => {
      const gameItem = document.createElement('div');
      gameItem.className = 'game-item';

      const displayName = game.lobbyName || `${game.hostName}'s game`;

      gameItem.innerHTML = `
        <div class="game-item-info">
          ${game.lobbyName ? `<div class="game-item-lobby-name">${DomHelpers.escapeHtml(game.lobbyName)}</div>` : ''}
          <div class="game-item-host">Host: ${DomHelpers.escapeHtml(game.hostName)}</div>
          <div class="game-item-id">ID: ${game.id.slice(-8)}</div>
          <div class="game-item-timer" data-created-at="${game.createdAt}"><span class="timer-text">loading...</span></div>
        </div>
        <button class="btn primary join-btn" data-game-id="${game.id}">Join</button>
      `;
      container.appendChild(gameItem);
    });

    // Add join button listeners
    container.querySelectorAll('.join-btn').forEach(btn => {
      btn.addEventListener('click', () => this.joinGame(btn.dataset.gameId));
    });

    // Initial timer update
    this.updateTimers();
  }

  /**
   * Start the timer interval
   */
  startTimer() {
    // Clear existing interval if any
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    // Update timers every second
    this.timerInterval = setInterval(() => this.updateTimers(), 1000);
  }

  /**
   * Stop the timer interval
   */
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Update all timer displays
   */
  updateTimers() {
    const timerElements = document.querySelectorAll('.game-item-timer');
    timerElements.forEach(element => {
      const createdAt = parseInt(element.dataset.createdAt);
      if (createdAt) {
        const elapsed = Date.now() - createdAt;
        const timerText = element.querySelector('.timer-text');
        if (timerText) {
          timerText.textContent = this.formatElapsedTime(elapsed);
        }
      }
    });
  }

  /**
   * Format elapsed time in a human-readable way
   */
  formatElapsedTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } else if (minutes > 0) {
      const secs = seconds % 60;
      return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get player name from input
   */
  getPlayerName() {
    const name = DomHelpers.getValue('player-name');
    if (!name) return null;

    DomHelpers.setValue('player-name', name);
    return name;
  }

  /**
   * Get lobby name from input (optional)
   */
  getLobbyName() {
    return DomHelpers.getValue('lobby-name') || null;
  }

  /**
   * Create a new game
   */
  createGame() {
    const name = this.getPlayerName();
    if (!name) {
      // Trigger message through callback
      this.onError?.('Please enter your name');
      return;
    }
    this.saveName(name);
    let lobbyName = this.getLobbyName();
    if (!lobbyName) {
      lobbyName = `${name}'s lobby`;
    }
    this.socket.createGame(name, lobbyName);
  }

  /**
   * Join an existing game
   */
  joinGame(gameId) {
    const name = this.getPlayerName();
    if (!name) {
      this.onError?.('Please enter your name');
      return;
    }
    this.saveName(name);
    this.socket.joinGame(gameId, name);
  }

  /**
   * Setup lobby event listeners
   */
  setupEventListeners() {
    DomHelpers.on('create-game-btn', 'click', () => this.createGame());
    DomHelpers.on('refresh-lobby-btn', 'click', () => this.loadGamesList());
  }

  /**
   * Set error callback
   */
  onError(callback) {
    this.onErrorCallback = callback;
  }
}
