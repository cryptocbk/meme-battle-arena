const heroesData = [
  { name: "Pepe", img: "images/pepe.png" },
  { name: "Doge", img: "images/doge.png" },
  { name: "Bonk", img: "images/bonk.png" },
  { name: "Penguin", img: "images/penguin.png" },
  { name: "Trump", img: "images/trump.png" },
  { name: "Popcat", img: "images/popcat.png" },
  { name: "Melania", img: "images/melania.png" },
];

// Стартовый баланс всегда 3.0 SOL
let balance = parseFloat(localStorage.getItem("balance")) || 3.0;
document.getElementById("balance").innerText = balance.toFixed(3);

const heroesDiv = document.getElementById("heroes");
let playerHero = null;
let battleActive = false; // флаг — идёт ли бой

// --- Web Audio ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- Звуки событий ---
function playSound(type) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === "attack") {
    osc.type = "square"; osc.frequency.value = 220; gain.gain.value = 0.05;
  }
  if (type === "win") {
    osc.type = "triangle"; osc.frequency.value = 600; gain.gain.value = 0.2;
  }
  if (type === "lose") {
    osc.type = "sawtooth"; osc.frequency.value = 120; gain.gain.value = 0.25;
  }

  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

// --- Ставка ---
const betSlider = document.getElementById("bet");
const betValueSpan = document.getElementById("betValue");
betSlider.addEventListener("input", () => betValueSpan.innerText = parseFloat(betSlider.value).toFixed(3));

// --- Герои ---
heroesData.forEach(hero => {
  const card = document.createElement("div");
  card.className = "hero-card";
  card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><div>${hero.name}</div>`;
  card.addEventListener("click", () => {
    if (battleActive) return; // нельзя менять героя во время боя
    playerHero = { ...hero, hp: 100 };
    document.getElementById("playerHero").innerHTML = `
      <img src="${hero.img}" alt="${hero.name}">
      <div class="hp-bar"><div class="hp-fill" id="playerHp"></div></div>`;
  });
  heroesDiv.appendChild(card);
});

function getRandomEnemy() {
  return { ...heroesData[Math.floor(Math.random() * heroesData.length)], hp: 100 };
}

// --- Бой ---
document.getElementById("startBattle").addEventListener("click", async () => {
  if (!playerHero) { alert("Choose a hero!"); return; }

  const multiplier = parseInt(document.getElementById("multiplier").value);
  let bet = parseFloat(betSlider.value);
  if (balance < bet) { alert("Not enough balance!"); return; }

  let enemyHero = getRandomEnemy();
  document.getElementById("enemyHero").innerHTML = `
    <img src="${enemyHero.img}" alt="${enemyHero.name}">
    <div class="hp-bar"><div class="hp-fill" id="enemyHp"></div></div>`;

  const logDiv = document.getElementById("log"); logDiv.innerHTML = "";

  let playerHP = 100, enemyHP = 100;
  battleActive = true;

  while (playerHP > 0 && enemyHP > 0) {
    await new Promise(r => setTimeout(r, 600));

    let dmgP = Math.floor(Math.random() * 15 + 5);
    let dmgE = Math.floor(Math.random() * 15 + 5);

    enemyHP -= dmgP;
    playerHP -= dmgE;
    if (enemyHP < 0) enemyHP = 0;
    if (playerHP < 0) playerHP = 0;

    document.getElementById("playerHp").style.width = playerHP + "%";
    document.getElementById("enemyHp").style.width = enemyHP + "%";

    logDiv.innerHTML += `Player hits ${dmgP}, Enemy hits ${dmgE}<br>`;
    logDiv.scrollTop = logDiv.scrollHeight;

    playSound("attack");
  }

  // Шансы
  let chance = 0.5;
  if (multiplier === 3) chance = 0.3;
  if (multiplier === 5) chance = 0.15;

  let result = Math.random() < chance ? "win" : "lose";

  if (result === "win") {
    balance += bet * multiplier;
    playSound("win");
    showResult("VICTORY!", `+${(bet * multiplier).toFixed(3)} ◎`, true);
  } else {
    balance -= bet;
    playSound("lose");
    showResult("DEFEAT!", `-${bet.toFixed(3)} ◎`, false);
  }

  document.getElementById("balance").innerText = balance.toFixed(3);
  localStorage.setItem("balance", balance.toFixed(3));

  battleActive = false;
});

// --- Результаты ---
function showResult(text, amount, win) {
  const modal = document.getElementById("resultModal");
  const txt = document.getElementById("resultText");
  const amt = document.getElementById("resultAmount");
  const effects = document.getElementById("resultEffects");

  txt.innerText = text;
  txt.style.color = win ? "lime" : "red";
  amt.innerText = amount;

  modal.style.display = "flex";
  effects.innerHTML = "";

  if (win) {
    for (let i = 0; i < 40; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "%";
      c.style.top = "-10px";
      c.style.backgroundColor = `hsl(${Math.random() * 360},100%,50%)`;
      effects.appendChild(c);
    }
  } else {
    for (let i = 0; i < 25; i++) {
      const s = document.createElement("div");
      s.className = "skull";
      s.innerText = "💀";
      s.style.left = Math.random() * 100 + "%";
      s.style.top = "-10px";
      effects.appendChild(s);
    }
  }
}

document.getElementById("tryAgain").addEventListener("click", () => {
  document.getElementById("resultModal").style.display = "none";
});
