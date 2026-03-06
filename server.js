import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GameManager } from './server/gameManager.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const gameManager = new GameManager();

// Serve static files
app.use(express.static('public'));

// Lobby endpoint
app.get('/api/lobby', (req, res) => {
  const games = gameManager.getAvailableGames();
  res.json({ games });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Create a new game
  socket.on('createGame', ({ playerName, lobbyName }) => {
    const game = gameManager.createGame(socket.id, playerName, lobbyName);
    socket.join(game.id);
    socket.emit('gameCreated', {
      gameId: game.id,
      player: 'X',
      playerName,
      lobbyName: game.lobbyName,
      createdAt: game.createdAt
    });
    console.log(`Game created: ${game.id} by ${playerName} (lobby: ${game.lobbyName})`);
  });

  // Join an existing game
  socket.on('joinGame', ({ gameId, playerName }) => {
    const result = gameManager.joinGame(gameId, socket.id, playerName);

    if (result.success) {
      socket.join(gameId);
      socket.emit('gameJoined', {
        gameId,
        player: 'O',
        playerName,
        lobbyName: result.game.lobbyName,
        createdAt: result.game.createdAt
      });

      // Notify both players that game is starting
      io.to(gameId).emit('gameStart', {
        gameId,
        players: result.game.players,
        lobbyName: result.game.lobbyName,
        createdAt: result.game.createdAt
      });
      console.log(`${playerName} joined game: ${gameId}`);
    } else {
      socket.emit('joinError', { message: result.error });
    }
  });

  // Make a move
  socket.on('makeMove', ({ gameId, q, r }) => {
    const result = gameManager.makeMove(gameId, socket.id, { q, r });

    if (result.success) {
      // Broadcast the move to all players in the game
      io.to(gameId).emit('moveMade', {
        q,
        r,
        player: result.player,
        currentPlayer: result.currentPlayer,
        movesRemaining: result.movesRemaining,
        board: result.board
      });

      // Check for win
      if (result.winner) {
        io.to(gameId).emit('gameOver', {
          winner: result.winner,
          winningLine: result.winningLine
        });
        gameManager.endGame(gameId);
      }
    } else {
      socket.emit('moveError', { message: result.error });
    }
  });

  // Request rematch
  socket.on('requestRematch', ({ gameId }) => {
    const result = gameManager.requestRematch(gameId, socket.id);

    if (result.success) {
      // Notify both players that rematch is starting
      io.to(gameId).emit('rematchAccepted', {
        currentPlayer: result.currentPlayer,
        movesRemaining: result.movesRemaining,
        players: result.game.players
      });
      console.log(`Rematch started for game: ${gameId}`);
    } else {
      socket.emit('moveError', { message: result.error });
    }
  });

  // Chat message
  socket.on('chatMessage', ({ gameId, message }) => {
    const game = gameManager.games.get(gameId);
    if (!game) return;

    const senderName = gameManager.getPlayerName(gameId, socket.id);
    if (!senderName) return;

    // Broadcast chat message to both players
    io.to(gameId).emit('chatMessage', {
      sender: senderName,
      message: message
    });
  });

  // Mouse position - broadcast to opponent only
  socket.on('mousePosition', ({ gameId, x, y }) => {
    const game = gameManager.games.get(gameId);
    if (!game) return;

    // Get the player role
    const playerRole = gameManager.getPlayerRole(game, socket.id);
    if (!playerRole) return;

    // Send to the other player only (not the sender)
    const opponentSocketId = playerRole === 'X' ? game.players.O?.socketId : game.players.X?.socketId;
    if (opponentSocketId) {
      io.to(opponentSocketId).emit('mousePosition', {
        socketId: socket.id,
        x: x,
        y: y,
        playerRole: playerRole
      });
    }
  });

  // Get game state (for reconnection)
  socket.on('getGameState', ({ gameId }) => {
    const state = gameManager.getGameState(gameId, socket.id);
    if (state) {
      socket.emit('gameState', state);
    }
  });

  // Leave game
  socket.on('leaveGame', ({ gameId }) => {
    gameManager.removePlayerFromGame(gameId, socket.id);
    socket.leave(gameId);
    io.to(gameId).emit('playerLeft', { socketId: socket.id });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    gameManager.handleDisconnect(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Hexatoe server running on http://localhost:${PORT}`);
});
