const socket = io();

const currentPriceEl = document.getElementById("current-price");
const leaderboardEl = document.getElementById("leaderboard");

const newsContainer = document.getElementById("news-container");
const newsText = document.getElementById("news-text");

const ctx = document.getElementById("chart");
let chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: Array.from({ length: 50 }, (_, i) => i + 1), // 50 points sur l'axe X
    datasets: [] // On va les remplir dynamiquement
  },
  options: {
    animation: false,
    responsive: true,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
});

// Couleurs pour les différentes actions
const colors = ["#FF5733", "#33FF57", "#3357FF", "#FF33F5", "#F5FF33"];

// Gère l'affichage d'une news
function displayNews(news) {
  if (!news) return;

  // 1. Mettre à jour le texte
  newsText.textContent = news.text;

  // 2. Mettre à jour la classe (couleur)
  newsContainer.className = `news-banner news-${news.type}`;

  // 3. Montrer la bannière (enlever 'hidden' pour la faire monter)
  setTimeout(() => {
      newsContainer.classList.remove('hidden');
  }, 100);

  // 4. La cacher après 8 secondes par exemple
  setTimeout(() => {
      newsContainer.classList.add('hidden');
  }, 8000);
}

socket.on("game:update", data => {
  // Mise à jour des datasets du graphique
  if (chart.data.datasets.length === 0) {
    // Si les datasets sont vides, on les crée
    data.actions.forEach((action, index) => {
      chart.data.datasets.push({
        label: action.name,
        data: action.history, // Changed from action.priceHistory
        borderColor: colors[index % colors.length],
        tension: 0.2
      });
    });
  } else {
    // Sinon on met à jour uniquement les données
    data.actions.forEach((action, index) => {
      chart.data.datasets[index].data = action.history; // Changed from action.priceHistory
    });
  }
  chart.update();

  // Mise à jour du leaderboard
  leaderboardEl.innerHTML = "";
  data.leaderboard.forEach(player => {
    const li = document.createElement("li");
    li.textContent = `${player.name} — ${player.totalValue} €`;
    leaderboardEl.appendChild(li);
  });
  
  // Afficher une news si elle est présente dans la mise à jour
  if (data.newsEvent) {
      displayNews(data.newsEvent);
  }
});