const heroesData = [
  { name: "Pepe", img: "images/pepe.png" },
  { name: "Doge", img: "images/doge.png" },
  { name: "Bonk", img: "images/bonk.png" },
  { name: "Penguin", img: "images/penguin.png" },
  { name: "Trump", img: "images/trump.png" },
  { name: "Popcat", img: "images/popcat.png" },
  { name: "Melania", img: "images/melania.png" },
];

let balance = 3.0;
document.getElementById("balance").innerText = balance.toFixed(3);

const heroesDiv = document.getElementById("heroes");
let playerHero = null;
let enemyHero = null;
let battleInProgress = false;

// Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  switch (type) {
    case "attack": osc.frequency.value = 200; break;
    case "crit": osc.frequency.value = 400; break;
    case "win": osc.frequency.value = 600; break;
    case "lose": osc.frequency.value = 100; break;
    default: osc.frequency.value = 300;
  }

  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
}

// Фоновая музыка (эпичные барабаны)
function playBackgroundMusic() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.value = 60;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  osc.start();
  osc.stop(audioCtx.currentTime + 999);
}
document.body.addEventListener("click", () => {
  if (audioCtx.state === "suspended") audioCtx.resume();
  playBackgroundMusic();
}, { once: true });

// Отрисовка героев
heroesData.forEach(hero => {
  const card = document.createElement("div");
  card.className = "hero-card";
  card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><div>${hero.name}</div>`;
  card.addEventListener("click", () => {
    if (battleInProgress) return;
    playerHero = { ...hero, hp: 100 };
    document.getElementById("playerHero").innerHTML =
      `<img src="${hero.img}" alt="${hero.name}">
       <div class="hp-bar"><div class="hp-fill" id="playerHp"></div></div>`;
  });
  heroesDiv.appendChild(card);
});

function getRandomEnemy() {
  return { ...heroesData[Math.floor(Math.random() * heroesData.length)], hp: 100 };
}

// Лог боя
function logMessage(msg) {
  const logDiv = document.getElementById("log");
  logDiv.innerHTML += msg + "<br>";
  logDiv.scrollTop = logDiv.scrollHeight;
}

// Бой
document.getElementById("startBattle").addEventListener("click", async () => {
  if (!playerHero) { alert("Choose a hero!"); return; }
  if (battleInProgress) return;

  const multiplier = parseInt(document.getElementById("multiplier").value);
  let bet = parseFloat(document.getElementById("bet").value);
  if (balance < bet) { alert("Not enough balance!"); return; }

  battleInProgress = true;
  enemyHero = getRandomEnemy();
  document.getElementById("enemyHero").innerHTML =
    `<img src="${enemyHero.img}" alt="${enemyHero.name}">
     <div class="hp-bar"><div class="hp-fill" id="enemyHp"></div></div>`;

  const logDiv = document.getElementById("log"); logDiv.innerHTML = "";
  let playerHP = playerHero.hp, enemyHP = enemyHero.hp;

  while (playerHP > 0 && enemyHP > 0) {
    await new Promise(r => setTimeout(r, 500));

    let playerDamage = Math.floor(Math.random() * 10 + 5);
    let enemyDamage = Math.floor(Math.random() * 10 + 5);

    if (Math.random() < 0.15) { playerDamage *= 2; playSound("crit"); }
    if (Math.random() < 0.15) { enemyDamage *= 2; playSound("crit"); }

    playSound("attack");

    playerHP -= enemyDamage;
    enemyHP -= playerDamage;
    if (playerHP < 0) playerHP = 0;
    if (enemyHP < 0) enemyHP = 0;

    updateHpBar("playerHp", playerHP);
    updateHpBar("enemyHp", enemyHP);

    logMessage(`Player hits ${playerDamage}, Enemy hits ${enemyDamage}`);
  }

  let winChance = multiplier === 2 ? 0.5 : multiplier === 3 ? 0.3 : 0.15;
  let result = (Math.random() < winChance) ? "win" : "lose";

  if (result === "win") {
    balance += bet * multiplier;
    playSound("win");
    showResult("VICTORY!", `+${(bet * multiplier).toFixed(3)} ◎ SOL`, "confetti");
  } else {
    balance -= bet;
    playSound("lose");
    showResult("DEFEAT!", `-${bet.toFixed(3)} ◎ SOL`, "skull");
  }

  document.getElementById("balance").innerText = balance.toFixed(3);
  battleInProgress = false;
});

function updateHpBar(id, hp) {
  const bar = document.getElementById(id);
  if (!bar) return;
  bar.style.width = hp + "%";
  if (hp > 50) bar.style.backgroundColor = "green";
  else if (hp > 20) bar.style.backgroundColor = "orange";
  else bar.style.backgroundColor = "red";
}

// Модальное окно
function showResult(text, amount, effect) {
  const modal = document.getElementById("resultModal");
  document.getElementById("resultText").innerText = text;
  document.getElementById("resultAmount").innerText = amount;

  const effects = document.getElementById("resultEffects");
  effects.innerHTML = "";
  for (let i = 0; i < 50; i++) {
    const el = document.createElement("div");
    el.className = effect;
    el.innerText = effect === "confetti" ? "🎉" : "💀";
    el.style.left = Math.random() * window.innerWidth + "px";
    el.style.top = "-20px";
    effects.appendChild(el);
  }

  modal.style.display = "flex";
}

document.getElementById("tryAgain").addEventListener("click", () => {
  document.getElementById("resultModal").style.display = "none";
});
