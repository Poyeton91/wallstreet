const NewsManager = require('./NewsManager');

class GameLoop {
    constructor(actions, io, expectedPlayers = 1) {
        this.actions = actions;
        this.io = io;
        this.expectedPlayers = expectedPlayers;
        this.players = {};
        this.interval = null;
        this.isGameOpen = false;

        this.newsManager = new NewsManager();
        this.tickCount = 0;
    }

    start() {
        if (this.isGameOpen) return;
        this.isGameOpen = true;

        for (const player of Object.values(this.players)) {
            if (player.hasJoined) player.isActive = true;
        }

        if (!this.interval) {
            this.interval = setInterval(() => this.tick(), 1000);
        }
        this.broadcastGameState();
    }

    stop() {
        this.isGameOpen = false;
        for (const player of Object.values(this.players)) {
            if (player.hasJoined) player.isActive = false;
        }

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.broadcastGameState();
    }

    tick() {
        this.tickCount++;
        let activeNewsEvent = null;

        // Toutes les 10 secondes, on essaie de générer une news
        if (this.tickCount % 10 === 0) {
            activeNewsEvent = this.newsManager.generateNews(this.actions);
            if (activeNewsEvent) {
                console.log("Nouvelle News déclenchée :", activeNewsEvent.text);
            }
        }

        // Fait vivre chaque action
        this.actions.forEach(action => action.tick());

        this.broadcastGameState(activeNewsEvent);
    }

    createPlayer(socketId) {
        const portfolio = {};
        this.actions.forEach(action => {
            portfolio[action.name] = { quantity: 0, invested: 0 };
        });

        this.players[socketId] = {
            id: socketId,
            name: "",
            cash: 10000,
            portfolio,
            hasJoined: false,
            isActive: false
        };

        this.emitPlayerState(socketId);
        this.emitLobbyState();
    }

    joinPlayer(socketId, playerName) {
        const player = this.players[socketId];
        if (!player) return;

        player.name = (playerName || "Joueur").trim() || "Joueur";
        player.hasJoined = true;
        player.isActive = this.isGameOpen;

        this.io.to(socketId).emit("player:joined", {
            isGameOpen: this.isGameOpen,
            isWaiting: !this.isGameOpen
        });

        this.broadcastGameState();
    }

    removePlayer(socketId) {
        delete this.players[socketId];
        this.broadcastGameState();
    }

    buyAction(socketId, actionIdentifier, quantity) {
        const player = this.players[socketId];
        if (!player || !player.isActive || !this.isGameOpen) return;

        const action = this.actions.find(a => a.name === actionIdentifier || a.shortName === actionIdentifier);
        if (!action) return;

        const cost = action.price * quantity;
        if (player.cash < cost) return;

        player.cash -= cost;

        if (!player.portfolio[action.name]) {
            player.portfolio[action.name] = { quantity: 0, invested: 0 };
        }
        player.portfolio[action.name].quantity += quantity;
        player.portfolio[action.name].invested += cost;

        this.broadcastGameState();
    }

    sellAction(socketId, actionIdentifier, quantity) {
        const player = this.players[socketId];
        if (!player || !player.isActive || !this.isGameOpen) return;

        const action = this.actions.find(a => a.name === actionIdentifier || a.shortName === actionIdentifier);
        if (!action) return;

        const ownedQuantity = player.portfolio[action.name]?.quantity || 0;
        if (ownedQuantity < quantity) return;

        const avgCost = player.portfolio[action.name].invested / ownedQuantity;

        player.portfolio[action.name].quantity -= quantity;
        player.portfolio[action.name].invested -= avgCost * quantity;
        player.cash += action.price * quantity;

        if (player.portfolio[action.name].quantity === 0) {
            player.portfolio[action.name].invested = 0;
        }

        this.broadcastGameState();
    }

    getPlayerTotalValue(player) {
        let total = player.cash;
        for (const action of this.actions) {
            const qty = player.portfolio[action.name]?.quantity || 0;
            total += qty * action.price;
        }
        return total;
    }

    getLeaderboard() {
        return Object.values(this.players)
            .filter(p => p.hasJoined)
            .map(p => ({
                id: p.id,
                name: p.name,
                cash: p.cash,
                portfolio: p.portfolio,
                totalValue: this.getPlayerTotalValue(p)
            }))
            .sort((a, b) => b.totalValue - a.totalValue);
    }

    getPublicActions() {
        return this.actions.map(action => ({
            name: action.name,
            shortName: action.shortName,
            sector: action.sector,
            currentPrice: action.price, // On traduit "price" de la classe en "currentPrice" pour le front
            history: action.history
        }));
    }

    emitLobbyState() {
        const playersArr = Object.values(this.players);
        const waitingCount = playersArr.filter(p => p.hasJoined && !p.isActive).length;
        const activeCount = playersArr.filter(p => p.hasJoined && p.isActive).length;

        this.io.emit("lobby:update", {
            isGameOpen: this.isGameOpen,
            waitingCount,
            activeCount
        });
    }

    emitPlayerState(socketId) {
        const player = this.players[socketId];
        if (!player) return;

        this.io.to(socketId).emit("player:update", {
            name: player.name,
            cash: player.cash,
            portfolio: player.portfolio,
            actions: this.getPublicActions(),
            totalValue: this.getPlayerTotalValue(player),
            isGameOpen: this.isGameOpen,
            isWaiting: player.hasJoined && !player.isActive,
            isActive: player.isActive
        });
    }

    broadcastGameState(newsEvent = null) {
        // Envoi aux écrans publics
        this.io.emit("game:update", {
            isGameOpen: this.isGameOpen,
            actions: this.getPublicActions(),
            leaderboard: this.getLeaderboard(),
            newsEvent
        });

        // Mise à jour du lobby
        this.emitLobbyState();

        // Envoi spécifique aux téléphones des joueurs
        for (const socketId in this.players) {
            this.emitPlayerState(socketId);
        }
    }
}

module.exports = GameLoop;