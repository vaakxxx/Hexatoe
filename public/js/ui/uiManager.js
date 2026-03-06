/**
 * UI manager for game interface
 */

import { DomHelpers } from '../utils/domHelpers.js';

export class UIManager {
  constructor(gameState) {
    this.state = gameState;
    this.messageTimeout = null;
    this.timerInterval = null;
  }

  /**
   * Update turn indicator and moves badge
   */
  updateTurnInfo() {
    const turnText = DomHelpers.getElement('turn-text');
    const movesBadge = DomHelpers.getElement('moves-remaining');

    if (!turnText || !movesBadge) return;

    const currentPlayerName = this.state.getCurrentPlayerName();

    if (this.state.isMyTurn()) {
      turnText.textContent = `Your turn! (${currentPlayerName})`;
      const playerColor = this.state.player === 'X' ? '#e94560' : '#4ecdc4';
      turnText.style.color = playerColor;
    } else {
      turnText.textContent = `${currentPlayerName}'s turn`;
      turnText.style.color = '#a0a0a0';
    }

    movesBadge.textContent = `${this.state.movesRemaining} move${this.state.movesRemaining !== 1 ? 's' : ''} left`;
  }

  /**
   * Update players info display
   */
  updatePlayersInfo() {
    const playersInfo = DomHelpers.getElement('players-info');
    if (!playersInfo || !this.state.players) return;

    const xName = this.state.playerNames.X || 'Player X';
    const oName = this.state.playerNames.O || 'Player O';

    const myBadge = this.state.player === 'X' ? 'x' : 'o';
    const opponentBadge = this.state.player === 'X' ? 'o' : 'x';
    const opponentSymbol = this.state.player === 'X' ? 'O' : 'X';
    const opponentName = this.state.player === 'X' ? oName : xName;

    playersInfo.innerHTML = `
      <span class="player-badge ${myBadge}">${this.state.playerName}: ${this.state.player}</span>
      <span class="player-badge ${opponentBadge}">${opponentName}: ${opponentSymbol}</span>
    `;
  }

  /**
   * Update all UI elements
   */
  updateUI() {
    this.updateTurnInfo();
    this.updatePlayersInfo();
  }

  /**
   * Show a temporary message
   */
  showMessage(text, type = '') {
    const messageEl = DomHelpers.getElement('game-message');
    if (!messageEl) return;

    messageEl.textContent = text;
    messageEl.className = 'message ' + type;

    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }

    this.messageTimeout = setTimeout(() => {
      messageEl.textContent = '';
      messageEl.className = 'message';
    }, 3000);
  }

  /**
   * Show modal dialog
   */
  showModal(title, message) {
    DomHelpers.setText('modal-title', title);
    DomHelpers.setText('modal-message', message);
    DomHelpers.showElement('modal');
  }

  /**
   * Close modal dialog
   */
  closeModal() {
    DomHelpers.hideElement('modal');
  }

  /**
   * Show game screen
   */
  showGameScreen() {
    DomHelpers.hideElement('lobby-screen');
    DomHelpers.showElement('game-screen');
    this.startGameTimer();
  }

  /**
   * Show lobby screen
   */
  showLobbyScreen() {
    this.stopGameTimer();
    DomHelpers.hideElement('game-screen');
    DomHelpers.showElement('lobby-screen');
  }

  /**
   * Update lobby title
   */
  updateLobbyTitle() {
    const title = DomHelpers.getElement('lobby-title');
    if (title) {
      title.textContent = this.state.lobbyName || `Game: ${this.state.gameId?.slice(-8) || ''}`;
    }
  }

  /**
   * Show rematch button
   */
  showRematchButton() {
    DomHelpers.showElement('rematch-btn');
  }

  /**
   * Hide rematch button
   */
  hideRematchButton() {
    DomHelpers.hideElement('rematch-btn');
  }

  /**
   * Start the game timer
   */
  startGameTimer() {
    // Clear existing interval if any
    this.stopGameTimer();

    // Update timer every second
    this.timerInterval = setInterval(() => this.updateGameTimer(), 1000);

    // Initial update
    this.updateGameTimer();
  }

  /**
   * Stop the game timer
   */
  stopGameTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Update the game timer display
   */
  updateGameTimer() {
    const timerElement = DomHelpers.getElement('game-timer');
    if (!timerElement || !this.state.gameStartTime) return;

    const elapsed = Date.now() - this.state.gameStartTime;
    timerElement.textContent = this.formatTime(elapsed);
  }

  /**
   * Format time in MM:SS or HH:MM:SS format
   */
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const secs = seconds % 60;
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Setup all UI event listeners
   */
  setupEventListeners(handlers) {
    DomHelpers.on('leave-game-btn', 'click', handlers.onLeaveGame);
    DomHelpers.on('modal-close-btn', 'click', handlers.onCloseModal);
    DomHelpers.on('rematch-btn', 'click', handlers.onRematch);
  }
}
