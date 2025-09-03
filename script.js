document.addEventListener("DOMContentLoaded", () => {
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
  let battleActive = false;

  // 🎵 Звуки
  const sounds = {
    attack: new Audio("sounds/attack.mp3"),
    crit: new Audio("sounds/crit.mp3"),
    win: new Audio("sounds/win.mp3"),
    lose: new Audio("sounds/lose.mp3"),
    bg: new Audio("sounds/bg.mp3"),
    select: new Audio("sounds/select.mp3") // ✅ звук выбора героя
  };

  // громкость
  sounds.bg.loop = true; sounds.bg.volume = 0.3;
  sounds.attack.volume = 0.5;
  sounds.crit.volume = 0.7;
  sounds.win.volume = 1.0;
  sounds.lose.volume = 0.9;
  sounds.select.volume = 0.6;

  // Автозапуск музыки после первого клика
  document.addEventListener("click", () => {
    if (sounds.bg.paused) {
      sounds.bg.play().catch(err => console.log("BG audio blocked:", err));
    }
  }, { once: true });

  // 🎴 Создание карточек героев
  heroesData.forEach(hero => {
    const card = document.createElement("div");
    card.className = "hero-card";
    card.innerHTML = `<img src="${hero.img}" alt="${hero.name}"><div>${hero.name}</div>`;
    card.addEventListener("click", ()=>{
      if (battleActive) return; // нельзя менять героя во время боя

      // ✅ звук выбора героя
      sounds.select.currentTime = 0;
      sounds.select.play();

      playerHero = {...hero, hp: 100};
      document.getElementById("playerHero").innerHTML = `
        <img src="${hero.img}" alt="${hero.name}">
        <div class="hp-bar"><div class="hp-fill" id="playerHp"></div></div>`;
    });
    heroesDiv.appendChild(card);
  });

  // 🆚 Выбор врага
  function getRandomEnemy() {
    return {...heroesData[Math.floor(Math.random() * heroesData.length)], hp: 100};
  }

  // 🎮 Запуск боя
  document.getElementById("startBattle").addEventListener("click", async()=>{
    if (!playerHero){ alert("Choose a hero!"); return; }
    if (battleActive) return;

    battleActive = true;
    const multiplier = parseInt(document.getElementById("multiplier").value);
    let bet = parseFloat(document.getElementById("bet").value);
    if(balance < bet){ alert("Not enough balance!"); battleActive=false; return; }

    enemyHero = getRandomEnemy();
    document.getElementById("enemyHero").innerHTML = `
      <img src="${enemyHero.img}" alt="${enemyHero.name}">
      <div class="hp-bar"><div class="hp-fill" id="enemyHp"></div></div>`;

    const logDiv = document.getElementById("log");
    logDiv.innerHTML = "";

    let playerHP = playerHero.hp, enemyHP = enemyHero.hp;

    // Шанс победы по множителю
    let winChance = 0.5;
    if (multiplier === 3) winChance = 0.3;
    if (multiplier === 5) winChance = 0.15;

    // Бой
    while(playerHP > 0 && enemyHP > 0){
      await new Promise(r => setTimeout(r, 500));

      let playerDamage = Math.floor(Math.random()*10 + 5);
      let enemyDamage = Math.floor(Math.random()*10 + 5);

      if(Math.random()<0.15){ playerDamage *= 2; sounds.crit.play(); flashScreen("player"); }
      if(Math.random()<0.15){ enemyDamage *= 2; sounds.crit.play(); flashScreen("enemy"); }

      sounds.attack.play();

      playerHP -= enemyDamage; 
      enemyHP -= playerDamage;

      if(playerHP < 0) playerHP = 0; 
      if(enemyHP < 0) enemyHP = 0;

      updateHpBar("playerHp", playerHP);
      updateHpBar("enemyHp", enemyHP);

      logDiv.innerHTML += `Player hits ${playerDamage}, Enemy hits ${enemyDamage}<br>`;
      logDiv.scrollTop = logDiv.scrollHeight;
    }

    // Итог
    let didWin = Math.random() < winChance;
    if (didWin){ balance += bet*multiplier; sounds.win.play(); showResult("win", bet*multiplier); }
    else { balance -= bet; sounds.lose.play(); showResult("lose", bet); }

    document.getElementById("balance").innerText = balance.toFixed(3);
    localStorage.setItem("balance", balance.toFixed(3));
    battleActive = false;
  });

  // ⚡ ХП бар
  function updateHpBar(id, hp){
    const el = document.getElementById(id);
    if(!el) return;
    el.style.width = hp + "%";

    // постепенное краснение
    if(hp > 50) el.style.backgroundColor = "green";
    else if(hp > 20) el.style.backgroundColor = "orange";
    else el.style.backgroundColor = "red";
  }

  // Эффект удара
  function flashScreen(type){
    const overlay = document.getElementById("resultOverlay");
    overlay.style.backgroundColor = type==="player" ? "rgba(0,255,0,0.2)" : "rgba(255,0,0,0.2)";
    overlay.style.opacity = 1;
    setTimeout(()=>overlay.style.opacity=0,100);
  }

  // 🏆 Результат
  function showResult(type, amount){
    const modal = document.getElementById("resultModal");
    const title = document.getElementById("resultTitle");
    const amountEl = document.getElementById("resultAmount");
    const effects = document.getElementById("effectsContainer");
    effects.innerHTML = "";

    if(type==="win"){
      title.innerText = "VICTORY!";
      title.style.color = "lime";
      amountEl.innerText = `+${amount.toFixed(3)} ◎ SOL`;
      createConfetti(effects);
    } else {
      title.innerText = "DEFEAT!";
      title.style.color = "red";
      amountEl.innerText = `-${amount.toFixed(3)} ◎ SOL`;
      createSkulls(effects);
    }

    modal.style.display = "flex";
  }

  // Конфетти 🎉
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

  // Черепа 💀
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

  // Закрытие модалки
  document.getElementById("closeModal").addEventListener("click", ()=>{
    document.getElementById("resultModal").style.display="none";
  });
});
