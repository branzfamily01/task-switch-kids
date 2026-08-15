const STORAGE_KEY = 'taskSwitchV3';
const LEGACY_KEY = 'taskSwitchV1';
const DEMO_TITLES = new Set(['算数プリント','漢字 20個','明日の持ち物']);
const fmtTime = d => new Intl.DateTimeFormat('ja-JP',{hour:'2-digit',minute:'2-digit'}).format(d);

const rewardCars = [
  {id:'speedtail', name:'McLaren Speedtail', short:'McLAREN SPEEDTAIL', unlock:20, className:'speedtail', badge:'HYPER GT'},
  {id:'amggtr', name:'Mercedes-AMG GT R', short:'AMG GT R', unlock:45, className:'amggtr', badge:'GREEN HELL'},
  {id:'toyota86', name:'Toyota 86', short:'TOYOTA 86', unlock:75, className:'toyota86', badge:'FR SPORTS'},
  {id:'trueno', name:'Toyota Sprinter Trueno', short:'SPRINTER TRUENO', unlock:110, className:'trueno', badge:'AE86 LEGEND'},
  {id:'gtr', name:'Nissan GT-R', short:'NISSAN GT-R', unlock:150, className:'gtr', badge:'AWD MONSTER'},
  {id:'f40', name:'Ferrari F40', short:'FERRARI F40', unlock:195, className:'f40', badge:'TWIN TURBO'},
  {id:'gt3', name:'Porsche 911 GT3', short:'911 GT3', unlock:245, className:'gt3', badge:'TRACK ICON'},
  {id:'aventador', name:'Lamborghini Aventador', short:'AVENTADOR', unlock:300, className:'aventador', badge:'V12 FLAGSHIP'}
];

const defaultState = {
  xp: 0,
  energy: 'mid',
  interests: ['game','collect','race','choice'],
  tasks: [],
  events: []
};

let state = load();
let mode = 'child';
let timerSession = null;

const strategyCatalog = {
  tiny: {name:'1問だけ', icon:'◼', desc:'最小単位まで小さくする', timer:0},
  timer: {name:'3分タイマー', icon:'⏱', desc:'3分だけ走る。鳴ったら続けるか決める', timer:180},
  race: {name:'2分タイムアタック', icon:'⚡', desc:'2分でどこまで進めるか挑戦する', timer:120},
  choice: {name:'二択スタート', icon:'⇆', desc:'始める場所を自分で選ぶ', timer:0},
  together: {name:'ピットクルー', icon:'🤝', desc:'最初の30秒だけ誰かと一緒に始める', timer:0},
  game: {name:'XPミッション', icon:'★', desc:'着手そのものをポイントにする', timer:0},
  random: {name:'ルーレット', icon:'🎲', desc:'次の一手をランダムに決める', timer:0}
};

function cloneDefault(){ return structuredClone(defaultState); }

function load(){
  try{
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(current) return {...cloneDefault(), ...current, tasks:Array.isArray(current.tasks)?current.tasks:[]};

    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY)||'null');
    if(legacy){
      const migrated = {...cloneDefault(), ...legacy};
      migrated.tasks = (legacy.tasks||[]).filter(t=>!DEMO_TITLES.has(t.title));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  }catch{}
  return cloneDefault();
}

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function log(type, text, taskId=null, strategy=null){
  state.events.unshift({id:crypto.randomUUID(), type, text, taskId, strategy, ts:Date.now()});
  state.events = state.events.slice(0,160);
  save();
  render();
}

function unlockedCars(xp=state.xp){ return rewardCars.filter(c=>xp>=c.unlock); }
function nextCar(xp=state.xp){ return rewardCars.find(c=>xp<c.unlock) || null; }
function carMarkup(car, unlocked=false, compact=false){
  return `<div class="car-art ${car.className} ${unlocked?'unlocked':'locked'} ${compact?'is-compact':''}" aria-label="${car.name}">
    <div class="car-glow"></div>
    <svg viewBox="0 0 420 150" role="img" aria-hidden="true">
      <path class="car-body" d="M35 99 C58 80,88 68,132 61 C168 38,213 29,270 39 C307 45,331 62,350 76 L384 83 C396 85,404 96,403 108 L399 117 L357 117 C352 134,338 143,320 143 C300 143,286 134,280 117 L126 117 C120 134,106 143,87 143 C68 143,54 133,49 117 L23 117 C21 108,24 103,35 99 Z"/>
      <path class="car-window" d="M143 62 C171 43,207 37,250 43 C273 46,295 56,316 74 L137 74 Z"/>
      <circle class="wheel" cx="88" cy="116" r="24"/><circle class="wheel-hub" cx="88" cy="116" r="10"/>
      <circle class="wheel" cx="321" cy="116" r="24"/><circle class="wheel-hub" cx="321" cy="116" r="10"/>
      <path class="car-line" d="M48 95 L349 95"/>
    </svg>
  </div>`;
}

function render(){
  document.getElementById('xpValue').textContent = state.xp;
  document.querySelectorAll('.energy-chip').forEach(b=>b.classList.toggle('active', b.dataset.energy===state.energy));
  renderUnlockProgress();
  renderTasks();
  renderGarage();
  renderParent();
}

function renderUnlockProgress(){
  const next = nextCar();
  const unlocked = unlockedCars();
  const prevThreshold = unlocked.length ? unlocked[unlocked.length-1].unlock : 0;
  if(next){
    const span = Math.max(1,next.unlock-prevThreshold);
    const progress = Math.min(1,Math.max(0,(state.xp-prevThreshold)/span));
    document.getElementById('nextUnlockTitle').textContent = next.short;
    document.getElementById('nextUnlockMeta').textContent = `${next.badge} / ${next.unlock} XPでアンロック`;
    document.getElementById('carRemain').textContent = Math.max(0,next.unlock-state.xp);
    document.getElementById('carProgressBar').style.width = `${progress*100}%`;
    document.getElementById('nextCarMini').textContent = `NEXT: ${next.short}`;
    document.getElementById('nextCarVisual').innerHTML = carMarkup(next,false,true);
  }else{
    document.getElementById('nextUnlockTitle').textContent = 'GARAGE COMPLETE';
    document.getElementById('nextUnlockMeta').textContent = 'すべてのマシンをアンロック！';
    document.getElementById('carRemain').textContent = '0';
    document.getElementById('carProgressBar').style.width = '100%';
    document.getElementById('nextCarMini').textContent = 'ALL CARS UNLOCKED';
    document.getElementById('nextCarVisual').innerHTML = carMarkup(rewardCars[rewardCars.length-1],true,true);
  }
}

function renderTasks(){
  const list = document.getElementById('taskList');
  const empty = document.getElementById('emptyState');
  list.innerHTML='';
  empty.hidden = state.tasks.length > 0;
  const tpl = document.getElementById('taskTemplate');
  state.tasks.forEach((task,index)=>{
    const node=tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id=task.id;
    node.classList.toggle('completed',task.completed);
    node.querySelector('.task-number').textContent=`MISSION ${String(index+1).padStart(2,'0')}`;
    node.querySelector('.task-emoji').textContent=task.emoji;
    node.querySelector('.task-title').textContent=task.title;
    const strategy = task.strategy ? ` / ${strategyCatalog[task.strategy]?.name||''}` : '';
    node.querySelector('.task-meta').textContent=`${task.subject} / ${task.minutes}分目安${strategy}`;
    node.querySelector('.task-status').textContent = task.completed ? 'CLEAR' : task.started ? 'CONTINUE' : 'SELECT';
    node.querySelector('.task-select-btn').addEventListener('click',()=>openMission(task.id));
    node.querySelector('.delete-task-btn').addEventListener('click',()=>deleteTask(task.id));
    list.appendChild(node);
  });
}

function renderGarage(){
  const grid=document.getElementById('garageGrid');
  const unlockedIds=new Set(unlockedCars().map(c=>c.id));
  document.getElementById('garageCount').textContent=unlockedIds.size;
  document.getElementById('garageTotal').textContent=rewardCars.length;
  grid.innerHTML=rewardCars.map(car=>{
    const unlocked=unlockedIds.has(car.id);
    return `<article class="garage-card ${unlocked?'unlocked':'locked'}">
      <div class="garage-badge">${unlocked?'UNLOCKED':`${car.unlock} XP`}</div>
      ${carMarkup(car,unlocked)}
      <div class="garage-copy"><strong>${car.short}</strong><span>${car.badge}</span></div>
    </article>`;
  }).join('');
}
