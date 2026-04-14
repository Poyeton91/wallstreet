const NewsManager = require('./NewsManager');

class GameLoop {
    /**
     * @param {Action[]} actions Tableau des actions gérées par la boucle de jeu.
     * @param {object} io L'instance Socket.IO pour la communication.
     * @param {number} expectedPlayers Nombre de joueurs attendus dans la partie.
     */
    constructor(actions, io, expectedPlayers = 1) {
        this.actions = actions;
        this.io = io;
        this.expectedPlayers = expectedPlayers;
        this.players = {};
        this.interval = null;
        
        // Initialisation du gestionnaire de news
        this.newsManager = new NewsManager();
        this.tickCount = 0; // Compteur pour déclencher des events
    }

    /**
     * Démarre la boucle de jeu.
     */
    start() {
        if (this.interval) return;
        this.interval = setInterval(() => this.tick(), 1000);
    }

    /**
     * Arrête la boucle de jeu.
     */
    stop() {
        clearInterval(this.interval);
        this.interval = null;
    }

    /**
     * Logique exécutée à chaque seconde.
     */
    tick() {
        this.tickCount++;
        let activeNewsEvent = null;

        // Toutes les X secondes (ex: 10), on essaie de générer une news
        if (this.tickCount % 10 === 0) {
            activeNewsEvent = this.newsManager.generateNews(this.actions);
            if (activeNewsEvent) {
                console.log("Nouvelle News déclenchée :", activeNewsEvent.text);
            }
        }

        this.actions.forEach(action => {
            // Appliquer le tick de l'action qui gère maintenant son propre prix
            action.tick();
        });

        // 3. Envoyer le nouvel état du jeu à tous les clients, en incluant la news si elle vient de pop
        this.broadcastGameState(activeNewsEvent);
    }

    /**
     * Gère la connexion d'un nouveau joueur.
     */
    addPlayer(socket, playerName) {
        this.players[socket.id] = {
            id: socket.id,
            name: playerName || `Joueur ${socket.id.substring(0, 4)}`,
            cash: 10000,
            shares: {} // { actionName: quantity }
        };
        this.broadcastGameState();
    }

    /**
     * Gère la déconnexion d'un joueur.
     */
    removePlayer(socket) {
        const player = this.players[socket.id];
        if (player) {
            // No need to "sell" actions from the market perspective, just remove from player's portfolio
            // The market price is independent of player actions now.
        }
        delete this.players[socket.id];
        this.broadcastGameState();
    }

    /**
     * Gère l'achat d'une action par un joueur.
     */
    buyAction(socket, actionShortName, quantity = 1) { // Changed parameter name to actionShortName
        const player = this.players[socket.id];
        const action = this.actions.find(a => a.shortName === actionShortName); // Changed lookup to shortName

        if (!player || !action) return;

        const totalPrice = action.price * quantity;

        if (player.cash >= totalPrice) {
            player.cash -= totalPrice;
            player.shares[actionShortName] = (player.shares[actionShortName] || 0) + quantity; // Use shortName for shares key
            this.broadcastGameState();
        }
    }

    /**
     * Gère la vente d'une action par un joueur.
     */
    sellAction(socket, actionShortName, quantity = 1) { // Changed parameter name to actionShortName
        const player = this.players[socket.id];
        const action = this.actions.find(a => a.shortName === actionShortName); // Changed lookup to shortName

        if (!player || !action) return;

        if ((player.shares[actionShortName] || 0) >= quantity) { // Use shortName for shares key
            player.shares[actionShortName] -= quantity;
            player.cash += action.price * quantity;
            this.broadcastGameState();
        }
    }

    /**
     * Calcule le classement des joueurs.
     */
    getLeaderboard() {
        return Object.values(this.players)
            .map(player => {
                let sharesValue = 0;
                for (const actionShortName in player.shares) { // Changed actionName to actionShortName
                    const action = this.actions.find(a => a.shortName === actionShortName); // Changed lookup to shortName
                    if (action) {
                        sharesValue += player.shares[actionShortName] * action.price;
                    }
                }
                return {
                    id: player.id,
                    name: player.name,
                    totalValue: Math.round(player.cash + sharesValue)
                };
            })
            .sort((a, b) => b.totalValue - a.totalValue);
    }

    /**
     * Diffuse l'état complet du jeu à tous les clients.
     * @param {Object} newsEvent News à afficher (optionnelle)
     */
    broadcastGameState(newsEvent = null) {
        // État global pour l'écran principal
        this.io.emit("game:update", {
            actions: this.actions.map(a => ({
                name: a.name,
                shortName: a.shortName,
                price: a.price,
                history: a.history
            })),
            leaderboard: this.getLeaderboard(),
            newsEvent: newsEvent // On passe la news ici
        });

        // État spécifique pour chaque joueur
        for (const playerId in this.players) {
            const player = this.players[playerId];
            this.io.to(playerId).emit("player:update", {
                name: player.name,
                cash: player.cash,
                shares: player.shares,
            });
        }
    }
}

module.exports = GameLoop;