/**
 * Chat manager for in-game messaging
 */

import { DomHelpers } from '../utils/domHelpers.js';

export class ChatManager {
  constructor(socketClient, gameState) {
    this.socket = socketClient;
    this.state = gameState;
    this.inactivityTimer = null;
    this.isActive = false;
  }

  /**
   * Send a chat message
   */
  sendMessage() {
    const input = DomHelpers.getElement('chat-input');
    const message = input?.value?.trim();

    if (!message || !this.state.isInGame()) return;

    this.socket.sendChatMessage(this.state.gameId, message);
    DomHelpers.setValue('chat-input', '');
  }

  /**
   * Add a chat message to the UI
   */
  addMessage(sender, message, type = 'normal') {
    const container = DomHelpers.getElement('chat-messages');
    if (!container) return;

    const messageEl = document.createElement('div');

    if (type === 'system') {
      messageEl.className = 'chat-message system';
      messageEl.textContent = message;
    } else {
      messageEl.className = 'chat-message';
      messageEl.innerHTML = `<span class="sender">${sender}:</span><span class="text">${DomHelpers.escapeHtml(message)}</span>`;
    }

    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;

    // Activate chat panel when message is received
    this.resetInactivityTimer();
  }

  /**
   * Reset inactivity timer
   */
  resetInactivityTimer() {
    // Set chat to active (full opacity)
    this.setChatActive(true);

    // Clear existing timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    // Set new timer to fade after 3 seconds of inactivity
    this.inactivityTimer = setTimeout(() => {
      this.setChatActive(false);
    }, 3000);
  }

  /**
   * Set chat panel active state
   */
  setChatActive(isActive) {
    const chatPanel = document.querySelector('.chat-panel');
    if (chatPanel) {
      chatPanel.style.opacity = isActive ? '1' : '0.25';
      chatPanel.style.transition = 'opacity 0.5s ease';
    }
    this.isActive = isActive;
  }

  /**
   * Setup chat event listeners
   */
  setupEventListeners() {
    const chatPanel = document.querySelector('.chat-panel');
    const chatInput = document.getElementById('chat-input');

    // Hover events
    if (chatPanel) {
      chatPanel.addEventListener('mouseenter', () => this.resetInactivityTimer());
      chatPanel.addEventListener('mouseleave', () => this.resetInactivityTimer());
    }

    // Input/typing events
    if (chatInput) {
      chatInput.addEventListener('focus', () => this.resetInactivityTimer());
      chatInput.addEventListener('blur', () => this.resetInactivityTimer());
      chatInput.addEventListener('input', () => this.resetInactivityTimer());
    }

    DomHelpers.on('chat-send-btn', 'click', () => {
      this.sendMessage();
      this.resetInactivityTimer();
    });
    DomHelpers.on('chat-input', 'keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
        this.resetInactivityTimer();
      }
    });

    // Start inactivity timer after initial setup
    this.resetInactivityTimer();
  }
}
