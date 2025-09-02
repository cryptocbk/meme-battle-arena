// Элементы
const playerSelect = document.getElementById('playerSelect');
const startBtn = document.getElementById('startBtn');
const playerNameEl = document.getElementById('playerName');
const enemyNameEl = document.getElementById('enemyName');
const playerImgEl = document.getElementById('playerImg');
const enemyImgEl = document.getElementById('enemyImg');
const playerHPBar = document.getElementById('playerHP');
const enemyHPBar = document.getElementById('enemyHP');
const battleField = document.getElementById('battleField');
const battleLogContainer = document.getElementById('battleLogContainer');
const battleLogEl = document.getElementById('battleLog');
const resultModal = document.getElementById('resultModal');
const resultText = document.getElementById('resultText');
const playAgainBtn = document.getElementById('playAgainBtn');

// Данные героев
const heroesData = {
  Pepe: { img: 'images/pepe.png' },
  Doge: { img: 'images/doge.png' },
  Bonk: { img: 'images/bonk.png' },
  Penguin: { img: 'images/penguin.png' },
  Trump: { img: 'images/trump.png' },
  Popcat: { img: 'images/popcat.png' },
  Melania: { img: 'images/melania.png' }
};

let player, enemy;
let playerStats = {}, enemyStats = {};
let battleActive = false;
let log = [];

// Рандом число
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

// Генерация характеристик
function generateStats(hero) {
  return {
    name: hero,
    hp: randInt(80, 120),
    atk: randInt(10, 25),
    def: randInt(5, 15),
    skill: ['Poison', 'Heal', 'Block', 'Fury'][randInt(0,4)],
    poisonCounter: 0
  };
}

// Обновление UI
function updateUI() {
  playerNameEl.textContent = playerStats.name;
  enemyNameEl.textContent = enemyStats.name;
  playerImgEl.src = heroesData[playerStats.name].img;
  enemyImgEl.src = heroesData[enemyStats.name].img;
  playerHPBar.style.width = playerStats.hp + '%';
  enemyHPBar.style.width = enemyStats.hp + '%';
}

// Лог
function logMessage(msg) {
  log.push(msg);
  battleLogEl.innerHTML = log.join('<br>');
  battleLogEl.scrollTop = battleLogEl.scrollHeight;
}

// Атака
function attackTurn(attacker, defender, attackerImg, defenderImg) {
  let damage = Math.max(attacker.atk - defender.def, 1);
  defender.hp = Math.max(defender.hp - damage, 0);

  // Анимация
  defenderImg.style.transform = `translateX(${attacker===playerStats?10:-10}px)`;
  defenderImg.style.filter = "brightness(1.5)";
  setTimeout(()=>{ defenderImg.style.transform="translateX(0)"; defenderImg.style.filter="brightness(1)"; },300);

  logMessage(`${attacker.name} ударил ${defender.name} на ${damage}`);

  // Скиллы
  if(attacker.skill==="Block") attacker.def = Math.floor(attacker.def*1.3);
  if(attacker.skill==="Fury") attacker.atk = Math.floor(attacker.atk*1.2);
  if(attacker.skill==="Poison") attacker.poisonCounter=3;
}

// Цикл боя
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

// Результат
function showResultModal(){
  let result;
  if(playerStats.hp<=0 && enemyStats.hp<=0) result="Ничья 🤝";
  else if(playerStats.hp<=0) result="Вы проиграли 😢";
  else result="Вы выиграли 🎉";
  resultText.textContent=result;
  resultModal.classList.remove('hidden');
}

// Старт боя
startBtn.addEventListener('click',()=>{
  const selected=playerSelect.value;
  if(!selected) return alert("Выберите героя!");
  player=selected;
  const enemyOptions = Object.keys(heroesData).filter(h=>h!==player);
  const enemyChoice = enemyOptions[randInt(0,enemyOptions.length)];
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

  // Максимум бой 30 секунд
  setTimeout(()=>{
    if(battleActive){
      battleActive=false;
      showResultModal();
    }
  },30000);
});

// Кнопка играть снова
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
