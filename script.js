const heroesData = [
  { name: "Pepe", img: "images/pepe.png" },
  { name: "Doge", img: "images/doge.png" },
  { name: "Bonk", img: "images/bonk.png" },
  { name: "Penguin", img: "images/penguin.png" },
  { name: "Trump", img: "images/trump.png" },
  { name: "Popcat", img: "images/popcat.png" },
  { name: "Melania", img: "images/melania.png" },
];

// Баланс: проверяем localStorage, если пусто — ставим 3.0
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
  bg: new Audio("sounds/bg.mp3"),
  select: new Audio("sounds/select.mp3")
};
sounds.bg.loop = true;
sounds.bg.volume = 0.4;
sounds.bg.play();

// Ставка
const betSlider = document.getElementById("bet");
const betValueSpan = document.getElementById("betValue");
betSlider.addEventListener("input", () => {
  betValueSpan.innerText = parseFloat(betSlider.value).toFixed(3);
});

// Карточки героев
heroesData.forEach(hero => {
  const card = document.createElement("div");
  card.className = "hero-card";
  card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><div>${hero.name}</div>`;
  card.addEventListener("click", () => {
    playerHero = { ...hero, hp: 100 };
    document.getElementById("playerHero").innerHTML = `
      <img src="${hero.img}" alt="${hero.name}">
      <div class="hp-bar">
        <div class="hp-fill" id="playerHp"></div>
      </div>`;
    if (sounds.select) sounds.select.play();
  });
  heroesDiv.appendChild(card);
});

function getRandomEnemy() {
  return { ...heroesData[Math.floor(Math.random() * heroesData.length)], hp: 100 };
}

// Бой
document.getElementById("startBattle").addEventListener("click", async () => {
  if (!playerHero) {
    alert("Choose a hero!");
    return;
  }
  const multiplier = parseInt(document.getElementById("multiplier").value);
  let bet = parseFloat(betSlider.value);
  if (balance < bet) {
    alert("Not enough balance!");
    return;
  }

  enemyHero = getRandomEnemy();
  document.getElementById("enemyHero").innerHTML = `
    <img src="${enemyHero.img}" alt="${enemyHero.name}">
    <div class="hp-bar">
      <div class="hp-fill" id="enemyHp"></div>
    </div>`;

  const logDiv = document.getElementById("log");
  logDiv.innerHTML = "";

  let playerHP = playerHero.hp, enemyHP = enemyHero.hp;

  while (playerHP > 0 && enemyHP > 0) {
    await new Promise(r => setTimeout(r, 600));

    let playerDamage = Math.floor(Math.random() * 10 + 5);
    let enemyDamage = Math.floor(Math.random() * 10 + 5);

    if (Math.random() < 0.15) {
      playerDamage *= 2;
      sounds.crit.play();
      flashScreen("player");
    }
    if (Math.random() < 0.15) {
      enemyDamage *= 2;
      sounds.crit.play();
      flashScreen("enemy");
    }

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

  let result = playerHP > enemyHP ? "win" : "lose";

  if (result === "win") {
    balance += bet * multiplier;
    sounds.win.play();
    showResult("win", bet * multiplier);
  } else {
    balance -= bet;
    sounds.lose.play();
    showResult("lose", bet);
  }

  // Обновляем баланс
  document.getElementById("balance").innerText = balance.toFixed(3);
  localStorage.setItem("balance", balance.toFixed(3));
});

function updateHpBar(id, hp) {
  const bar = document.getElementById(id);
  bar.style.width = hp + "%";

  if (hp > 50) {
    bar.style.backgroundColor = `rgb(0, 200, 0)`;
  } else {
    let red = 255 - (hp * 5);
    let green = hp * 5;
    bar.style.backgroundColor = `rgb(${red},${green},0)`;
  }
}

function flashScreen(type) {
  const overlay = document.getElementById("resultOverlay");
  overlay.style.backgroundColor = type === "player" ? "rgba(0,255,0,0.2)" : "rgba(255,0,0,0.2)";
  overlay.style.opacity = 1;
  setTimeout(() => overlay.style.opacity = 0, 100);
}

function showResult(type, amount) {
  const overlay = document.getElementById("resultOverlay");
  overlay.style.opacity = 1;
  overlay.style.fontSize = "42px";
  overlay.style.textAlign = "center";

  if (type === "win") {
    overlay.style.color = "lime";
    overlay.innerHTML = `VICTORY!<br>+${amount.toFixed(3)} ◎`;
    createConfetti("confetti");
  } else {
    overlay.style.color = "red";
    overlay.innerHTML = `DEFEAT!<br>-${amount.toFixed(3)} ◎`;
    createConfetti("skull");
  }

  setTimeout(() => overlay.style.opacity = 0, 2500);
}

function createConfetti(type) {
  for (let i = 0; i < 40; i++) {
    const c = document.createElement("div");
    c.className = type === "confetti" ? "confetti" : "skull";
    c.style.left = Math.random() * window.innerWidth + "px";
    document.body.appendChild(c);
    setTimeout(() => document.body.removeChild(c), 3000);
  }
}
