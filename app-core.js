const STORAGE_KEY = 'taskSwitchV1';
const now = () => new Date();
const fmtTime = d => new Intl.DateTimeFormat('ja-JP',{hour:'2-digit',minute:'2-digit'}).format(d);

const defaultState = {
  xp: 0,
  energy: 'mid',
  interests: ['game','collect','choice'],
  tasks: [
    {id: crypto.randomUUID(), title:'算数プリント', emoji:'🧮', minutes:20, subject:'算数', completed:false, started:false, strategy:null, startedAt:null, switches:0},
    {id: crypto.randomUUID(), title:'漢字 20個', emoji:'✏️', minutes:15, subject:'国語', completed:false, started:false, strategy:null, startedAt:null, switches:0},
    {id: crypto.randomUUID(), title:'明日の持ち物', emoji:'🎒', minutes:5, subject:'準備', completed:false, started:false, strategy:null, startedAt:null, switches:0}
  ],
  events: []
};

let state = load();
let mode = 'child';

const strategyCatalog = {
  tiny: {name:'1問だけ', icon:'🧩', desc:'最小単位まで小さくする'},
  timer: {name:'3分タイマー', icon:'⏱️', desc:'3分だけやって終了してもOK'},
  race: {name:'タイムアタック', icon:'🔥', desc:'短い時間でどこまで行けるか挑戦'},
  choice: {name:'二択', icon:'🧭', desc:'始め方を自分で選ぶ'},
  together: {name:'いっしょに開始', icon:'🤝', desc:'最初の1つだけ伴走する'},
  game: {name:'XPミッション', icon:'🎮', desc:'着手そのものにXPをつける'},
  random: {name:'ガチャ', icon:'🎲', desc:'次の一手をランダム決定'}
};

function load(){
  try{ return {...structuredClone(defaultState), ...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}; }
  catch{ return structuredClone(defaultState); }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function log(type, text, taskId=null, strategy=null){
  state.events.unshift({id:crypto.randomUUID(), type, text, taskId, strategy, ts:Date.now()});
  state.events = state.events.slice(0,120); save(); render();
}

function render(){
  document.getElementById('xpValue').textContent = state.xp;
  document.querySelectorAll('.energy-chip').forEach(b=>b.classList.toggle('active', b.dataset.energy===state.energy));
  const remain = 30 - (state.xp % 30 || (state.xp ? 30 : 0));
  const progress = state.xp % 30;
  document.getElementById('treasureRemain').textContent = state.xp && progress===0 ? 30 : 30-progress;
  document.getElementById('treasureBar').style.width = `${(progress/30)*100}%`;
  document.getElementById('treasureIcon').textContent = progress >= 24 ? '✨🎁' : '🎁';
  renderTasks(); renderParent();
}

function renderTasks(){
  const list = document.getElementById('taskList'); list.innerHTML='';
  const tpl = document.getElementById('taskTemplate');
  state.tasks.forEach(task=>{
    const node=tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id=task.id; node.classList.toggle('completed',task.completed);
    node.querySelector('.task-emoji').textContent=task.emoji;
    node.querySelector('.task-title').textContent=task.title;
    const strategy = task.strategy ? `・${strategyCatalog[task.strategy].name}` : '';
    node.querySelector('.task-meta').textContent=`${task.minutes}分くらい${strategy}`;
    node.querySelector('.start-btn').textContent = task.started ? '再開' : 'START';
    node.querySelector('.task-main').addEventListener('click',()=>openTask(task.id));
    node.querySelector('.start-btn').addEventListener('click',()=>startTask(task.id));
    node.querySelector('.switch-btn').addEventListener('click',()=>switchTask(task.id));
    node.querySelector('.done-btn').addEventListener('click',()=>completeTask(task.id));
    list.appendChild(node);
  });
}

