/* Meme Coin Battle Arena — enhanced:
   - win chance bias by multiplier: x2=50%, x3=30%, x5=15%
   - deduct bet at start, payout on win = bet * multiplier
   - confetti on win, red flash on loss
   - blood splatter on hit, neon background, WebAudio effects
*/

/* -------------------------
   CONFIG & DATA
   ------------------------- */
const heroesData = {
  Pepe: "images/pepe.png",
  Doge: "images/doge.png",
  Bonk: "images/bonk.png",
  Penguin: "images/penguin.png",
  Trump: "images/trump.png",
  Popcat: "images/popcat.png",
  Melania: "images/melania.png"
};
const winProb = { 2: 0.5, 3: 0.3, 5: 0.15 }; // player's chance to win at chosen multiplier

/* -------------------------
   DOM
   ------------------------- */
const heroCardsNode = document.getElementById("heroCards");
const solBalanceEl = document.getElementById("solBalance");
const betSlider = document.getElementById("betSlider");
const betAmountEl = document.getElementById("betAmount");
const multiplierSelect = document.getElementById("multiplierSelect");
const startBtn = document.getElementById("startBtn");

const playerImg = document.getElementById("playerImg");
const playerName = document.getElementById("playerName");
const playerHpBar = document.getElementById("playerHp");
const playerHpValue = document.getElementById("playerHpValue");
const playerStatsText = document.getElementById("playerStats");

const enemyImg = document.getElementById("enemyImg");
const enemyName = document.getElementById("enemyName");
const enemyHpBar = document.getElementById("enemyHp");
const enemyHpValue = document.getElementById("enemyHpValue");
const enemyStatsText = document.getElementById("enemyStats");

const arenaWrapper = document.getElementById("arenaWrapper");
const battleLogContainer = document.getElementById("battleLogContainer");
const battleLog = document.getElementById("battleLog");

const resultModal = document.getElementById("resultModal");
const resultText = document.getElementById("resultText");
const resultDetail = document.getElementById("resultDetail");
const playAgainBtn = document.getElementById("playAgainBtn");
const confettiCanvas = document.getElementById("confettiCanvas");
const lossFlash = document.getElementById("lossFlash");

let selectedHero = null;
let playerStats = {}, enemyStats = {};
let battleActive = false;
let solBalance = 3.0;

/* -------------------------
   Utilities
   ------------------------- */
function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }
function logMessage(msg){ battleLog.innerHTML += `<div>${msg}</div>`; battleLog.scrollTop = battleLog.scrollHeight; }

/* -------------------------
   Render hero cards
   ------------------------- */
for (const name in heroesData){
  const card = document.createElement("div");
  card.className = "hero-card";
  card.innerHTML = `<img src="${heroesData[name]}" alt="${name}"><p>${name}</p>`;
  card.onclick = () => {
    document.querySelectorAll(".hero-card").forEach(c=>c.classList.remove("selected"));
    card.classList.add("selected");
    selectedHero = name;
  };
  heroCardsNode.appendChild(card);
}

/* -------------------------
   Bet slider
   ------------------------- */
betSlider.addEventListener("input",()=>{
  betAmountEl.textContent = parseFloat(betSlider.value).toFixed(3);
});

/* -------------------------
   Audio (WebAudio simple synth)
   ------------------------- */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function ensureAudio() { if(!audioCtx) audioCtx = new AudioCtx(); }

function playTone(frequency, type='sine', duration=0.12, gain=0.08){
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.value = frequency;
  g.gain.value = gain;
  o.connect(g); g.connect(audioCtx.destination);
  o.start();
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  setTimeout(()=>{ o.stop(); }, duration*1000 + 20);
}

function playHitSound(isCrit=false){
  if(!audioCtx) ensureAudio();
  if(isCrit){
    playTone(880,'square',0.14,0.14);
    setTimeout(()=>playTone(1320,'sine',0.08,0.09),80);
  } else {
    playTone(400,'sawtooth',0.08,0.07);
  }
}
function playVictorySound(){
  if(!audioCtx) ensureAudio();
  playTone(660,'sine',0.18,0.12);
  setTimeout(()=>playTone(880,'sine',0.12,0.12),160);
  setTimeout(()=>playTone(1040,'sine',0.09,0.10),320);
}
function playLossSound(){
  if(!audioCtx) ensureAudio();
  playTone(150,'sine',0.5,0.16);
}

/* -------------------------
   Blood splatter
   ------------------------- */
function spawnBlood(x,y,parentEl){
  const count = randInt(6,12);
  for(let i=0;i<count;i++){
    const p = document.createElement('div');
    p.className='blood-particle';
    parentEl.appendChild(p);
    // random start near x,y
    const angle = Math.random()*Math.PI*2;
    const speed = 20 + Math.random()*80;
    p.style.left = (x - 5) + 'px'; p.style.top = (y - 5) + 'px';
    const dx = Math.cos(angle)*speed; const dy = Math.sin(angle)*speed;
    // animate
    p.style.transform = `translate(${dx}px, ${dy}px) scale(${0.6+Math.random()})`;
    p.style.opacity = '0';
    setTimeout(()=> p.remove(), 900 + Math.random()*400);
  }
}

/* -------------------------
   Confetti (canvas)
   ------------------------- */
let confettiParticles = [], confettiRAF = null;
function startConfetti(){
  const canvas = confettiCanvas;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  confettiParticles = [];
  for(let i=0;i<180;i++){
    confettiParticles.push({
      x: Math.random()*canvas.width,
      y: Math.random()*-canvas.height,
      r: 5 + Math.random()*8,
      color: `hsl(${Math.random()*360},90%,60%)`,
      vx: (Math.random()-0.5)*2,
      vy: 2 + Math.random()*4,
      angle: Math.random()*360,
      va: (Math.random()-0.5)*0.2
    });
  }
  let startTime = Date.now();
  function step(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    confettiParticles.forEach(p=>{
      p.x += p.vx; p.y += p.vy; p.angle += p.va;
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r*1.6);
      ctx.restore();
      if(p.y > canvas.height + 20){ p.y = -10; p.x = Math.random()*canvas.width; }
    });
    confettiRAF = requestAnimationFrame(step);
    // stop after ~5s
    if(Date.now() - startTime > 4800){ cancelAnimationFrame(confettiRAF); ctx.clearRect(0,0,canvas.width,canvas.height); }
  }
  step();
}

/* -------------------------
   Screen shake
   ------------------------- */
function screenShake(intensity=6,duration=350){
  const el = document.body;
  el.style.transition = `transform ${duration}ms`;
  el.style.transform = `translate(${randInt(-intensity,intensity)}px, ${randInt(-intensity,intensity)}px)`;
  setTimeout(()=>{ el.style.transform=''; }, duration);
}

/* -------------------------
   Stats generation and UI updates
   ------------------------- */
function generateStats(name){
  return {
    name,
    img: heroesData[name],
    hp: 100,
    atk: randInt(12,26),
    def: randInt(6,14),
    critChance: randInt(8,20),
    skill: ["Poison","Heal","Block","Fury"][randInt(0,3)],
    poisonCounter:0
  };
}

function applyHpColor(bar, hp){
  // width already set; choose gradient via thresholds
  if(hp > 50) bar.style.background = 'linear-gradient(to right,#00ff90,#ffcc00)';
  else if(hp > 25) bar.style.background = 'linear-gradient(to right,#ffb54d,#ff4d4d)';
  else bar.style.background = 'linear-gradient(to right,#ff4d4d,#8b0000)';
}

function updateUI(){
  if(playerStats.name){
    playerImg.src = playerStats.img;
    playerName.textContent = playerStats.name;
    playerHpBar.style.width = playerStats.hp + '%';
    playerHpValue.textContent = Math.max(0, Math.round(playerStats.hp));
    playerStatsText.textContent = `ATK:${playerStats.atk} DEF:${playerStats.def} CRIT:${playerStats.critChance}% SKILL:${playerStats.skill}`;
    applyHpColor(playerHpBar, playerStats.hp);
  }
  if(enemyStats.name){
    enemyImg.src = enemyStats.img;
    enemyName.textContent = enemyStats.name;
    enemyHpBar.style.width = enemyStats.hp + '%';
    enemyHpValue.textContent = Math.max(0, Math.round(enemyStats.hp));
    enemyStatsText.textContent = `ATK:${enemyStats.atk} DEF:${enemyStats.def} CRIT:${enemyStats.critChance}% SKILL:${enemyStats.skill}`;
    applyHpColor(enemyHpBar, enemyStats.hp);
  }
}

/* -------------------------
   Attack logic (with crit, skills)
   ------------------------- */
function attackTurn(attacker, defender, defenderImgContainer){
  // critical?
  const isCrit = Math.random()*100 < attacker.critChance;
  let base = Math.max(attacker.atk - Math.floor(defender.def/2), 1);
  let damage = isCrit ? Math.floor(base * (1.6 + Math.random()*0.6)) : base;
  defender.hp = Math.max(0, defender.hp - damage);

  // spawn blood near image center
  const imgBox = defenderImgContainer.getBoundingClientRect();
  spawnBlood(imgBox.width/2, imgBox.height/2, defenderImgContainer);

  // play sounds & shake if crit
  playHitSound(isCrit);
  if(isCrit) screenShake(8,200);

  // show log
  logMessage(`${attacker.name} hits ${defender.name} for ${damage}${isCrit? ' (CRIT!)':''}`);

  // skill effects
  if(attacker.skill === "Heal" && Math.random() < 0.33){
    const heal = randInt(6,12);
    attacker.hp = Math.min(100, attacker.hp + heal);
    logMessage(`${attacker.name} heals ${heal} HP!`);
  }
  if(attacker.skill === "Poison" && Math.random() < 0.45){
    defender.poisonCounter = 3;
    logMessage(`${defender.name} is poisoned!`);
  }
  if(attacker.skill === "Block" && Math.random() < 0.6){
    attacker.def = Math.floor(attacker.def * 1.25);
    logMessage(`${attacker.name} raises defense!`);
  }
  if(attacker.skill === "Fury" && Math.random() < 0.5){
    attacker.atk = Math.floor(attacker.atk * 1.25);
    logMessage(`${attacker.name} goes Furious!`);
  }

  // poison tick on defender (applies after being hit)
  if(defender.poisonCounter > 0){
    defender.hp = Math.max(0, defender.hp - 5);
    defender.poisonCounter--;
    logMessage(`${defender.name} takes 5 poison damage!`);
  }

  updateUI();
}

/* -------------------------
   Battle loop
   ------------------------- */
function battleLoop(){
  if(!battleActive) return;
  if(playerStats.hp <= 0 || enemyStats.hp <= 0){
    battleActive = false;
    finishBattle();
    return;
  }

  // randomly pick attacker each tick
  if(Math.random() > 0.5) attackTurn(playerStats, enemyStats, document.querySelector('#enemy .heroImgContainer'));
  else attackTurn(enemyStats, playerStats, document.querySelector('#player .heroImgContainer'));

  setTimeout(battleLoop, 900);
}

/* -------------------------
   Outcome handling (balance, modal, effects)
   ------------------------- */
function finishBattle(){
  const multiplier = parseInt(multiplierSelect.value);
  const bet = parseFloat(betSlider.value);

  // Evaluate winner
  let resultTextStr = '';
  let netChange = 0; // net to player (already bet was deducted at start)
  if(playerStats.hp <= 0 && enemyStats.hp <= 0){
    resultTextStr = "Draw!";
    netChange = 0;
  } else if(playerStats.hp <= 0){
    resultTextStr = "You lost!";
    netChange = 0; // loss already applied (bet deducted at start)
    // red flash + sound
    lossFlash.classList.remove('hidden');
    playLossSound();
    setTimeout(()=> lossFlash.classList.add('hidden'), 900);
  } else {
    resultTextStr = "You WON!";
    // payout: bet * multiplier returned to balance
    const payout = bet * multiplier;
    solBalance += payout;
    netChange = payout;
    playVictorySound();
    startConfetti();
    // stop confetti after ~5s handled in startConfetti
  }

  // update UI balance and show modal
  solBalanceEl.textContent = solBalance.toFixed(3);
  resultText.textContent = resultTextStr;
  if(netChange > 0) resultDetail.textContent = `You gained +${netChange.toFixed(3)} SOL (payout)`;
  else if(netChange < 0) resultDetail.textContent = `You lost -${Math.abs(netChange).toFixed(3)} SOL`;
  else resultDetail.textContent = ``;

  resultModal.classList.remove('hidden');
}

/* -------------------------
   Start battle (handle probability bias, deduct bet)
   ------------------------- */
startBtn.addEventListener("click", ()=>{
  if(!selectedHero) return alert("Please select a hero first.");
  const bet = parseFloat(betSlider.value);
  if(bet <= 0) return alert("Set a bet amount.");
  if(bet > solBalance) return alert("Not enough SOL balance for that bet.");

  // Deduct the bet immediately (stake)
  solBalance = Math.max(0, solBalance - bet);
  solBalanceEl.textContent = solBalance.toFixed(3);

  // Generate base stats
  playerStats = generateStats(selectedHero);
  // choose random enemy different from player
  const enemyOptions = Object.keys(heroesData).filter(h=>h !== selectedHero);
  let enemyChoice = enemyOptions[Math.floor(Math.random()*enemyOptions.length)];
  enemyStats = generateStats(enemyChoice);

  // Determine whether player should have advantage based on selected multiplier probabilities
  const mult = parseInt(multiplierSelect.value);
  const pWinProb = winProb[mult] || 0.5;
  const playerWillWin = Math.random() < pWinProb;

  // Bias stats strongly to reflect the chosen winProb (to realize the probability)
  if(playerWillWin){
    // boost player, nerf enemy
    playerStats.atk += randInt(6,14);
    playerStats.def += randInt(3,8);
    enemyStats.atk = Math.max(4, enemyStats.atk - randInt(4,10));
    enemyStats.def = Math.max(2, enemyStats.def - randInt(2,6));
    // slight HP adjustment
    playerStats.hp = 100;
    enemyStats.hp = 75 - randInt(0,10);
  } else {
    // boost enemy, nerf player
    enemyStats.atk += randInt(8,18);
    enemyStats.def += randInt(4,10);
    playerStats.atk = Math.max(4, playerStats.atk - randInt(3,8));
    playerStats.def = Math.max(2, playerStats.def - randInt(2,6));
    enemyStats.hp = 100;
    playerStats.hp = 70 - randInt(0,6);
  }

  // Reset UI & log
  battleLog.innerHTML = "";
  resultModal.classList.add('hidden');
  arenaWrapper.classList.remove('hidden');
  battleLogContainer.classList.remove('hidden');
  updateUI();
  battleActive = true;
  setTimeout(battleLoop, 800);

  // safety auto-stop after 30s
  setTimeout(()=>{ if(battleActive){ battleActive=false; finishBattle(); }}, 30000);
});

/* -------------------------
   Play again
   ------------------------- */
playAgainBtn.addEventListener("click", ()=>{
  // reset
  selectedHero = null;
  document.querySelectorAll(".hero-card").forEach(c=>c.classList.remove("selected"));
  playerStats = {}; enemyStats = {};
  arenaWrapper.classList.add('hidden');
  battleLogContainer.classList.add('hidden');
  resultModal.classList.add('hidden');
  battleLog.innerHTML = "";
  multiplierSelect.value = "2"; betSlider.value = 0.5; betAmountEl.textContent = "0.500";
});

/* -------------------------
   Helpers on load
   ------------------------- */
function init(){
  solBalanceEl.textContent = solBalance.toFixed(3);
  betAmountEl.textContent = parseFloat(betSlider.value).toFixed(3);
  // resize confetti canvas to window size on demand
  window.addEventListener('resize', () => {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  });
}
init();
