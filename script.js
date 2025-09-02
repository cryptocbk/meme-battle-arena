const playerSelect = document.getElementById('playerSelect');
const multiplierSelect = document.getElementById('multiplierSelect');
const betSlider = document.getElementById('betSlider');
const betAmount = document.getElementById('betAmount');
const solBalanceEl = document.getElementById('solBalance');
const startBtn = document.getElementById('startBtn');

const playerNameEl = document.getElementById('playerName');
const enemyNameEl = document.getElementById('enemyName');
const playerImgEl = document.getElementById('playerImg');
const enemyImgEl = document.getElementById('enemyImg');
const playerHPBar = document.getElementById('playerHP');
const enemyHPBar = document.getElementById('enemyHP');
const playerHPValue = document.getElementById('playerHPValue');
const enemyHPValue = document.getElementById('enemyHPValue');
const playerAtkEl = document.getElementById('playerAtk');
const enemyAtkEl = document.getElementById('enemyAtk');
const playerDefEl = document.getElementById('playerDef');
const enemyDefEl = document.getElementById('enemyDef');
const playerSkillEl = document.getElementById('playerSkill');
const enemySkillEl = document.getElementById('enemySkill');
const battleField = document.getElementById('battleField');
const battleLogContainer = document.getElementById('battleLogContainer');
const battleLogEl = document.getElementById('battleLog');
const resultModal = document.getElementById('resultModal');
const resultText = document.getElementById('resultText');
const playAgainBtn = document.getElementById('playAgainBtn');

const heroesData = {
  Pepe: { img: 'images/pepe.png' },
  Doge: { img: 'images/doge.png' },
  Bonk: { img: 'images/bonk.png' },
  Penguin: { img: 'images/penguin.png' },
  Trump: { img: 'images/trump.png' },
  Popcat: { img: 'images/popcat.png' },
  Melania: { img: 'images/melania.png' }
};

let playerStats={}, enemyStats={}, battleActive=false, log=[];
let solBalance = 3;

betSlider.addEventListener('input',()=>{
  betAmount.textContent = parseFloat(betSlider.value).toFixed(3);
});

function randInt(min,max){ return Math.floor(Math.random()*(max-min)+min); }
function generateStats(hero){
  return {name:hero,hp:randInt(80,120),atk:randInt(10,25),def:randInt(5,15),skill:['Poison','Heal','Block','Fury'][randInt(0,4)],poisonCounter:0};
}

function updateHPBar(bar,hp){
  bar.style.width = hp + '%';
  if(hp>50) bar.style.background='linear-gradient(to right,#4caf50,#00e676)';
  else if(hp>25) bar.style.background='linear-gradient(to right,#ff9800,#ff5722)';
  else bar.style.background='linear-gradient(to right,#f44336,#b71c1c)';
}

function updateUI(){
  playerNameEl.textContent=playerStats.name;
  enemyNameEl.textContent=enemyStats.name;
  playerImgEl.src=heroesData[playerStats.name].img;
  enemyImgEl.src=heroesData[enemyStats.name].img;
  playerHPValue.textContent=playerStats.hp;
  enemyHPValue.textContent=enemyStats.hp;
  playerAtkEl.textContent=playerStats.atk;
  enemyAtkEl.textContent=enemyStats.atk;
  playerDefEl.textContent=playerStats.def;
  enemyDefEl.textContent=enemyStats.def;
  playerSkillEl.textContent=playerStats.skill;
  enemySkillEl.textContent=enemyStats.skill;
  updateHPBar(playerHPBar,playerStats.hp);
  updateHPBar(enemyHPBar,enemyStats.hp);
}

function logMessage(msg){ log.push(msg); battleLogEl.innerHTML=log.join('<br>'); battleLogEl.scrollTop=battleLogEl.scrollHeight; }

function showHitEffect(heroEl){
  const effect = document.createElement('div');
  effect.classList.add('hitEffect');
  heroEl.appendChild(effect);
  setTimeout(()=> effect.remove(),500);
}

function attackTurn(attacker,defender){
  let damage = Math.max(attacker.atk - defender.def,1);
  defender.hp = Math.max(defender.hp - damage,0);
  logMessage(`${attacker.name} hits ${defender.name} for ${damage}`);
  const defenderEl = defender===playerStats? playerImgEl.parentElement : enemyImgEl.parentElement;
  showHitEffect(defenderEl);
  if(attacker.skill==="Block") attacker.def = Math.floor(attacker.def*1.3);
  if(attacker.skill==="Fury") attacker.atk = Math.floor(attacker.atk*1.2);
  if(attacker.skill==="Poison") defender.poisonCounter=3;
  if(defender.poisonCounter>0){ defender.hp = Math.max(defender.hp-5,0); defender.poisonCounter--; logMessage(`${defender.name} takes 5 poison damage!`);}
}

function battleLoop(){
  if(!battleActive) return;
  if(playerStats.hp<=0 || enemyStats.hp<=0){ battleActive=false; showResultModal(); return; }
  const attackerIsPlayer = Math.random()>0.5;
  if(attackerIsPlayer) attackTurn(playerStats,enemyStats);
  else attackTurn(enemyStats,playerStats);
  updateUI();
  setTimeout(battleLoop,1000);
}

function showResultModal(){
  let multiplier = parseInt(multiplierSelect.value);
  let bet = parseFloat(betSlider.value);
  let resultMsg = '';
  let solChange = 0;
  if(playerStats.hp<=0 && enemyStats.hp<=0) resultMsg = `Draw!`;
  else if(playerStats.hp<=0){ resultMsg = `You lost!`; solChange = -bet*multiplier; }
  else{ resultMsg = `You won!`; solChange = bet*multiplier; }
  solBalance = Math.max(solBalance + solChange,0);
  solBalanceEl.textContent = solBalance.toFixed(3);
  resultText.textContent = `${resultMsg} ${solChange>0?'+':'-'}${Math.abs(solChange).toFixed(3)} SOL`;
  resultModal.classList.remove('hidden');
}

startBtn.addEventListener('click',()=>{
  const selected = playerSelect.value;
  if(!selected) return alert("Select a hero!");
  playerStats = generateStats(selected);

  const enemyOptions = Object.keys(heroesData).filter(h=>h!==selected);
  const multiplier = parseInt(multiplierSelect.value);
  let enemyChoice = enemyOptions[randInt(0,enemyOptions.length)];
  if(multiplier>2){
    const chance = multiplier===2?0.5:multiplier===3?0.3:0.15;
    if(Math.random()>chance) enemyChoice = enemyOptions[randInt(0,enemyOptions.length)];
  }
  enemyStats = generateStats(enemyChoice);

  log=[]; battleLogEl.innerHTML='';
  battleField.classList.remove('hidden');
  battleLogContainer.classList.remove('hidden');
  resultModal.classList.add('hidden');

  updateUI();
  battleActive=true;
  setTimeout(battleLoop,1000);
  setTimeout(()=>{ if(battleActive){ battleActive=false; showResultModal(); }},30000);
});

playAgainBtn.addEventListener('click',()=>{
  playerStats={}; enemyStats={}; log=[]; battleActive=false;
  battleField.classList.add('hidden');
  battleLogContainer.classList.add('hidden');
  resultModal.classList.add('hidden');
  playerSelect.value=''; multiplierSelect.value='2'; betSlider.value=0.5; betAmount.textContent='0.5';
});
