const heroesData = [
  { name: "Pepe", img: "images/pepe.png" },
  { name: "Doge", img: "images/doge.png" },
  { name: "Bonk", img: "images/bonk.png" },
  { name: "Penguin", img: "images/penguin.png" },
  { name: "Trump", img: "images/trump.png" },
  { name: "Popcat", img: "images/popcat.png" },
  { name: "Melania", img: "images/melania.png" },
];

// Баланс
let balance = parseFloat(localStorage.getItem("balance"));
if (isNaN(balance)) {
  balance = 3.0;
  localStorage.setItem("balance", balance.toFixed(3));
}
document.getElementById("balance").innerText = balance.toFixed(3);

const heroesDiv = document.getElementById("heroes");
let playerHero = null;
let enemyHero = null;

// Звуки
const sounds = {
  attack: new Audio("sounds/attack.mp3"),
  crit: new Audio("sounds/crit.mp3"),
  win: new Audio("sounds/win.mp3"),
  lose: new Audio("sounds/lose.mp3"),
  select: new Audio("sounds/select.mp3"),
};

// Ставка
const betSlider = document.getElementById("bet");
const betValueSpan = document.getElementById("betValue");
betSlider.addEventListener("input", () => betValueSpan.innerText = parseFloat(betSlider.value).toFixed(3));

// Рисуем героев
heroesData.forEach(hero => {
  const card = document.createElement("div");
  card.className = "hero-card";
  card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><div>${hero.name}</div>`;
  card.addEventListener("click", () => {
    sounds.select.play();
    playerHero = { ...hero, hp: 100 };
    document.getElementById("playerHero").innerHTML =
      `<img src="${hero.img}" alt="${hero.name}">
       <div class="hp-bar"><div class="hp-fill" id="playerHp"></div></div>`;
  });
  heroesDiv.appendChild(card);
});

function getRandomEnemy() {
  return { ...heroesData[Math.floor(Math.random() * heroesData.length)], hp: 100 };
}

// Запуск боя
document.getElementById("startBattle").addEventListener("click", async () => {
  if (!playerHero) { alert("Choose a hero!"); return; }
  const multiplier = parseInt(document.getElementById("multiplier").value);
  let bet = parseFloat(betSlider.value);
  if (balance < bet) { alert("Not enough balance!"); return; }

  enemyHero = getRandomEnemy();
  document.getElementById("enemyHero").innerHTML =
    `<img src="${enemyHero.img}" alt="${enemyHero.name}">
     <div class="hp-bar"><div class="hp-fill" id="enemyHp"></div></div>`;

  const logDiv = document.getElementById("log");
  logDiv.innerHTML = "";

  let playerHP = 100, enemyHP = 100;

  while (playerHP > 0 && enemyHP > 0) {
    await new Promise(r => setTimeout(r, 600));
    let playerDamage = Math.floor(Math.random() * 10 + 5);
    let enemyDamage = Math.floor(Math.random() * 10 + 5);

    if (Math.random() < 0.15) { playerDamage *= 2; sounds.crit.play(); }
    if (Math.random() < 0.15) { enemyDamage *= 2; sounds.crit.play(); }

    sounds.attack.play();

    playerHP -= enemyDamage;
    enemyHP -= playerDamage;
    if (playerHP < 0) playerHP = 0;
    if (enemyHP < 0) enemyHP = 0;

    updateHpBar("playerHp", playerHP);
    updateHpBar("enemyHp", enemyHP);

    logDiv.innerHTML += `Player hits ${playerDamage}, Enemy hits ${enemyDamage}<br>`;
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  let result;
  if (playerHP > enemyHP) {
    balance += bet * multiplier;
    result = { type: "win", amount: `+${(bet * multiplier).toFixed(3)} ◎ SOL` };
    sounds.win.play();
  } else {
    balance -= bet;
    result = { type: "lose", amount: `-${bet.toFixed(3)} ◎ SOL` };
    sounds.lose.play();
  }

  localStorage.setItem("balance", balance.toFixed(3));
  document.getElementById("balance").innerText = balance.toFixed(3);
  showResult(result);
});

function updateHpBar(id, hp) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.width = hp + "%";
  let red = 255 - (hp * 2.55);
  let green = hp * 2.55;
  el.style.backgroundColor = `rgb(${red},${green},0)`;
}

// Модальное окно результата
function showResult(result) {
  const modal = document.getElementById("resultModal");
  const title = document.getElementById("resultTitle");
  const amount = document.getElementById("resultAmount");
  const effect = document.getElementById("effectContainer");
  effect.innerHTML = "";

  if (result.type === "win") {
    title.style.color = "lime";
    title.innerText = "VICTORY!";
    amount.innerText = result.amount;
    for (let i = 0; i < 50; i++) createParticle("confetti", effect);
  } else {
    title.style.color = "red";
    title.innerText = "DEFEAT!";
    amount.innerText = result.amount;
    for (let i = 0; i < 40; i++) createParticle("skull", effect);
  }

  modal.style.display = "flex";

  document.getElementById("tryAgain").onclick = () => {
    modal.style.display = "none";
  };
}

function createParticle(type, container) {
  const p = document.createElement("div");
  p.className = type;
  p.style.left = Math.random() * 100 + "%";
  p.style.backgroundColor = type === "confetti" ? `hsl(${Math.random() * 360},100%,50%)` : "";
  container.appendChild(p);
  setTimeout(() => p.remove(), 3000);
}
