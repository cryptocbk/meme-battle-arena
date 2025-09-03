const heroesData = [
  { name: "Pepe", img: "images/pepe.png" },
  { name: "Doge", img: "images/doge.png" },
  { name: "Bonk", img: "images/bonk.png" },
  { name: "Penguin", img: "images/penguin.png" },
  { name: "Trump", img: "images/trump.png" },
  { name: "Popcat", img: "images/popcat.png" },
  { name: "Melania", img: "images/melania.png" },
];

let balance = parseFloat(localStorage.getItem("balance")) || 3.0;
document.getElementById("balance").innerText = balance.toFixed(3);

const heroesDiv = document.getElementById("heroes");
let playerHero = null;

// --- Web Audio ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let bgMusic = null, bgGain = null;

// --- Звуки событий ---
function playSound(type) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === "attack") {
    osc.type = "square"; osc.frequency.value = 300; gain.gain.value = 0.05;
  }
  if (type === "win") {
    osc.type = "triangle"; osc.frequency.value = 800; gain.gain.value = 0.2;
  }
  if (type === "lose") {
    osc.type = "sawtooth"; osc.frequency.value = 100; gain.gain.value = 0.25;
  }

  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

// --- Эпичная музыка с барабанами ---
function startEpicMusic() {
  stopEpicMusic();

  bgGain = audioCtx.createGain();
  bgGain.gain.value = 0.15;
  bgGain.connect(audioCtx.destination);

  bgMusic = [];

  // Барабаны
  const drum = audioCtx.createOscillator();
  const drumGain = audioCtx.createGain();
  drum.type = "sine";
  drum.frequency.value = 100;
  drumGain.gain.value = 0.15;

  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.value = 1.5;
  lfoGain.gain.value = 50;
  lfo.connect(lfoGain);
  lfoGain.connect(drum.frequency);

  drum.connect(drumGain).connect(bgGain);
  drum.start();
  lfo.start();
  bgMusic.push(drum, lfo);

  // Эпичная мелодия (полифония sawtooth)
  [440, 554, 659].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    g.gain.value = 0.05;
    osc.connect(g).connect(bgGain);
    osc.start(audioCtx.currentTime + i * 0.2);
    bgMusic.push(osc);
  });
}

function stopEpicMusic() {
  if (bgMusic) {
    bgMusic.forEach(o => { try { o.stop(); } catch {} });
    bgMusic = null;
  }
  if (bgGain) { bgGain.disconnect(); bgGain = null; }
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

  startEpicMusic();

  let playerHP = 100, enemyHP = 100;
  let battleOver = false;

  while (!battleOver) {
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

    if (enemyHP <= 0 || playerHP <= 0) {
      battleOver = true;
    }
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

  stopEpicMusic();

  document.getElementById("balance").innerText = balance.toFixed(3);
  localStorage.setItem("balance", balance.toFixed(3));
});

// --- Результаты ---
function showResult(text, amount, win) {
  const modal = document.getElementById("resultModal");
  const txt = document.getElementById("resultText");
  const amt = document.getElementById("resultAmount");

  txt.innerText = text;
  txt.style.color = win ? "lime" : "red";
  amt.innerText = amount;

  modal.style.display = "block";

  if (win) createConfetti();
  else createSkulls();
}

document.getElementById("tryAgain").addEventListener("click", () => {
  document.getElementById("resultModal").style.display = "none";
});

// --- Эффекты ---
function createConfetti() {
  for (let i = 0; i < 50; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left = Math.random() * window.innerWidth + "px";
    c.style.top = "-20px";
    c.style.backgroundColor = `hsl(${Math.random() * 360},100%,50%)`;
    document.body.appendChild(c);
    setTimeout(() => document.body.removeChild(c), 2500);
  }
}

function createSkulls() {
  for (let i = 0; i < 25; i++) {
    const s = document.createElement("div");
    s.className = "skull";
    s.innerText = "💀";
    s.style.position = "absolute";
    s.style.left = Math.random() * window.innerWidth + "px";
    s.style.top = "-20px";
    s.style.fontSize = "24px";
    s.style.animation = "fall 2.5s linear forwards";
    document.body.appendChild(s);
    setTimeout(() => document.body.removeChild(s), 2500);
  }
}
