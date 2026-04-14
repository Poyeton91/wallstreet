const socket = io();

const joinSection = document.getElementById("join-section");
const waitingSection = document.getElementById("waiting-section");
const gameSection = document.getElementById("game-section");

const nameInput = document.getElementById("name-input");
const joinButton = document.getElementById("join-button");

const playerNameEl = document.getElementById("player-name");
const cashEl = document.getElementById("cash");
const totalValueEl = document.getElementById("total-value");
const actionsContainer = document.getElementById("actions-container");

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

socket.on("player:joined", data => {
  if (data.isGameOpen) {
    showGameState();
  } else {
    showWaitingState();
  }
});

// Écoute des mises à jour globales pour afficher les boutons
socket.on("game:update", data => {
  // On crée l'interface d'achat/vente si elle n'existe pas encore
  if (actionsContainer.children.length === 0) {
    data.actions.forEach(action => {
      const actionDiv = document.createElement("div");
      actionDiv.className = "action-card";
      actionDiv.style = "margin-bottom: 20px; border: 1px solid #ccc; padding: 10px;";

      const title = document.createElement("h3");
      title.textContent = `${action.name} (${action.shortName})`;

      const priceSpan = document.createElement("p");
      priceSpan.id = `price-${action.name}`; // Changed to action.name
      priceSpan.textContent = `Prix: ${action.currentPrice} €`;

      const sharesSpan = document.createElement("p");
      sharesSpan.id = `shares-${action.name}`; // Changed to action.name
      sharesSpan.textContent = `Vous possédez: 0 actions`;

      const controlsDiv = document.createElement("div");
      controlsDiv.style = "display: flex; gap: 10px; margin-top: 10px;";

      // Conteneur Achat
      const buyDiv = document.createElement("div");
      buyDiv.innerHTML = '<strong>Acheter:</strong><br>';
      [1, 5, 10, 100, 1000].forEach(qty => {
          const btn = document.createElement("button");
          btn.textContent = `+${qty}`;
          btn.style.margin = "2px";
          btn.onclick = () => socket.emit("player:buy", { actionName: action.name, quantity: qty }); // Changed to action.name
          buyDiv.appendChild(btn);
      });

      // Conteneur Vente
      const sellDiv = document.createElement("div");
      sellDiv.innerHTML = '<strong>Vendre:</strong><br>';
      [1, 5, 10, 100, 1000].forEach(qty => {
          const btn = document.createElement("button");
          btn.textContent = `-${qty}`;
          btn.style.margin = "2px";
          btn.onclick = () => socket.emit("player:sell", { actionName: action.name, quantity: qty }); // Changed to action.name
          sellDiv.appendChild(btn);
      });

      controlsDiv.appendChild(buyDiv);
      controlsDiv.appendChild(sellDiv);

      actionDiv.appendChild(title);
      actionDiv.appendChild(priceSpan);
      actionDiv.appendChild(sharesSpan);
      actionDiv.appendChild(controlsDiv);

      actionsContainer.appendChild(actionDiv);
    });
  } else {
    // Si l'interface existe, on met juste à jour le prix
    data.actions.forEach(action => {
      const priceSpan = document.getElementById(`price-${action.name}`); // Changed to action.name
      if (priceSpan) {
        priceSpan.textContent = `Prix: ${action.currentPrice} €`;
      }
    });
  }
});

// Écoute des mises à jour du joueur (cash, actions possédées)
socket.on("player:update", data => {
  if (playerNameEl) playerNameEl.textContent = data.name || "";
  if (cashEl) cashEl.textContent = data.cash;
  if (totalValueEl) totalValueEl.textContent = data.totalValue;

  if (!hasSubmittedName) {
    showJoinState();
    return;
  }

  if (data.isActive && data.isGameOpen) {
    showGameState();
  } else {
    showWaitingState();
  }

  // Met à jour l'affichage des actions possédées par le joueur
  if (data.portfolio) { // Changed from data.shares to data.portfolio
    for (const actionName in data.portfolio) { // Changed from data.shares to data.portfolio
      const sharesSpan = document.getElementById(`shares-${actionName}`);
      if (sharesSpan) {
        sharesSpan.textContent = `Vous possédez: ${data.portfolio[actionName]} actions`; // Changed from data.shares to data.portfolio
      }
    }
  }
});