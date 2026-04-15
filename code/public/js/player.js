const socket = io();

// --- DOM Elements ---
const joinSection = document.getElementById('join-section');
const waitingSection = document.getElementById('waiting-section');
const gameSection = document.getElementById('game-section');

const nameInput = document.getElementById('name-input');
const joinButton = document.getElementById('join-button');

const playerNameDisplay = document.getElementById('player-name-display');
const netWorthDisplay = document.getElementById('net-worth-display');
const walletDisplay = document.getElementById('wallet-display');
const actionsContainer = document.getElementById('actions-container');
const backgroundGraphCanvas = document.getElementById('background-graph');

// --- State ---
let netWorthHistory = [];
let netWorthChart;
let hasSubmittedName = false;
let currentPlayerCash = 0; // Global variable for player's cash

// --- State Management Functions ---
function showState(state) {
    joinSection.style.display = 'none';
    waitingSection.style.display = 'none';
    gameSection.style.display = 'none';

    if (state === 'join') joinSection.style.display = 'block';
    else if (state === 'waiting') waitingSection.style.display = 'block';
    else if (state === 'game') gameSection.style.display = 'block';
}

// --- Chart Functions ---
function initializeChart() {
    if (netWorthChart) netWorthChart.destroy();
    const ctx = backgroundGraphCanvas.getContext('2d');
    netWorthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Net Worth',
                data: [],
                borderColor: '#FFFFFF', // Solid white color
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                pointRadius: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } }
        }
    });
}

function updateChart(newNetWorth) {
    if (!netWorthChart) return;
    const now = new Date();
    netWorthHistory.push({ time: now, value: newNetWorth });
    const oneMinuteAgo = now.getTime() - 60000;
    netWorthHistory = netWorthHistory.filter(point => point.time.getTime() > oneMinuteAgo);
    netWorthChart.data.labels = netWorthHistory.map(p => p.time);
    netWorthChart.data.datasets[0].data = netWorthHistory.map(p => p.value);
    netWorthChart.update('none');
}

// --- Socket Event Handlers ---
socket.on('connect', () => {
    if (hasSubmittedName) {
        // Le serveur a redémarré : on le force à nous réinscrire automatiquement
        socket.emit('player:join', nameInput.value.trim() || "Joueur");
    } else {
        showState('join');
    }
});

socket.on('player:joined', (data) => {
    if (data.isGameOpen) {
        showState('game');
        initializeChart();
    } else {
        showState('waiting');
    }
});

socket.on('game:open', () => {
    if (hasSubmittedName) {
        showState('game');
        initializeChart();
    }
});

socket.on('player:update', data => {
    playerNameDisplay.textContent = data.name || "Player";
    netWorthDisplay.textContent = `${data.totalValue.toLocaleString()} €`;
    walletDisplay.textContent = `Wallet: ${data.cash.toLocaleString()} €`;
    currentPlayerCash = data.cash;
    updateChart(data.totalValue);

    document.querySelectorAll('.action-card').forEach(card => {
        // card.dataset.actionName contient déjà le nom complet (ex: "ManqueDo")
        const actionName = card.dataset.actionName;

        // On récupère directement l'objet du portfolio
        const portfolioEntry = data.portfolio[actionName];
        const quantityOwned = portfolioEntry?.quantity || 0;
        const invested = portfolioEntry?.invested || 0;

        const parsedPrice = parseFloat(card.dataset.currentPrice);
        const currentPrice = isNaN(parsedPrice) ? 0 : parsedPrice;

        const currentValue = currentPrice * quantityOwned;
        const gainLoss = quantityOwned > 0 ? currentValue - invested : 0;

        card.querySelector('.action-total-value').textContent = `${currentValue.toLocaleString()} €`;
        card.querySelector('.details-quantity').textContent = quantityOwned;
        card.querySelector('.details-invested').textContent = invested.toLocaleString() + '€';

        const gainLossEl = card.querySelector('.details-gain-loss');
        gainLossEl.textContent = gainLoss.toFixed(2) + '€';
        gainLossEl.style.color = gainLoss >= 0 ? '#6eff92' : '#ff5757';

        // --- GESTION DES BOUTONS SELL ---
        card.querySelectorAll('button[data-action="sell"]').forEach(button => {
            const quantityToSell = parseInt(button.dataset.quantity);
            // On peut vendre si on possède au moins la quantité demandée
            const canSell = quantityOwned >= quantityToSell;

            button.disabled = !canSell;
            button.classList.toggle('can-sell', canSell);
        });

        // --- GESTION DES BOUTONS BUY ---
        card.querySelectorAll('button[data-action="buy"]').forEach(button => {
            const quantityToBuy = parseInt(button.dataset.quantity);
            button.disabled = (currentPrice * quantityToBuy) > currentPlayerCash;
        });
    });
});

socket.on('game:update', data => {
    if (!Array.isArray(data.actions)) return;

    if (actionsContainer.children.length === 0 && data.actions.length > 0) {
        actionsContainer.innerHTML = '';
        data.actions.forEach(action => {
            const card = createActionCard(action);
            actionsContainer.appendChild(card);
        });
    } else {
        data.actions.forEach(action => {
            const card = document.querySelector(`.action-card[data-action-name="${action.name}"]`);
            if (card) {
                const newPrice = action.currentPrice;

                let priceHistory = card.dataset.priceHistory ? JSON.parse(card.dataset.priceHistory) : [];
                const now = Date.now();
                priceHistory.push({ time: now, price: newPrice });
                const tenSecondsAgo = now - 10000;
                priceHistory = priceHistory.filter(p => p.time >= tenSecondsAgo);
                card.dataset.priceHistory = JSON.stringify(priceHistory);
                
                const oldPriceDataPoint = priceHistory[0];
                const oldPrice = oldPriceDataPoint ? oldPriceDataPoint.price : newPrice;

                card.dataset.currentPrice = newPrice;

                card.querySelector('.action-value').textContent = `${newPrice.toLocaleString()} €`;
                card.querySelector('.action-price-reminder').textContent = `Current Price: ${newPrice.toLocaleString()} €`;

                const tendencyDiv = card.querySelector('.action-tendency');
                if (tendencyDiv) {
                    const tendency = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;
                    tendencyDiv.classList.remove('up', 'down');
                    let arrow = '';
                    if (tendency > 0.01) {
                        tendencyDiv.classList.add('up');
                        arrow = ' ▲';
                    } else if (tendency < -0.01) {
                        tendencyDiv.classList.add('down');
                        arrow = ' ▼';
                    }
                    tendencyDiv.textContent = `${tendency.toFixed(2)}%${arrow}`;
                }

                card.querySelectorAll('button[data-action="buy"]').forEach(button => {
                    const quantityToBuy = parseInt(button.dataset.quantity);
                    button.disabled = (newPrice * quantityToBuy) > currentPlayerCash;
                });
            }
        });
    }
});

// --- UI Creation and Interaction ---
function createActionCard(action) {
    const card = document.createElement('div');
    card.className = 'action-card';
    card.dataset.actionName = action.name;
    card.dataset.currentPrice = action.currentPrice;
    card.dataset.priceHistory = JSON.stringify([]);

    card.innerHTML = `
        <div class="action-header">
            <div>
                <div class="action-name">${action.shortName}</div>
                <div class="action-value">${action.currentPrice.toLocaleString()} €</div>
            </div>
            <div style="text-align: right;">
                <div class="action-total-value">0 €</div>
                <div class="action-tendency">0.00%</div>
            </div>
        </div>
        <div class="action-details">
            <div class="details-grid">
                <div class="details-item">
                    <div class="details-label">Owned</div>
                    <div class="details-value details-quantity">0</div>
                </div>
                <div class="details-item">
                    <div class="details-label">Invested</div>
                    <div class="details-value details-invested">0€</div>
                </div>
                <div class="details-item">
                    <div class="details-label">Gain/Loss</div>
                    <div class="details-value details-gain-loss">0.00€</div>
                </div>
            </div>
        </div>
        <div class="action-buttons">
            <div class="button-row">
                <button data-action="buy" data-quantity="1">Buy 1</button>
                <button data-action="buy" data-quantity="5">5</button>
                <button data-action="buy" data-quantity="25">25</button>
                <button data-action="buy" data-quantity="100">100</button>
                <button data-action="buy" data-quantity="1000">1000</button>
            </div>
            <div class="button-row">
                <button class="sell" data-action="sell" data-quantity="1">Sell 1</button>
                <button class="sell" data-action="sell" data-quantity="5">5</button>
                <button class="sell" data-action="sell" data-quantity="25">25</button>
                <button class="sell" data-action="sell" data-quantity="100">100</button>
                <button class="sell" data-action="sell" data-quantity="1000">1000</button>
            </div>
        </div>
        <div class="action-price-reminder">Current Price: ${action.currentPrice.toLocaleString()} €</div>
    `;

    card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
            const wasExpanded = card.classList.contains('is-expanded');
            document.querySelectorAll('.action-card.is-expanded').forEach(c => {
                c.classList.remove('is-expanded');
            });
            if (!wasExpanded) {
                card.classList.add('is-expanded');
            }
        }
    });

    card.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            if (button.disabled) return;
            const { action, quantity } = button.dataset;
            socket.emit(`player:${action}`, { actionName: card.dataset.actionName, quantity: parseInt(quantity) });
        });
    });

    return card;
}

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    showState('join');

    joinButton.addEventListener('click', () => {
        const name = nameInput.value.trim();
        if (!name) {
            alert('Entre un pseudo.');
            return;
        }
        hasSubmittedName = true;
        socket.emit('player:join', name);
    });
});
