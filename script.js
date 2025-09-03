// ---------- Data ----------
const heroesData = [
  { name: "Pepe",    img: "images/pepe.png" },
  { name: "Doge",    img: "images/doge.png" },
  { name: "Bonk",    img: "images/bonk.png" },
  { name: "Penguin", img: "images/penguin.png" },
  { name: "Trump",   img: "images/trump.png" },
  { name: "Popcat",  img: "images/popcat.png" },
  { name: "Melania", img: "images/melania.png" },
];

let balance = parseFloat(localStorage.getItem("balance")) || 3.0;
const balanceEl = document.getElementById("balance");
balanceEl.innerText = balance.toFixed(3);

const heroesDiv = document.getElementById("heroes");
let playerHero = null;
let enemyHero  = null;

// ---------- Web Audio (no external files) ----------
let audioCtx = null;
let unlocked = false;
let bgNode = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function unlockAudioOnce() {
  if (unlocked) return;
  ensureAudio();
  // tiny blip to unlock
  playTone(440, 0.02, "sine", 0.0001);
  unlocked = true;
  startBg();
}
document.addEventListener("pointerdown", unlockAudioOnce, { once: true });

function playTone(freq, duration=0.15, type="sine", volume=0.2, attack=0.01, release=0.08) {
  ensureAudio();
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const now = audioCtx.currentTime;
  const end = now + duration + release;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + attack);
  gain.gain.linearRampToValueAtTime(volume, now + duration);
  gain.gain.linearRampToValueAtTime(0.0001, end);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(end);
}

function playNoiseBurst(duration=0.25, volume=0.08) {
  ensureAudio();
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1) * (1 - i/bufferSize);
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const gain = audioCtx.createGain();
  gain.gain.value = volume;
  src.connect(gain).connect(audioCtx.destination);
  src.start();
}

function startBg() {
  if (bgNode) return; // already running
  ensureAudio();
  // soft ambient: two gentle oscillators beating
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc1.type = "sine"; osc2.type = "sine";
  osc1.frequency.value = 220;
  osc2.frequency.value = 221.2; // slight detune for beat
  gain.gain.value = 0.02;       // very quiet
  osc1.connect(gain); osc2.connect(gain); gain.connect(audioCtx.destination);
  osc1.start(); osc2.start();
  bgNode = { osc1, osc2, gain };
}

function stopBg() {
  if (!bgNode) return;
  try { bgNode.osc1.stop(); bgNode.osc2.stop(); } catch(e){}
  bgNode = null;
}

// SFX helpers
function sfxAttack(){ playNoiseBurst(0.08, 0.09); playTone(180, 0.06, "square", 0.06, 0.005, 0.05); }
function sfxCrit()  { playTone(740, 0.09, "sawtooth", 0.12); playTone(980, 0.09, "sawtooth", 0.10); }
function sfxWin()   { // rising triad
  [523.25, 659.25, 783.99].forEach((f,i)=> setTimeout(()=>playTone(f,0.18,"triangle",0.18), i*120));
}
function sfxLose()  { // descending
  [392.00, 329.63, 261.63].forEach((f,i)=> setTimeout(()=>playTone(f,0.2,"sine",0.16), i*130));
}

// ---------- UI: heroes ----------
heroesData.forEach(hero => {
  const card = document.createElement("div");
  card.className = "hero-card";
  card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><div>${hero.name}</div>`;
  card.addEventListener("click", ()=>{
    playerHero = {...hero, hp: 100};
    document.getElementById("playerHero").innerHTML = `
      <img src="${hero.img}" alt="${hero.name}">
      <div class="hp-bar"><div class="hp-fill" id="playerHp" style="width:100%"></div></div>
    `;
  });
  heroesDiv.appendChild(card);
});

function getRandomEnemy() {
  return {...heroesData[Math.floor(Math.random() * heroesData.length)], hp: 100};
}

// ---------- Battle ----------
const betSlider   = document.getElementById("bet");
const betValueEl  = document.getElementById("betValue");
betSlider.addEventListener("input", ()=> betValueEl.innerText = parseFloat(betSlider.value).toFixed(3));

const overlay = document.getElementById("resultOverlay");

document.getElementById("startBattle").addEventListener("click", async () => {
  if(!playerHero){ alert("Choose a hero!"); return; }

  unlockAudioOnce(); // гарантируем звук с клика

  const multiplier = parseInt(document.getElementById("multiplier").value);
  const bet = parseFloat(betSlider.value);
  if(balance < bet){ alert("Not enough balance!"); return; }

  enemyHero = getRandomEnemy();
  document.getElementById("enemyHero").innerHTML = `
    <img src="${enemyHero.img}" alt="${enemyHero.name}">
    <div class="hp-bar"><div class="hp-fill" id="enemyHp" style="width:100%"></div></div>
  `;

  const logDiv = document.getElementById("log");
  logDiv.innerHTML = "";

  // reset overlay
  overlay.style.opacity = 0;
  overlay.className = "result-overlay";

  let playerHP = 100, enemyHP = 100;
  const interval = 500;

  while (playerHP > 0 && enemyHP > 0) {
    await wait(interval);

    let playerDamage = randInt(5, 15);
    let enemyDamage  = randInt(5, 15);

    // crits
    if (Math.random() < 0.15) { playerDamage *= 2; sfxCrit(); flash("green"); }
    if (Math.random() < 0.15) { enemyDamage  *= 2; sfxCrit(); flash("red");   }

    sfxAttack();

    // apply damage
    playerHP = Math.max(0, playerHP - enemyDamage);
    enemyHP  = Math.max(0, enemyHP  - playerDamage);

    // bars
    const pBar = document.getElementById("playerHp");
    const eBar = document.getElementById("enemyHp");
    if (pBar) {
      pBar.style.width = playerHP + "%";
      pBar.style.backgroundColor = `rgb(${255-(playerHP*2.55)},${playerHP*2.55},0)`;
    }
    if (eBar) {
      eBar.style.width = enemyHP + "%";
      eBar.style.backgroundColor = `rgb(${255-(enemyHP*2.55)},${enemyHP*2.55},0)`;
    }

    logDiv.innerHTML += `Player hits ${playerDamage}, Enemy hits ${enemyDamage}<br>`;
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  // result
  const result = playerHP > enemyHP ? "win" : "lose";
  let delta = 0;
  if (result === "win") { delta = bet * multiplier; balance += delta; sfxWin(); }
  else { delta = -bet; balance += delta; sfxLose(); }

  balanceEl.innerText = balance.toFixed(3);
  localStorage.setItem("balance", balance.toFixed(3));

  // show modal with effects
  showResultModal(result, delta);
});

// ---------- Effects ----------
function flash(color) {
  overlay.style.opacity = 1;
  overlay.classList.remove("flash-green","flash-red");
  overlay.classList.add(color === "green" ? "flash-green" : "flash-red");
  // auto fade handled by animation
  setTimeout(()=>{ overlay.style.opacity = 0; }, 650);
}

function showResultModal(type, delta) {
  const modal = document.getElementById("resultModal");
  const title = document.getElementById("modalTitle");
  const amount= document.getElementById("modalAmount");
  const layer = document.getElementById("effectsLayer");
  const btn   = document.getElementById("playAgainBtn");

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  // clear effects layer
  layer.innerHTML = "";

  if (type === "win") {
    title.textContent = "VICTORY!";
    title.style.color = "lime";
    amount.textContent = `+ ${Math.abs(delta).toFixed(3)} ◎ SOL`;
    amount.style.color = "lime";

    // salute (fireworks) + confetti
    fireworks(layer, 3);
    confetti(layer, 120);
    // green flicker across arena too
    flash("green");
  } else {
    title.textContent = "DEFEAT!";
    title.style.color = "red";
    amount.textContent = `- ${Math.abs(delta).toFixed(3)} ◎ SOL`;
    amount.style.color = "red";

    // falling skulls
    skullRain(40);
    // red flicker
    flash("red");
  }

  btn.onclick = () => { location.reload(); };
}

function confetti(container, count=80) {
  for (let i=0;i<count;i++) {
    const el = document.createElement("div");
    el.className = "confetti";
    el.style.left = Math.random()*100 + "vw";
    el.style.top  = - (Math.random()*20 + 5) + "vh";
    el.style.width = el.style.height = (Math.random()*6 + 4) + "px";
    el.style.backgroundColor = `hsl(${Math.random()*360},100%,50%)`;
    el.style.animation = `confettiFall ${1.2 + Math.random()*1.4}s linear forwards`;
    document.body.appendChild(el);
    setTimeout(()=> el.remove(), 3000);
  }
}

function skullRain(count=30) {
  for (let i=0;i<count;i++) {
    const s = document.createElement("div");
    s.className = "skull";
    s.textContent = "☠️";
    s.style.left = Math.random()*100 + "vw";
    s.style.top  = - (Math.random()*30 + 10) + "vh";
    s.style.animation = `skullFall ${1.5 + Math.random()*1.2}s linear forwards`;
    document.body.appendChild(s);
    setTimeout(()=> s.remove(), 3500);
  }
}

function fireworks(container, bursts=3) {
  for (let b=0;b<bursts;b++) {
    setTimeout(()=>{
      const cx = Math.random()*80 + 10; // vw
      const cy = Math.random()*50 + 15; // vh
      const particles = 34;
      for (let i=0;i<particles;i++) {
        const p = document.createElement("div");
        p.className = "firework-particle";
        const angle = (i/particles) * Math.PI*2;
        const dist  = 80 + Math.random()*60; // px
        const tx = Math.cos(angle)*dist;
        const ty = Math.sin(angle)*dist;
        p.style.left = `calc(${cx}vw)`;
        p.style.top  = `calc(${cy}vh)`;
        p.style.background = `hsl(${Math.random()*360},100%,60%)`;
        p.style.setProperty("--tx", tx+"px");
        p.style.setProperty("--ty", ty+"px");
        p.style.animation = `fireworkBurst ${600 + Math.random()*300}ms ease-out forwards`;
        container.appendChild(p);
        setTimeout(()=> p.remove(), 1200);
      }
      // small pop
      playNoiseBurst(0.07, 0.1);
      playTone(880, 0.08, "triangle", 0.1);
    }, b*450 + Math.random()*200);
  }
}

// ---------- Utils ----------
function wait(ms){ return new Promise(r => setTimeout(r, ms)); }
function randInt(min, max){ return Math.floor(Math.random()*(max-min+1)) + min; }
