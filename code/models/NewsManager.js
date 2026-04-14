class NewsManager {
    constructor() {
        // --- Paramètres d'équilibrage des probabilités ---
        // 0.0 = Totalement aléatoire (chaque action a la même chance)
        // 1.0 = Biais proportionnel (une action 2x plus chère a 2x plus de chance d'avoir une mauvaise news)
        // 2.0 = Biais agressif (au carré)
        // 3.0 = Biais extrême (au cube)
        this.priceBiasIntensity = 3.0;

        // Liste des news disponibles
        this.newsList = [
            // --- NEWS TECH ---
            {
                id: "tech_leak_rumor",
                type: "informative",
                text: "Rumeur : Une faille de sécurité mineure aurait été découverte chez {COMPANY}.",
                targetSector: "tech",
                impactPerSecond: -15.0, 
                durationInSeconds: 8
            },
            {
                id: "tech_leak_confirmed",
                type: "negative",
                text: "Fuite de données chez {COMPANY} : Quelques milliers de comptes touchés.",
                targetSector: "tech",
                impactPerSecond: -30.0, 
                durationInSeconds: 10
            },
            {
                id: "tech_innovation",
                type: "positive",
                text: "Nouvelle mise à jour prometteuse annoncée par {COMPANY}.",
                targetSector: "tech",
                impactPerSecond: 25.0, 
                durationInSeconds: 8
            },
            {
                id: "tech_earnings_beat",
                type: "positive",
                text: "{COMPANY} dépasse largement les attentes de Wall Street ce trimestre.",
                targetSector: "tech",
                impactPerSecond: 40.0, 
                durationInSeconds: 10
            },
            // --- NEWS AUTO ---
            {
                id: "auto_recall",
                type: "negative",
                text: "Rappel massif de véhicules pour {COMPANY} suite à un défaut d'essuie-glace.",
                targetSector: "auto",
                impactPerSecond: -25.0,
                durationInSeconds: 8
            },
            {
                id: "auto_sales_record",
                type: "positive",
                text: "Les ventes du nouveau modèle de {COMPANY} explosent les records.",
                targetSector: "auto",
                impactPerSecond: 30.0,
                durationInSeconds: 8
            },
            // --- NEWS ALIMENTATION ---
            {
                id: "food_poisoning_rumor",
                type: "informative",
                text: "Avis mitigés sur la nouvelle recette proposée par {COMPANY}.",
                targetSector: "food",
                impactPerSecond: -12.0,
                durationInSeconds: 6
            },
            {
                id: "food_health_scandal",
                type: "negative",
                text: "Scandale ! Un restaurant {COMPANY} fermé pour grave problème d'hygiène.",
                targetSector: "food",
                impactPerSecond: -35.0,
                durationInSeconds: 10
            },
            {
                id: "food_new_burger",
                type: "positive",
                text: "Le nouveau menu viral de {COMPANY} attire une foule immense.",
                targetSector: "food",
                impactPerSecond: 20.0,
                durationInSeconds: 8
            },
            // --- NEWS FINANCE ---
            {
                id: "bank_fraud_rumor",
                type: "informative",
                text: "Enquête surprise des régulateurs dans les bureaux de {COMPANY}.",
                targetSector: "finance",
                impactPerSecond: -20.0,
                durationInSeconds: 7
            },
            {
                id: "bank_earnings",
                type: "positive",
                text: "Les bénéfices records de {COMPANY} rassurent totalement les investisseurs.",
                targetSector: "finance",
                impactPerSecond: 30.0,
                durationInSeconds: 8
            },
            // --- MACRO-ÉCONOMIE (Touche tout le monde) ---
            {
                id: "macro_inflation",
                type: "informative",
                text: "L'inflation s'envole ce mois-ci, panique sur les marchés !",
                targetSector: "ALL",
                impactPerSecond: -18.0,
                durationInSeconds: 8
            },
            {
                id: "macro_growth",
                type: "positive",
                text: "Croissance mondiale exceptionnelle, tous les indicateurs sont au vert !",
                targetSector: "ALL",
                impactPerSecond: 20.0,
                durationInSeconds: 8
            }
        ];
        
        this.activeNews = null; 
    }

    /**
     * Sélectionne une news aléatoire applicable aux actions en cours
     * et applique son effet via la méthode applyNews de l'action.
     */
    generateNews(activeActions) {
        if (!activeActions || activeActions.length === 0) return null;

        const shuffledNews = [...this.newsList].sort(() => 0.5 - Math.random());

        for (const newsTemplate of shuffledNews) {
            let targetActions = [];

            if (newsTemplate.targetSector === "ALL") {
                targetActions = activeActions;
            } else {
                targetActions = activeActions.filter(a => a.sector === newsTemplate.targetSector);
            }

            if (targetActions.length > 0) {
                // Est-ce une bonne ou une mauvaise news ?
                const isPositive = newsTemplate.impactPerSecond > 0;

                // On trouve le prix maximum parmis les cibles pour normaliser les calculs
                const maxTargetPrice = Math.max(...targetActions.map(a => a.price));

                // On attribue un poids à chaque action cible potentielle
                const weightedActions = targetActions.map(action => {
                    let weight = 1.0;
                    
                    if (this.priceBiasIntensity > 0) {
                        // relativePrice est entre ~0 et 1 (1 = l'action la plus chère du secteur)
                        const relativePrice = Math.max(0.01, action.price / maxTargetPrice);

                        if (isPositive) {
                            // Bonne news : on favorise les petites actions (on inverse le ratio)
                            weight = Math.pow(1 / relativePrice, this.priceBiasIntensity);
                        } else {
                            // Mauvaise news : on favorise les grosses actions
                            weight = Math.pow(relativePrice, this.priceBiasIntensity);
                        }
                    }

                    return { action, weight };
                });

                // Tirage au sort pondéré
                const totalWeight = weightedActions.reduce((sum, aw) => sum + aw.weight, 0);
                let randomValue = Math.random() * totalWeight;
                let targetAction = weightedActions[0].action;

                for (const aw of weightedActions) {
                    randomValue -= aw.weight;
                    if (randomValue <= 0) {
                        targetAction = aw.action;
                        break;
                    }
                }

                const formattedText = newsTemplate.text.replace(/{COMPANY}/g, targetAction.name);

                // Application de l'effet
                if (newsTemplate.targetSector === "ALL") {
                    targetActions.forEach(a => a.applyNews(newsTemplate.impactPerSecond, newsTemplate.durationInSeconds));
                } else {
                    targetAction.applyNews(newsTemplate.impactPerSecond, newsTemplate.durationInSeconds);
                }

                this.activeNews = {
                    text: formattedText,
                    type: newsTemplate.type
                };

                return this.activeNews;
            }
        }

        return null;
    }
}

module.exports = NewsManager;