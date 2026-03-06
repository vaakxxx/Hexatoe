/**
 * Cursor manager for opponent cursor visualization
 */

import { HexUtils } from '../utils/hexUtils.js';

export class CursorManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.opponentCursors = new Map();
    this.maxTrailLength = 15;
  }

  /**
   * Update opponent cursor position
   */
  updateOpponentCursor(data, myPlayer) {
    const { socketId, x, y, playerRole } = data;

    // Don't track our own cursor
    if (playerRole === myPlayer) return;

    // Store grid/map coordinates (not screen coordinates)
    // This allows cursors to move with the map when panning
    const color = HexUtils.getPlayerColor(playerRole);

    const cursor = this.opponentCursors.get(socketId) || {
      trail: [],
      playerRole,
      color
    };

    cursor.gridX = x;
    cursor.gridY = y;
    cursor.lastUpdate = Date.now();
    cursor.color = color;
    cursor.playerRole = playerRole;

    // Add to trail (store grid coordinates)
    cursor.trail.push({ x: x, y: y, time: Date.now() });

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

  /**
   * Remove cursor for disconnected player
   */
  removeCursor(socketId) {
    this.opponentCursors.delete(socketId);
  }

  /**
   * Clear all cursors
   */
  clearAll() {
    this.opponentCursors.clear();
  }

  /**
   * Clean up old cursors
   */
  cleanupOldCursors() {
    const now = Date.now();
    for (const [socketId, cursor] of this.opponentCursors) {
      if (now - cursor.lastUpdate > 2000) {
        this.opponentCursors.delete(socketId);
      }
    }
  }

  /**
   * Draw all opponent cursors
   * Note: Call this within a translated context so cursors render in map space
   */
  draw(ctx) {
    this.cleanupOldCursors();

    for (const cursor of this.opponentCursors.values()) {
      this.drawTrail(ctx, cursor);
      this.drawCursor(ctx, cursor);
    }
  }

  /**
   * Draw cursor trail
   */
  drawTrail(ctx, cursor) {
    if (cursor.trail.length < 2) return;

    const now = Date.now();
    const rgb = HexUtils.hexToRgb(cursor.color);

    for (let i = 0; i < cursor.trail.length; i++) {
      const point = cursor.trail[i];
      const age = now - point.time;
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
   * Draw cursor dot
   */
  drawCursor(ctx, cursor) {
    if (cursor.gridX === undefined || cursor.gridY === undefined) return;

    const now = Date.now();

    ctx.beginPath();
    ctx.arc(cursor.gridX, cursor.gridY, 6, 0, Math.PI * 2);
    ctx.fillStyle = cursor.color;
    ctx.fill();

    // White border if actively moving
    const isMoving = cursor.trail.length > 0 && (now - cursor.trail[cursor.trail.length - 1].time) < 100;
    if (isMoving) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}
