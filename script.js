document.addEventListener("DOMContentLoaded", () => {
  // ----- DATA -----
  const heroesData = [
    { name: "Pepe",    img: "images/pepe.png" },
    { name: "Doge",    img: "images/doge.png" },
    { name: "Bonk",    img: "images/bonk.png" },
    { name: "Penguin", img: "images/penguin.png" },
    { name: "Trump",   img: "images/trump.png" },
    { name: "Popcat",  img: "images/popcat.png" },
    { name: "Melania", img: "images/melania.png" },
  ];

  // ----- STATE -----
  let balance = parseFloat(localStorage.getItem("balance"));
if (isNaN(balance)) {
  balance = 3.0; // стартовый баланс только при первом запуске
  localStorage.setItem("balance", balance.toFixed(3));
}
document.getElementById("balance").innerText = balance.toFixed(3);


  const heroesDiv    = document.getElementById("heroes");
  const betSlider    = document.getElementById("bet");
  const betValueSpan = document.getElementById("betValue");
  betValueSpan.textContent = parseFloat(betSlider.value).toFixed(3);

  let playerHero = null;
  let enemyHero  = null;
  let inBattle   = false;
  let battleTimer = null;

  // ----- AUDIO -----
  const SFX = {
    attack: "sounds/attack.mp3",
    crit:   "sounds/crit.mp3",
    win:    "sounds/win.mp3",
    lose:   "sounds/lose.mp3",
    bg:     "sounds/bg.mp3",
    select: "sounds/select.mp3"
  };
  const VOL = { attack:0.5, crit:0.7, win:1.0, lose:0.9, bg:0.3, select:0.6 };

  const bg = new Audio(SFX.bg);
  bg.loop = true; bg.volume = VOL.bg;

  let audioReady = false;
  function unlockAudio() {
    if (audioReady) return;
    audioReady = true;
    bg.play().catch(()=>{});
    // легкий прогрев коротких звуков
    ["attack","crit","win","lose","select"].forEach(k=>{
      const a = new Audio(SFX[k]); a.volume=0; a.play().then(()=>{a.pause();a.currentTime=0;}).catch(()=>{});
    });
  }
  window.addEventListener("pointerdown", unlockAudio, { once:true });
  window.addEventListener("keydown",     unlockAudio, { once:true });

  function playSFX(name) {
    const src = SFX[name]; if (!src) return;
    const a = new Audio(src); a.volume = VOL[name] ?? 1.0; a.play().catch(()=>{});
  }

  // ----- UI -----
  betSlider.addEventListener("input", () => {
    betValueSpan.textContent = parseFloat(betSlider.value).toFixed(3);
  });

  heroesData.forEach(hero => {
    const card = document.createElement("div");
    card.className = "hero-card";
    card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><div>${hero.name}</div>`;
    card.addEventListener("click", () => {
      if (inBattle) return; // нельзя менять в бою
      playSFX("select");
      playerHero = { ...hero, hp: 100 };
      document.getElementById("playerHero").innerHTML = `
        <img src="${hero.img}" alt="${hero.name}">
        <div class="hp-bar"><div class="hp-fill" id="playerHp" style="width:100%"></div></div>`;
    });
    heroesDiv.appendChild(card);
  });

  function getRandomEnemy() {
    const h = heroesData[Math.floor(Math.random()*heroesData.length)];
    return { ...h, hp: 100 };
  }

  // ----- BATTLE -----
  document.getElementById("startBattle").addEventListener("click", () => {
    unlockAudio();
    if (!playerHero) { alert("Choose a hero!"); return; }
    if (inBattle) return;
    inBattle = true;

    const multiplier = parseInt(document.getElementById("multiplier").value,10);
    const bet = parseFloat(betSlider.value);
    if (balance < bet) { alert("Not enough balance!"); inBattle=false; return; }

    // показываем врага
    enemyHero = getRandomEnemy();
    document.getElementById("enemyHero").innerHTML = `
      <img src="${enemyHero.img}" alt="${enemyHero.name}">
      <div class="hp-bar"><div class="hp-fill" id="enemyHp" style="width:100%"></div></div>`;

    const logDiv = document.getElementById("log");
    logDiv.innerHTML = "";

    let playerHP = 100;
    let enemyHP  = 100;

    // шанс победы по множителю
    let winChance = 0.5;
    if (multiplier === 3) winChance = 0.3;
    if (multiplier === 5) winChance = 0.15;
    const playerShouldWin = Math.random() < winChance;

    // тик боя
    const tickMs = 600;
    clearInterval(battleTimer);
    battleTimer = setInterval(() => {
      // если кто-то уже пал
      if (playerHP <= 0 || enemyHP <= 0) {
        finish();
        return;
      }

      // урон 5..14
      let pDmg = 5 + Math.floor(Math.random()*10); // по врагу
      let eDmg = 5 + Math.floor(Math.random()*10); // по игроку

      // крит 15%
      const overlay = document.getElementById("resultOverlay");
      if (Math.random() < 0.15) { pDmg *= 2; playSFX("crit"); flash(overlay, "player"); }
      if (Math.random() < 0.15) { eDmg *= 2; playSFX("crit"); flash(overlay, "enemy"); }

      // лёгкий перекос к заданному исходу, чтобы бой выглядел естественно
      if (playerShouldWin) {
        pDmg = Math.round(pDmg * 1.2);
        eDmg = Math.max(1, Math.round(eDmg * 0.85));
      } else {
        pDmg = Math.max(1, Math.round(pDmg * 0.85));
        eDmg = Math.round(eDmg * 1.2);
      }

      playSFX("attack");

      // применяем урон
      playerHP = Math.max(0, playerHP - eDmg);
      enemyHP  = Math.max(0, enemyHP  - pDmg);

      updateHP("playerHp", playerHP);
      updateHP("enemyHp",  enemyHP);

      logDiv.innerHTML += `Player hits ${pDmg}, Enemy hits ${eDmg}<br>`;
      logDiv.scrollTop = logDiv.scrollHeight;

      // завершаем при нуле
      if (playerHP <= 0 || enemyHP <= 0) {
        finish();
      }
    }, tickMs);

    function finish() {
      clearInterval(battleTimer);

      const playerWon = playerShouldWin;
      if (playerWon) {
        balance += bet * multiplier;
        playSFX("win");
        showResult("VICTORY!", `+${(bet*multiplier).toFixed(3)} ◎ SOL`, true);
      } else {
        balance -= bet;
        playSFX("lose");
        showResult("DEFEAT!", `-${bet.toFixed(3)} ◎ SOL`, false);
      }
      balanceEl.textContent = balance.toFixed(3);
      localStorage.setItem("balance", balance.toFixed(3));
      inBattle = false;
    }
  });

  // ----- HP BAR -----
  function updateHP(id, hp) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.width = hp + "%";

    let r, g;
    if (hp > 50) {
      const t = (100 - hp) / 50; // 0..1
      r = Math.round(255 * t);
      g = 255;
    } else {
      const t = hp / 50; // 1..0
      r = 255;
      g = Math.round(255 * t);
    }
    el.style.backgroundColor = `rgb(${r},${g},0)`;
  }

  // ----- HIT FLASH -----
  function flash(overlay, who) {
    if (!overlay) return;
    overlay.style.backgroundColor = (who === "player") ? "rgba(0,255,0,0.18)" : "rgba(255,0,0,0.18)";
    overlay.style.opacity = 1;
    setTimeout(() => { overlay.style.opacity = 0; }, 120);
  }

  // ----- RESULT MODAL + EFFECTS -----
  const modal   = document.getElementById("resultModal");
  const effects = document.getElementById("effectsContainer");
  const titleEl = document.getElementById("resultTitle");
  const amtEl   = document.getElementById("resultAmount");
  const closeBtn= document.getElementById("closeModal");

  function showResult(title, amount, victory) {
    titleEl.textContent  = title;
    titleEl.style.color  = victory ? "lime" : "red";
    amtEl.textContent    = amount;

    modal.classList.remove("victory","defeat","show");
    modal.classList.add(victory ? "victory" : "defeat", "show");
    modal.setAttribute("aria-hidden", "false");

    effects.innerHTML = "";
    if (victory) {
      createConfetti(effects, 110, 2400, 4200);
      launchFireworks(effects, 6);
    } else {
      createSkulls(effects, 80, 2400, 4200);
    }
  }

  function hideModal() {
    modal.classList.remove("show","victory","defeat");
    modal.setAttribute("aria-hidden", "true");
    effects.innerHTML = "";
  }

  closeBtn.addEventListener("click", hideModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) hideModal(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("show")) hideModal(); });

  // ----- EFFECTS -----
  function createConfetti(container, count=80, minDur=2000, maxDur=4000) {
    for (let i=0;i<count;i++){
      const delay = Math.random()*1500;
      setTimeout(() => {
        const c = document.createElement("div");
        c.className = "confetti";
        c.style.left = Math.random()*100 + "%";
        c.style.width = c.style.height = (Math.random()*8 + 4) + "px";
        c.style.backgroundColor = `hsl(${Math.random()*360},100%,55%)`;
        c.style.animationDuration = (Math.random()*(maxDur-minDur)+minDur) + "ms";
        container.appendChild(c);
        setTimeout(()=>c.remove(), maxDur+1200);
      }, delay);
    }
  }

  function createSkulls(container, count=50, minDur=2000, maxDur=4000) {
    for (let i=0;i<count;i++){
      const delay = Math.random()*1500;
      setTimeout(() => {
        const s = document.createElement("div");
        s.className = "skull";
        s.textContent = "💀";
        s.style.left = Math.random()*100 + "%";
        s.style.fontSize = (Math.random()*18 + 22) + "px";
        s.style.animationDuration = (Math.random()*(maxDur-minDur)+minDur) + "ms";
        container.appendChild(s);
        setTimeout(()=>s.remove(), maxDur+1200);
      }, delay);
    }
  }

  function launchFireworks(container, bursts=5) {
    for (let i=0;i<bursts;i++){
      const delay = Math.random()*1200;
      setTimeout(() => {
        const f = document.createElement("div");
        f.className = "firework";
        f.style.left = (15 + Math.random()*70) + "%";
        f.style.top  = (20 + Math.random()*60) + "%";
        const hue = Math.floor(Math.random()*360);
        f.style.borderColor = `hsl(${hue},100%,60%)`;
        container.appendChild(f);
        setTimeout(()=>f.remove(), 1400);
      }, delay);
    }
  }
});
