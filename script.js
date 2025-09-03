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
let muted = false;

// 🔊 Audio
const sounds = {
  attack: new Audio("sounds/attack.mp3"),
  crit: new Audio("sounds/crit.mp3"),
  win: new Audio("sounds/win.mp3"),
  lose: new Audio("sounds/lose.mp3"),
  bg: new Audio("sounds/bg.mp3")
};
sounds.bg.loop = true; 
sounds.bg.volume = 0.3;

// кнопка mute
document.getElementById("muteBtn").addEventListener("click", ()=>{
  muted = !muted;
  Object.values(sounds).forEach(s => s.muted = muted);
  document.getElementById("muteBtn").innerText = muted ? "🔇 Muted" : "🔊 Mute";
});

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
      <div class="hp-bar"><div class="hp-fill" id="playerHp"></div></div>
    `;
  });
  heroesDiv.appendChild(card);
});

// выбор врага
function getRandomEnemy() {
  return {...heroesData[Math.floor(Math.random() * heroesData.length)], hp: 100};
}

// запуск битвы
document.getElementById("startBattle").addEventListener("click", async()=>{
  if(!playerHero){ alert("Choose a hero!"); return; }

  // фон включается только после клика
  if (sounds.bg.paused && !muted) {
    sounds.bg.play();
  }

  const multiplier = parseInt(document.getElementById("multiplier").value);
  let bet = parseFloat(betSlider.value);
  if(balance < bet){ alert("Not enough balance!"); return; }

  enemyHero = getRandomEnemy();
  document.getElementById("enemyHero").innerHTML = `
    <img src="${enemyHero.img}" alt="${enemyHero.name}">
    <div class="hp-bar"><div class="hp-fill" id="enemyHp"></div></div>
  `;

  const logDiv = document.getElementById("log"); 
  logDiv.innerHTML = "";
  let playerHP = 100, enemyHP = 100;
  const interval = 500;

  while(playerHP > 0 && enemyHP > 0) {
    await new Promise(r => setTimeout(r, interval));
    let playerDamage = Math.floor(Math.random()*10 + 5);
    let enemyDamage = Math.floor(Math.random()*10 + 5);

    if(Math.random()<0.15){ playerDamage *= 2; if(!muted) sounds.crit.play(); flashScreen("player"); }
    if(Math.random()<0.15){ enemyDamage *= 2; if(!muted) sounds.crit.play(); flashScreen("enemy"); }

    if(!muted) sounds.attack.play();

    playerHP = Math.max(0, playerHP - enemyDamage);
    enemyHP = Math.max(0, enemyHP - playerDamage);

    // правильный процент
    document.getElementById("playerHp").style.width = (playerHP/100*100) + "%";
    document.getElementById("enemyHp").style.width = (enemyHP/100*100) + "%";

    logDiv.innerHTML += `Player hits ${playerDamage}, Enemy hits ${enemyDamage}<br>`;
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  // результат
  let result = playerHP > enemyHP ? "win" : "lose";
  if(result === "win"){ 
    balance += bet*multiplier; 
    if(!muted) sounds.win.play(); 
  }
  else { 
    balance -= bet; 
    if(!muted) sounds.lose.play(); 
  }

  document.getElementById("balance").innerText = balance.toFixed(3);
  localStorage.setItem("balance", balance.toFixed(3));

  showResult(result);
});

// ⚡ Вспышки
function flashScreen(type){
  const overlay = document.getElementById("resultOverlay");
  overlay.style.backgroundColor = type==="player" ? "rgba(0,255,0,0.2)" : "rgba(255,0,0,0.2)";
  overlay.style.opacity = 1;
  setTimeout(()=>overlay.style.opacity=0,100);
}

// 🪧 Модальное окно результата
function showResult(type){
  const overlay = document.getElementById("resultOverlay");
  overlay.style.opacity = 1;
  overlay.style.fontSize = "36px";
  overlay.style.flexDirection = "column";

  if(type==="win"){
    overlay.style.color = "lime";
    overlay.innerHTML = `VICTORY!<br><button onclick="location.reload()">Play Again</button>`;
    createConfetti();
  }
  else {
    overlay.style.color = "red";
    overlay.innerHTML = `DEFEAT!<br><button onclick="location.reload()">Try Again</button>`;
  }
}

// 🎉 Конфетти
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
