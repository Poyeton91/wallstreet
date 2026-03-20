const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
// test
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// ===== ÉTAT DU JEU =====
let gameState = {
  currentPrice: 100,
  priceHistory: [100],
  players: {}
};

// ===== FONCTIONS UTILES =====
function getLeaderboard() {
  return Object.values(gameState.players)
    .map(player => ({
      id: player.id,
      name: player.name,
      cash: player.cash,
      shares: player.shares,
      totalValue: player.cash + player.shares * gameState.currentPrice
    }))
    .sort((a, b) => b.totalValue - a.totalValue);
}

function broadcastGameState() {
  io.emit("game:update", {
    currentPrice: gameState.currentPrice,
    priceHistory: gameState.priceHistory,
    leaderboard: getLeaderboard()
  });

  for (const playerId in gameState.players) {
    const player = gameState.players[playerId];

    io.to(playerId).emit("player:update", {
      name: player.name,
      cash: player.cash,
      shares: player.shares,
      currentPrice: gameState.currentPrice,
      totalValue: player.cash + player.shares * gameState.currentPrice
    });
  }
}

// ===== ÉVOLUTION DU MARCHÉ =====
setInterval(() => {
  const variation = Math.floor(Math.random() * 11) - 5; // entre -5 et +5
  gameState.currentPrice = Math.max(1, gameState.currentPrice + variation);
  gameState.priceHistory.push(gameState.currentPrice);

  if (gameState.priceHistory.length > 50) {
    gameState.priceHistory.shift();
  }

  broadcastGameState();
}, 1000);

// ===== SOCKET.IO =====
io.on("connection", socket => {
  console.log("Nouvelle connexion :", socket.id);

  socket.on("player:join", playerName => {
    gameState.players[socket.id] = {
      id: socket.id,
      name: playerName || "Joueur",
      cash: 10000,
      shares: 0
    };

    broadcastGameState();
  });

  socket.on("player:buy", () => {
    const player = gameState.players[socket.id];
    if (!player) return;

    if (player.cash >= gameState.currentPrice) {
      player.cash -= gameState.currentPrice;
      player.shares += 1;
      broadcastGameState();
    }
  });

  socket.on("player:sell", () => {
    const player = gameState.players[socket.id];
    if (!player) return;

    if (player.shares > 0) {
      player.shares -= 1;
      player.cash += gameState.currentPrice;
      broadcastGameState();
    }
  });

  socket.on("disconnect", () => {
    delete gameState.players[socket.id];
    broadcastGameState();
    console.log("Déconnexion :", socket.id);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Serveur lancé");
});