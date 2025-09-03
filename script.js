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
let enemyHero = null;

// --- Audio setup & unlock ---
const sounds = {
  attack: new Audio("sounds/attack.mp3"),
  crit:   new Audio("sounds/crit.mp3"),
  win:    new Audio("sounds/win.mp3"),
  lose:   new Audio("sounds/lose.mp3"),
  bg:     new Audio("sounds/bg.mp3")
};
// настройки
sounds.bg.loop = true;
sounds.bg.volume = 0.3;
// немного помогаем загрузке
Object.values(sounds).forEach(a => {
  a.preload = "auto";
  // iOS/Safari дружелюбие
  if ("playsInline" in a) a.playsInline = true;
});

// Авто-разблокировка на первом взаимодействии (клик/тап/кнопка)
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  // один раз воспроизводим/паузим каждый звук, чтобы страница получила разрешение на последующие воспроизведения
  Object.values(sounds).forEach(a => {
    try {
      a.currentTime = 0;
      a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(()=>{});
    } catch(e) {}
  });
  // сразу запускаем фоновую музыку
  sounds.bg.play().catch(()=>{});
}
document.addEventListener("pointerdown", unlockAudio, { once: true });

// ставка
const betSlider = document.getElementById("bet");
const betValueSpan = document.getElementById("betValue");
betSlider.addEventListener("input", ()=> 
  betValueSpan.innerText = parseFloat(betSlider.value).toFixed(3)
);

// герои
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

document.getElementById("startBattle").addEventListener("click", async()=>{
  if(!playerHero){ alert("Choose a hero!"); return; }

  // явное разблокирование звука по клику Start Battle
  unlockAudio();

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

  const overlay = document.getElementById("resultOverlay");
  overlay.classList.remove("active");
  overlay.style.opacity = 0;
  overlay.innerHTML = "";

  let playerHP = 100, enemyHP = 100;
  const interval = 500;

  while(playerHP > 0 && enemyHP > 0) {
    await new Promise(r => setTimeout(r, interval));

    let playerDamage = Math.floor(Math.random()*10 + 5);
    let enemyDamage  = Math.floor(Math.random()*10 + 5);

    // криты
    if(Math.random()<0.15){ playerDamage *= 2; sounds.crit.play().catch(()=>{}); flashScreen("player"); }
    if(Math.random()<0.15){ enemyDamage  *= 2; sounds.crit.play().catch(()=>{}); flashScreen("enemy"); }

    // удар
    sounds.attack.currentTime = 0;
    sounds.attack.play().catch(()=>{});

    // применение урона
    playerHP = Math.max(0, playerHP - enemyDamage);
    enemyHP  = Math.max(0, enemyHP  - playerDamage);

    // обновление полосок (HP в процентах)
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

  // результат
  const result = playerHP > enemyHP ? "win" : "lose";
  if(result === "win"){ 
    balance += bet*multiplier; 
    sounds.win.play().catch(()=>{});
  } else { 
    balance -= bet; 
    sounds.lose.play().catch(()=>{});
  }
  document.getElementById("balance").innerText = balance.toFixed(3);
  localStorage.setItem("balance", balance.toFixed(3));

  showResult(result);
});

function flashScreen(type){
  const overlay = document.getElementById("resultOverlay");
  // во время вспышек клики не нужны
  overlay.classList.remove("active");
  overlay.style.backgroundColor = type==="player" ? "rgba(0,255,0,0.2)" : "rgba(255,0,0,0.2)";
  overlay.style.opacity = 1;
  setTimeout(()=>overlay.style.opacity=0,100);
}

function showResult(type){
  const overlay = document.getElementById("resultOverlay");
  overlay.classList.add("active");
  overlay.style.opacity = 1;
  overlay.style.fontSize = "36px";
  overlay.style.backgroundColor = "rgba(0,0,0,0.8)";
  overlay.innerHTML = "";

  const title = document.createElement("div");
  title.textContent = (type === "win") ? "VICTORY!" : "DEFEAT!";
  title.style.color = (type === "win") ? "lime" : "red";
  overlay.appendChild(title);

  const btn = document.createElement("button");
  btn.textContent = (type === "win") ? "Play Again" : "Try Again";
  btn.addEventListener("click", () => location.reload());
  overlay.appendChild(btn);

  if(type==="win") createConfetti();
}

function createConfetti(){
  for(let i=0;i<50;i++){
    const c = document.createElement("div");
    c.className="confetti";
    c.style.left = Math.random()*window.innerWidth + "px";
    c.style.backgroundColor = `hsl(${Math.random()*360},100%,50%)`;
    document.body.appendChild(c);
    setTimeout(()=>document.body.removeChild(c), 1000);
  }
}
