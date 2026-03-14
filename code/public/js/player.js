const socket = io();

const joinSection = document.getElementById("join-section");
const gameSection = document.getElementById("game-section");

const nameInput = document.getElementById("name-input");
const joinButton = document.getElementById("join-button");

const playerNameEl = document.getElementById("player-name");
const currentPriceEl = document.getElementById("current-price");
const cashEl = document.getElementById("cash");
const sharesEl = document.getElementById("shares");
const totalValueEl = document.getElementById("total-value");

const buyButton = document.getElementById("buy-button");
const sellButton = document.getElementById("sell-button");

joinButton.addEventListener("click", () => {
  const name = nameInput.value.trim();
  socket.emit("player:join", name);

  joinSection.style.display = "none";
  gameSection.style.display = "block";
});

buyButton.addEventListener("click", () => {
  socket.emit("player:buy");
});

sellButton.addEventListener("click", () => {
  socket.emit("player:sell");
});

socket.on("player:update", data => {
  playerNameEl.textContent = data.name;
  currentPriceEl.textContent = data.currentPrice;
  cashEl.textContent = data.cash;
  sharesEl.textContent = data.shares;
  totalValueEl.textContent = data.totalValue;
});