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

// Audio
const sounds = {
  attack: new Audio("sounds/attack.mp3"),
  crit: new Audio("sounds/crit.mp3"),
  win: new Audio("sounds/win.mp3"),
  lose: new Audio("sounds/lose.mp3"),
  bg: new Audio("sounds/bg.mp3")
};
sounds.bg.loop = true; sounds.bg.volume = 0.3; sounds.bg.play();

document.getElementById("muteBtn").addEventListener("click", ()=>{
  muted = !muted;
  Object.values(sounds).forEach(s => s.muted = muted);
  document.getElementById("muteBtn").innerText = muted ? "🔇 Muted" : "🔊 Mute";
});

const betSlider = document.getElementById("bet");
const betValueSpan = document.getElementById("betValue");
betSlider.addEventListener("input", ()=> betValueSpan.innerText = parseFloat(betSlider.value).toFixed(3));

heroesData.forEach(hero => {
  const card = document.createElement("div");
  card.className = "hero-card";
  card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><div>${hero.name}</div>`;
  card.addEventListener("click", ()=>{
    playerHero = {...hero, hp: 100};
    document.getElementById("playerHero").innerHTML = `<img src="${hero.img}" alt="${hero.name}"><div class="hp-bar"><div class="hp-fill" id="playerHp"></div></div>`;
  });
  heroesDiv.appendChild(card);
});

function getRandomEnemy() {
  return {...heroesData[Math.floor(Math.random() * heroesData.length)], hp: 100};
}

document.getElementById("startBattle").addEventListener("click", async()=>{
  if(!playerHero){ alert("Choose a hero!"); return; }
  const multiplier = parseInt(document.getElementById("multiplier").value);
  let bet = parseFloat(betSlider.value);
  if(balance < bet){ alert("Not enough balance!"); return; }

  enemyHero = getRandomEnemy();
  document.getElementById("enemyHero").innerHTML = `<img src="${enemyHero.img}" alt="${enemyHero.name}"><div class="hp-bar"><div class="hp-fill" id="enemyHp"></div></div>`;

  const logDiv = document.getElementById("log"); logDiv.innerHTML = "";
  const overlay = document.getElementById("resultOverlay"); overlay.style.opacity = 0; overlay.innerText = "";
  let playerHP = playerHero.hp, enemyHP = enemyHero.hp;
  const duration = Math.random()*25 + 5, interval = 500, totalTicks = Math.floor(duration*1000/interval);

  for(let i=0;i<totalTicks;i++){
    await new Promise(r => setTimeout(r, interval));
    let playerDamage = Math.floor(Math.random()*10 + 5), enemyDamage = Math.floor(Math.random()*10 + 5);

    if(Math.random()<0.15){ playerDamage *= 2; if(!muted) sounds.crit.play(); flashScreen("player"); }
    if(Math.random()<0.15){ enemyDamage *= 2; if(!muted) sounds.crit.play(); flashScreen("enemy"); }

    if(!muted) sounds.attack.play();

    playerHP -= enemyDamage; enemyHP -= playerDamage;
    if(playerHP < 0) playerHP = 0; 
    if(enemyHP < 0) enemyHP = 0;

    document.getElementById("playerHp").style.width = playerHP + "%";
    document.getElementById("playerHp").style.backgroundColor = `rgb(${255-(playerHP*2.55)},${playerHP*2.55},0)`;
    document.getElementById("enemyHp").style.width = enemyHP + "%";
    document.getElementById("enemyHp").style.backgroundColor = `rgb(${255-(enemyHP*2.55)},${enemyHP*2.55},0)`;

    logDiv.innerHTML += `Player hits ${playerDamage}, Enemy hits ${enemyDamage}<br>`;
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  let result = playerHP > enemyHP ? "win" : "lose";
  if(result === "win"){ balance += bet*multiplier; if(!muted) sounds.win.play(); showResult("win"); }
  else{ balance -= bet; if(!muted) sounds.lose.play(); showResult("lose"); }

  document.getElementById("balance").innerText = balance.toFixed(3);
  localStorage.setItem("balance", balance.toFixed(3));
});

function flashScreen(type){
  const overlay = document.getElementById("resultOverlay");
  overlay.style.backgroundColor = type==="player" ? "rgba(0,255,0,0.2)" : "rgba(255,0,0,0.2)";
  overlay.style.opacity = 1;
  setTimeout(()=>overlay.style.opacity=0,100);
}

function showResult(type){
  const overlay = document.getElementById("resultOverlay");
  overlay.style.opacity = 1;
  if(type==="win"){
    overlay.style.color = "lime";
    overlay.innerText = "VICTORY!";
    createConfetti();
    setTimeout(()=>overlay.style.opacity=0, 1500);
  }
  else if(type==="lose"){
    overlay.style.color = "red";
    overlay.innerText = "DEFEAT!";
    setTimeout(()=>overlay.style.opacity=0, 1500);
  }
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
