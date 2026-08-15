function completeTask(id){
  const task=state.tasks.find(t=>t.id===id); if(!task||task.completed)return;
  task.completed=true; state.xp+=10; save();
  log('complete',`「${task.title}」完了！ +10XP`,task.id,task.strategy);
  openModal(`<p class="kicker">MISSION CLEAR</p><h2>🎉 完了！</h2><p>最後までできたことに加えて、「始めた」ことも今日の成功。</p><div class="micro-step"><strong>+10 XP</strong>宝箱に近づいた！</div><button class="big-action" data-close>つぎへ</button>`);
}

function openTask(id){
  const t=state.tasks.find(x=>x.id===id); if(!t)return;
  openModal(`<p class="kicker">MISSION</p><h2>${t.emoji} ${t.title}</h2><p>${t.minutes}分くらい。全部を見なくてOK。最初の一手だけ選ぼう。</p><div class="choice-grid"><button class="choice-btn" data-task-action="start" data-id="${t.id}">▶ START<small>今の状態に合う作戦を自動で選ぶ</small></button><button class="choice-btn" data-task-action="switch" data-id="${t.id}">⚡ SWITCH<small>今のやり方が合わないときに変更</small></button><button class="choice-btn" data-task-action="complete" data-id="${t.id}">✓ できた<small>完了にしてXPを獲得</small></button></div>`);
}

function openZero(){
  const options=[
    ['✋','教材に触るだけ','机に出す・ページを開く。そこで終わってもOK。'],
    ['👀','1問だけ読む','答えなくていい。読むだけで成功。'],
    ['⏱️','2分だけ','タイマーが鳴ったら続けるかやめるか選べる。'],
    ['🤝','誰かと一緒に始める','最初の30秒だけ伴走してもらう。']
  ];
  openModal(`<p class="kicker">ZERO MODE</p><h2>😑 やる気ゼロ</h2><p>「全部やる」は選択肢から外します。今できそうな最小行動を1つだけ。</p><div class="choice-grid">${options.map((o,i)=>`<button class="choice-btn" data-zero="${i}">${o[0]} ${o[1]}<small>${o[2]}</small></button>`).join('')}</div>`);
}

function addTaskForm(){
  openModal(`<p class="kicker">NEW MISSION</p><h2>ミッション追加</h2><div class="field"><label>やること</label><input id="newTitle" placeholder="例：理科のプリント" /></div><div class="field"><label>ジャンル</label><select id="newSubject"><option>算数</option><option>国語</option><option>理科</option><option>社会</option><option>英語</option><option>準備</option><option>生活</option></select></div><div class="field"><label>だいたい何分？</label><input id="newMinutes" type="number" min="1" max="120" value="10" /></div><button class="big-action" id="saveTaskBtn">追加する</button>`);
  setTimeout(()=>document.getElementById('newTitle')?.focus(),50);
}

function addTask(){
  const title=document.getElementById('newTitle')?.value.trim(); if(!title)return;
  const subject=document.getElementById('newSubject').value;
  const minutes=Math.max(1,Number(document.getElementById('newMinutes').value)||10);
  const emojiMap={算数:'🧮',国語:'✏️',理科:'🔬',社会:'🌏',英語:'🔤',準備:'🎒',生活:'🏠'};
  state.tasks.push({id:crypto.randomUUID(),title,emoji:emojiMap[subject]||'📘',minutes,subject,completed:false,started:false,strategy:null,startedAt:null,switches:0}); save();
  log('add',`新しいミッション「${title}」を追加。`); closeModal();
}

function openModal(html){
  document.getElementById('modalContent').innerHTML=html;
  const modal=document.getElementById('modal'); modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
}
function closeModal(){ const m=document.getElementById('modal'); m.classList.remove('open'); m.setAttribute('aria-hidden','true'); }

// Events

document.getElementById('modeBtn').addEventListener('click',()=>{
  mode = mode==='child'?'parent':'child';
  document.getElementById('childView').classList.toggle('active',mode==='child');
  document.getElementById('parentView').classList.toggle('active',mode==='parent');
  document.getElementById('modeBtn').textContent=mode==='child'?'👦 子ども':'👩 親';
  document.getElementById('modeBtn').setAttribute('aria-label', mode==='child'?'親モードへ切り替え':'子どもモードへ切り替え');
  renderParent();
});
document.querySelectorAll('.energy-chip').forEach(btn=>btn.addEventListener('click',()=>{state.energy=btn.dataset.energy;save();render();log('energy',`エネルギーを「${btn.textContent.trim()}」に設定。`)}));
document.getElementById('zeroBtn').addEventListener('click',openZero);
document.getElementById('addTaskBtn').addEventListener('click',addTaskForm);
document.getElementById('resetBtn').addEventListener('click',()=>{if(confirm('TASK SWITCHの保存データをリセットしますか？')){localStorage.removeItem(STORAGE_KEY);state=structuredClone(defaultState);save();render();}});
document.getElementById('interestGrid').addEventListener('change',e=>{if(e.target.matches('input')){state.interests=[...document.querySelectorAll('#interestGrid input:checked')].map(i=>i.value);save();render();}});
document.getElementById('modal').addEventListener('click',e=>{
  if(e.target.matches('[data-close], .modal-backdrop')) closeModal();
  const action=e.target.closest('[data-task-action]'); if(action){ closeModal(); const id=action.dataset.id; ({start:startTask,switch:switchTask,complete:completeTask})[action.dataset.taskAction](id); }
  const startNow=e.target.closest('[data-start-now]'); if(startNow){ closeModal(); startTask(startNow.dataset.startNow); }
  const zero=e.target.closest('[data-zero]'); if(zero){ const labels=['教材に触るだけ','1問だけ読む','2分だけ','誰かと一緒に始める']; state.xp+=1; save(); log('zero',`やる気ゼロから「${labels[Number(zero.dataset.zero)]}」を選択。 +1XP`); closeModal(); }
  if(e.target.id==='saveTaskBtn') addTask();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
render();
