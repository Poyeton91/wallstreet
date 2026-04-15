const socket = io();

// 1. Récupération des données depuis le sessionStorage
const statsString = sessionStorage.getItem("wallstreet_endStats");

// Si la page est ouverte sans stats (ex: actualisation forcée), on renvoie à l'écran de base
if (!statsString) {
    window.location.href = "/screen";
} else {
    const stats = JSON.parse(statsString);
    revealEndStats(stats);
}

// 2. Écoute pour le "Rejouer"
// Si l'admin clique sur "Ouvrir la partie" depuis le lobby, on retourne automatiquement sur l'écran des graphiques !
socket.on("game:update", data => {
    if (data.isGameOpen) {
        window.location.href = "/screen";
    }
});


// --- LOGIQUE DE RÉVÉLATION ---
function fillStat(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = text;
}

async function revealEndStats(stats) {
    // Remplissage des textes
    if (stats.frenetic) fillStat("frenetic-text", `${stats.frenetic.player.name} (${stats.frenetic.trades} actions)`);
    else fillStat("frenetic-text", "Tout le monde a dormi !");

    if (stats.squirrel) fillStat("squirrel-text", `${stats.squirrel.player.name} (${Math.round(stats.squirrel.cash).toLocaleString()}€ cash)`);

    if (stats.rat) {
        fillStat("rat-text", `${stats.rat.player.name} (Seulement ${stats.rat.amount}€ investis)`);
    } else {
        fillStat("rat-text", "Tout le monde est ruiné !");
    }

    if (stats.nemesis) fillStat("nemesis-text", `${stats.nemesis.p1.name} ⚔️ ${stats.nemesis.p2.name} (${stats.nemesis.swaps} croisements)`);
    else fillStat("nemesis-text", "Paix dans le monde");

    if (stats.remontada) fillStat("remontada-text", `${stats.remontada.player.name} (+${stats.remontada.places} places !)`);
    else fillStat("remontada-text", "Classement figé");

    if (stats.falloff) fillStat("falloff-text", `${stats.falloff.player.name} (Top 1 ➔ ${stats.falloff.finalRank}ème)`);
    else fillStat("falloff-text", "Les leaders ont tenu bon");

    if (stats.poorest) fillStat("poorest-text", `${stats.poorest.name} (${Math.round(stats.poorest.totalValue).toLocaleString()}€)`);

    // Remplissage Podium
    if (stats.podium[0]) { fillStat("p1-name", stats.podium[0].name); fillStat("p1-score", Math.round(stats.podium[0].totalValue).toLocaleString() + ' €'); }
    if (stats.podium[1]) { fillStat("p2-name", stats.podium[1].name); fillStat("p2-score", Math.round(stats.podium[1].totalValue).toLocaleString() + ' €'); }
    if (stats.podium[2]) { fillStat("p3-name", stats.podium[2].name); fillStat("p3-score", Math.round(stats.podium[2].totalValue).toLocaleString() + ' €'); }
    if (stats.podium[3]) fillStat("p4-text", `4ème : ${stats.podium[3].name}`);
    if (stats.podium[4]) fillStat("p5-text", `5ème : ${stats.podium[4].name}`);

    // Séquence de révélation
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    await sleep(1000);
    document.getElementById("stat-frenetic").classList.remove("hidden-step");
    await sleep(1000);
    document.getElementById("stat-squirrel").classList.remove("hidden-step");
    await sleep(1000);
    document.getElementById("stat-rat").classList.remove("hidden-step");
    await sleep(1000);
    document.getElementById("stat-nemesis").classList.remove("hidden-step");

    await sleep(2500);
    document.getElementById("stat-remontada").classList.remove("hidden-step");
    await sleep(1000);
    document.getElementById("stat-falloff").classList.remove("hidden-step");
    await sleep(1000);
    document.getElementById("stat-poorest").classList.remove("hidden-step");

    await sleep(3000);
    document.getElementById("podium-others").classList.remove("hidden-step");

    await sleep(2000);
    document.getElementById("podium-3").classList.remove("hidden-step");

    await sleep(2000);
    document.getElementById("podium-2").classList.remove("hidden-step");

    await sleep(3000);
    document.getElementById("podium-1").classList.remove("hidden-step");
}