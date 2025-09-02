const heroesData = {
  Pepe: "images/pepe.png",
  Doge: "images/doge.png",
  Bonk: "images/bonk.png",
  Penguin: "images/penguin.png",
  Trump: "images/trump.png",
  Popcat: "images/popcat.png",
  Melania: "images/melania.png"
};

let playerStats = {}, enemyStats = {};
let battleActive = false, log = [];
let solBalance = 3.0;

const solBalanceEl = document.getElementById("solBalance");
const betSlider = document.getElementById("betSlider");
const betAmount = document.getElementById("betAmount");
const multiplierSelect = document.getElementById("multiplierSelect");
const startBtn = document.getElementById("startBtn");
const heroCards = document.getElementById("heroCards");

const playerImgEl = document.getElementById("playerImg");
const playerNameEl = document.getElementById("playerName");
const playerHpEl = document.getElementById("playerHp");
const playerStatsEl = document.getElementById("playerStats");

const enemyImgEl = document.getElementById("enemyImg");
const enemyNameEl = document.getElementById("enemyName");
const enemyHpEl = document.getElementById("enemyHp");
const enemyStatsEl = document.getElementById("enemyStats");

const battleField = document.getElementById("battleField");
const battleLogEl = document.getElementById("battleLog");
const battleLogContainer = document.getElementById("battleLogContainer");

const resultModal = document.getElementById("resultModal");
const resultText = document.getElementById("resultText");
const playAgainBtn = document.getElementById("playAgainBtn");
const confettiCanvas = document.getElementById("confettiCanvas");
const ctx = confettiCanvas.getContext("2d");

let selectedHero = null;

// Render hero cards
for (let hero in heroesData) {
  const card = document.createElement("div");
  card.className = "hero-card";
  card.innerHTML = `<img src="${heroesData[hero]}" alt="${hero}"><p>${hero}</p>`;
  card.addEventListener("click", () => {
    document.querySelectorAll(".hero-card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedHero = hero;
  });
  heroCards.appendChild(card);
}

// Bet slider update
betSlider.addEventListener("input", () => {
  betAmount.textContent = parseFloat(betSlider.value).toFixed(3);
});

// Generate stats
function generateStats(name) {
  return {
    name,
    img: heroesData[name],
    hp: 100,
    atk: Math.floor(Math.random() * 20) + 10,
    def: Math.floor(Math.random() * 10) + 5,
    skill: ["Poison", "Heal", "Block", "Fury"][Math.floor(Math.random() * 4)],
    poisonCounter: 0
  };
}

function updateUI() {
  if (playerStats.name) {
    playerImgEl.src = playerStats.img;
    playerNameEl.textContent = playerStats.name;
    playerHpEl.style.width = playerStats.hp + "%";
    playerStatsEl.textContent = `ATK:${playerStats.atk} DEF:${playerStats.def} SKILL:${playerStats.skill}`;
  }
  if (enemyStats.name) {
    enemyImgEl.src = enemyStats.img;
    enemyNameEl.textContent = enemyStats.name;
    enemyHpEl.style.width = enemyStats.hp + "%";
    enemyStatsEl.textContent = `ATK:${enemyStats.atk} DEF:${enemyStats.def} SKILL:${enemyStats.skill}`;
  }
}

function logMessage(msg) {
  log.push(msg);
  battleLogEl.innerHTML += `<div>${msg}</div>`;
  battleLogEl.scrollTop = battleLogEl.scrollHeight;
}

function attackTurn(attacker, defender) {
  let damage = Math.max(attacker.atk - Math.floor(defender.def / 2), 1);
  defender.hp = Math.max(defender.hp - damage, 0);
  logMessage(`${attacker.name} hits ${defender.name} for ${damage}`);
  if (attacker.skill === "Heal" && Math.random() > 0.7) {
    attacker.hp = Math.min(attacker.hp + 10, 100);
    logMessage(`${attacker.name} heals 10 HP!`);
  }
  if (attacker.skill === "Poison" && Math.random() > 0.6) {
    defender.poisonCounter = 3;
    logMessage(`${defender.name} is poisoned!`);
  }
  if (defender.poisonCounter > 0) {
    defender.hp = Math.max(defender.hp - 5, 0);
    defender.poisonCounter--;
    logMessage(`${defender.name} takes 5 poison damage!`);
  }
}

function battleLoop() {
  if (!battleActive) return;
  if (playerStats.hp <= 0 || enemyStats.hp <= 0) {
    battleActive = false;
    showResultModal();
    return;
  }
  if (Math.random() > 0.5) attackTurn(playerStats, enemyStats);
  else attackTurn(enemyStats, playerStats);
  updateUI();
  setTimeout(battleLoop, 1000);
}

function showResultModal() {
  let multiplier = parseInt(multiplierSelect.value);
  let bet = parseFloat(betSlider.value);
  let resultMsg = "";
  let solChange = 0;

  if (playerStats.hp <= 0 && enemyStats.hp <= 0) {
    resultMsg = "Draw!";
  } else if (playerStats.hp <= 0) {
    resultMsg = "You lost!";
    solChange = -bet * multiplier;
  } else {
    resultMsg = "You won!";
    solChange = bet * multiplier;
    launchConfetti();
  }

  solBalance = Math.max(solBalance + solChange, 0);
  solBalanceEl.textContent = solBalance.toFixed(3);
  resultText.textContent = `${resultMsg} ${solChange > 0 ? "+" : "-"}${Math.abs(solChange).toFixed(3)} SOL`;
  resultModal.classList.remove("hidden");
}

// Confetti animation
let confettiParticles = [];
function launchConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiParticles = [];
  for (let i = 0; i < 150; i++) {
    confettiParticles.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * 150 + 50,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
      tilt: Math.floor(Math.random() * 10) - 10
    });
  }
  requestAnimationFrame(updateConfetti);
}
function updateConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles.forEach(p => {
    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, true);
    ctx.fill();
    p.y += 2;
    if (p.y > confettiCanvas.height) p.y = -10;
  });
  requestAnimationFrame(updateConfetti);
}

startBtn.addEventListener("click", () => {
  if (!selectedHero) return alert("Select a hero!");
  playerStats = generateStats(selectedHero);

  const enemyOptions = Object.keys(heroesData).filter(h => h !== selectedHero);
  enemyStats = generateStats(enemyOptions[Math.floor(Math.random() * enemyOptions.length)]);

  log = [];
  battleLogEl.innerHTML = "";
  battleField.classList.remove("hidden");
  battleLogContainer.classList.remove("hidden");
  resultModal.classList.add("hidden");

  updateUI();
  battleActive = true;
  setTimeout(battleLoop, 1000);
  setTimeout(() => {
    if (battleActive) {
      battleActive = false;
      showResultModal();
    }
  }, 30000);
});

playAgainBtn.addEventListener("click", () => {
  playerStats = {};
  enemyStats = {};
  log = [];
  battleActive = false;
  battleField.classList.add("hidden");
  battleLogContainer.classList.add("hidden");
  resultModal.classList.add("hidden");
  document.querySelectorAll(".hero-card").forEach(c => c.classList.remove("selected"));
  selectedHero = null;
  multiplierSelect.value = "2";
  betSlider.value = 0.5;
  betAmount.textContent = "0.5";
});
