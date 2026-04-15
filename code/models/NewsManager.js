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
                impactPerSecond: -6.0,
                durationInSeconds: 7
            },
            {
                id: "tech_leak_confirmed",
                type: "negative",
                text: "Fuite de données chez {COMPANY} : Quelques milliers de comptes touchés.",
                targetSector: "tech",
                impactPerSecond: -30.0, 
                durationInSeconds: 4
            },
            {
                id: "tech_innovation",
                type: "positive",
                text: "Nouvelle mise à jour prometteuse annoncée par {COMPANY}.",
                targetSector: "tech",
                impactPerSecond: 15.0,
                durationInSeconds: 6
            },
            {
                id: "tech_earnings_beat",
                type: "positive",
                text: "{COMPANY} dépasse largement les attentes de Wall Street ce trimestre.",
                targetSector: "tech",
                impactPerSecond: 20.0,
                durationInSeconds: 10
            },
            {
                id: "tech_ai_breakthrough",
                type: "positive",
                text: "L'intelligence artificielle de {COMPANY} a pris conscience d'elle-même et a optimisé ses impôts. Les marchés adorent !",
                targetSector: "tech",
                impactPerSecond: 35.0,
                durationInSeconds: 6
            },
            {
                id: "tech_ai_breakthrough2",
                type: "negative",
                text: "L'intelligence artificielle de {COMPANY} prend plusieurs jours de congé !",
                targetSector: "tech",
                impactPerSecond: -5.0,
                durationInSeconds: 6
            },
            {
                id: "tech_ai_breakthrough3",
                type: "negative",
                text: "L'intelligence artificielle de {COMPANY} s'est rebellé et a pris le contrôle de l'entreprise.",
                targetSector: "tech",
                impactPerSecond: -25.0,
                durationInSeconds: 6
            },
            {
                id: "tech_ceo_scandal",
                type: "negative",
                text: "Scandale : le PDG de {COMPANY} a été surpris en train d'insulter des investisseurs sur un forum. L'action dévisse.",
                targetSector: "tech",
                impactPerSecond: -25.0,
                durationInSeconds: 6
            },
            {
                id: "tech_viral_product",
                type: "positive",
                text: "Les nouvelles lunettes connectées de {COMPANY} font un carton inattendu chez les influenceurs.",
                targetSector: "tech",
                impactPerSecond: 20.0,
                durationInSeconds: 9
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
            {
                id: "auto_autonomous_crash",
                type: "negative",
                text: "Le taxi sans chauffeur de {COMPANY} a percuté une vitrine. Le programme autonome est suspendu.",
                targetSector: "auto",
                impactPerSecond: -35.0,
                durationInSeconds: 4
            },
            {
                id: "auto_strike",
                type: "negative",
                text: "Grève surprise massive dans les usines de {COMPANY}. Les chaînes de production sont à l'arrêt complet.",
                targetSector: "auto",
                impactPerSecond: -15.0,
                durationInSeconds: 15
            },
            {
                id: "auto_chip_shortage",
                type: "informative",
                text: "Pénurie de composants : {COMPANY} repousse la sortie de son nouveau SUV de plusieurs mois.",
                targetSector: "auto",
                impactPerSecond: -12.0,
                durationInSeconds: 6
            },
            {
                id: "auto_mega_contract",
                type: "positive",
                text: "{COMPANY} signe un contrat géant pour équiper toute la police de Dubaï avec ses véhicules.",
                targetSector: "auto",
                impactPerSecond: 45.0,
                durationInSeconds: 6
            },
            {
                id: "auto_eco_award",
                type: "positive",
                text: "Le nouveau moteur propre de {COMPANY} reçoit le grand prix de l'innovation écologique.",
                targetSector: "auto",
                impactPerSecond: 13.0,
                durationInSeconds: 14
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
                impactPerSecond: -20.0,
                durationInSeconds: 7
            },
            {
                id: "food_new_burger",
                type: "positive",
                text: "Le nouveau menu viral de {COMPANY} attire une foule immense.",
                targetSector: "food",
                impactPerSecond: 20.0,
                durationInSeconds: 6
            },

            {
                id: "food_vegan_success",
                type: "positive",
                text: "Le nouveau simili-viande 100% synthétique de {COMPANY} est un triomphe. Les ruptures de stock s'enchaînent.",
                targetSector: "food",
                impactPerSecond: 28.0,
                durationInSeconds: 6
            },
            {
                id: "food_weird_collab",
                type: "informative",
                text: "{COMPANY} annonce un nouveau burger goût pizza hawaïenne. Les marchés sont perplexes.",
                targetSector: "food",
                impactPerSecond: -4.0,
                durationInSeconds: 10
            },
            {
                id: "food_health_trend",
                type: "positive",
                text: "Une étude douteuse prouve que les sodas de {COMPANY} allongent l'espérance de vie. Les ventes explosent.",
                targetSector: "food",
                impactPerSecond: 15,
                durationInSeconds: 9
            },
            {
                id: "food_rat_scandal",
                type: "negative",
                text: "Une vidéo virale montre un rongeur dans les cuisines de {COMPANY}. L'action plonge !",
                targetSector: "food",
                impactPerSecond: -45.0,
                durationInSeconds: 4
            },

            {
                id: "food_potato_shortage",
                type: "negative",
                text: "Grave pénurie de frites chez {COMPANY}. Les clients menacent de boycotter les restaurants.",
                targetSector: "food",
                impactPerSecond: -10.0,
                durationInSeconds: 12
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

            {
                id: "finance_crypto_loss",
                type: "negative",
                text: "Un stagiaire de {COMPANY} a perdu le mot de passe du portefeuille crypto. Des millions partis en fumée.",
                targetSector: "finance",
                impactPerSecond: -30.0,
                durationInSeconds: 4
            },
            {
                id: "finance_huge_dividends",
                type: "positive",
                text: "{COMPANY} annonce des dividendes généreuses. Les traders sabrent le champagne !",
                targetSector: "finance",
                impactPerSecond: 35.0,
                durationInSeconds: 6
            },
            {
                id: "finance_merger_rumor",
                type: "informative",
                text: "Bruit de couloir : {COMPANY} s'apprêterait à acheter son concurrent principal.",
                targetSector: "finance",
                impactPerSecond: 12.0,
                durationInSeconds: 7
            },
            // --- MACRO-ÉCONOMIE (Touche tout le monde) ---
            {
                id: "macro_inflation",
                type: "informative",
                text: "L'inflation s'envole ce mois-ci, panique sur les marchés !",
                targetSector: "ALL",
                impactPerSecond: -6,
                durationInSeconds: 18
            },
            {
                id: "macro_growth",
                type: "positive",
                text: "Croissance mondiale exceptionnelle, tous les indicateurs sont au vert !",
                targetSector: "ALL",
                impactPerSecond: 7,
                durationInSeconds: 15
            },

            {
                id: "macro_war_rumor",
                type: "negative",
                text: "Tensions géopolitiques extrêmes : un conflit mondial semble imminent. La bourse s'effondre.",
                targetSector: "ALL",
                impactPerSecond: -35.0,
                durationInSeconds: 15
            },

            {
                id: "macro_war_rumor",
                type: "informative",
                text: "Rumeur : Une guerre pourait se préparer dans les prochains jours",
                targetSector: "ALL",
                impactPerSecond: -5.0,
                durationInSeconds: 20
            },

            {
                id: "macro_world_peace",
                type: "positive",
                text: "Accord de paix historique signé. Tous les indices mondiaux s'envolent vers la lune !",
                targetSector: "ALL",
                impactPerSecond: 20.0,
                durationInSeconds: 30
            },
            {
                id: "macro_alien_contact",
                type: "informative",
                text: "Les extraterrestres existent et ils utilisent notre monnaie. Gros bouleversement sur les marchés.",
                targetSector: "ALL",
                impactPerSecond: 15.0,
                durationInSeconds: 10
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

        // On mélange et on prend la première news
        const shuffledNews = [...this.newsList].sort(() => 0.5 - Math.random());
        const newsTemplate = shuffledNews[0];

        console.log(`[DEBUG NEWS] ID: ${newsTemplate.id} | Impact: ${newsTemplate.impactPerSecond}€/s | Durée: ${newsTemplate.durationInSeconds}s`);

        // 1. GESTION DES NEWS MACRO (Touche tout le monde)
        if (newsTemplate.targetSector === "ALL") {
            activeActions.forEach(a => a.applyNews(newsTemplate.impactPerSecond, newsTemplate.durationInSeconds));
            this.activeNews = {
                text: newsTemplate.text,
                type: newsTemplate.type
            };
            return this.activeNews;
        }

        // 2. GESTION DES NEWS CIBLÉES
        // --- LA CORRECTION EST ICI ---
        // On filtre pour que la news ne touche QUE les entreprises de son propre secteur
        const targetActions = activeActions.filter(a => a.sector === newsTemplate.targetSector);

        // Sécurité : Si par hasard il n'y a aucune action de ce secteur en jeu, on annule.
        if (targetActions.length === 0) return null;

        const isPositive = newsTemplate.impactPerSecond > 0;

        // Le prix de référence reste celui du LEADER GLOBAL du jeu (tous secteurs confondus)
        const globalMaxPrice = Math.max(...activeActions.map(a => a.price));

        const weightedActions = targetActions.map(action => {
            let weight = 1.0;

            if (this.priceBiasIntensity > 0) {
                // Comparaison par rapport au leader global
                const relativePrice = Math.max(0.01, action.price / globalMaxPrice);

                if (isPositive) {
                    weight = Math.pow(1 / relativePrice, this.priceBiasIntensity);
                } else {
                    weight = Math.pow(relativePrice, this.priceBiasIntensity);
                }
            }
            return { action, weight };
        });

        // Tirage au sort de la victime/du gagnant
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

        console.log(`[DEBUG BIAS] Cible choisie : ${targetAction.name} (Prix actuel : ${targetAction.price}€)`);

        // Application
        const formattedText = newsTemplate.text.replace(/{COMPANY}/g, targetAction.name);
        targetAction.applyNews(newsTemplate.impactPerSecond, newsTemplate.durationInSeconds);

        this.activeNews = {
            text: formattedText,
            type: newsTemplate.type
        };

        return this.activeNews;
    }
}

module.exports = NewsManager;