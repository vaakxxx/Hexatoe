/**
 * Hexagonal grid utilities using axial coordinates (q, r)
 * The third coordinate s is implicit: s = -q - r
 */

export class HexUtils {
  /**
   * Convert hex coordinates to a unique string key
   */
  static hexToKey(q, r) {
    return `${q},${r}`;
  }

  /**
   * Parse a key back to hex coordinates
   */
  static keyToHex(key) {
    const [q, r] = key.split(',').map(Number);
    return { q, r };
  }

  /**
   * Get the six neighboring hexes
   */
  static getNeighbors(q, r) {
    return [
      { q: q + 1, r: r },     // East
      { q: q + 1, r: r - 1 }, // Northeast
      { q: q, r: r - 1 },     // Northwest
      { q: q - 1, r: r },     // West
      { q: q - 1, r: r + 1 }, // Southwest
      { q: q, r: r + 1 },     // Southeast
    ];
  }

  /**
   * Get the three axes directions for win checking
   * Each axis has two opposite directions
   */
  static getAxesDirections() {
    return [
      // Axis 1: East-West (q axis)
      [{ dq: 1, dr: 0 }, { dq: -1, dr: 0 }],
      // Axis 2: Northwest-Southeast (r axis)
      [{ dq: 0, dr: -1 }, { dq: 0, dr: 1 }],
      // Axis 3: Northeast-Southwest (s axis, where s = -q - r)
      [{ dq: 1, dr: -1 }, { dq: -1, dr: 1 }],
    ];
  }

  /**
   * Check if two hexes are equal
   */
  static hexEqual(a, b) {
    return a.q === b.q && a.r === b.r;
  }

  /**
   * Calculate distance between two hexes
   */
  static hexDistance(a, b) {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  }

  /**
   * Convert axial coordinates to pixel coordinates for rendering
   * @param {number} q - q coordinate
   * @param {number} r - r coordinate
   * @param {number} size - hex size in pixels
   * @returns {x, y} - pixel coordinates
   */
  static hexToPixel(q, r, size) {
    const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    const y = size * (3 / 2 * r);
    return { x, y };
  }

  /**
   * Convert pixel coordinates to hex coordinates
   * @param {number} x - pixel x coordinate
   * @param {number} y - pixel y coordinate
   * @param {number} size - hex size in pixels
   * @returns {q, r} - hex coordinates
   */
  static pixelToHex(x, y, size) {
    const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / size;
    const r = (2 / 3 * y) / size;
    return this.hexRound(q, r);
  }

  /**
   * Round floating point hex coordinates to nearest integer hex
   */
  static hexRound(q, r) {
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

  /**
   * Get hex corner points for drawing
   */
  static getHexCorners(centerX, centerY, size) {
    const corners = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i - 30); // -30 to start with point at top
      corners.push({
        x: centerX + size * Math.cos(angle),
        y: centerY + size * Math.sin(angle)
      });
    }
    return corners;
  }
}
