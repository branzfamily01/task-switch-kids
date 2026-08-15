function renderParent(){
  const starts=state.events.filter(e=>e.type==='start');
  const switches=state.events.filter(e=>e.type==='switch');
  const completions=state.events.filter(e=>e.type==='complete');
  const startedTaskIds=new Set(starts.map(e=>e.taskId).filter(Boolean));
  const completedStartedIds=new Set(completions.map(e=>e.taskId).filter(id=>startedTaskIds.has(id)));
  document.getElementById('startRate').textContent=startedTaskIds.size?Math.round((completedStartedIds.size/startedTaskIds.size)*100)+'%':'—';
  document.getElementById('switchRate').textContent=starts.length?Math.round((switches.length/starts.length)*100)+'%':'—';
  const elapsed=[];
  state.tasks.forEach(t=>{
    if(t.startedAt){
      const complete=state.events.find(e=>e.type==='complete'&&e.taskId===t.id);
      if(complete) elapsed.push(Math.max(1,Math.round((complete.ts-t.startedAt)/60000)));
    }
  });
  document.getElementById('avgStart').textContent=elapsed.length?`${Math.round(elapsed.reduce((a,b)=>a+b,0)/elapsed.length)}分`:'—';

  const stats={};
  Object.keys(strategyCatalog).forEach(k=>stats[k]={start:0,complete:0});
  state.events.forEach(e=>{
    if(e.strategy&&stats[e.strategy]){
      if(e.type==='start'||e.type==='switch') stats[e.strategy].start++;
      if(e.type==='complete') stats[e.strategy].complete++;
    }
  });
  const rows=Object.entries(stats)
    .map(([k,v])=>({k,...v,rate:v.start?Math.min(100,Math.round((v.complete/v.start)*100)):0}))
    .filter(x=>x.start)
    .sort((a,b)=>b.rate-a.rate);
  document.getElementById('strategyStats').innerHTML=rows.length
    ? rows.map(r=>`<div class="strategy-row"><span class="strategy-name">${strategyCatalog[r.k].icon} ${strategyCatalog[r.k].name}</span><span class="strategy-bar"><i style="width:${r.rate}%"></i></span><strong>${r.rate}%</strong></div>`).join('')
    : '<p class="hint">まだデータがありません。ミッションを選んで「この作戦でスタート」を使うと記録されます。</p>';

  document.getElementById('eventLog').innerHTML=state.events.length
    ? state.events.slice(0,16).map(e=>`<div class="event-item"><time>${fmtTime(new Date(e.ts))}</time>${e.text}</div>`).join('')
    : '<p class="hint">行動ログはまだありません。</p>';
  document.querySelectorAll('#interestGrid input').forEach(i=>i.checked=state.interests.includes(i.value));
}

function chooseStrategy(task){
  const candidates=[];
  const interests=new Set(state.interests);
  if(state.energy==='low') candidates.push('tiny','timer','together');
  if(state.energy==='mid') candidates.push('timer','choice','game','tiny');
  if(state.energy==='high') candidates.push('race','game','random','choice');
  if(interests.has('race')) candidates.push('race','timer');
  if(interests.has('game')) candidates.push('game');
  if(interests.has('choice')) candidates.push('choice');
  if(interests.has('together')) candidates.push('together');
  if(interests.has('collect')) candidates.push('game','race');
  const unique=[...new Set(candidates)];
  return unique[Math.floor(Math.random()*unique.length)] || 'tiny';
}

function strategyStep(key){
  const steps={
    tiny:'教材を開いて、最初の1問だけ見る。答えまで行かなくてOK。',
    timer:'下のタイマーをその場でスタート。3分で止めても成功。',
    race:'下の2分タイマーで、どこまで進めるか記録に挑戦。',
    choice:'「最初の1問」か「いちばん簡単そうな1問」のどちらかを選ぶ。',
    together:'誰かに「30秒だけ一緒に」と頼んで、最初の操作までやる。',
    game:'この画面を閉じたら即スタート。着手で +2 XP。',
    random:'ページを開き、目についた1問から始める。順番は無視してOK。'
  };
  return steps[key]||steps.tiny;
}

function openMission(id){
  const task=state.tasks.find(t=>t.id===id); if(!task)return;
  if(task.completed){
    openModal(`<p class="kicker">MISSION CLEAR</p><h2>${task.emoji} ${escapeHtml(task.title)}</h2><p>このミッションは完了済みです。</p><button class="big-action" data-close>閉じる</button>`);
    return;
  }
  const recommended=task.strategy || chooseStrategy(task);
  task.strategy=recommended;
  save();
  showStrategyDecision(task,false);
}

function showStrategyDecision(task, switched=false){
  const s=strategyCatalog[task.strategy];
  openModal(`<p class="kicker">02 / CHOOSE STRATEGY</p>
    <h2>${escapeHtml(task.title)}</h2>
    <div class="mission-summary"><span>${task.subject}</span><span>約${task.minutes}分</span></div>
    <div class="strategy-hero ${switched?'switched':''}">
      <span class="strategy-icon">${s.icon}</span>
      <div><small>${switched?'NEW STRATEGY':'RECOMMENDED'}</small><strong>${s.name}</strong><p>${s.desc}</p></div>
    </div>
    <div class="micro-step"><strong>最初にやること</strong>${strategyStep(task.strategy)}</div>
    <button class="big-action" data-confirm-start="${task.id}">この作戦でスタート</button>
    <button class="switch-action" data-switch-strategy="${task.id}">↻ 別の作戦に変える</button>
    <p class="button-note">上が「決定」。下は「今の作戦が合わない時だけ」使います。</p>`);
}

function confirmStart(id){
  const task=state.tasks.find(t=>t.id===id); if(!task||task.completed)return;
  if(!task.started){
    task.started=true;
    task.startedAt=Date.now();
    state.xp += 2;
    log('start',`「${task.title}」を ${strategyCatalog[task.strategy].name} で開始。 +2XP`,task.id,task.strategy);
  }else{
    save();
  }
  showActiveStrategy(task);
}

function switchStrategy(id){
  const task=state.tasks.find(t=>t.id===id); if(!task||task.completed)return;
  const previous=task.strategy;
  const keys=Object.keys(strategyCatalog).filter(k=>k!==previous);
  const preferred=chooseStrategy(task);
  task.strategy = preferred!==previous ? preferred : keys[Math.floor(Math.random()*keys.length)];
  task.switches=(task.switches||0)+1;
  save();
  log('switch',`「${task.title}」の作戦を ${strategyCatalog[task.strategy].name} に変更。`,task.id,task.strategy);
  showStrategyDecision(task,true);
}

function showActiveStrategy(task){
  const s=strategyCatalog[task.strategy];
  const timerHtml=s.timer?timerPanelHtml(task,s.timer):'';
  openModal(`<p class="kicker">03 / GO</p>
    <h2>${s.icon} ${s.name}</h2>
    <p class="active-task-title">${escapeHtml(task.title)}</p>
    <div class="micro-step active"><strong>今はこれだけ</strong>${strategyStep(task.strategy)}</div>
    ${timerHtml}
    <div class="active-actions">
      <button class="big-action success" data-complete-task="${task.id}">✓ できた！ミッションクリア</button>
      <button class="switch-action" data-switch-strategy="${task.id}">↻ 進まないので作戦を変える</button>
    </div>`);
  if(s.timer) initializeTimer(task.id,s.timer);
}

function timerPanelHtml(task, seconds){
  return `<section class="timer-panel" data-timer-task="${task.id}">
    <div class="timer-label">ONBOARD TIMER</div>
    <div id="timerDisplay" class="timer-display">${formatSeconds(seconds)}</div>
    <div class="timer-track"><span id="timerTrack"></span></div>
    <div class="timer-controls">
      <button data-timer-action="start">▶ START</button>
      <button data-timer-action="pause">Ⅱ PAUSE</button>
      <button data-timer-action="reset">↺ RESET</button>
    </div>
  </section>`;
}

function initializeTimer(taskId,total){
  stopTimerInterval();
  timerSession={taskId,total,remaining:total,running:false,interval:null};
  updateTimerDisplay();
}

function startTimer(){
  if(!timerSession||timerSession.running)return;
  if(timerSession.remaining<=0) timerSession.remaining=timerSession.total;
  timerSession.running=true;
  timerSession.interval=setInterval(()=>{
    timerSession.remaining=Math.max(0,timerSession.remaining-1);
    updateTimerDisplay();
    if(timerSession.remaining<=0){
      stopTimerInterval();
      timerSession.running=false;
      const panel=document.querySelector('.timer-panel');
      panel?.classList.add('finished');
      const display=document.getElementById('timerDisplay');
      if(display) display.textContent='FINISH!';
      if(navigator.vibrate) navigator.vibrate([150,80,150]);
    }
  },1000);
}

function pauseTimer(){ if(timerSession){ stopTimerInterval(); timerSession.running=false; } }
function resetTimer(){ if(timerSession){ stopTimerInterval(); timerSession.running=false; timerSession.remaining=timerSession.total; document.querySelector('.timer-panel')?.classList.remove('finished'); updateTimerDisplay(); } }
function stopTimerInterval(){ if(timerSession?.interval){ clearInterval(timerSession.interval); timerSession.interval=null; } }
function formatSeconds(sec){ const m=Math.floor(sec/60); const s=sec%60; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function updateTimerDisplay(){
  if(!timerSession)return;
  const display=document.getElementById('timerDisplay');
  const track=document.getElementById('timerTrack');
  if(display) display.textContent=formatSeconds(timerSession.remaining);
  if(track) track.style.width=`${((timerSession.total-timerSession.remaining)/timerSession.total)*100}%`;
}
