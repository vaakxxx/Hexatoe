/**
 * Lobby manager for game lobby functionality
 */

import { DomHelpers } from '../utils/domHelpers.js';

export class LobbyManager {
  constructor(socketClient, gameState) {
    this.socket = socketClient;
    this.state = gameState;
    this.STORAGE_KEY = 'hexatoe_player_name';
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
        </div>
        <button class="btn primary join-btn" data-game-id="${game.id}">Join</button>
      `;
      container.appendChild(gameItem);
    });

    // Add join button listeners
    container.querySelectorAll('.join-btn').forEach(btn => {
      btn.addEventListener('click', () => this.joinGame(btn.dataset.gameId));
    });
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
