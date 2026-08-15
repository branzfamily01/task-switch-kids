function completeTask(id){
  const task=state.tasks.find(t=>t.id===id); if(!task||task.completed)return;
  const before=state.xp;
  stopTimerInterval();
  task.completed=true;
  state.xp+=10;
  save();
  const newlyUnlocked=rewardCars.filter(car=>before<car.unlock && state.xp>=car.unlock);
  log('complete',`「${task.title}」完了！ +10XP`,task.id,task.strategy);
  if(newlyUnlocked.length){
    const car=newlyUnlocked[0];
    openModal(`<p class="kicker">NEW CAR UNLOCKED</p>
      <h2>🏁 NEW MACHINE!</h2>
      ${carMarkup(car,true)}
      <div class="unlock-celebration"><strong>${car.short}</strong><span>${car.badge}</span></div>
      <p>ミッションクリアで新しいマシンを獲得！ガレージに追加されました。</p>
      <button class="big-action" data-close>ガレージへ戻る</button>`);
  }else{
    const next=nextCar();
    openModal(`<p class="kicker">MISSION CLEAR</p><h2>✓ CLEAR +10 XP</h2>
      <p>「${escapeHtml(task.title)}」完了。</p>
      <div class="micro-step"><strong>${next?`次は ${next.short}`:'GARAGE COMPLETE'}</strong>${next?`あと ${Math.max(0,next.unlock-state.xp)} XPでアンロック。`:'すべてのマシンを獲得済み！'}</div>
      <button class="big-action" data-close>つぎへ</button>`);
  }
}

function deleteTask(id){
  const task=state.tasks.find(t=>t.id===id); if(!task)return;
  if(!confirm(`「${task.title}」を削除しますか？`))return;
  state.tasks=state.tasks.filter(t=>t.id!==id);
  state.events=state.events.filter(e=>e.taskId!==id);
  save();
  render();
}

function openZero(){
  const options=[
    ['教材を出すだけ','机に出す・ページを開く。そこで終わってもOK。','tiny'],
    ['1問だけ見る','答えなくていい。読むだけで成功。','tiny'],
    ['2分だけ走る','その場でタイマーを使って2分だけ。','race'],
    ['ピットクルーを呼ぶ','誰かと最初の30秒だけ一緒に。','together']
  ];
  openModal(`<p class="kicker">RESCUE MODE</p><h2>やる気ゼロから発進</h2>
    <p>「全部やる」は考えません。いちばんラクそうな入口を1つ選ぶ。</p>
    <div class="choice-grid">${options.map((o,i)=>`<button class="choice-btn" data-zero="${i}"><strong>${o[0]}</strong><small>${o[1]}</small></button>`).join('')}</div>`);
}

function addTaskForm(){
  openModal(`<p class="kicker">NEW MISSION</p><h2>今日やることを追加</h2>
    <div class="field"><label>やること</label><input id="newTitle" placeholder="例：算数の宿題 4ページ" maxlength="60" /></div>
    <div class="field"><label>ジャンル</label><select id="newSubject"><option>算数</option><option>国語</option><option>理科</option><option>社会</option><option>英語</option><option>準備</option><option>生活</option><option>その他</option></select></div>
    <div class="field"><label>だいたい何分？</label><input id="newMinutes" type="number" min="1" max="180" value="10" /></div>
    <button class="big-action" id="saveTaskBtn">このミッションを追加</button>`);
  setTimeout(()=>document.getElementById('newTitle')?.focus(),50);
}

function addTask(){
  const title=document.getElementById('newTitle')?.value.trim();
  if(!title){ document.getElementById('newTitle')?.focus(); return; }
  const subject=document.getElementById('newSubject').value;
  const minutes=Math.max(1,Math.min(180,Number(document.getElementById('newMinutes').value)||10));
  const emojiMap={算数:'🧮',国語:'✏️',理科:'🔬',社会:'🌏',英語:'🔤',準備:'🎒',生活:'🏠',その他:'🎯'};
  state.tasks.push({id:crypto.randomUUID(),title,emoji:emojiMap[subject]||'🎯',minutes,subject,completed:false,started:false,strategy:null,startedAt:null,switches:0});
  save();
  log('add',`新しいミッション「${title}」を追加。`);
  closeModal();
}

function escapeHtml(value=''){
  return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

function openModal(html){
  stopTimerInterval();
  timerSession=null;
  document.getElementById('modalContent').innerHTML=html;
  const modal=document.getElementById('modal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
}

function closeModal(){
  stopTimerInterval();
  timerSession=null;
  const modal=document.getElementById('modal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
}

document.getElementById('modeBtn').addEventListener('click',()=>{
  mode = mode==='child'?'parent':'child';
  document.getElementById('childView').classList.toggle('active',mode==='child');
  document.getElementById('parentView').classList.toggle('active',mode==='parent');
  document.getElementById('modeBtn').textContent=mode==='child'?'PILOT':'PARENT';
  document.getElementById('modeBtn').setAttribute('aria-label', mode==='child'?'親モードへ切り替え':'子どもモードへ切り替え');
  renderParent();
});

document.querySelectorAll('.energy-chip').forEach(btn=>btn.addEventListener('click',()=>{
  state.energy=btn.dataset.energy;
  save();
  render();
  log('energy',`コンディションを「${btn.textContent.trim().replace(/\s+/g,' ')}」に設定。`);
}));

document.getElementById('zeroBtn').addEventListener('click',openZero);
document.getElementById('addTaskBtn').addEventListener('click',addTaskForm);
document.getElementById('resetBtn').addEventListener('click',()=>{
  if(confirm('TASK SWITCHの保存データをすべてリセットしますか？')){
    localStorage.removeItem(STORAGE_KEY);
    state=cloneDefault();
    save();
    render();
  }
});
document.getElementById('interestGrid').addEventListener('change',e=>{
  if(e.target.matches('input')){
    state.interests=[...document.querySelectorAll('#interestGrid input:checked')].map(i=>i.value);
    save();
    render();
  }
});

document.getElementById('modal').addEventListener('click',e=>{
  if(e.target.matches('[data-close], .modal-backdrop')){ closeModal(); return; }

  const confirmStartBtn=e.target.closest('[data-confirm-start]');
  if(confirmStartBtn){ confirmStart(confirmStartBtn.dataset.confirmStart); return; }

  const switchBtn=e.target.closest('[data-switch-strategy]');
  if(switchBtn){ switchStrategy(switchBtn.dataset.switchStrategy); return; }

  const completeBtn=e.target.closest('[data-complete-task]');
  if(completeBtn){ completeTask(completeBtn.dataset.completeTask); return; }

  const timerBtn=e.target.closest('[data-timer-action]');
  if(timerBtn){
    ({start:startTimer,pause:pauseTimer,reset:resetTimer})[timerBtn.dataset.timerAction]?.();
    return;
  }

  const zero=e.target.closest('[data-zero]');
  if(zero){
    const options=[
      {label:'教材を出すだけ',strategy:'tiny'},
      {label:'1問だけ見る',strategy:'tiny'},
      {label:'2分だけ走る',strategy:'race'},
      {label:'ピットクルーを呼ぶ',strategy:'together'}
    ];
    const picked=options[Number(zero.dataset.zero)];
    state.xp+=1;
    save();
    log('zero',`RESCUE MODEで「${picked.label}」を選択。 +1XP`);
    if(picked.strategy==='race'){
      const tempTask={id:'rescue',title:'RESCUE MODE',strategy:'race'};
      openModal(`<p class="kicker">RESCUE TIMER</p><h2>2分だけ走る</h2>${timerPanelHtml(tempTask,120)}<button class="big-action" data-close>終わる</button>`);
      initializeTimer('rescue',120);
    }else{
      openModal(`<p class="kicker">RESCUE START</p><h2>${picked.label}</h2><p>これだけできたら今日は発進成功。</p><button class="big-action" data-close>やってみる</button>`);
    }
    return;
  }

  if(e.target.id==='saveTaskBtn') addTask();
});

document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}

render();
