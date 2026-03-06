# Hexatoe - Hexagonal Tic-Tac-Toe

A real-time multiplayer hexagonal tic-tac-toe game.

## Features

- **Real-time multiplayer** with WebSocket via Socket.io
- **Hexagonal grid board** - pan around the board with drag
- **In-game chat** with auto-fade when inactive
- **Rematch system** - play again with flipped roles (X becomes O, O becomes X)
- **Lobby system** - create custom lobbies or join existing games
- **Player name persistence** - your name is saved locally
- **Visual feedback** - opponent cursor tracking, turn indicators, and move animations

## Rules

- **Players**: Two players (X and O)
- **Turn Order**: X plays once first, then players alternate taking 2 turns each
- **Win Condition**: First to get 6 pieces in a row along any of the 3 hex axes wins
- **Grid**: Large hexagonal board (40x40 hex grid) - pan to explore

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

1. Enter your name in the lobby (name is automatically saved for next time)
2. Optionally enter a custom lobby name, or let it default to "{name}'s lobby"
3. Create a new game or join an existing one from the list
4. Take turns placing pieces on the hex grid
5. First to 6 in a row wins!
6. After the game, click "Rematch" to play again with swapped roles

### Controls

- **Left-click** on a hex to place your piece
- **Right-click + drag** to pan around the board
- **Enter** focuses the chat input when in game
- Hover over chat panel to restore full opacity

### Features

- **Player colors**: X players see red/pink theme, O players see teal theme
- **Turn indicator**: "Your turn!" shows in your player's color
- **Chat panel**: Fades to 25% opacity when inactive (no typing, no hover, no recent messages)
- **Opponent cursor**: See where your opponent is hovering on the board
- **Mouse trails**: Visual feedback showing your recent mouse movement

## Technical Details

### Hex Coordinate System

The game uses **axial coordinates** (q, r) for hex positions:
- The third coordinate s is implicit: `s = -q - r`
- Allows efficient neighbor calculation and win checking
- Conversion to pixel coordinates for rendering

### Win Detection

Win checking scans in 3 axial directions:
1. East-West (q axis)
2. Northwest-Southeast (r axis)
3. Northeast-Southwest (s axis)

### Tech Stack

- **Backend**: Node.js + Express + Socket.io
- **Frontend**: Vanilla JavaScript (ES6 modules) + HTML5 Canvas
- **Real-time**: WebSocket via Socket.io
- **State Management**: Client-side game state with server validation

## Project Structure

```
hexatoe/
├── server.js              # Main server entry point
├── server/
│   ├── gameManager.js     # Game session management
│   └── gameLogic.js       # Core game rules and win detection
├── public/
│   ├── index.html         # Main HTML
│   ├── styles.css         # Game styling
│   └── js/
│       ├── game.js                        # Main client orchestrator
│       ├── core/
│       │   ├── gameState.js               # Client game state
│       │   └── socketClient.js            # Socket.io wrapper
│       ├── rendering/
│       │   ├── renderer.js                # Canvas rendering
│       │   └── cursorManager.js           # Opponent cursor tracking
│       ├── input/
│       │   └── inputHandler.js            # Mouse/keyboard input
│       ├── ui/
│       │   ├── uiManager.js               # UI updates
│       │   ├── chatManager.js             # Chat functionality
│       │   └── lobbyManager.js            # Lobby management
│       └── utils/
│           ├── hexUtils.js                # Hex grid math
│           └── domHelpers.js              # DOM utilities
└── package.json
```
