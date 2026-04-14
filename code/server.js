const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const Action = require('./models/Action');
const GameLoop = require('./models/GameLoop');
const NewsManager = require('./models/NewsManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// ===== PARAMÈTRES DE LA PARTIE =====
const EXPECTED_PLAYERS = 26;

// Fonction pour déterminer le nombre d'actions en fonction du nombre de joueurs
function getNumActionsForPlayers(players) {
  if (players <= 2) return 1;
  if (players <= 10) return 2;
  if (players <= 25) return 3;
  return 4; // Plus de 25
}

// ===== MODÈLES D'ACTIONS (Humoristiques) =====
const actionTemplates = [
  { name: 'Gogole', shortName: 'GGL', initialPrice: 100, sector: 'tech' },
  { name: 'Microdoux', shortName: 'MSFT', initialPrice: 120, sector: 'tech' },
  { name: 'Pomme', shortName: 'AAPL', initialPrice: 150, sector: 'tech' },
  { name: 'FesseBouc', shortName: 'FB', initialPrice: 100, sector: 'tech' }, // Update initial price to 100
  { name: 'Amazone', shortName: 'AMZN', initialPrice: 200, sector: 'tech' },
  { name: 'Hessla', shortName: 'TSLA', initialPrice: 180, sector: 'auto' },
  { name: 'Netflics', shortName: 'NFLX', initialPrice: 130, sector: 'tech' },
  { name: 'ManqueDo', shortName: 'MCD', initialPrice: 100, sector: 'food' } // Update initial price to 100
];

// Fonction pour choisir N actions aléatoirement
function getRandomActions(templates, count) {
  const shuffled = [...templates].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(tpl => 
    new Action(
      tpl.name, 
      tpl.initialPrice,
      tpl.sector,
      tpl.shortName // Pass shortName to the Action constructor
    )
  );
}

// ===== INITIALISATION DES ACTIONS =====
const numActionsToCreate = getNumActionsForPlayers(EXPECTED_PLAYERS);
const activeActions = getRandomActions(actionTemplates, numActionsToCreate);

console.log(`Initialisation pour ${EXPECTED_PLAYERS} joueurs attendus.`);
console.log(`Création de ${numActionsToCreate} actions: ${activeActions.map(a => a.name).join(', ')}`);

// ===== INITIALISATION DE LA GAME LOOP =====
const game = new GameLoop(activeActions, io, EXPECTED_PLAYERS);

// Démarrer la boucle de jeu
game.start();

// ===== SOCKET.IO =====
io.on("connection", socket => {
  console.log("Nouvelle connexion :", socket.id);

  socket.on("player:join", playerName => {
    game.addPlayer(socket, playerName);
  });

  socket.on("player:buy", data => {
    const actionName = typeof data === 'string' ? data : data.actionName;
    const quantity = typeof data === 'object' && data.quantity ? data.quantity : 1;
    game.buyAction(socket, actionName, quantity);
  });

  socket.on("player:sell", data => {
    const actionName = typeof data === 'string' ? data : data.actionName;
    const quantity = typeof data === 'object' && data.quantity ? data.quantity : 1;
    game.sellAction(socket, actionName, quantity);
  });

  socket.on("disconnect", () => {
    game.removePlayer(socket);
    console.log("Déconnexion :", socket.id);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Serveur lancé sur le port " + PORT);
});