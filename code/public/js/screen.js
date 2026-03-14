const socket = io();

const currentPriceEl = document.getElementById("current-price");
const leaderboardEl = document.getElementById("leaderboard");

const ctx = document.getElementById("chart");
let chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [{
      label: "Prix du marché",
      data: [],
      tension: 0.2
    }]
  },
  options: {
    animation: false,
    responsive: true
  }
});

socket.on("game:update", data => {
  currentPriceEl.textContent = data.currentPrice;

  chart.data.labels = data.priceHistory.map((_, index) => index + 1);
  chart.data.datasets[0].data = data.priceHistory;
  chart.update();

  leaderboardEl.innerHTML = "";
  data.leaderboard.forEach(player => {
    const li = document.createElement("li");
    li.textContent = `${player.name} — ${player.totalValue} € (cash: ${player.cash} €, actions: ${player.shares})`;
    leaderboardEl.appendChild(li);
  });
});