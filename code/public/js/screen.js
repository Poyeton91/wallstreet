const socket = io();

const statusEl = document.getElementById("screen-status");
const currentPriceEl = document.getElementById("current-price");
const leaderboardEl = document.getElementById("leaderboard");

const newsContainer = document.getElementById("news-container");
const newsText = document.getElementById("news-text");

const ctx = document.getElementById("chart");

const colors = ["#FF5733", "#33FF57", "#3357FF", "#FF33F5", "#F5FF33"];

let chart = new Chart(ctx, {
    type: "line",
    data: {
        labels: Array.from({ length: 50 }, (_, i) => i + 1),
        datasets: []
    },
    options: {
        animation: false,
        responsive: true,
        scales: {
            y: {
                beginAtZero: false
            }
        }
    }
});

function displayNews(news) {
    if (!news || !newsContainer || !newsText) return;

    newsText.textContent = news.text;
    newsContainer.className = `news-banner news-${news.type}`;

    setTimeout(() => {
        newsContainer.classList.remove("hidden");
    }, 100);

    setTimeout(() => {
        newsContainer.classList.add("hidden");
    }, 8000);
}

socket.on("game:update", data => {
    if (statusEl) {
        statusEl.textContent = data.isGameOpen ? "Partie ouverte" : "Partie fermée";
    }

    if (currentPriceEl) {
        if (data.actions && data.actions.length > 0) {
            currentPriceEl.textContent = data.actions[0].currentPrice;
        } else {
            currentPriceEl.textContent = "0";
        }
    }

    if (chart.data.datasets.length === 0) {
        data.actions.forEach((action, index) => {
            chart.data.datasets.push({
                label: action.name,
                data: action.history,
                borderColor: colors[index % colors.length],
                tension: 0.2
            });
        });
    } else {
        data.actions.forEach((action, index) => {
            if (!chart.data.datasets[index]) {
                chart.data.datasets.push({
                    label: action.name,
                    data: action.history,
                    borderColor: colors[index % colors.length],
                    tension: 0.2
                });
            } else {
                chart.data.datasets[index].label = action.name;
                chart.data.datasets[index].data = action.history;
            }
        });

        chart.data.datasets = chart.data.datasets.slice(0, data.actions.length);
    }

    chart.update();

    leaderboardEl.innerHTML = "";
    data.leaderboard.forEach(player => {
        const li = document.createElement("li");
        li.textContent = `${player.name} — ${player.totalValue} €`;
        leaderboardEl.appendChild(li);
    });

    if (data.newsEvent) {
        displayNews(data.newsEvent);
    }
});