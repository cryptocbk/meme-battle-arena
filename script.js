/* =================== Data =================== */
const heroesData = [
  { name: "Pepe",    img: "images/pepe.png" },
  { name: "Doge",    img: "images/doge.png" },
  { name: "Bonk",    img: "images/bonk.png" },
  { name: "Penguin", img: "images/penguin.png" },
  { name: "Trump",   img: "images/trump.png" },
  { name: "Popcat",  img: "images/popcat.png" },
  { name: "Melania", img: "images/melania.png" },
];

/* =================== Balance =================== */
// Первый запуск = 3.000 SOL
let balance = parseFloat(localStorage.getItem("balance"));
if (isNaN(balance)) {
  balance = 3.0;
  localStorage.setItem("balance", balance.toFixed(3));
}
document.getElementById("balance").innerText = balance.toFixed(3);

/* =================== Audio =================== */
const sounds = {
  attack: new Audio("sounds/attack.mp3"),
  crit:   new Audio("sounds/crit.mp3"),
  win:    new Audio("sounds/win.mp3"),
  lose:   new Audio("sounds/lose.mp3"),
  select: new Audio("sounds/select.mp3"),
  bg:     new Audio("sounds/bg.mp3"),
};
sounds.bg.loop = true;
sounds.bg.volume = 0.32;

// Разрешаем воспроизведение после первого взаимодействия
let audioUnlocked = false;
function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try { sounds.bg.play(); } catch (e) {}
  // легкий "разогрев" коротких звуков
  ["select","attack","crit","win","lose"].forEach(k => { try { sounds[k].play().then(()=>sounds[k].pause()); } catch(e){} });
  document.removeEventListener("click", unlockAudioOnce);
  document.removeEventListener("touchstart", unlockAudioOnce);
}
document.addEventListener("click", unlockAudioOnce, { once:false });
document.addEventListener("touchstart", unlockAudioOnce, { once:false });

/* =================== DOM =================== */
const heroesDiv = document.getElementById("heroes");
const betSlider = document.getElementById("bet");
const betValueSpan = document.getElementById("betValue");
const logDiv = document.getElementById("log");

const playerHeroBox = document.getElementById("playerHero");
const enemyHeroBox  = document.getElementById("enemyHero");
const playerStatsBox = document.getElementById("playerStats");
const enemyStatsBox  = document.getElementById("enemyStats");

let playerHero = null;
let enemyHero = null;
let playerStats = null;
let enemyStats  = null;
let battleInProgress = false;

/* =================== UI =================== */
betSlider.addEventListener("input", () => betValueSpan.innerText = parseFloat(betSlider.value).toFixed(3));

function renderHeroCard(hero) {
  const card = document.createElement("div");
  card.className = "hero-card";
  card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><div>${hero.name}</div>`;
  card.addEventListener("click", () => {
    if (battleInProgress) return;
    try { sounds.select.currentTime = 0; sounds.select.play(); } catch(e){}
    playerHero = { ...hero, hp: 100 };
    playerStats = rollStats();
    renderFighter("playerHero", playerHero);
    renderStats(playerStatsBox, playerStats);
  });
  return card;
}

function renderFighter(containerId, hero) {
  const el = document.getElementById(containerId);
  el.innerHTML = `
    <img src="${hero.img}" alt="${hero.name}">
    <div class="hp-bar"><div class="hp-fill" id="${containerId==='playerHero'?'playerHp':'enemyHp'}" style="width:100%"></div></div>
  `;
}

function renderStats(container, s) {
  container.innerHTML = `
    <div>🗡️ Атака: <b>${s.atk}</b></div>
    <div>🛡️ Защита: <b>${s.def}</b></div>
    <div>💥 Крит: <b>${(s.crit*100).toFixed(0)}%</b></div>
    <div>🦊 Ловкость: <b>${s.agi}</b></div>
    <div>✨ Скилл: <b>${s.skill}</b></div>
  `;
}

/* =================== Stats =================== */
function rollStats() {
  // Диапазоны можно менять под вкус
  return {
    atk:  Math.floor(15 + Math.random()*25),        // 15..40
    def:  Math.floor(5 + Math.random()*20),         // 5..25
    crit: 0.05 + Math.random()*0.25,                // 5%..30%
    agi:  Math.floor(5 + Math.random()*20),         // 5..25
    skill:Math.floor(1 + Math.random()*10)          // 1..10
  };
}

/* =================== Heroes list =================== */
heroesData.forEach(h => heroesDiv.appendChild(renderHeroCard(h)));

/* =================== Battle =================== */
document.getElementById("startBattle").addEventListener("click", async () => {
  if (!playerHero) { alert("Choose a hero!"); return; }
  if (battleInProgress) return;

  // Запрещаем менять героя на время боя
  battleInProgress = true;
  setCardsDisabled(true);

  // Противник
  enemyHero = { ...heroesData[Math.floor(Math.random()*heroesData.length)], hp: 100 };
  enemyStats = rollStats();
  renderFighter("enemyHero", enemyHero);
  renderStats(enemyStatsBox, enemyStats);

  const bet = parseFloat(betSlider.value);
  const multiplier = parseInt(document.getElementById("multiplier").value);
  if (balance < bet) { alert("Not enough balance!"); battleInProgress=false; setCardsDisabled(false); return; }

  logDiv.innerHTML = "";

  // Бой: попеременные удары, длится пока у кого-то HP > 0
  while (playerHero.hp > 0 && enemyHero.hp > 0) {
    await sleep(650);

    // Игрок атакует
    let pdmg = rollDamage(playerStats, enemyStats);
    if (Math.random() < playerStats.crit) { pdmg = Math.floor(pdmg * 1.8); safePlay(sounds.crit); }
    enemyHero.hp = Math.max(0, enemyHero.hp - pdmg);
    safePlay(sounds.attack);
    logLine(`You hit enemy for ${pdmg}`);
    updateHpBar("enemyHp", enemyHero.hp);

    if (enemyHero.hp <= 0) break;

    await sleep(500);

    // Враг атакует
    let edmg = rollDamage(enemyStats, playerStats);
    if (Math.random() < enemyStats.crit) { edmg = Math.floor(edmg * 1.8); safePlay(sounds.crit); }
    playerHero.hp = Math.max(0, playerHero.hp - edmg);
    safePlay(sounds.attack);
    logLine(`Enemy hits you for ${edmg}`);
    updateHpBar("playerHp", playerHero.hp);
  }

  // Результат
  const win = playerHero.hp > enemyHero.hp;
  if (win) {
    const gain = bet * multiplier;
    balance += gain;
    showResultModal({ type: "win", amount: gain });
    safePlay(sounds.win);
  } else {
    balance -= bet;
    showResultModal({ type: "lose", amount: bet });
    safePlay(sounds.lose);
  }
  localStorage.setItem("balance", balance.toFixed(3));
  document.getElementById("balance").innerText = balance.toFixed(3);

  // Разрешаем менять героя
  battleInProgress = false;
  setCardsDisabled(false);
});

/* =================== Combat helpers =================== */
function rollDamage(attacker, defender) {
  // Базовый разброс + влияние статов
  const base = 8 + Math.random()*12;                 // 8..20
  const atkBonus = attacker.atk * 0.6 + attacker.skill * 0.8;
  const defMit   = defender.def * 0.45 + defender.agi * 0.2;
  let dmg = Math.max(3, Math.round(base + atkBonus - defMit));
  return dmg;
}

function updateHpBar(id, hp) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.width = hp + "%";
  // Плавное покраснение после 50%
  const t = Math.max(0, (50 - Math.max(0, hp - 50)) / 50); // 0..1 начиная с 50%
  // Interpolate: green (0,200,0) -> red (220,0,0)
  const r = Math.round(0 + t * (220 - 0));
  const g = Math.round(200 - t * (200 - 0));
  el.style.backgroundColor = `rgb(${r},${g},0)`;
}

function logLine(text) {
  logDiv.innerHTML += `${text}<br>`;
  logDiv.scrollTop = logDiv.scrollHeight;
}

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
function safePlay(a){ try { a.currentTime = 0; a.play(); } catch(e){} }
function setCardsDisabled(disabled) {
  document.querySelectorAll(".hero-card").forEach(c=>{
    if (disabled) c.classList.add("disabled"); else c.classList.remove("disabled");
  });
}

/* =================== Modal & Effects =================== */
const modal = document.getElementById("resultModal");
const modalContent = document.getElementById("modalContent");
const titleEl = document.getElementById("resultTitle");
const amountEl = document.getElementById("resultAmount");
const effectContainer = document.getElementById("effectContainer");
document.getElementById("tryAgain").addEventListener("click", () => {
  modal.style.display = "none";
  effectContainer.innerHTML = "";
});

function showResultModal({ type, amount }) {
  effectContainer.innerHTML = "";
  modalContent.classList.remove("win","lose");
  modalContent.classList.add(type === "win" ? "win" : "lose");

  if (type === "win") {
    titleEl.style.color = "lime";
    titleEl.textContent = "VICTORY!";
    amountEl.textContent = `+${amount.toFixed(3)} ◎ SOL`;
    spawnRibbons(60); // ленточки-конфетти
  } else {
    titleEl.style.color = "red";
    titleEl.textContent = "DEFEAT!";
    amountEl.textContent = `-${amount.toFixed(3)} ◎ SOL`;
    spawnSkulls(50);   // черепа
  }

  modal.style.display = "flex";
}

function spawnRibbons(n=50) {
  for (let i=0; i<n; i++) {
    const rb = document.createElement("div");
    rb.className = "ribbon";
    rb.style.left = Math.random()*100 + "%";
    rb.style.setProperty("--dx", (Math.random()*300 - 150) + "px");   // дрейф влево/вправо
    rb.style.setProperty("--rot", (360 + Math.random()*1080) + "deg");// вращение
    rb.style.setProperty("--t",   (2.8 + Math.random()*2.2) + "s");   // длительность
    // красивый градиент ленточки
    const hue = Math.floor(Math.random()*360);
    rb.style.background = `linear-gradient(${Math.random()*360}deg, hsl(${hue} 90% 55%), hsl(${(hue+60)%360} 90% 50%))`;
    effectContainer.appendChild(rb);
    setTimeout(()=>rb.remove(), 5000);
  }
}

function spawnSkulls(n=40) {
  for (let i=0; i<n; i++) {
    const sk = document.createElement("div");
    sk.className = "skull";
    sk.style.left = Math.random()*100 + "%";
    sk.style.setProperty("--dx", (Math.random()*260 - 130) + "px");
    sk.style.setProperty("--rot", (360 + Math.random()*1080) + "deg");
    sk.style.setProperty("--t",   (2.8 + Math.random()*2.2) + "s");
    effectContainer.appendChild(sk);
    setTimeout(()=>sk.remove(), 5000);
  }
}
