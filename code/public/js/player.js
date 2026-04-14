const socket = io();

const joinSection = document.getElementById("join-section");
const waitingSection = document.getElementById("waiting-section");
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

let hasSubmittedName = false;

function showJoinState() {
  joinSection.style.display = "block";
  waitingSection.style.display = "none";
  gameSection.style.display = "none";
}

function showWaitingState() {
  joinSection.style.display = "none";
  waitingSection.style.display = "block";
  gameSection.style.display = "none";
}

function showGameState() {
  joinSection.style.display = "none";
  waitingSection.style.display = "none";
  gameSection.style.display = "block";
}

joinButton.addEventListener("click", () => {
  const name = nameInput.value.trim();

  if (!name) {
    alert("Entre un pseudo.");
    return;
  }

  hasSubmittedName = true;
  socket.emit("player:join", name);
});

buyButton.addEventListener("click", () => {
  socket.emit("player:buy");
});

sellButton.addEventListener("click", () => {
  socket.emit("player:sell");
});

socket.on("player:joined", data => {
  if (data.isGameOpen) {
    showGameState();
  } else {
    showWaitingState();
  }
});

socket.on("player:update", data => {
  playerNameEl.textContent = data.name || "";
  currentPriceEl.textContent = data.currentPrice;
  cashEl.textContent = data.cash;
  sharesEl.textContent = data.shares;
  totalValueEl.textContent = data.totalValue;

  if (!hasSubmittedName) {
    showJoinState();
    return;
  }

  if (data.isActive && data.isGameOpen) {
    showGameState();
  } else {
    showWaitingState();
  }
});