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

// Web Audio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let bgGain = null, bgNoise = null, bgDrums = null;

// --- Функция звуков
function playSound(type) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === "attack") {
    osc.type = "square"; osc.frequency.value = 400; gain.gain.value = 0.1;
  }
  if (type === "win") {
    osc.type = "triangle"; osc.frequency.value = 800; gain.gain.value = 0.15;
  }
  if (type === "lose") {
    osc.type = "sawtooth"; osc.frequency.value = 120; gain.gain.value = 0.2;
  }

  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

// --- Фоновые звуки (толпа + барабаны)
function startBackgroundAudio() {
  stopBackgroundAudio();

  bgGain = audioCtx.createGain();
  bgGain.gain.value = 0.15;
  bgGain.connect(audioCtx.destination);

  // Noise (crowd)
  const bufferSize = 2 * audioCtx.sampleRate;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  bgNoise = audioCtx.createBufferSource();
  bgNoise.buffer = buffer;
  bgNoise.loop = true;

  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 400;
  noiseFilter.Q.value = 1;

  bgNoise.connect(noiseFilter);
  noiseFilter.connect(bgGain);
  bgNoise.start();

  // Drums
  bgDrums = audioCtx.createOscillator();
  const drumGain = audioCtx.createGain();
  drumGain.gain.value = 0.05;
  bgDrums.type = "sine";
  bgDrums.frequency.setValueAtTime(60, audioCtx.currentTime);

  // Tremolo effect (boom-boom)
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.value = 1.5; // beats per sec
  lfoGain.gain.value = 40;
  lfo.connect(lfoGain);
  lfoGain.connect(bgDrums.frequency);

  bgDrums.connect(drumGain).connect(bgGain);
  bgDrums.start();
  lfo.start();
}

function stopBackgroundAudio() {
  if(bgNoise) { bgNoise.stop(); bgNoise.disconnect(); bgNoise = null; }
  if(bgDrums) { bgDrums.stop(); bgDrums.disconnect(); bgDrums = null; }
  if(bgGain) { bgGain.disconnect(); bgGain = null; }
}

// --- Ставка
const betSlider = document.getElementById("bet");
const betValueSpan = document.getElementById("betValue");
betSlider.addEventListener("input", ()=> betValueSpan.innerText = parseFloat(betSlider.value).toFixed(3));

// --- Герои
heroesData.forEach(hero => {
  const card = document.createElement("div");
  card.className = "hero-card";
  card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><div>${hero.name}</div>`;
  card.addEventListener("click", ()=>{
    playerHero = {...hero, hp: 100};
    document.getElementById("playerHero").innerHTML = `
      <img src="${hero.img}" alt="${hero.name}">
      <div class="hp-bar"><div class="hp-fill" id="playerHp"></div></div>`;
  });
  heroesDiv.appendChild(card);
});

function getRandomEnemy() {
  return {...heroesData[Math.floor(Math.random() * heroesData.length)], hp: 100};
}

// --- Бой
document.getElementById("startBattle").addEventListener("click", async()=>{
  if(!playerHero){ alert("Choose a hero!"); return; }

  const multiplier = parseInt(document.getElementById("multiplier").value);
  let bet = parseFloat(betSlider.value);
  if(balance < bet){ alert("Not enough balance!"); return; }

  let enemyHero = getRandomEnemy();
  document.getElementById("enemyHero").innerHTML = `
    <img src="${enemyHero.img}" alt="${enemyHero.name}">
    <div class="hp-bar"><div class="hp-fill" id="enemyHp"></div></div>`;

  const logDiv = document.getElementById("log"); logDiv.innerHTML = "";

  startBackgroundAudio();

  // Анимация боя
  let playerHP = 100, enemyHP = 100;
  const duration = 20, interval = 500, totalTicks = Math.floor(duration*1000/interval);

  for(let i=0;i<totalTicks;i++){
    await new Promise(r => setTimeout(r, interval));
    let dmgP = Math.floor(Math.random()*10+5);
    let dmgE = Math.floor(Math.random()*10+5);
    playerHP -= dmgE; enemyHP -= dmgP;
    if(playerHP<0) playerHP=0; if(enemyHP<0) enemyHP=0;

    document.getElementById("playerHp").style.width = playerHP + "%";
    document.getElementById("enemyHp").style.width = enemyHP + "%";

    logDiv.innerHTML += `Player hits ${dmgP}, Enemy hits ${dmgE}<br>`;
    logDiv.scrollTop = logDiv.scrollHeight;

    playSound("attack");
  }

  // Шанс победы
  let chance = 0.5;
  if(multiplier===3) chance = 0.3;
  if(multiplier===5) chance = 0.15;

  let result = Math.random() < chance ? "win" : "lose";

  if(result==="win"){
    balance += bet*multiplier;
    playSound("win");
    showResult("VICTORY!", `+${(bet*multiplier).toFixed(3)} ◎`, true);
  } else {
    balance -= bet;
    playSound("lose");
    showResult("DEFEAT!", `-${bet.toFixed(3)} ◎`, false);
  }

  stopBackgroundAudio();

  document.getElementById("balance").innerText = balance.toFixed(3);
  localStorage.setItem("balance", balance.toFixed(3));
});

// --- Результаты
function showResult(text, amount, win){
  const modal = document.getElementById("resultModal");
  const txt = document.getElementById("resultText");
  const amt = document.getElementById("resultAmount");

  txt.innerText = text;
  txt.style.color = win ? "lime" : "red";
  amt.innerText = amount;

  modal.style.display = "block";

  if(win) createConfetti();
  else createSkulls();
}

document.getElementById("tryAgain").addEventListener("click", ()=>{
  document.getElementById("resultModal").style.display = "none";
});

// --- Эффекты
function createConfetti(){
  for(let i=0;i<40;i++){
    const c = document.createElement("div");
    c.className="confetti";
    c.style.left = Math.random()*window.innerWidth + "px";
    c.style.top = "-20px";
    c.style.backgroundColor = `hsl(${Math.random()*360},100%,50%)`;
    document.body.appendChild(c);
    setTimeout(()=>document.body.removeChild(c),2000);
  }
}

function createSkulls(){
  for(let i=0;i<20;i++){
    const s = document.createElement("div");
    s.className="skull";
    s.style.left = Math.random()*window.innerWidth + "px";
    s.style.top = "-20px";
    document.body.appendChild(s);
    setTimeout(()=>document.body.removeChild(s),2000);
  }
}
