/* =================== Data & Balance =================== */
const heroesData = [
  { name: "Pepe",    img: "images/pepe.png" },
  { name: "Doge",    img: "images/doge.png" },
  { name: "Bonk",    img: "images/bonk.png" },
  { name: "Penguin", img: "images/penguin.png" },
  { name: "Trump",   img: "images/trump.png" },
  { name: "Popcat",  img: "images/popcat.png" },
  { name: "Melania", img: "images/melania.png" },
];

let balance = parseFloat(localStorage.getItem("balance"));
if (isNaN(balance)) { balance = 3.0; localStorage.setItem("balance", balance.toFixed(3)); }
document.getElementById("balance").innerText = balance.toFixed(3);

/* =================== Audio =================== */
const sounds = {
  attack: "sounds/attack.mp3",
  crit:   "sounds/crit.mp3",
  win:    "sounds/win.mp3",
  lose:   "sounds/lose.mp3",
  select: "sounds/select.mp3",
  bg:     "sounds/bg.mp3"
};
let bgAudio = null;
let audioUnlocked = false;
function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    bgAudio = new Audio(sounds.bg);
    bgAudio.loop = true;
    bgAudio.volume = 0.32;
    bgAudio.play().catch(()=>{});
  } catch(e){}
  document.removeEventListener("click", unlockAudioOnce);
  document.removeEventListener("touchstart", unlockAudioOnce);
}
document.addEventListener("click", unlockAudioOnce);
document.addEventListener("touchstart", unlockAudioOnce);

/* =================== DOM refs =================== */
const heroesDiv = document.getElementById("heroes");
const betSlider = document.getElementById("bet");
const betValueSpan = document.getElementById("betValue");
const logDiv = document.getElementById("log");
const playerStatsBox = document.getElementById("playerStats");
const enemyStatsBox  = document.getElementById("enemyStats");

const modal = document.getElementById("resultModal");
const modalContent = document.getElementById("modalContent");
const titleEl = document.getElementById("resultTitle");
const amountEl = document.getElementById("resultAmount");
const effectContainer = document.getElementById("effectContainer");
const tryAgainBtn = document.getElementById("tryAgain");

let playerHero = null, enemyHero = null;
let playerStats = null, enemyStats = null;
let battleInProgress = false;

/* =================== Utils =================== */
function sleep(ms){ return new Promise(res => setTimeout(res, ms)); }
function playSoundOnce(name, vol=1.0){ try { const a = new Audio(sounds[name]); a.volume = vol; a.play().catch(()=>{}); } catch(e){} }
function logLine(txt){ logDiv.innerHTML += txt + "<br>"; logDiv.scrollTop = logDiv.scrollHeight; }
function setCardsDisabled(disabled){ document.querySelectorAll(".hero-card").forEach(c => {
  if (disabled) c.classList.add("disabled"); else c.classList.remove("disabled");
}); }

/* =================== Stats roll & render =================== */
function rollStats(){
  return {
    atk:  Math.floor(15 + Math.random()*25),
    def:  Math.floor(5 + Math.random()*20),
    crit: 0.05 + Math.random()*0.25,
    agi:  Math.floor(5 + Math.random()*20),
    skill:Math.floor(1 + Math.random()*10)
  };
}
function renderStats(container, s){
  const atk   = String(s.atk);
  const def   = String(s.def);
  const crit  = (s.crit*100).toFixed(0) + "%";
  const agi   = String(s.agi);
  const skill = String(s.skill);

  container.innerHTML = `
    <div class="stat-row"><div class="stat-left">🗡️ <span>Attack:</span></div><div class="stat-value">${atk}</div></div>
    <div class="stat-row"><div class="stat-left">🛡️ <span>Defense:</span></div><div class="stat-value">${def}</div></div>
    <div class="stat-row"><div class="stat-left">💥 <span>Crit:</span></div><div class="stat-value">${crit}</div></div>
    <div class="stat-row"><div class="stat-left">🦊 <span>Agility:</span></div><div class="stat-value">${agi}</div></div>
    <div class="stat-row"><div class="stat-left">✨ <span>Skill:</span></div><div class="stat-value">${skill}</div></div>
  `;
}

/* =================== Render heroes =================== */
function createHeroCard(hero){
  const card = document.createElement("div");
  card.className = "hero-card";
  card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><div>${hero.name}</div>`;
  card.addEventListener("click", () => {
    if (battleInProgress) return;
    playSoundOnce('select', 0.8);
    playerHero = { ...hero, hp: 100 };
    playerStats = rollStats();
    renderFighter("playerHero", playerHero);
    renderStats(playerStatsBox, playerStats);
    logLine(`Selected ${hero.name}`);
  });
  return card;
}
heroesData.forEach(h => heroesDiv.appendChild(createHeroCard(h)));

function renderFighter(containerId, hero){
  const el = document.getElementById(containerId);
  el.innerHTML = `
    <img src="${hero.img}" alt="${hero.name}">
    <div class="hp-bar"><div class="hp-fill" id="${containerId==='playerHero'?'playerHp':'enemyHp'}" style="width:100%"></div></div>
  `;
}

/* =================== Bet UI =================== */
betSlider.addEventListener("input", () => betValueSpan.innerText = parseFloat(betSlider.value).toFixed(3));

/* =================== Win chance mapping (user requested) =================== */
function getWinChanceForMultiplier(mult) {
  if (mult === 2) return 0.40;   // 40%
  if (mult === 3) return 0.15;   // 15%
  if (mult === 5) return 0.05;   // 5%
  return 0.40;
}

/* =================== Battle logic =================== */
document.getElementById("startBattle").addEventListener("click", async () => {
  if (!playerHero) { alert("Choose a hero!"); return; }
  if (battleInProgress) return;

  const multiplier = parseInt(document.getElementById("multiplier").value,10);
  const bet = parseFloat(betSlider.value);
  if (balance < bet) { alert("Not enough balance!"); return; }

  // START BATTLE (local balance)
  battleInProgress = true;
  setCardsDisabled(true);

  // spawn enemy and stats fresh
  enemyHero = { ...heroesData[Math.floor(Math.random()*heroesData.length)], hp: 100 };
  enemyStats = rollStats();
  renderFighter("enemyHero", enemyHero);
  renderStats(enemyStatsBox, enemyStats);

  logDiv.innerHTML = "";

  // decide biased outcome based on multiplier
  const winChance = getWinChanceForMultiplier(multiplier);
  const playerShouldWin = Math.random() < winChance;
  console.log('winChance', winChance, 'playerShouldWin', playerShouldWin);

  // fight loop
  while (playerHero.hp > 0 && enemyHero.hp > 0) {
    await sleep(650);

    // player attack
    let pdmg = rollDamage(playerStats, enemyStats);
    if (playerShouldWin) {
      pdmg = Math.round(pdmg * (1.4 + Math.random()*0.25));
    } else {
      pdmg = Math.round(pdmg * (0.65 + Math.random()*0.15));
    }
    if (Math.random() < playerStats.crit) { pdmg = Math.floor(pdmg * 1.8); playSoundOnce('crit',0.8); }
    enemyHero.hp = Math.max(0, enemyHero.hp - pdmg);
    playSoundOnce('attack',0.5);
    logLine(`You hit enemy for ${pdmg}`);
    updateHpBar("enemyHp", enemyHero.hp);

    if (enemyHero.hp <= 0) break;

    await sleep(450);

    // enemy attack
    let edmg = rollDamage(enemyStats, playerStats);
    if (playerShouldWin) {
      edmg = Math.round(edmg * (0.6 + Math.random()*0.2));
    } else {
      edmg = Math.round(edmg * (1.3 + Math.random()*0.3));
    }
    if (Math.random() < enemyStats.crit) { edmg = Math.floor(edmg * 1.8); playSoundOnce('crit',0.8); }
    playerHero.hp = Math.max(0, playerHero.hp - edmg);
    playSoundOnce('attack',0.5);
    logLine(`Enemy hits you for ${edmg}`);
    updateHpBar("playerHp", playerHero.hp);
  }

  // result & balance update
  const win = playerHero.hp > enemyHero.hp;
  if (win) {
    const gain = bet * multiplier;
    balance += gain;
    playSoundOnce('win', 1.0);
    showResultModal({ type: "win", amount: gain });
  } else {
    balance -= bet;
    playSoundOnce('lose', 0.9);
    showResultModal({ type: "lose", amount: bet });
  }
  localStorage.setItem("balance", balance.toFixed(3));
  document.getElementById("balance").innerText = balance.toFixed(3);

  // keep cards disabled until user presses Try Again (forces reselect)
  battleInProgress = false;
});

/* damage formula */
function rollDamage(attacker, defender){
  const base = 8 + Math.random()*12;
  const atkBonus = attacker.atk * 0.6 + attacker.skill * 0.8;
  const defMit   = defender.def * 0.45 + defender.agi * 0.2;
  return Math.max(3, Math.round(base + atkBonus - defMit));
}

/* smooth HP color interpolation */
function updateHpBar(id, hp){
  const el = document.getElementById(id);
  if (!el) return;
  el.style.width = hp + "%";
  let r,g;
  if (hp > 50) {
    const frac = (hp - 50) / 50;
    r = Math.round(255 * (1 - frac));
    g = 200;
  } else {
    const frac = hp / 50;
    r = Math.round(220 + (35 * frac));
    g = Math.round(0 + (200 * frac));
  }
  el.style.backgroundColor = `rgb(${r},${g},0)`;
}

/* =================== Modal / effects =================== */
tryAgainBtn.addEventListener("click", () => {
  modal.style.display = "none";
  effectContainer.innerHTML = "";
  // reset fighters so next battle requires selection
  playerHero = null; enemyHero = null; playerStats = null; enemyStats = null;
  document.getElementById("playerHero").innerHTML = "";
  document.getElementById("enemyHero").innerHTML = "";
  playerStatsBox.innerHTML = ""; enemyStatsBox.innerHTML = "";
  setCardsDisabled(false);
});

function spawnRibbons(n=60){
  for (let i=0;i<n;i++){
    const el = document.createElement("div");
    el.className = "ribbon";
    el.style.left = Math.random()*100 + "%";
    el.style.setProperty("--dx", (Math.random()*380 - 190) + "px");
    el.style.setProperty("--rot", (360 + Math.random()*1080) + "deg");
    el.style.setProperty("--t", (3.6 + Math.random()*2.4) + "s");
    const hue = Math.floor(Math.random()*360);
    el.style.background = `linear-gradient(${Math.random()*360}deg, hsl(${hue} 80% 55%), hsl(${(hue+40)%360} 80% 45%))`;
    effectContainer.appendChild(el);
    setTimeout(()=>el.remove(), 7000);
  }
}
function spawnSkulls(n=50){
  for (let i=0;i<n;i++){
    const el = document.createElement("div");
    el.className = "skull";
    el.textContent = "💀";
    el.style.left = Math.random()*100 + "%";
    el.style.fontSize = (12 + Math.random()*18) + "px";
    el.style.setProperty("--dx", (Math.random()*360 - 180) + "px");
    el.style.setProperty("--rot", (180 + Math.random()*900) + "deg");
    el.style.setProperty("--t", (3.6 + Math.random()*2.6) + "s");
    effectContainer.appendChild(el);
    setTimeout(()=>el.remove(), 7000);
  }
}
function showResultModal({type, amount}){
  effectContainer.innerHTML = "";
  modalContent.classList.remove("win","lose");
  modalContent.classList.add(type==="win"?"win":"lose");
  if (type === "win"){
    titleEl.style.color = "lime"; titleEl.textContent = "VICTORY!";
    amountEl.textContent = `+${amount.toFixed(3)} ◎ SOL`;
    spawnRibbons(60);
  } else {
    titleEl.style.color = "red"; titleEl.textContent = "DEFEAT!";
    amountEl.textContent = `-${amount.toFixed(3)} ◎ SOL`;
    spawnSkulls(45);
  }
  modal.style.display = "flex";
  setCardsDisabled(true);
}
