function renderParent(){
  const starts=state.events.filter(e=>e.type==='start');
  const switches=state.events.filter(e=>e.type==='switch');
  const completions=state.events.filter(e=>e.type==='complete');
  const successfulTaskIds=new Set(completions.map(e=>e.taskId));
  const startRate=starts.length? Math.round((successfulTaskIds.size/starts.length)*100)+'%' : '—';
  document.getElementById('startRate').textContent=startRate;
  document.getElementById('switchRate').textContent=starts.length?Math.round((switches.length/starts.length)*100)+'%':'—';
  const elapsed=[];
  state.tasks.forEach(t=>{ if(t.startedAt){ const complete=state.events.find(e=>e.type==='complete'&&e.taskId===t.id); if(complete) elapsed.push(Math.max(1,Math.round((complete.ts-t.startedAt)/60000))); }});
  document.getElementById('avgStart').textContent=elapsed.length?`${Math.round(elapsed.reduce((a,b)=>a+b,0)/elapsed.length)}分`:'—';

  const stats={};
  Object.keys(strategyCatalog).forEach(k=>stats[k]={start:0,complete:0});
  state.events.forEach(e=>{ if(e.strategy&&stats[e.strategy]){ if(e.type==='start'||e.type==='switch')stats[e.strategy].start++; if(e.type==='complete')stats[e.strategy].complete++; }});
  const rows=Object.entries(stats).map(([k,v])=>({k,...v,rate:v.start?Math.min(100,Math.round((v.complete/v.start)*100)):0})).filter(x=>x.start).sort((a,b)=>b.rate-a.rate);
  document.getElementById('strategyStats').innerHTML=rows.length?rows.map(r=>`<div class="strategy-row"><span class="strategy-name">${strategyCatalog[r.k].icon} ${strategyCatalog[r.k].name}</span><span class="strategy-bar"><i style="width:${r.rate}%"></i></span><strong>${r.rate}%</strong></div>`).join(''):'<p class="hint">まだデータがありません。STARTやSWITCHを使うと、成功パターンが見えてきます。</p>';

  document.getElementById('eventLog').innerHTML=state.events.length?state.events.slice(0,12).map(e=>`<div class="event-item"><time>${fmtTime(new Date(e.ts))}</time>${e.text}</div>`).join(''):'<p class="hint">今日の行動ログはまだありません。</p>';
  document.querySelectorAll('#interestGrid input').forEach(i=>i.checked=state.interests.includes(i.value));
}

function chooseStrategy(task){
  const energy=state.energy;
  const interests=new Set(state.interests);
  const candidates=[];
  if(energy==='low') candidates.push('tiny','timer','together');
  if(energy==='mid') candidates.push('timer','choice','game','tiny');
  if(energy==='high') candidates.push('race','game','random','choice');
  if(interests.has('game')) candidates.push('game');
  if(interests.has('race')) candidates.push('race');
  if(interests.has('choice')) candidates.push('choice');
  if(interests.has('together')) candidates.push('together');
  if(interests.has('collect')) candidates.push('game','random');
  const unique=[...new Set(candidates)];
  return unique[Math.floor(Math.random()*unique.length)] || 'tiny';
}

function startTask(id){
  const task=state.tasks.find(t=>t.id===id); if(!task||task.completed)return;
  if(!task.strategy) task.strategy=chooseStrategy(task);
  if(!task.started){ task.started=true; task.startedAt=Date.now(); }
  state.xp += 2; save();
  log('start',`「${task.title}」に着手。作戦は ${strategyCatalog[task.strategy].name}。`,task.id,task.strategy);
  showStart(task);
}

function showStart(task){
  const s=strategyCatalog[task.strategy];
  let step='最初の1問だけ見てみよう。答えを書かなくてもOK。';
  if(task.strategy==='timer') step='3分だけスタート。3分でやめても成功。';
  if(task.strategy==='race') step='2分でどこまで進めるか、記録に挑戦。';
  if(task.strategy==='choice') step='「最初の1問」か「いちばん簡単そうな1問」、好きな方から。';
  if(task.strategy==='together') step='最初の1問だけ、大人かAIに声をかけて一緒に開始。';
  if(task.strategy==='game') step='まず1アクションで +2XP。終わりより「始めた」が勝ち。';
  if(task.strategy==='random') step='ページを開いて、目についた1問を選ぶ。順番どおりじゃなくてOK。';
  openModal(`<p class="kicker">ACTIVATION</p><h2>${s.icon} ${s.name}</h2><p>${s.desc}</p><div class="micro-step"><strong>今やるのはこれだけ</strong>${step}</div><button class="big-action" data-close>できそう。やってみる</button>`);
}

function switchTask(id){
  const task=state.tasks.find(t=>t.id===id); if(!task||task.completed)return;
  const previous=task.strategy;
  let next=chooseStrategy(task);
  const keys=Object.keys(strategyCatalog);
  if(next===previous) next=keys[(keys.indexOf(next)+1)%keys.length];
  task.strategy=next; task.switches=(task.switches||0)+1; save();
  log('switch',`「${task.title}」の作戦を ${strategyCatalog[next].name} に変更。`,task.id,next);
  showSwitch(task,previous,next);
}

function showSwitch(task, previous, next){
  const s=strategyCatalog[next];
  openModal(`<p class="kicker">SWITCH</p><h2>⚡ 作戦変更</h2><p>進まないなら、がんばり方ではなく「やり方」を変える。</p><div class="micro-step"><strong>${previous?strategyCatalog[previous].name:'いまの方法'} → ${s.name}</strong>${s.icon} ${s.desc}</div><button class="big-action" data-start-now="${task.id}">この作戦で始める</button>`);
}

