// Mémoire pour stocker les classements des 30 dernières secondes
let leaderboardHistory = [];

const socket = io();

const alertBox = document.getElementById("alert-box");
const timerValue = document.getElementById("timer-value");
const leaderboardContainer = document.getElementById("leaderboard-container");
const canvas = document.getElementById("market-chart");

const colors = ["#ea9c0b", "#3fe047", "#f00000", "#1e33a8", "#25c76a"];
const FIXED_HISTORY_LENGTH = 50;

// Variables pour le Timer
let countdownSeconds = 5 * 60; // 5 minutes
let timerInterval = null;
let gameAlreadyStarted = false; // Pour éviter de relancer le chrono à chaque seconde

// Variable pour le minuteur de la news
let newsTimeout = null;

const newsItemWrapper = document.getElementById("news-item-wrapper");
const newsIconContainer = document.getElementById("news-icon-container");
const newsIcon = document.getElementById("news-icon");

// --- MINI-PLUGIN POUR ÉCRIRE LE NOM AU BOUT DE LA COURBE ---
const inlineLegendPlugin = {
    id: 'inlineLegend',
    afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        ctx.save();
        // On réutilise la police de ton jeu pour que ça soit harmonieux
        ctx.font = 'bold 20px "Lilita One", Arial, sans-serif';
        ctx.textBaseline = 'middle';

        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (!meta.hidden && dataset.data.length > 0) {
                // On récupère les coordonnées (X, Y) du tout dernier point de la ligne
                const lastPointIndex = dataset.data.length - 1;
                const lastPoint = meta.data[lastPointIndex];

                if (lastPoint) {
                    ctx.fillStyle = dataset.borderColor; // Le texte prend la couleur de la courbe
                    // On écrit le nom de l'action juste à droite de ce dernier point (+10 pixels)
                    ctx.fillText(dataset.label, lastPoint.x + 10, lastPoint.y);
                }
            }
        });
        ctx.restore();
    }
};

// --- INITIALISATION DU GRAPHIQUE ---
let chart = new Chart(canvas, {
    type: "line",
    data: {
        labels: Array.from({ length: FIXED_HISTORY_LENGTH }, (_, i) => i + 1),
        datasets: []
    },
    // On active notre plugin ici !
    plugins: [inlineLegendPlugin],
    options: {
        layout: {
            padding: {
                right: 120 // IMPORTANT : On laisse 90px de vide à droite pour que les noms ne soient pas coupés
            }
        },
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: {
                display: false // ON CACHE L'ANCIENNE LÉGENDE CLASSIQUE
            }
        },
        scales: {
            x: {
                ticks: {
                    color: "#666",
                    callback: (val, index) => (index + 1) % 5 === 0 ? 'T' + (index + 1) : null
                },
                grid: { color: "#ddd" }
            },
            y: { ticks: { color: "#666" }, grid: { color: "#ddd" } }
        }
    }
});

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function startCountdown() {
    if (timerInterval) return;

    timerInterval = setInterval(() => {
        countdownSeconds--;
        timerValue.textContent = formatTime(countdownSeconds);

        // Effet de stress (dernière minute)
        if (countdownSeconds <= 60) {
            timerValue.classList.add('timer-stress');
        }

        // Fin du temps
        if (countdownSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            // On ordonne au serveur de fermer la partie
            socket.emit("admin:close-game");
        }
    }, 1000);
}

function resetCountdown() {
    clearInterval(timerInterval);
    timerInterval = null;
    countdownSeconds = 5 * 60;
    timerValue.textContent = "STOP";
    timerValue.classList.remove('timer-stress');
    gameAlreadyStarted = false;
}

socket.on("game:update", data => {
    if (!data.isGameOpen && data.endStats) {
        resetCountdown();

        // 1. On sauvegarde les stats dans le navigateur
        sessionStorage.setItem("wallstreet_endStats", JSON.stringify(data.endStats));

        // 2. On redirige vers la nouvelle page !
        window.location.href = "/endscreen.html";
        return;
    }

    // --- GESTION DU TIMER ---
    if (data.isGameOpen) {
        if (!gameAlreadyStarted) {
            gameAlreadyStarted = true;
            startCountdown();
        }
    } else {
        resetCountdown();
    }

    // --- GESTION DES NEWS (8s + Couleurs) ---
    // --- GESTION DES NEWS (8s + Couleurs + Icones/Images) ---
    if (data.newsEvent && data.newsEvent.text) {
        alertBox.textContent = data.newsEvent.text;

        // Mise à jour des couleurs du contour et de l'image selon le type
        if (data.newsEvent.type === "positive") {
            alertBox.style.borderColor = "#28a745"; // Vert
            alertBox.style.backgroundColor = "#beffbe";
            newsIcon.src = "/assets/positif.png";
        } else if (data.newsEvent.type === "negative") {
            alertBox.style.borderColor = "#dc3545"; // Rouge
            alertBox.style.backgroundColor = "#ffe6e6";
            newsIcon.src = "/assets/danger.webp";
        } else {
            alertBox.style.borderColor = "#ffaa00"; // Orange/Jaune
            alertBox.style.backgroundColor = "#ffecc7";
            newsIcon.src = "/assets/neutre.png";
        }
    }

// État initial lors du tout premier lancement
    if (!gameAlreadyStarted && alertBox.textContent.trim() === "") {
        alertBox.textContent = "LIVE NEWS — En attente d'un événement marché...";
        alertBox.style.borderColor = "#ffaa00";
        newsIcon.src = "/assets/neutre.png";
    }

    // --- LEADERBOARD ---
    // --- 3. MISE À JOUR DU LEADERBOARD (Évolution sur 30s) ---
    if (data.leaderboard) {
        // On sauvegarde le classement actuel dans l'historique
        leaderboardHistory.push(data.leaderboard);

        // Si on dépasse 30 secondes d'historique (30 ticks), on retire le plus vieux
        if (leaderboardHistory.length > 30) {
            leaderboardHistory.shift();
        }

        // On récupère le classement d'il y a 30 secondes (ou moins si la partie vient de commencer)
        const pastLeaderboard = leaderboardHistory[0];

        leaderboardContainer.innerHTML = "";

        data.leaderboard.forEach((player, index) => {
            const currentRank = index + 1;
            let trendIcon = '=';
            let trendClass = 'trend-eq';

            // On cherche la position du joueur il y a 30 secondes
            const pastIndex = pastLeaderboard.findIndex(p => p.id === player.id);

            if (pastIndex !== -1) {
                const pastRank = pastIndex + 1;
                if (currentRank < pastRank) {
                    trendIcon = '▲'; trendClass = 'trend-up';
                } else if (currentRank > pastRank) {
                    trendIcon = '▼'; trendClass = 'trend-down';
                }
            } else {
                // S'il n'était pas là, il vient de monter !
                trendIcon = '▲'; trendClass = 'trend-up';
            }

            // Le top 1 a droit à sa couronne !
            const rankDisplay = currentRank === 1
                ? `<span class="crown">👑</span> 1`
                : `<span class="${trendClass}">${trendIcon}</span> ${currentRank}`;

            // Formatage du score pour séparer les milliers (ex: 10 500)
            const formattedScore = Math.round(player.totalValue).toLocaleString('fr-FR');

            const row = document.createElement("div");
            row.className = "lb-row";
            row.innerHTML = `
                <div class="lb-rank">${rankDisplay}</div>
                <div class="lb-name">${player.name}</div>
                <div class="lb-score">${formattedScore} €</div>
            `;
            leaderboardContainer.appendChild(row);
        });
    }

    // --- GRAPHIQUE (DÉFILEMENT) ---
    if (data.actions && data.actions.length > 0) {
        chart.data.datasets = data.actions.map((action, index) => ({
            label: action.name,
            data: action.history || [],
            borderColor: colors[index % colors.length],
            backgroundColor: "transparent",
            tension: 0.35,
            pointRadius: 0,
            borderWidth: 4
        }));
        chart.update("none");
    }
});