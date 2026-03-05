/**
 * Hexatoe - Hexagonal Tic-Tac-Toe Client
 */

class HexatoeClient {
  constructor() {
    this.socket = null;
    this.gameId = null;
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

    this.init();
  }

  init() {
    // Initialize canvas
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Set up event listeners
    this.setupEventListeners();

    // Connect to server
    this.connectToServer();

    // Load games list
    this.loadGamesList();

    // Set up canvas resize handler
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
  }

  setupEventListeners() {
    // Lobby
    document.getElementById('create-game-btn').addEventListener('click', () => this.createGame());
    document.getElementById('refresh-lobby-btn').addEventListener('click', () => this.loadGamesList());

    // Game
    document.getElementById('leave-game-btn').addEventListener('click', () => this.leaveGame());
    document.getElementById('modal-close-btn').addEventListener('click', () => this.closeModal());

    // Canvas interactions
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
    this.canvas.addEventListener('mouseup', () => this.handleCanvasMouseUp());
    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredHex = null;
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
      this.player = data.player;
      this.playerName = data.playerName;
      this.showGameScreen();
      this.showMessage('Waiting for opponent...', 'success');
    });

    this.socket.on('gameJoined', (data) => {
      this.gameId = data.gameId;
      this.player = data.player;
      this.playerName = data.playerName;
      this.showGameScreen();
    });

    this.socket.on('gameStart', (data) => {
      this.players = data.players;
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
        `${data.winner === this.player ? 'You win!' : data.winner + ' wins!'}`
      );
    });

    this.socket.on('moveError', (data) => {
      this.showMessage(data.message, 'error');
    });

    this.socket.on('joinError', (data) => {
      this.showMessage(data.message, 'error');
    });

    this.socket.on('playerLeft', () => {
      this.showMessage('Opponent disconnected', 'error');
    });

    this.socket.on('gameState', (data) => {
      this.board = data.board;
      this.currentPlayer = data.currentPlayer;
      this.movesRemaining = data.movesRemaining;
      this.winningLine = data.winningLine;
      this.updateUI();
      this.render();
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
      gameItem.innerHTML = `
        <div class="game-item-info">
          <div class="game-item-host">${game.hostName}'s game</div>
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

  createGame() {
    const name = this.getPlayerName();
    if (!name) {
      this.showMessage('Please enter your name', 'error');
      return;
    }
    this.socket.emit('createGame', name);
  }

  joinGame(gameId) {
    const name = this.getPlayerName();
    if (!name) {
      this.showMessage('Please enter your name', 'error');
      return;
    }
    this.socket.emit('joinGame', { gameId, playerName: name });
  }

  // Game methods
  showGameScreen() {
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('game-id').textContent = `Game: ${this.gameId.slice(-8)}`;
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
    this.player = null;
    this.board = {};
    this.winningLine = null;
    this.showLobbyScreen();
  }

  updateUI() {
    const turnText = document.getElementById('turn-text');
    const movesBadge = document.getElementById('moves-remaining');
    const playersInfo = document.getElementById('players-info');

    // Update turn indicator
    if (this.currentPlayer === this.player) {
      turnText.textContent = 'Your turn!';
      turnText.style.color = '#4ecdc4';
    } else {
      turnText.textContent = `${this.currentPlayer}'s turn`;
      turnText.style.color = '#a0a0a0';
    }

    movesBadge.textContent = `${this.movesRemaining} move${this.movesRemaining !== 1 ? 's' : ''} left`;

    // Update players info
    if (this.players) {
      playersInfo.innerHTML = `
        <span class="player-badge ${this.player === 'X' ? 'x' : 'o'}">You: ${this.player}</span>
        <span class="player-badge ${this.player === 'X' ? 'o' : 'x'}">Opponent: ${this.player === 'X' ? 'O' : 'X'}</span>
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

    if (this.isDragging) {
      this.offsetX += e.clientX - this.lastMousePos.x;
      this.offsetY += e.clientY - this.lastMousePos.y;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.render();
    } else {
      // Convert screen coordinates to hex grid coordinates
      const x = e.clientX - rect.left - this.canvas.width / 2 - this.offsetX;
      const y = e.clientY - rect.top - this.canvas.height / 2 - this.offsetY;
      const hex = this.pixelToHex(x, y);
      if (!this.hoveredHex || hex.q !== this.hoveredHex.q || hex.r !== this.hoveredHex.r) {
        this.hoveredHex = hex;
        this.render();
      }
    }
  }

  handleCanvasMouseDown(e) {
    this.isDragging = true;
    this.lastMousePos = { x: e.clientX, y: e.clientY };
    this.canvas.style.cursor = 'grabbing';
  }

  handleCanvasMouseUp() {
    this.isDragging = false;
    this.canvas.style.cursor = 'crosshair';
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.handleCanvasMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
  }

  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.handleCanvasMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  }

  handleTouchEnd(e) {
    e.preventDefault();
    if (!this.isDragging) return;

    const touch = e.changedTouches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left - this.canvas.width / 2 - this.offsetX;
    const y = touch.clientY - rect.top - this.canvas.height / 2 - this.offsetY;

    this.handleCanvasMouseUp();

    // Check if this was a tap (not a drag)
    const hex = this.pixelToHex(x, y);
    const key = hex.q + ',' + hex.r;

    // Check bounds
    if (!this.isHexInBounds(hex.q, hex.r)) {
      return;
    }

    if (this.currentPlayer === this.player && !this.board[key]) {
      this.socket.emit('makeMove', {
        gameId: this.gameId,
        q: hex.q,
        r: hex.r
      });
    }
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
