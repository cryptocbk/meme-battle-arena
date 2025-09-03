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
  bg:     new Audio("sounds/bg.mp3")
};
sounds.bg.loop = true;
sounds.bg.volume = 0.35;

// unlock bg on first interaction (mobile autoplay policy)
let audioUnlocked = false;
function unlockAudioOnce() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try { sounds.bg.play().catch(()=>{}); } catch(e){}
  // prime short sounds
  ["select","attack","crit","win","lose"].forEach(k => {
    try { sounds[k].play().then(()=>sounds[k].pause()).catch(()=>{}); } catch(e){}
  });
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
function safePlay(a){ try { a.currentTime = 0; a.play().catch(()=>{}); } catch(e){} }
function logLine(txt){ logDiv.innerHTML += txt + "<br>"; logDiv.scrollTop = logDiv.scrollHeight; }

/* =================== Stats roll & render =================== */
function rollStats(){
  return {
    atk:  Math.floor(15 + Math.random()*25),        // 15..40
    def:  Math.floor(5 + Math.random()*20),         // 5..25
    crit: 0.05 + Math.random()*0.25,                // 5%..30%
    agi:  Math.floor(5 + Math.random()*20),         // 5..25
    skill:Math.floor(1 + Math.random()*10)          // 1..10
  };
}
function renderStats(container, s){
  container.innerHTML = `
    <div>🗡️ Attack: <b>${s.atk}</b></div>
    <div>🛡️ Defense: <b>${s.def}</b></div>
    <div>💥 Crit: <b>${(s.crit*100).toFixed(0)}%</b></div>
    <div>🦊 Agility: <b>${s.agi}</b></div>
    <div>✨ Skill: <b>${s.skill}</b></div>
  `;
}

/* =================== Render heroes =================== */
function createHeroCard(hero){
  const card = document.createElement("div");
  card.className = "hero-card";
  card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><div>${hero.name}</div>`;
  card.addEventListener("click", () => {
    if (battleInProgress) return;
    // click sound always
    safePlay(sounds.select);
    playerHero = { ...hero, hp: 100 };
    playerStats = rollStats();
    renderFighter("playerHero", playerHero);
    renderStats(playerStatsBox, playerStats);
  });
  return card;
}
heroesData.forEach(h => heroesDiv.appendChild(createHeroCard(h)));

/* render fighter avatar + hp bar */
function renderFighter(containerId, hero){
  const el = document.getElementById(containerId);
  el.innerHTML = `
    <img src="${hero.img}" alt="${hero.name}">
    <div class="hp-bar"><div class="hp-fill" id="${containerId==='playerHero'?'playerHp':'enemyHp'}" style="width:100%"></div></div>
  `;
}

/* =================== Bet UI =================== */
betSlider.addEventListener("input", () => betValueSpan.innerText = parseFloat(betSlider.value).toFixed(3));

/* =================== Battle logic =================== */
document.getElementById("startBattle").addEventListener("click", async () => {
  if (!playerHero) { alert("Choose a hero!"); return; }
  if (battleInProgress) return;

  const bet = parseFloat(betSlider.value);
  const multiplier = parseInt(document.getElementById("multiplier").value,10);
  if (balance < bet) { alert("Not enough balance!"); return; }

  // lock selection
  battleInProgress = true;
  setCardsDisabled(true);

  // spawn enemy and stats
  enemyHero = { ...heroesData[Math.floor(Math.random()*heroesData.length)], hp: 100 };
  enemyStats = rollStats();
  renderFighter("enemyHero", enemyHero);
  renderStats(enemyStatsBox, enemyStats);

  logDiv.innerHTML = "";

  // fight loop: player hits then enemy hits until someone <=0
  while (playerHero.hp > 0 && enemyHero.hp > 0) {
    await sleep(650);

    // player attack
    let pdmg = rollDamage(playerStats, enemyStats);
    if (Math.random() < playerStats.crit) { pdmg = Math.floor(pdmg * 1.8); safePlay(sounds.crit); }
    enemyHero.hp = Math.max(0, enemyHero.hp - pdmg);
    safePlay(sounds.attack);
    logLine(`You hit enemy for ${pdmg}`);
    updateHpBar("enemyHp", enemyHero.hp);

    if (enemyHero.hp <= 0) break;

    await sleep(500);

    // enemy attack
    let edmg = rollDamage(enemyStats, playerStats);
    if (Math.random() < enemyStats.crit) { edmg = Math.floor(edmg * 1.8); safePlay(sounds.crit); }
    playerHero.hp = Math.max(0, playerHero.hp - edmg);
    safePlay(sounds.attack);
    logLine(`Enemy hits you for ${edmg}`);
    updateHpBar("playerHp", playerHero.hp);
  }

  // calculate result
  const win = playerHero.hp > enemyHero.hp;
  if (win) {
    const gain = bet * multiplier;
    balance += gain;
    safePlay(sounds.win);
    showResultModal({ type: "win", amount: gain });
  } else {
    balance -= bet;
    safePlay(sounds.lose);
    showResultModal({ type: "lose", amount: bet });
  }

  localStorage.setItem("balance", balance.toFixed(3));
  document.getElementById("balance").innerText = balance.toFixed(3);

  // unlock selection
  battleInProgress = false;
  setCardsDisabled(false);
});

/* damage formula */
function rollDamage(attacker, defender){
  const base = 8 + Math.random()*12; // 8..20
  const atkBonus = attacker.atk * 0.6 + attacker.skill * 0.8;
  const defMit   = defender.def * 0.45 + defender.agi * 0.2;
  return Math.max(3, Math.round(base + atkBonus - defMit));
}

/* smooth HP color interpolation:
   >50% : interpolate from yellow(255,200,0) at 50 -> green(0,200,0) at 100
   <=50%: interpolate from red(220,0,0) at 0 -> yellow(255,200,0) at 50
*/
function updateHpBar(id, hp){
  const el = document.getElementById(id);
  if (!el) return;
  el.style.width = hp + "%";

  let r,g;
  if (hp > 50) {
    const frac = (hp - 50) / 50; // 0..1
    r = Math.round(255 * (1 - frac));
    g = 200;
  } else {
    const frac = hp / 50; // 0..1
    r = 255;
    g = Math.round(200 * frac);
  }
  el.style.backgroundColor = `rgb(${r},${g},0)`;
}

/* disable / enable hero cards while fighting */
function setCardsDisabled(disabled){
  document.querySelectorAll(".hero-card").forEach(c => {
    if (disabled) c.classList.add("disabled"); else c.classList.remove("disabled");
  });
}

/* =================== Modal / effects =================== */
tryAgainBtn.addEventListener("click", () => {
  modal.style.display = "none";
  effectContainer.innerHTML = "";
});

/* spawn ribbons (ribbons) inside modal */
function spawnRibbons(n=60){
  for (let i=0;i<n;i++){
    const el = document.createElement("div");
    el.className = "ribbon";
    el.style.left = Math.random()*100 + "%";
    el.style.setProperty("--dx", (Math.random()*380 - 190) + "px");
    el.style.setProperty("--rot", (360 + Math.random()*1080) + "deg");
    el.style.setProperty("--t", (2.6 + Math.random()*2.4) + "s");
    const hue = Math.floor(Math.random()*360);
    el.style.background = `linear-gradient(${Math.random()*360}deg, hsl(${hue} 80% 55%), hsl(${(hue+40)%360} 80% 45%))`;
    effectContainer.appendChild(el);
    setTimeout(()=>el.remove(), 5200);
  }
}

/* spawn skull emojis inside modal */
function spawnSkulls(n=50){
  for (let i=0;i<n;i++){
    const el = document.createElement("div");
    el.className = "skull";
    el.textContent = "💀"; // fallback visible emoji
    el.style.left = Math.random()*100 + "%";
    el.style.fontSize = (12 + Math.random()*18) + "px";
    el.style.setProperty("--dx", (Math.random()*360 - 180) + "px");
    el.style.setProperty("--rot", (180 + Math.random()*900) + "deg");
    el.style.setProperty("--t", (2.6 + Math.random()*2.6) + "s");
    effectContainer.appendChild(el);
    setTimeout(()=>el.remove(), 5200);
  }
}

function showResultModal({type, amount}){
  effectContainer.innerHTML = "";
  modalContent.classList.remove("win","lose");
  modalContent.classList.add(type==="win"?"win":"lose");

  if (type === "win"){
    titleEl.style.color = "lime";
    titleEl.textContent = "VICTORY!";
    amountEl.textContent = `+${amount.toFixed(3)} ◎ SOL`;
    spawnRibbons(70);
  } else {
    titleEl.style.color = "red";
    titleEl.textContent = "DEFEAT!";
    amountEl.textContent = `-${amount.toFixed(3)} ◎ SOL`;
    spawnSkulls(60);
  }
  modal.style.display = "flex";
}
