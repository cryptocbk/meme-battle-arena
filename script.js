const heroesData = {
  Pepe: { img: 'images/pepe.png' },
  Doge: { img: 'images/doge.png' },
  Bonk: { img: 'images/bonk.png' },
  Penguin: { img: 'images/penguin.png' },
  Trump: { img: 'images/trump.png' },
  Popcat: { img: 'images/popcat.png' },
  Melania: { img: 'images/melania.png' }
};

const skills = ["Poison", "Heal", "Block", "Fury"];

const playerSelect = document.getElementById('player-select');
const startBtn = document.getElementById('start-battle');
const playAgainBtn = document.getElementById('play-again');

const battleField = document.getElementById('battle-field');
const battleLogContainer = document.getElementById('battle-log-container');
const resultModal = document.getElementById('result-modal');
const resultText = document.getElementById('result-text');

const playerNameEl = document.getElementById('player-name');
const playerImgEl = document.getElementById('player-img');
const playerHpEl = document.getElementById('player-hp');
const playerHpBar = document.getElementById('player-hp-bar');
const playerStatsEl = document.getElementById('player-stats');

const enemyNameEl = document.getElementById('enemy-name');
const enemyImgEl = document.getElementById('enemy-img');
const enemyHpEl = document.getElementById('enemy-hp');
const enemyHpBar = document.getElementById('enemy-hp-bar');
const enemyStatsEl = document.getElementById('enemy-stats');

const battleLogEl = document.getElementById('battle-log');

let player = null;
let enemy = null;
let playerStats = {};
let enemyStats = {};
let log = [];
let battleActive = false;

// Утилиты
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => Math.random() * (max - min) + min;

function generateStats(name) {
  return {
    name,
    hp: randInt(80, 120),
    atk: randInt(15, 30),
    def: randInt(5, 15),
    critChance: randInt(5, 20),
    critMult: randFloat(1.5, 2.0),
    skill: skills[randInt(0, skills.length-1)],
    skillTurns: 0,
    poisonCounter: 0
  };
}

function getHpColor(stats) {
  if(stats.skill === "Poison" && stats.poisonCounter>0) return "#ff4d4d";
  if(stats.skill === "Heal") return "#66ff66";
  if(stats.skill === "Block" && stats.skillTurns>0) return "#4da6ff";
  if(stats.skill === "Fury" && stats.skillTurns>0) return "#ff9933";
  return "green";
}

function updateUI() {
  playerNameEl.textContent = playerStats.name;
  playerImgEl.src = heroesData[playerStats.name].img;
  playerHpEl.textContent = playerStats.hp;
  playerHpBar.style.width = playerStats.hp + "%";
  playerHpBar.style.background = getHpColor(playerStats);
  playerStatsEl.textContent = `ATK:${playerStats.atk} DEF:${playerStats.def} CRIT:${playerStats.critChance}% ×${playerStats.critMult.toFixed(1)} SKILL:${playerStats.skill}`;

  enemyNameEl.textContent = enemyStats.name;
  enemyImgEl.src = heroesData[enemyStats.name].img;
  enemyHpEl.textContent = enemyStats.hp;
  enemyHpBar.style.width = enemyStats.hp + "%";
  enemyHpBar.style.background = getHpColor(enemyStats);
  enemyStatsEl.textContent = `ATK:${enemyStats.atk} DEF:${enemyStats.def} CRIT:${enemyStats.critChance}% ×${enemyStats.critMult.toFixed(1)} SKILL:${enemyStats.skill}`;
}

function logMessage(msg){
  const li = document.createElement('li');
  li.textContent = msg;
  battleLogEl.appendChild(li);
  battleLogEl.scrollTop = battleLogEl.scrollHeight;
}

function applySkill(stats, target, isPlayer){
  if(stats.skill === "Poison" && stats.poisonCounter>0){
    const dmg = randInt(3,6);
    target.hp = Math.max(target.hp - dmg, 0);
    stats.poisonCounter--;
    logMessage(`${stats.name} Poison наносит ${dmg} урона`);
  }
  if(stats.skill === "Block" && stats.skillTurns>0){
    stats.skillTurns--;
    if(stats.skillTurns===0) stats.def = Math.floor(stats.def/1.3);
  }
  if(stats.skill === "Fury" && stats.skillTurns>0){
    stats.skillTurns--;
    if(stats.skillTurns===0) stats.atk = Math.floor(stats.atk/1.2);
  }
}

function attackTurn(attacker, defender, attackerImg, defenderImg){
  applySkill(attacker, defender, attacker===playerStats);

  let damage = Math.max(attacker.atk - defender.def, 1);
  if(Math.random()*100<attacker.critChance) damage = Math.floor(damage*attacker.critMult);

  if(attacker.skill==="Heal" && Math.random()<0.3){
    const heal = randInt(8,15);
    attacker.hp = Math.min(attacker.hp + heal, attacker===playerStats?playerStats.hp:enemyStats.hp);
    logMessage(`${attacker.name} исцелился на ${heal} HP`);
  }

  defender.hp = Math.max(defender.hp - damage,0);

  // анимация
  defenderImg.style.transform = "translateX("+ (attacker===playerStats ? 10 : -10)+"px)";
  defenderImg.style.filter = "brightness(1.5)";
  setTimeout(()=>{ defenderImg.style.transform="translateX(0)"; defenderImg.style.filter="brightness(1)"; },300);

  logMessage(`${attacker.name} ударил ${defender.name} на ${damage}`);

  // скиллы активные
  if(attacker.skill==="Block") attacker.def = Math.floor(attacker.def*1.3);
  if(attacker.skill==="Fury") attacker.atk = Math.floor(attacker.atk*1.2);
  if(attacker.skill==="Poison") attacker.poisonCounter=3;
}

function battleLoop(){
  if(!battleActive) return;
  if(playerStats.hp<=0 || enemyStats.hp<=0){
    battleActive=false;
    showResultModal();
    return;
  }
  const attackerIsPlayer = Math.random()>0.5;
  if(attackerIsPlayer) attackTurn(playerStats, enemyStats, playerImgEl, enemyImgEl);
  else attackTurn(enemyStats, playerStats, enemyImgEl, playerImgEl);
  updateUI();
  setTimeout(battleLoop,1000);
}

function showResultModal(){
  let result;
  if(playerStats.hp<=0 && enemyStats.hp<=0) result="Ничья 🤝";
  else if(playerStats.hp<=0) result="Вы проиграли 😢";
  else result="Вы выиграли 🎉";
  resultText.textContent=result;
  resultModal.classList.remove('hidden');
}

startBtn.addEventListener('click',()=>{
  const selected=playerSelect.value;
  if(!selected) return alert("Выберите героя!");
  player=selected;
  const enemyOptions = Object.keys(heroesData).filter(h=>h!==player);
  const enemyChoice = enemyOptions[randInt(0,enemyOptions.length-1)];
  enemy = enemyChoice;

  playerStats = generateStats(player);
  enemyStats = generateStats(enemy);

  log=[];
  battleLogEl.innerHTML="";

  battleField.classList.remove('hidden');
  battleLogContainer.classList.remove('hidden');
  resultModal.classList.add('hidden');

  updateUI();
  battleActive=true;

  setTimeout(battleLoop,1000);

  // максимум бой 30 секунд
  setTimeout(()=>{
    if(battleActive){
      battleActive=false;
      showResultModal();
    }
  },30000);
});

playAgainBtn.addEventListener('click',()=>{
  player=null;
  enemy=null;
  playerStats={};
  enemyStats={};
  log=[];
  battleActive=false;
  battleField.classList.add('hidden');
  battleLogContainer.classList.add('hidden');
  resultModal.classList.add('hidden');
  playerSelect.value="";
});
