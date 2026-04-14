const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const publicPath = path.join(__dirname, "public");
const lobbyImagesPath = path.join(publicPath, "assets", "lobby");

app.use(express.static(publicPath));

const PORT = process.env.PORT || 3000;

// ===== ÉTAT DU JEU =====
let gameState = {
  isGameOpen: false,
  currentPrice: 100,
  priceHistory: [100],
  players: {}
};

let marketInterval = null;

// ===== FONCTIONS UTILES =====
function getLeaderboard() {
  return Object.values(gameState.players)
      .filter(player => player.hasJoined)
      .map(player => ({
        id: player.id,
        name: player.name,
        cash: player.cash,
        shares: player.shares,
        totalValue: player.cash + player.shares * gameState.currentPrice
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
}

function getWaitingCount() {
  return Object.values(gameState.players).filter(
      player => player.hasJoined && !player.isActive
  ).length;
}

function getActiveCount() {
  return Object.values(gameState.players).filter(
      player => player.hasJoined && player.isActive
  ).length;
}

function emitLobbyState() {
  io.emit("lobby:update", {
    isGameOpen: gameState.isGameOpen,
    waitingCount: getWaitingCount(),
    activeCount: getActiveCount()
  });
}

function broadcastGameState() {
  io.emit("game:update", {
    isGameOpen: gameState.isGameOpen,
    currentPrice: gameState.currentPrice,
    priceHistory: gameState.priceHistory,
    leaderboard: getLeaderboard()
  });

  emitLobbyState();

  for (const playerId in gameState.players) {
    const player = gameState.players[playerId];

    io.to(playerId).emit("player:update", {
      name: player.name,
      cash: player.cash,
      shares: player.shares,
      currentPrice: gameState.currentPrice,
      totalValue: player.cash + player.shares * gameState.currentPrice,
      isGameOpen: gameState.isGameOpen,
      isWaiting: player.hasJoined && !player.isActive,
      isActive: player.isActive
    });
  }
}

function startMarket() {
  if (marketInterval) return;

  marketInterval = setInterval(() => {
    if (!gameState.isGameOpen) return;

    const variation = Math.floor(Math.random() * 11) - 5;
    gameState.currentPrice = Math.max(1, gameState.currentPrice + variation);
    gameState.priceHistory.push(gameState.currentPrice);

    if (gameState.priceHistory.length > 50) {
      gameState.priceHistory.shift();
    }

    broadcastGameState();
  }, 1000);
}

function stopMarket() {
  if (marketInterval) {
    clearInterval(marketInterval);
    marketInterval = null;
  }
}

function openGame() {
  gameState.isGameOpen = true;

  for (const player of Object.values(gameState.players)) {
    if (player.hasJoined) {
      player.isActive = true;
    }
  }

  startMarket();
  broadcastGameState();
}

function closeGame() {
  gameState.isGameOpen = false;

  for (const player of Object.values(gameState.players)) {
    if (player.hasJoined) {
      player.isActive = false;
    }
  }

  stopMarket();
  broadcastGameState();
}

// ===== ROUTE API POUR LES IMAGES DU LOBBY =====
app.get("/api/lobby-backgrounds", (req, res) => {
  fs.readdir(lobbyImagesPath, (err, files) => {
    if (err) {
      return res.json([]);
    }

    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

    const imageUrls = files
        .filter(file => allowedExtensions.includes(path.extname(file).toLowerCase()))
        .map(file => `/assets/lobby/${file}`);

    res.json(imageUrls);
  });
});

// ===== SOCKET.IO =====
io.on("connection", socket => {
  console.log("Nouvelle connexion :", socket.id);

  gameState.players[socket.id] = {
    id: socket.id,
    name: "",
    cash: 10000,
    shares: 0,
    hasJoined: false,
    isActive: false
  };

  io.to(socket.id).emit("player:update", {
    name: "",
    cash: 10000,
    shares: 0,
    currentPrice: gameState.currentPrice,
    totalValue: 10000,
    isGameOpen: gameState.isGameOpen,
    isWaiting: false,
    isActive: false
  });

  emitLobbyState();

  socket.on("player:join", playerName => {
    const player = gameState.players[socket.id];
    if (!player) return;

    player.name = (playerName || "Joueur").trim() || "Joueur";
    player.hasJoined = true;
    player.isActive = gameState.isGameOpen;

    io.to(socket.id).emit("player:joined", {
      isGameOpen: gameState.isGameOpen,
      isWaiting: !gameState.isGameOpen
    });

    broadcastGameState();
  });

  socket.on("player:buy", () => {
    const player = gameState.players[socket.id];
    if (!player || !player.isActive || !gameState.isGameOpen) return;

    if (player.cash >= gameState.currentPrice) {
      player.cash -= gameState.currentPrice;
      player.shares += 1;
      broadcastGameState();
    }
  });

  socket.on("player:sell", () => {
    const player = gameState.players[socket.id];
    if (!player || !player.isActive || !gameState.isGameOpen) return;

    if (player.shares > 0) {
      player.shares -= 1;
      player.cash += gameState.currentPrice;
      broadcastGameState();
    }
  });

  socket.on("admin:open-game", () => {
    openGame();
  });

  socket.on("admin:close-game", () => {
    closeGame();
  });

  socket.on("disconnect", () => {
    delete gameState.players[socket.id];
    broadcastGameState();
    console.log("Déconnexion :", socket.id);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});