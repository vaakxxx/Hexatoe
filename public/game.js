/**
 * Hexatoe - Hexagonal Tic-Tac-Toe Client
 */

class HexatoeClient {
  constructor() {
    this.socket = null;
    this.gameId = null;
    this.lobbyName = null;
    this.player = null;
    this.playerName = '';
    this.canvas = null;
    this.ctx = null;
    this.board = {};
    this.currentPlayer = 'X';
    this.movesRemaining = 1;
    // Hexagon grid radius (20 gives a large hexagon)
    this.gridRadius = 20;
    this.hexSize = 30;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.lastMousePos = { x: 0, y: 0 };
    this.hoveredHex = null;
    this.winningLine = null;
    this.players = null;
    this.playerNames = { X: '', O: '' }; // Store actual player names

    // Mouse trail for visual feedback
    this.mouseTrail = [];
    this.maxTrailLength = 15;

    // Opponent cursors with trails
    this.opponentCursors = new Map(); // socketId -> { gridX, gridY, trail: [], color, playerRole, lastUpdate }
    this.lastMouseEmit = 0;
    this.mouseEmitThrottle = 30; // ms between position updates

    // Animation frame for continuous rendering
    this.animationFrameId = null;

    this.init();
  }

  init() {
    // Initialize canvas
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Set up event listeners
    this.setupEventListeners();

    // Global Enter key handler - focus player name input on lobby, chat input on game screen
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();

        // Check if we're on the lobby screen
        const lobbyScreen = document.getElementById('lobby-screen');
        if (!lobbyScreen.classList.contains('hidden')) {
          const playerInput = document.getElementById('player-name');
          if (playerInput) {
            playerInput.focus();
          }
        }
        // Check if we're on the game screen
        const gameScreen = document.getElementById('game-screen');
        if (!gameScreen.classList.contains('hidden')) {
          const chatInput = document.getElementById('chat-input');
          if (chatInput) {
            chatInput.focus();
          }
        }
      }
    });

    // Connect to server
    this.connectToServer();

    // Load games list
    this.loadGamesList();

    // Set up canvas resize handler
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();

    // Start continuous render loop
    this.startRenderLoop();
  }

  startRenderLoop() {
    const loop = () => {
      // Always render to keep trails and cursors smooth
      if (this.gameId) {
        this.render();
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  setupEventListeners() {
    // Lobby
    document.getElementById('create-game-btn').addEventListener('click', () => this.createGame());
    document.getElementById('refresh-lobby-btn').addEventListener('click', () => this.loadGamesList());
    document.getElementById('rematch-btn').addEventListener('click', () => this.requestRematch());

    // Game
    document.getElementById('leave-game-btn').addEventListener('click', () => this.leaveGame());
    document.getElementById('modal-close-btn').addEventListener('click', () => this.closeModal());

    // Chat
    document.getElementById('chat-send-btn').addEventListener('click', () => this.sendChatMessage());
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendChatMessage();
      }
    });

    // Canvas interactions - RIGHT click to drag, LEFT click to place
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault(); // Prevent context menu
      return false;
    });
    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
    this.canvas.addEventListener('mouseup', () => this.handleCanvasMouseUp());
    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredHex = null;
      this.mouseTrail = [];
      this.render();
    });

    // Touch support
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
  }

  connectToServer() {
    this.socket = io();

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      this.showMessage('Disconnected from server', 'error');
    });

    this.socket.on('gameCreated', (data) => {
      this.gameId = data.gameId;
      this.lobbyName = data.lobbyName;
      this.player = data.player;
      this.playerName = data.playerName;
      this.playerNames[this.player] = data.playerName;
      this.showGameScreen();
      this.showMessage('Waiting for opponent...', 'success');
    });

    this.socket.on('gameJoined', (data) => {
      this.gameId = data.gameId;
      this.lobbyName = data.lobbyName;
      this.player = data.player;
      this.playerName = data.playerName;
      this.playerNames[this.player] = data.playerName;
      this.showGameScreen();
    });

    this.socket.on('gameStart', (data) => {
      this.players = data.players;
      // Store player names
      this.playerNames.X = data.players.X?.name || 'Player X';
      this.playerNames.O = data.players.O?.name || 'Player O';
      this.showMessage('Game started!', 'success');
      this.updateUI();
      // Ensure canvas is properly sized before rendering
      requestAnimationFrame(() => {
        this.resizeCanvas();
        this.render();
      });
    });

    this.socket.on('moveMade', (data) => {
      this.board = data.board;
      this.currentPlayer = data.currentPlayer;
      this.movesRemaining = data.movesRemaining;
      this.updateUI();
      this.render();
    });

    this.socket.on('gameOver', (data) => {
      this.winningLine = data.winningLine;
      this.render();
      this.showModal(
        'Game Over!',
        `${this.playerNames[data.winner] || data.winner} wins!`
      );
      // Show rematch button
      document.getElementById('rematch-btn').classList.remove('hidden');
    });

    this.socket.on('rematchAccepted', (data) => {
      this.board = {};
      this.currentPlayer = data.currentPlayer;
      this.movesRemaining = data.movesRemaining;
      this.winningLine = null;
      this.player = data.newRole; // Role is flipped in rematch!
      this.playerNames.X = data.players.X.name;
      this.playerNames.O = data.players.O.name;
      this.players = data.players;

      document.getElementById('rematch-btn').classList.add('hidden');
      this.showMessage('Rematch! Roles have been flipped!', 'success');
      this.updateUI();
      this.render();
      this.addChatMessage('System', 'Rematch started! Roles have been flipped.', 'system');
    });

    this.socket.on('moveError', (data) => {
      this.showMessage(data.message, 'error');
    });

    this.socket.on('joinError', (data) => {
      this.showMessage(data.message, 'error');
    });

    this.socket.on('playerLeft', (data) => {
      if (data.socketId) {
        this.opponentCursors.delete(data.socketId);
        this.render();
      }
      this.addChatMessage('System', 'Your opponent has left the game.', 'system');
      this.showMessage('Opponent disconnected', 'error');
    });

    this.socket.on('chatMessage', (data) => {
      this.addChatMessage(data.sender, data.message);
    });

    this.socket.on('gameState', (data) => {
      this.board = data.board;
      this.currentPlayer = data.currentPlayer;
      this.movesRemaining = data.movesRemaining;
      this.winningLine = data.winningLine;
      this.updateUI();
      this.render();
    });

    // Opponent mouse position updates
    this.socket.on('mousePosition', (data) => {
      this.updateOpponentCursor(data);
    });
  }

  // Lobby methods
  loadGamesList() {
    fetch('/api/lobby')
      .then(res => res.json())
      .then(data => {
        this.displayGamesList(data.games);
      })
      .catch(err => {
        console.error('Error loading games:', err);
      });
  }

  displayGamesList(games) {
    const container = document.getElementById('games-container');
    container.innerHTML = '';

    if (games.length === 0) {
      container.innerHTML = '<p style="color: #a0a0a0;">No games available. Create one!</p>';
      return;
    }

    games.forEach(game => {
      const gameItem = document.createElement('div');
      gameItem.className = 'game-item';

      // Display lobby name if available, otherwise show host name
      const displayName = game.lobbyName || `${game.hostName}'s game`;

      gameItem.innerHTML = `
        <div class="game-item-info">
          ${game.lobbyName ? `<div class="game-item-lobby-name">${this.escapeHtml(game.lobbyName)}</div>` : ''}
          <div class="game-item-host">Host: ${this.escapeHtml(game.hostName)}</div>
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

  getPlayerName() {
    const nameInput = document.getElementById('player-name');
    let name = nameInput.value.trim() || 'Anonymous';
    nameInput.value = name;
    return name;
  }

  getLobbyName() {
    const lobbyInput = document.getElementById('lobby-name');
    const lobbyName = lobbyInput.value.trim();
    return lobbyName || null; // Return null if empty, server will use default
  }

  createGame() {
    const name = this.getPlayerName();
    if (!name) {
      this.showMessage('Please enter your name', 'error');
      return;
    }
    const lobbyName = this.getLobbyName();
    this.socket.emit('createGame', { playerName: name, lobbyName });
  }

  joinGame(gameId) {
    const name = this.getPlayerName();
    if (!name) {
      this.showMessage('Please enter your name', 'error');
      return;
    }
    this.socket.emit('joinGame', { gameId, playerName: name });
  }

  requestRematch() {
    if (!this.gameId) return;
    this.socket.emit('requestRematch', { gameId: this.gameId });
    document.getElementById('rematch-btn').classList.add('hidden');
    this.showMessage('Rematch requested!', 'success');
  }

  // Game methods
  showGameScreen() {
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('lobby-title').textContent = this.lobbyName || `Game: ${this.gameId.slice(-8)}`;
    // Wait for layout reflow before resizing canvas
    requestAnimationFrame(() => {
      this.resizeCanvas();
      this.render();
    });
  }

  showLobbyScreen() {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('lobby-screen').classList.remove('hidden');
    this.loadGamesList();
  }

  leaveGame() {
    if (this.gameId) {
      this.socket.emit('leaveGame', { gameId: this.gameId });
    }
    this.gameId = null;
    this.lobbyName = null;
    this.player = null;
    this.board = {};
    this.winningLine = null;
    this.playerNames = { X: '', O: '' };
    this.opponentCursors.clear();
    document.getElementById('rematch-btn').classList.add('hidden');
    this.showLobbyScreen();
  }

  updateUI() {
    const turnText = document.getElementById('turn-text');
    const movesBadge = document.getElementById('moves-remaining');
    const playersInfo = document.getElementById('players-info');

    // Update turn indicator with player name
    const currentPlayerName = this.playerNames[this.currentPlayer] || this.currentPlayer;
    if (this.currentPlayer === this.player) {
      turnText.textContent = `Your turn! (${currentPlayerName})`;
      turnText.style.color = '#4ecdc4';
    } else {
      turnText.textContent = `${currentPlayerName}'s turn`;
      turnText.style.color = '#a0a0a0';
    }

    movesBadge.textContent = `${this.movesRemaining} move${this.movesRemaining !== 1 ? 's' : ''} left`;

    // Update players info with names
    if (this.players) {
      const xName = this.playerNames.X || 'Player X';
      const oName = this.playerNames.O || 'Player O';
      playersInfo.innerHTML = `
        <span class="player-badge ${this.player === 'X' ? 'x' : 'o'}">You: ${this.player} (${this.playerName})</span>
        <span class="player-badge ${this.player === 'X' ? 'o' : 'x'}">Opponent: ${this.player === 'X' ? 'O' : 'X'} (${this.player === 'X' ? oName : xName})</span>
      `;
    }
  }

  showMessage(text, type = '') {
    const messageEl = document.getElementById('game-message');
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
    setTimeout(() => {
      messageEl.textContent = '';
      messageEl.className = 'message';
    }, 3000);
  }

  showModal(title, message) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    document.getElementById('modal').classList.remove('hidden');
  }

  closeModal() {
    document.getElementById('modal').classList.add('hidden');
  }

  // Chat methods
  sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message) return;

    this.socket.emit('chatMessage', {
      gameId: this.gameId,
      message: message
    });

    input.value = '';
  }

  addChatMessage(sender, message, type = 'normal') {
    const messagesContainer = document.getElementById('chat-messages');
    const messageEl = document.createElement('div');

    if (type === 'system') {
      messageEl.className = 'chat-message system';
      messageEl.textContent = message;
    } else {
      messageEl.className = 'chat-message';
      messageEl.innerHTML = `<span class="sender">${sender}:</span><span class="text">${this.escapeHtml(message)}</span>`;
    }

    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Canvas methods
  resizeCanvas() {
    const container = this.canvas.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Only resize if container has actual dimensions
    if (width > 0 && height > 0) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.render();
    }
  }

  // Check if a hex is within the hexagon grid
  isHexInBounds(q, r) {
    const s = -q - r;
    return Math.abs(q) <= this.gridRadius &&
           Math.abs(r) <= this.gridRadius &&
           Math.abs(s) <= this.gridRadius;
  }

  handleCanvasClick(e) {
    if (this.currentPlayer !== this.player) return;
    if (e.button !== 0) return; // Only left click (button 0) places pieces

    const rect = this.canvas.getBoundingClientRect();
    // Convert screen coordinates to hex grid coordinates
    // The grid origin (0,0) is at the center of the canvas plus offset
    const x = e.clientX - rect.left - this.canvas.width / 2 - this.offsetX;
    const y = e.clientY - rect.top - this.canvas.height / 2 - this.offsetY;

    const hex = this.pixelToHex(x, y);

    // Check if hex is within hexagon bounds
    if (!this.isHexInBounds(hex.q, hex.r)) {
      this.showMessage('Outside the play area', 'error');
      return;
    }

    // Check if hex is already occupied
    const key = hex.q + ',' + hex.r;
    if (this.board[key]) {
      this.showMessage('Cell already occupied', 'error');
      return;
    }

    // Make the move
    this.socket.emit('makeMove', {
      gameId: this.gameId,
      q: hex.q,
      r: hex.r
    });
  }

  handleCanvasMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Calculate game board position (accounting for pan offset)
    const gridX = screenX - this.canvas.width / 2 - this.offsetX;
    const gridY = screenY - this.canvas.height / 2 - this.offsetY;

    // Send mouse position to server (throttled) - only if we're in a game with both players
    const now = Date.now();
    if (now - this.lastMouseEmit > this.mouseEmitThrottle && this.gameId && this.players && this.players.X && this.players.O) {
      this.lastMouseEmit = now;
      // Send grid position (relative to game board center, accounting for pan)
      this.socket.emit('mousePosition', {
        gameId: this.gameId,
        x: gridX,
        y: gridY
      });
    }

    // Update mouse trail
    this.updateMouseTrail(screenX, screenY);

    if (this.isDragging) {
      this.offsetX += e.clientX - this.lastMousePos.x;
      this.offsetY += e.clientY - this.lastMousePos.y;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    } else {
      // Convert screen coordinates to hex grid coordinates
      const hex = this.pixelToHex(gridX, gridY);
      if (!this.hoveredHex || hex.q !== this.hoveredHex.q || hex.r !== this.hoveredHex.r) {
        this.hoveredHex = hex;
      }
    }
  }

  updateMouseTrail(x, y) {
    // Add current position to trail
    this.mouseTrail.push({ x, y, time: Date.now() });

    // Remove old trail points
    const now = Date.now();
    while (this.mouseTrail.length > 0 && now - this.mouseTrail[0].time > 500) {
      this.mouseTrail.shift();
    }

    // Limit trail length
    if (this.mouseTrail.length > this.maxTrailLength) {
      this.mouseTrail.shift();
    }
  }

  updateOpponentCursor(data) {
    const { socketId, x, y, playerRole } = data;

    // Don't track our own cursor (shouldn't happen since server filters, but just in case)
    if (playerRole === this.player) return;

    // x and y are grid coordinates (relative to board center)
    // Convert to screen coordinates (applying our local pan offset)
    const screenX = x + this.canvas.width / 2 + this.offsetX;
    const screenY = y + this.canvas.height / 2 + this.offsetY;

    // Get color based on opponent's role (X = red, O = teal)
    const color = playerRole === 'X' ? '#e94560' : '#4ecdc4';

    const cursor = this.opponentCursors.get(socketId) || {
      trail: [],
      playerRole: playerRole,
      color: color
    };

    cursor.screenX = screenX;
    cursor.screenY = screenY;
    cursor.lastUpdate = Date.now();
    cursor.color = color;
    cursor.playerRole = playerRole;

    // Add to trail
    cursor.trail.push({ x: screenX, y: screenY, time: Date.now() });

    // Remove old trail points
    const now = Date.now();
    while (cursor.trail.length > 0 && now - cursor.trail[0].time > 500) {
      cursor.trail.shift();
    }

    // Limit trail length
    if (cursor.trail.length > this.maxTrailLength) {
      cursor.trail.shift();
    }

    this.opponentCursors.set(socketId, cursor);
  }

  handleCanvasMouseDown(e) {
    // Only right click (button 2) starts dragging
    if (e.button === 2) {
      this.isDragging = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
      e.preventDefault();
    }
  }

  handleCanvasMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvas.style.cursor = 'crosshair';
    }
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    // Treat touch as left click for placing pieces
    this.handleCanvasClick({ clientX: touch.clientX, clientY: touch.clientY, button: 0 });
  }

  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    // Update mouse trail for touch
    this.updateMouseTrail(touch.clientX, touch.clientY);

    // Use two fingers or simulate right-click for dragging on touch
    if (e.touches.length === 2) {
      if (!this.isDragging) {
        this.isDragging = true;
        this.lastMousePos = { x: touch.clientX, y: touch.clientY };
        this.canvas.style.cursor = 'grabbing';
      } else {
        this.offsetX += touch.clientX - this.lastMousePos.x;
        this.offsetY += touch.clientY - this.lastMousePos.y;
        this.lastMousePos = { x: touch.clientX, y: touch.clientY };
      }
    }
  }

  handleTouchEnd(e) {
    e.preventDefault();
    this.handleCanvasMouseUp();
  }

  // Hex math methods
  hexToPixel(q, r) {
    const x = this.hexSize * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    const y = this.hexSize * (3 / 2 * r);
    return { x, y };
  }

  pixelToHex(x, y) {
    const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / this.hexSize;
    const r = (2 / 3 * y) / this.hexSize;
    return this.hexRound(q, r);
  }

  hexRound(q, r) {
    let s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);

    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }

    return { q: rq, r: rr };
  }

  getHexCorners(centerX, centerY) {
    const corners = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i - 30);
      corners.push({
        x: centerX + this.hexSize * Math.cos(angle),
        y: centerY + this.hexSize * Math.sin(angle)
      });
    }
    return corners;
  }

  // Rendering
  render() {
    const ctx = this.ctx;
    const canvas = this.canvas;

    // Safety check - don't render if canvas isn't ready
    if (!ctx || !canvas || canvas.width === 0 || canvas.height === 0) {
      return;
    }

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(this.offsetX + canvas.width / 2, this.offsetY + canvas.height / 2);

    // Draw mouse trail
    this.drawMouseTrail();

    // Draw hex grid in hexagon shape
    // Iterate through all coordinates and filter by hexagon bounds
    for (let q = -this.gridRadius; q <= this.gridRadius; q++) {
      for (let r = -this.gridRadius; r <= this.gridRadius; r++) {
        // Only draw if within the hexagon
        if (this.isHexInBounds(q, r)) {
          const pos = this.hexToPixel(q, r);
          this.drawHex(pos.x, pos.y, q, r);
        }
      }
    }

    // Draw winning line
    if (this.winningLine) {
      this.drawWinningLine();
    }

    ctx.restore();

    // Draw opponent cursors with trails (outside the grid translation)
    this.drawOpponentCursors();
  }

  drawMouseTrail() {
    const ctx = this.ctx;

    if (this.mouseTrail.length < 2) return;

    // Get color based on player role (X = red, O = teal)
    const color = this.player === 'X' ? '#e94560' : '#4ecdc4';
    let r, g, b;
    if (color === '#e94560') {
      r = 233; g = 69; b = 96;
    } else {
      r = 78; g = 205; b = 196;
    }

    // Draw mouse trail as dots with fading opacity
    for (let i = 0; i < this.mouseTrail.length; i++) {
      const point = this.mouseTrail[i];
      const age = Date.now() - point.time;
      if (age > 500) continue; // Skip old points

      const opacity = 1 - (age / 500); // Fade out over 500ms
      const size = 2 + (opacity * 3); // Size varies from 2 to 5

      ctx.beginPath();
      ctx.arc(point.x - this.offsetX - this.canvas.width / 2, point.y - this.offsetY - this.canvas.height / 2, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.8})`;
      ctx.fill();
    }
  }

  drawOpponentCursors() {
    const ctx = this.ctx;
    const now = Date.now();

    // Clean up old cursors (no updates for 2 seconds)
    for (const [socketId, cursor] of this.opponentCursors) {
      if (now - cursor.lastUpdate > 2000) {
        this.opponentCursors.delete(socketId);
      }
    }

    // Draw each opponent cursor with their trail
    for (const cursor of this.opponentCursors.values()) {
      const color = cursor.color;

      // Draw trail
      if (cursor.trail.length >= 2) {
        for (let i = 0; i < cursor.trail.length; i++) {
          const point = cursor.trail[i];
          const age = now - point.time;
          if (age > 500) continue;

          const opacity = 1 - (age / 500);
          const size = 2 + (opacity * 3);

          // Parse the color and add opacity
          let r, g, b;
          if (color === '#e94560') {
            r = 233; g = 69; b = 96;
          } else if (color === '#4ecdc4') {
            r = 78; g = 205; b = 196;
          } else {
            r = 255; g = 255; b = 255;
          }

          ctx.beginPath();
          ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.8})`;
          ctx.fill();
        }
      }

      // Draw cursor dot
      if (cursor.screenX !== undefined && cursor.screenY !== undefined) {
        ctx.beginPath();
        ctx.arc(cursor.screenX, cursor.screenY, 6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Only draw white border if actively moving (has trail point within last 100ms)
        const isMoving = cursor.trail.length > 0 && (now - cursor.trail[cursor.trail.length - 1].time) < 100;
        if (isMoving) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }
  }

  drawHex(x, y, q, r) {
    const ctx = this.ctx;
    const key = q + ',' + r;
    const cell = this.board[key];

    // Get hex corners
    const corners = this.getHexCorners(x, y);

    // Determine fill color
    let fillColor = 'rgba(255, 255, 255, 0.05)';
    let strokeColor = 'rgba(255, 255, 255, 0.2)';
    let lineWidth = 1;

    // Hover effect
    if (this.hoveredHex && this.hoveredHex.q === q && this.hoveredHex.r === r) {
      if (this.currentPlayer === this.player && !cell) {
        fillColor = this.player === 'X' ? 'rgba(233, 69, 96, 0.3)' : 'rgba(78, 205, 196, 0.3)';
      }
    }

    // Occupied cell
    if (cell === 'X') {
      fillColor = 'rgba(233, 69, 96, 0.4)';
      strokeColor = '#e94560';
      lineWidth = 2;
    } else if (cell === 'O') {
      fillColor = 'rgba(78, 205, 196, 0.4)';
      strokeColor = '#4ecdc4';
      lineWidth = 2;
    }

    // Draw hexagon
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // Draw X or O
    if (cell) {
      this.drawMark(x, y, cell);
    }
  }

  drawMark(x, y, player) {
    const ctx = this.ctx;
    const size = this.hexSize * 0.5;

    if (player === 'X') {
      // Draw X
      ctx.strokeStyle = '#e94560';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - size, y - size);
      ctx.lineTo(x + size, y + size);
      ctx.moveTo(x + size, y - size);
      ctx.lineTo(x - size, y + size);
      ctx.stroke();
    } else {
      // Draw O
      ctx.strokeStyle = '#4ecdc4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawWinningLine() {
    if (!this.winningLine || this.winningLine.length < 2) return;

    const ctx = this.ctx;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    const first = this.hexToPixel(this.winningLine[0].q, this.winningLine[0].r);
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < this.winningLine.length; i++) {
      const pos = this.hexToPixel(this.winningLine[i].q, this.winningLine[i].r);
      ctx.lineTo(pos.x, pos.y);
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new HexatoeClient();
});
