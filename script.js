// ===== DATA =====
const heroesData = [
  { name: "Pepe",    img: "images/pepe.png" },
  { name: "Doge",    img: "images/doge.png" },
  { name: "Bonk",    img: "images/bonk.png" },
  { name: "Penguin", img: "images/penguin.png" },
  { name: "Trump",   img: "images/trump.png" },
  { name: "Popcat",  img: "images/popcat.png" },
  { name: "Melania", img: "images/melania.png" },
];

// ===== STATE =====
let balance = parseFloat(localStorage.getItem("balance")) || 3.0;
document.getElementById("balance").innerText = balance.toFixed(3);

const heroesDiv = document.getElementById("heroes");
const betSlider = document.getElementById("bet");
const betValueSpan = document.getElementById("betValue");
betValueSpan.innerText = parseFloat(betSlider.value).toFixed(3);

let playerHero = null;
let enemyHero  = null;
let inBattle   = false;
let audioUnlocked = false;

// ===== AUDIO (MP3 из папки sounds/) =====
const sounds = {
  attack: new Audio("sounds/attack.mp3"),
  crit:   new Audio("sounds/crit.mp3"),
  win:    new Audio("sounds/win.mp3"),
  lose:   new Audio("sounds/lose.mp3"),
  bg:     new Audio("sounds/bg.mp3"),
};
// Предзагрузка и громкости
for (const k in sounds) sounds[k].preload = "auto";
sounds.bg.loop = true; sounds.bg.volume = 0.30;
sounds.attack.volume = 0.50;
sounds.crit.volume   = 0.70;
sounds.win.volume    = 1.00;
sounds.lose.volume   = 0.90;

// Разрешение воспроизведения после первого взаимодействия
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;

  // Пытаемся запустить фон (если блокируется — просто игнор)
  sounds.bg.play().catch(()=>{});

  // "Прайм" эффектов (некоторые браузеры требуют жест)
  const toPrime = [sounds.attack, sounds.crit, sounds.win, sounds.lose];
  toPrime.forEach(a => {
    try {
      a.muted = true;
      a.currentTime = 0;
      a.play().then(() => { a.pause(); a.muted = false; }).catch(()=>{ a.muted = false; });
    } catch {}
  });
}
window.addEventListener("pointerdown", unlockAudio, { once: true });

// Воспроизведение SFX с клонированием (чтобы звуки могли накладываться)
function playSFX(name) {
  const src = sounds[name];
  if (!src) return;
  const a = src.cloneNode(true);
  a.volume = src.volume;
  a.play().catch(()=>{});
  // автоудаление
  setTimeout(() => a.remove(), 15000);
}

// ===== UI BUILD =====
betSlider.addEventListener("input", () => {
  betValueSpan.innerText = parseFloat(betSlider.value).toFixed(3);
});

heroesData.forEach(hero => {
  const card = document.createElement("div");
  card.className = "hero-card";
  card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><div>${hero.name}</div>`;
  card.addEventListener("click", () => {
    if (inBattle) return;              // нельзя менять героя в бою
    playerHero = { ...hero, hp: 100 }; // 100 HP в начале
    document.getElementById("playerHero").innerHTML = `
      <img src="${hero.img}" alt="${hero.name}">
      <div class="hp-bar"><div class="hp-fill" id="playerHp" style="width:100%"></div></div>`;
  });
  heroesDiv.appendChild(card);
});

function getRandomEnemy() {
  return { ...heroesData[Math.floor(Math.random()*heroesData.length)], hp: 100 };
}

// ===== BATTLE =====
document.getElementById("startBattle").addEventListener("click", startBattle);
function startBattle() {
  unlockAudio(); // на всякий случай продублируем
  if (!playerHero) { alert("Choose a hero!"); return; }
  if (inBattle) return;
  inBattle = true;

  const multiplier = parseInt(document.getElementById("multiplier").value, 10);
  const bet = parseFloat(betSlider.value);
  if (balance < bet) { alert("Not enough balance!"); inBattle = false; return; }

  enemyHero = getRandomEnemy();
  document.getElementById("enemyHero").innerHTML = `
    <img src="${enemyHero.img}" alt="${enemyHero.name}">
    <div class="hp-bar"><div class="hp-fill" id="enemyHp" style="width:100%"></div></div>`;

  const logDiv = document.getElementById("log");
  logDiv.innerHTML = "";

  let playerHP = 100;
  let enemyHP  = 100;

  // Пошаговый бой до падения одного из HP
  const step = async () => {
    if (playerHP <= 0 || enemyHP <= 0) { finish(); return; }

    // задержка между ударами
    await new Promise(r => setTimeout(r, 500 + Math.random()*150));

    // базовый урон 5..14
    let playerDamage = (5 + Math.floor(Math.random()*10));
    let enemyDamage  = (5 + Math.floor(Math.random()*10));

    // крит 15%
    if (Math.random() < 0.15) { playerDamage *= 2; playSFX("crit"); }
    if (Math.random() < 0.15) { enemyDamage  *= 2; playSFX("crit"); }

    // звуки атаки (чуть позже, чтобы не слипались с критом)
    setTimeout(()=> playSFX("attack"), 40);

    // наносим урон синхронно
    playerHP = Math.max(0, playerHP - enemyDamage);
    enemyHP  = Math.max(0, enemyHP  - playerDamage);

    updateHP("playerHp", playerHP);
    updateHP("enemyHp",  enemyHP);

    logDiv.innerHTML += `Player hits ${playerDamage}, Enemy hits ${enemyDamage}<br>`;
    logDiv.scrollTop = logDiv.scrollHeight;

    // продолжаем до нуля
    step();
  };

  step();

  // Завершение: шанс победы по множителю (x2 50%, x3 30%, x5 15%)
  function finish() {
    // Итог по вероятности (как ты просил), независимо от HP исхода анимации боя.
    let winChance = 0.5;
    if (multiplier === 3) winChance = 0.3;
    if (multiplier === 5) winChance = 0.15;

    const isWin = Math.random() < winChance;

    if (isWin) {
      balance += bet * multiplier;
      playSFX("win");
      showResult("VICTORY!", `+${(bet*multiplier).toFixed(3)} ◎ SOL`, true);
    } else {
      balance -= bet;
      playSFX("lose");
      showResult("DEFEAT!", `-${bet.toFixed(3)} ◎ SOL`, false);
    }

    document.getElementById("balance").innerText = balance.toFixed(3);
    localStorage.setItem("balance", balance.toFixed(3));
    inBattle = false;
  }
}

// ===== HP BAR =====
// Цвет: >50% — от зелёного к жёлтому; <=50% — от жёлтого к красному
function updateHP(id, hp) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.width = hp + "%";

  let r, g;
  if (hp > 50) {           // 100..50 -> зелёный -> жёлтый (R 0..255, G 255)
    const t = (100 - hp) / 50;  // 0..1
    r = Math.round(255 * t);
    g = 255;
  } else {                 // 50..0 -> жёлтый -> красный (R 255, G 255..0)
    const t = hp / 50;          // 1..0
    r = 255;
    g = Math.round(255 * t);
  }
  el.style.backgroundColor = `rgb(${r},${g},0)`;
}

// ===== RESULT MODAL + EFFECTS =====
const modal        = document.getElementById("resultModal");
const modalContent = document.getElementById("modalContent");
const effects      = document.getElementById("effectsContainer");
const titleEl      = document.getElementById("resultTitle");
const amountEl     = document.getElementById("resultAmount");
const closeBtn     = document.getElementById("closeModal");

function showResult(title, amount, victory) {
  titleEl.textContent  = title;
  titleEl.style.color  = victory ? "lime" : "red";
  amountEl.textContent = amount;

  // классы для мерцания
  modal.classList.remove("victory","defeat");
  modal.classList.add(victory ? "victory" : "defeat");

  // очищаем и запускаем эффекты внутри модалки
  effects.innerHTML = "";
  if (victory) {
    createConfetti(effects, 100, 2500, 4200); // больше и медленнее
    launchFireworks(effects, 6);              // салюты
  } else {
    createSkulls(effects, 70, 2500, 4200);    // больше и медленнее
  }

  // показываем окно
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

// закрытие по кнопке, клику снаружи и Esc
closeBtn.addEventListener("click", hideModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) hideModal();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("show")) hideModal();
});
function hideModal() {
  modal.classList.remove("show", "victory", "defeat");
  modal.setAttribute("aria-hidden", "true");
  effects.innerHTML = "";
}

// ===== EFFECTS HELPERS =====
// Конфетти: распределённый запуск во времени, случайный размер/скорость
function createConfetti(container, count = 80, minDur = 2000, maxDur = 4000) {
  for (let i = 0; i < count; i++) {
    const delay = Math.random() * 1500; // разнесём появление
    setTimeout(() => {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "%";
      c.style.width = c.style.height = (Math.random() * 8 + 4) + "px";
      c.style.backgroundColor = `hsl(${Math.random()*360},100%,55%)`;
      c.style.animationDuration = (Math.random() * (maxDur - minDur) + minDur) + "ms";
      container.appendChild(c);
      setTimeout(() => c.remove(), maxDur + 1000);
    }, delay);
  }
}

// Черепа: тоже распределяем во времени
function createSkulls(container, count = 50, minDur = 2000, maxDur = 4000) {
  for (let i = 0; i < count; i++) {
    const delay = Math.random() * 1500;
    setTimeout(() => {
      const s = document.createElement("div");
      s.className = "skull";
      s.textContent = "💀";
      s.style.left = Math.random() * 100 + "%";
      s.style.fontSize = (Math.random() * 18 + 22) + "px";
      s.style.animationDuration = (Math.random() * (maxDur - minDur) + minDur) + "ms";
      container.appendChild(s);
      setTimeout(() => s.remove(), maxDur + 1000);
    }, delay);
  }
}

// Салюты: круговые вспышки в случайных местах модалки
function launchFireworks(container, bursts = 5) {
  for (let i = 0; i < bursts; i++) {
    const delay = Math.random() * 1200;
    setTimeout(() => {
      const f = document.createElement("div");
      f.className = "firework";
      f.style.left = (15 + Math.random() * 70) + "%";
      f.style.top  = (20 + Math.random() * 60) + "%";
      const hue = Math.floor(Math.random()*360);
      f.style.borderColor = `hsl(${hue},100%,60%)`;
      container.appendChild(f);
      setTimeout(() => f.remove(), 1400);
    }, delay);
  }
}
