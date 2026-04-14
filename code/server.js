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

// ===== PARAMÈTRES DE LA PARTIE =====
const EXPECTED_PLAYERS = 26;
const INITIAL_CASH = 10000;
const MAX_HISTORY = 50;
const MARKET_TICK_MS = 1000;

// ===== OUTILS =====
function getNumActionsForPlayers(players) {
    if (players <= 2) return 1;
    if (players <= 10) return 2;
    if (players <= 25) return 3;
    return 4;
}

const actionTemplates = [
    { name: "Gogole", shortName: "GGL", initialPrice: 100, sector: "tech" },
    { name: "Microdoux", shortName: "MSFT", initialPrice: 120, sector: "tech" },
    { name: "Pomme", shortName: "AAPL", initialPrice: 150, sector: "tech" },
    { name: "FesseBouc", shortName: "FB", initialPrice: 100, sector: "tech" },
    { name: "Amazone", shortName: "AMZN", initialPrice: 200, sector: "tech" },
    { name: "Hessla", shortName: "TSLA", initialPrice: 180, sector: "auto" },
    { name: "Netflics", shortName: "NFLX", initialPrice: 130, sector: "tech" },
    { name: "ManqueDo", shortName: "MCD", initialPrice: 100, sector: "food" }
];

function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function createAction(template) {
    return {
        name: template.name,
        shortName: template.shortName,
        sector: template.sector,
        currentPrice: template.initialPrice,
        history: [template.initialPrice]
    };
}

function createRandomActions() {
    const count = getNumActionsForPlayers(EXPECTED_PLAYERS);
    return shuffle(actionTemplates).slice(0, count).map(createAction);
}

function clampPrice(value) {
    return Math.max(1, Math.round(value));
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ===== NEWS =====
const newsTemplates = [
    {
        type: "good",
        text: action => `${action.name} annonce une innovation révolutionnaire. Le marché s'emballe.`,
        impact: { min: 6, max: 14 }
    },
    {
        type: "bad",
        text: action => `${action.name} est visée par un scandale financier. Les investisseurs paniquent.`,
        impact: { min: -14, max: -6 }
    },
    {
        type: "neutral",
        text: action => `${action.name} publie des résultats jugés corrects mais sans surprise.`,
        impact: { min: -3, max: 3 }
    },
    {
        type: "good",
        text: action => `${action.name} signe un partenariat inattendu. La confiance remonte.`,
        impact: { min: 5, max: 12 }
    },
    {
        type: "bad",
        text: action => `${action.name} subit des retards de production. Le titre recule.`,
        impact: { min: -10, max: -4 }
    }
];

function maybeGenerateNews(actions) {
    const shouldTrigger = Math.random() < 0.18;
    if (!shouldTrigger || actions.length === 0) return null;

    const action = actions[getRandomInt(0, actions.length - 1)];
    const template = newsTemplates[getRandomInt(0, newsTemplates.length - 1)];
    const delta = getRandomInt(template.impact.min, template.impact.max);

    action.currentPrice = clampPrice(action.currentPrice + delta);
    action.history.push(action.currentPrice);
    if (action.history.length > MAX_HISTORY) {
        action.history.shift();
    }

    return {
        type: template.type,
        text: template.text(action),
        actionName: action.name,
        delta
    };
}

// ===== ÉTAT DU JEU =====
const activeActions = createRandomActions();

let gameState = {
    isGameOpen: false,
    players: {},
    actions: activeActions,
    lastNewsEvent: null
};

let marketInterval = null;

console.log(`Initialisation pour ${EXPECTED_PLAYERS} joueurs attendus.`);
console.log(`Création de ${activeActions.length} actions : ${activeActions.map(a => a.name).join(", ")}`);

// ===== FONCTIONS MÉTIER =====
function getActionByName(actionName) {
    return gameState.actions.find(action => action.name === actionName);
}

function getPlayerPortfolioValue(player) {
    let total = player.cash;

    for (const action of gameState.actions) {
        const quantity = player.portfolio[action.name] || 0;
        total += quantity * action.currentPrice;
    }

    return total;
}

function getLeaderboard() {
    return Object.values(gameState.players)
        .filter(player => player.hasJoined)
        .map(player => ({
            id: player.id,
            name: player.name,
            cash: player.cash,
            portfolio: player.portfolio,
            totalValue: getPlayerPortfolioValue(player)
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

function getPublicActions() {
    return gameState.actions.map(action => ({
        name: action.name,
        shortName: action.shortName,
        sector: action.sector,
        currentPrice: action.currentPrice,
        history: action.history
    }));
}

function emitLobbyState() {
    io.emit("lobby:update", {
        isGameOpen: gameState.isGameOpen,
        waitingCount: getWaitingCount(),
        activeCount: getActiveCount()
    });
}

function emitPlayerState(playerId) {
    const player = gameState.players[playerId];
    if (!player) return;

    io.to(playerId).emit("player:update", {
        name: player.name,
        cash: player.cash,
        portfolio: player.portfolio,
        actions: getPublicActions(),
        totalValue: getPlayerPortfolioValue(player),
        isGameOpen: gameState.isGameOpen,
        isWaiting: player.hasJoined && !player.isActive,
        isActive: player.isActive
    });
}

function broadcastGameState(newsEvent = null) {
    io.emit("game:update", {
        isGameOpen: gameState.isGameOpen,
        actions: getPublicActions(),
        leaderboard: getLeaderboard(),
        newsEvent
    });

    emitLobbyState();

    for (const playerId of Object.keys(gameState.players)) {
        emitPlayerState(playerId);
    }
}

function startMarket() {
    if (marketInterval) return;

    marketInterval = setInterval(() => {
        if (!gameState.isGameOpen) return;

        for (const action of gameState.actions) {
            const baseVariation = getRandomInt(-5, 5);
            action.currentPrice = clampPrice(action.currentPrice + baseVariation);
            action.history.push(action.currentPrice);

            if (action.history.length > MAX_HISTORY) {
                action.history.shift();
            }
        }

        const newsEvent = maybeGenerateNews(gameState.actions);
        gameState.lastNewsEvent = newsEvent;

        broadcastGameState(newsEvent);
    }, MARKET_TICK_MS);
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

function createPlayer(socketId) {
    const portfolio = {};
    for (const action of gameState.actions) {
        portfolio[action.name] = 0;
    }

    return {
        id: socketId,
        name: "",
        cash: INITIAL_CASH,
        portfolio,
        hasJoined: false,
        isActive: false
    };
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

    gameState.players[socket.id] = createPlayer(socket.id);

    emitPlayerState(socket.id);
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

    socket.on("player:buy", data => {
        const player = gameState.players[socket.id];
        if (!player || !player.isActive || !gameState.isGameOpen) return;

        const actionName = typeof data === "string" ? data : data?.actionName;
        const quantity = Math.max(
            1,
            Number.isInteger(data?.quantity) ? data.quantity : 1
        );

        const action = getActionByName(actionName);
        if (!action) return;

        const cost = action.currentPrice * quantity;
        if (player.cash < cost) return;

        player.cash -= cost;
        player.portfolio[action.name] = (player.portfolio[action.name] || 0) + quantity;

        broadcastGameState();
    });

    socket.on("player:sell", data => {
        const player = gameState.players[socket.id];
        if (!player || !player.isActive || !gameState.isGameOpen) return;

        const actionName = typeof data === "string" ? data : data?.actionName;
        const quantity = Math.max(
            1,
            Number.isInteger(data?.quantity) ? data.quantity : 1
        );

        const action = getActionByName(actionName);
        if (!action) return;

        const ownedQuantity = player.portfolio[action.name] || 0;
        if (ownedQuantity < quantity) return;

        player.portfolio[action.name] -= quantity;
        player.cash += action.currentPrice * quantity;

        broadcastGameState();
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