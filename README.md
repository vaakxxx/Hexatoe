# Hexatoe - Hexagonal Tic-Tac-Toe

A real-time multiplayer hexagonal tic-tac-toe game played on an infinite hex grid.

## Rules

- **Players**: Two players (X and O)
- **Turn Order**: X plays once first, then players alternate taking 2 turns each
- **Win Condition**: First to get 6 pieces in a row along any of the 3 hex axes wins
- **Grid**: Infinite hexagonal grid - the board expands as you play

## Installation

```bash
npm install
```

## Running the Game

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Then open your browser to `http://localhost:3000`

## How to Play

1. Enter your name in the lobby
2. Create a new game or join an existing one
3. Take turns placing pieces on the hex grid
4. First to 6 in a row wins!

### Controls

- **Click** on a hex to place your piece
- **Drag** to pan around the board
- The grid automatically expands as pieces are placed

## Technical Details

### Hex Coordinate System

The game uses **axial coordinates** (q, r) for hex positions:
- The third coordinate s is implicit: `s = -q - r`
- This allows efficient neighbor calculation and win checking

### Win Detection

Win checking is done by scanning in 3 axial directions:
1. East-West (q axis)
2. Northwest-Southeast (r axis)
3. Northeast-Southwest (s axis)

### Tech Stack

- **Backend**: Node.js + Express + Socket.io
- **Frontend**: Vanilla JavaScript + HTML5 Canvas
- **Real-time**: WebSocket via Socket.io

## Project Structure

```
hexatoe/
├── server.js           # Main server entry point
├── server/
│   ├── gameManager.js  # Game session management
│   ├── gameLogic.js    # Core game rules and win detection
│   └── hexUtils.js     # Hex grid math utilities
├── public/
│   ├── index.html      # Main HTML
│   ├── styles.css      # Styling
│   └── game.js         # Client-side game logic and rendering
└── package.json
```
