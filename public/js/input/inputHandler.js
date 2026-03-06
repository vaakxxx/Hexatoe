/**
 * Input handler for canvas interactions
 */

import { HexUtils } from '../utils/hexUtils.js';

export class InputHandler {
  constructor(canvas, gameState, socketClient) {
    this.canvas = canvas;
    this.state = gameState;
    this.socket = socketClient;

    // Pan state
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.lastMousePos = { x: 0, y: 0 };

    // Hover state
    this.hoveredHex = null;

    // Mouse trail for visual feedback (stored in grid/map coordinates)
    this.mouseTrail = [];
    this.maxTrailLength = 15;

    // Mouse position throttling
    this.lastMouseEmit = 0;
    this.mouseEmitThrottle = 30;
  }

  /**
   * Setup all input event listeners
   */
  setupEventListeners(callbacks) {
    this.callbacks = callbacks;

    // Mouse events
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
  }

  /**
   * Handle canvas click for placing pieces
   */
  handleClick(e) {
    if (!this.state.isMyTurn()) return;
    if (e.button !== 0) return; // Only left click

    const hex = this.getHexAtPosition(e);

    if (!hex) {
      this.callbacks?.onError?.('Outside the play area');
      return;
    }

    if (this.state.isCellOccupied(hex.q, hex.r)) {
      this.callbacks?.onError?.('Cell already occupied');
      return;
    }

    this.socket.makeMove(this.state.gameId, hex.q, hex.r);
  }

  /**
   * Handle mouse move
   */
  handleMouseMove(e) {
    const { screenX, screenY, gridX, gridY } = this.getMousePosition(e);

    // Send mouse position to server (throttled)
    const now = Date.now();
    if (now - this.lastMouseEmit > this.mouseEmitThrottle &&
        this.state.isInGame() &&
        this.state.players &&
        this.state.players.X &&
        this.state.players.O) {
      this.lastMouseEmit = now;
      this.socket.sendMousePosition(this.state.gameId, gridX, gridY);
    }

    // Update mouse trail with grid coordinates (map space)
    this.updateMouseTrail(gridX, gridY);

    if (this.isDragging) {
      this.offsetX += e.clientX - this.lastMousePos.x;
      this.offsetY += e.clientY - this.lastMousePos.y;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    } else {
      const hex = HexUtils.pixelToHex(gridX, gridY, this.state.hexSize);
      if (!this.hoveredHex || hex.q !== this.hoveredHex.q || hex.r !== this.hoveredHex.r) {
        this.hoveredHex = hex;
      }
    }

    this.callbacks?.onInputUpdate?.();
  }

  /**
   * Handle mouse down for dragging
   */
  handleMouseDown(e) {
    if (e.button === 2) { // Right click
      this.isDragging = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
      e.preventDefault();
    }
  }

  /**
   * Handle mouse up
   */
  handleMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvas.style.cursor = 'crosshair';
    }
  }

  /**
   * Handle mouse leave
   */
  handleMouseLeave() {
    this.hoveredHex = null;
    this.mouseTrail = [];
    this.callbacks?.onInputUpdate?.();
  }

  /**
   * Handle touch start
   */
  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.handleClick({ clientX: touch.clientX, clientY: touch.clientY, button: 0 });
  }

  /**
   * Handle touch move
   */
  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const screenX = touch.clientX - rect.left;
    const screenY = touch.clientY - rect.top;
    const gridX = screenX - this.canvas.width / 2 - this.offsetX;
    const gridY = screenY - this.canvas.height / 2 - this.offsetY;

    // Update mouse trail with grid coordinates (map space)
    this.updateMouseTrail(gridX, gridY);

    // Two-finger drag
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

  /**
   * Handle touch end
   */
  handleTouchEnd(e) {
    e.preventDefault();
    this.handleMouseUp();
  }

  /**
   * Get mouse position in various coordinate systems
   */
  getMousePosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const gridX = screenX - this.canvas.width / 2 - this.offsetX;
    const gridY = screenY - this.canvas.height / 2 - this.offsetY;
    return { screenX, screenY, gridX, gridY };
  }

  /**
   * Get hex at click position
   */
  getHexAtPosition(e) {
    const { gridX, gridY } = this.getMousePosition(e);
    const hex = HexUtils.pixelToHex(gridX, gridY, this.state.hexSize);

    if (!HexUtils.isHexInBounds(hex.q, hex.r, this.state.gridRadius)) {
      return null;
    }

    return hex;
  }

  /**
   * Update mouse trail (stores grid/map coordinates)
   */
  updateMouseTrail(x, y) {
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

  /**
   * Reset input state
   */
  reset() {
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.hoveredHex = null;
    this.mouseTrail = [];
  }

  /**
   * Get current offset for rendering
   */
  getOffset() {
    return { x: this.offsetX, y: this.offsetY };
  }
}
