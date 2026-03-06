/**
 * Canvas renderer for the hexagonal game board
 */

import { HexUtils } from '../utils/hexUtils.js';

export class Renderer {
  constructor(canvas, gameState, inputHandler, cursorManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = gameState;
    this.input = inputHandler;
    this.cursors = cursorManager;
  }

  /**
   * Resize canvas to fit container
   */
  resize() {
    const container = this.canvas.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width > 0 && height > 0) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  /**
   * Main render function
   */
  render() {
    if (!this.ctx || !this.canvas || this.canvas.width === 0 || this.canvas.height === 0) {
      return;
    }

    this.clearCanvas();
    this.drawBackground();
    this.drawBoard();
    this.drawWinningLine();
  }

  /**
   * Clear canvas
   */
  clearCanvas() {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw background grid pattern
   */
  drawBackground() {
    const ctx = this.ctx;
    const canvas = this.canvas;

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
  }

  /**
   * Draw the hexagonal board
   */
  drawBoard() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const offset = this.input.getOffset();

    ctx.save();
    ctx.translate(offset.x + canvas.width / 2, offset.y + canvas.height / 2);

    // Draw mouse trail (trail points are already in grid/map coordinates)
    this.drawMouseTrail();

    // Draw hex grid in hexagon shape
    for (let q = -this.state.gridRadius; q <= this.state.gridRadius; q++) {
      for (let r = -this.state.gridRadius; r <= this.state.gridRadius; r++) {
        if (HexUtils.isHexInBounds(q, r, this.state.gridRadius)) {
          const pos = HexUtils.hexToPixel(q, r, this.state.hexSize);
          this.drawHex(pos.x, pos.y, q, r);
        }
      }
    }

    // Draw opponent cursors (within the translated context so they move with map)
    this.cursors.draw(ctx);

    ctx.restore();
  }

  /**
   * Draw mouse trail (points are in grid/map coordinates)
   */
  drawMouseTrail() {
    const ctx = this.ctx;
    const trail = this.input.mouseTrail;

    if (trail.length < 2) return;

    const color = HexUtils.getPlayerColor(this.state.player);
    const rgb = HexUtils.hexToRgb(color);

    for (let i = 0; i < trail.length; i++) {
      const point = trail[i];
      const age = Date.now() - point.time;
      if (age > 500) continue;

      const opacity = 1 - (age / 500);
      const size = 2 + (opacity * 3);

      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.8})`;
      ctx.fill();
    }
  }

  /**
   * Draw a single hex
   */
  drawHex(x, y, q, r) {
    const ctx = this.ctx;
    const key = HexUtils.hexToKey(q, r);
    const cell = this.state.board[key];
    const corners = HexUtils.getHexCorners(x, y, this.state.hexSize);

    let fillColor = 'rgba(255, 255, 255, 0.05)';
    let strokeColor = 'rgba(255, 255, 255, 0.2)';
    let lineWidth = 1;

    // Hover effect
    if (this.input.hoveredHex &&
        this.input.hoveredHex.q === q &&
        this.input.hoveredHex.r === r &&
        this.state.isMyTurn() &&
        !cell) {
      fillColor = this.state.player === 'X'
        ? 'rgba(233, 69, 96, 0.3)'
        : 'rgba(78, 205, 196, 0.3)';
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

    // Draw mark if occupied
    if (cell) {
      this.drawMark(x, y, cell);
    }
  }

  /**
   * Draw X or O mark
   */
  drawMark(x, y, player) {
    const ctx = this.ctx;
    const size = this.state.hexSize * 0.5;

    if (player === 'X') {
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
      ctx.strokeStyle = '#4ecdc4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /**
   * Draw winning line
   */
  drawWinningLine() {
    if (!this.state.winningLine || this.state.winningLine.length < 2) return;

    const ctx = this.ctx;
    const offset = this.input.getOffset();

    ctx.save();
    ctx.translate(offset.x + this.canvas.width / 2, offset.y + this.canvas.height / 2);

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    const first = HexUtils.hexToPixel(this.state.winningLine[0].q, this.state.winningLine[0].r, this.state.hexSize);
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < this.state.winningLine.length; i++) {
      const pos = HexUtils.hexToPixel(this.state.winningLine[i].q, this.state.winningLine[i].r, this.state.hexSize);
      ctx.lineTo(pos.x, pos.y);
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  /**
   * Start continuous render loop
   */
  startRenderLoop(callback) {
    const loop = () => {
      if (this.state.isInGame()) {
        callback();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
