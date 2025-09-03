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
let inBattle = false;

// Звуки
const sounds = {
  attack: new Audio("sounds/attack.mp3"),
  crit: new Audio("sounds/crit.mp3"),
  win: new Audio("sounds/win.mp3"),
  lose: new Audio("sounds/lose.mp3"),
  bg: new Audio("sounds/bg.mp3")
};

// громкость
sounds.bg.loop = true; sounds.bg.volume = 0.3;
sounds.attack.volume = 0.5;
sounds.crit.volume = 0.7;
sounds.win.volume = 1.0;
sounds.lose.volume = 0.9;

// автозапуск музыки
document.addEventListener("click", () => {
  if (sounds.bg.paused) {
    sounds.bg.play().catch(err => console.log("BG audio blocked:", err));
  }
}, { once: true });

const betSlider = document.getElementById("bet");
const betValueSpan = document.getElementById("betValue");
betSlider.addEventListener("input", ()=> betValueSpan.innerText = parseFloat(betSlider.value).toFixed(3));

heroesData.forEach(hero => {
  const card = document.createElement("div");
  card.className = "hero-card";
  card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><div>${hero.name}</div>`;
  card.addEventListener("click", ()=>{
    if (inBattle) return;
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

document.getElementById("startBattle").addEventListener("click", async()=>{
  if(!playerHero){ alert("Choose a hero!"); return; }
  if(inBattle) return;
  inBattle = true;

  const multiplier = parseInt(document.getElementById("multiplier").value);
  let bet = parseFloat(betSlider.value);
  if(balance < bet){ alert("Not enough balance!"); inBattle = false; return; }

  enemyHero = getRandomEnemy();
  document.getElementById("enemyHero").innerHTML = `
    <img src="${enemyHero.img}" alt="${enemyHero.name}">
    <div class="hp-bar"><div class="hp-fill" id="enemyHp"></div></div>`;

  const logDiv = document.getElementById("log"); logDiv.innerHTML = "";
  let playerHP = playerHero.hp, enemyHP = enemyHero.hp;

  while(playerHP > 0 && enemyHP > 0){
    await new Promise(r => setTimeout(r, 500));

    let playerDamage = Math.floor(Math.random()*10 + 5), enemyDamage = Math.floor(Math.random()*10 + 5);

    if(Math.random()<0.15){ playerDamage *= 2; sounds.crit.play(); }
    if(Math.random()<0.15){ enemyDamage *= 2; sounds.crit.play(); }

    sounds.attack.play();

    playerHP -= enemyDamage; enemyHP -= playerDamage;
    if(playerHP < 0) playerHP = 0; 
    if(enemyHP < 0) enemyHP = 0;

    updateHP("playerHp", playerHP);
    updateHP("enemyHp", enemyHP);

    logDiv.innerHTML += `Player hits ${playerDamage}, Enemy hits ${enemyDamage}<br>`;
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  let winChance = 0.5;
  if(multiplier === 3) winChance = 0.3;
  if(multiplier === 5) winChance = 0.15;

  let result = (Math.random() < winChance) ? "win" : "lose";

  if(result === "win"){ 
    balance += bet*multiplier; 
    sounds.win.play(); 
    showResult("VICTORY!", `+${(bet*multiplier).toFixed(3)} ◎ SOL`, true);
  }
  else{ 
    balance -= bet; 
    sounds.lose.play(); 
    showResult("DEFEAT!", `-${bet.toFixed(3)} ◎ SOL`, false);
  }

  document.getElementById("balance").innerText = balance.toFixed(3);
  localStorage.setItem("balance", balance.toFixed(3));

  inBattle = false;
});

function updateHP(id, hp){
  const el = document.getElementById(id);
  if (!el) return;
  el.style.width = hp + "%";
  let green = Math.floor((hp/100) * 255);
  let red = 255 - green;
  el.style.backgroundColor = `rgb(${red},${green},0)`;
}

function showResult(title, amount, victory){
  const modal = document.getElementById("resultModal");
  const modalContent = document.getElementById("modalContent");
  const titleEl = document.getElementById("resultTitle");
  const amountEl = document.getElementById("resultAmount");
  const effects = document.getElementById("effectsContainer");

  titleEl.innerText = title;
  titleEl.style.color = victory ? "lime" : "red";
  amountEl.innerText = amount;
  effects.innerHTML = "";

  modal.classList.remove("victory","defeat");
  modal.classList.add(victory ? "victory" : "defeat");

  if(victory){ createConfetti(effects); }
  else{ createSkulls(effects); }

  modal.style.display = "flex";

  document.getElementById("closeModal").onclick = ()=>{
    modal.style.display = "none";
  }
}

function createConfetti(container){
  for(let i=0; i<80; i++){
    const c = document.createElement("div");
    c.className="confetti";
    c.style.left = Math.random()*100 + "%";
    c.style.backgroundColor = `hsl(${Math.random()*360},100%,50%)`;
    c.style.width = c.style.height = Math.random()*8+4 + "px";
    c.style.animationDuration = (Math.random()*3+3) + "s";
    container.appendChild(c);
    setTimeout(()=>c.remove(), 6000);
  }
}

function createSkulls(container){
  for(let i=0; i<50; i++){
    const skull = document.createElement("div");
    skull.className="skull";
    skull.innerText="💀";
    skull.style.left = Math.random()*100 + "%";
    skull.style.fontSize = (Math.random()*20+20) + "px";
    skull.style.animationDuration = (Math.random()*3+3) + "s";
    container.appendChild(skull);
    setTimeout(()=>skull.remove(), 6000);
  }
}
