const socket = io();

const playerUrl = "https://wallstreet.up.railway.app/player.html";

const qrCodeContainer = document.getElementById("qrcode");
const backgroundSlideshow = document.getElementById("background-slideshow");

const gameStatusEl = document.getElementById("game-status");
const waitingCountEl = document.getElementById("waiting-count");
const activeCountEl = document.getElementById("active-count");

const openGameButton = document.getElementById("open-game-button");
const closeGameButton = document.getElementById("close-game-button");

new QRCode(qrCodeContainer, {
    text: playerUrl,
    width: 300,
    height: 300,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
});

openGameButton.addEventListener("click", () => {
    socket.emit("admin:open-game");
    window.open("/screen.html", "_blank");
});

closeGameButton.addEventListener("click", () => {
    socket.emit("admin:close-game");
});

socket.on("lobby:update", data => {
    gameStatusEl.textContent = data.isGameOpen ? "Partie ouverte" : "Partie fermée";
    waitingCountEl.textContent = data.waitingCount;
    activeCountEl.textContent = data.activeCount;
});

async function loadLobbyBackgrounds() {
    try {
        const response = await fetch("/api/lobby-backgrounds");
        const images = await response.json();

        if (!Array.isArray(images) || images.length === 0) {
            backgroundSlideshow.classList.add("background-fallback");
            return;
        }

        images.forEach((imageUrl, index) => {
            const slide = document.createElement("div");
            slide.className = "bg-slide";
            slide.style.backgroundImage = `url("${imageUrl}")`;

            if (index === 0) {
                slide.classList.add("active");
            }

            backgroundSlideshow.appendChild(slide);
        });

        if (images.length > 1) {
            startSlideshow();
        }
    } catch (error) {
        console.error("Impossible de charger les images du lobby :", error);
        backgroundSlideshow.classList.add("background-fallback");
    }
}

function startSlideshow() {
    const slides = document.querySelectorAll(".bg-slide");
    let currentIndex = 0;

    setInterval(() => {
        slides[currentIndex].classList.remove("active");
        currentIndex = (currentIndex + 1) % slides.length;
        slides[currentIndex].classList.add("active");
    }, 7000);
}

loadLobbyBackgrounds();

