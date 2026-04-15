const socket = io();

const alertBox = document.getElementById("alert-box");
const timerValue = document.getElementById("timer-value");
const leaderboardContainer = document.getElementById("leaderboard-container");
const canvas = document.getElementById("market-chart");

const colors = ["#5f6f8a", "#3f7ae0", "#f08a00", "#1e33a8", "#25c76a"];
const FIXED_HISTORY_LENGTH = 50;

// Variables pour le Timer
let countdownSeconds = 5 * 60; // 5 minutes
let timerInterval = null;
let gameAlreadyStarted = false; // Pour éviter de relancer le chrono à chaque seconde

// Variable pour le minuteur de la news
let newsTimeout = null;

let chart = new Chart(canvas, {
    type: "line",
    data: {
        labels: Array.from({ length: FIXED_HISTORY_LENGTH }, (_, i) => i + 1),
        datasets: []
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: {
                position: "right",
                labels: { color: "#222", font: { size: 14, weight: "bold" } }
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
    if (data.newsEvent && data.newsEvent.text) {
        alertBox.textContent = "LIVE NEWS — " + data.newsEvent.text;
        if (data.newsEvent.type === "positive") {
            alertBox.style.borderColor = "#28a745";
            alertBox.style.backgroundColor = "#e6ffe6";
        } else if (data.newsEvent.type === "negative") {
            alertBox.style.borderColor = "#dc3545";
            alertBox.style.backgroundColor = "#ffe6e6";
        }
        if (newsTimeout) clearTimeout(newsTimeout);
        newsTimeout = setTimeout(() => {
            alertBox.textContent = "LIVE NEWS — En attente d'un événement marché...";
            alertBox.style.borderColor = "#ff7b7b";
            alertBox.style.backgroundColor = "#fff4f4";
        }, 8000);
    }

    // --- LEADERBOARD ---
    leaderboardContainer.innerHTML = "";
    data.leaderboard.forEach((player, index) => {
        const row = document.createElement("div");
        row.className = "leader-row";
        row.innerHTML = `<span>#${index + 1} ${player.name}</span><strong>${Math.round(player.totalValue)} €</strong>`;
        leaderboardContainer.appendChild(row);
    });

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