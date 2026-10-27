(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('study-data').textContent);
  const byPid = new Map(data.rows.map(r => [r.pid, r]));
  const $ = s => document.querySelector(s);
  const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fill = d => `color-mix(in srgb,var(--blue) ${8 + d * 6}%,var(--paper))`;
  let selectedPid = 'P14361', gridScope = 'all';
  function selectProblem(pid) {
    const r=byPid.get(pid);if(!r)return;selectedPid=pid;
    $('#selected-problem').innerHTML=`<div class="headline"><span>${r.year} ${r.slot}</span><a href="${r.source}" target="_blank" rel="noopener noreferrer">${r.pid} ${escape(r.title)}</a><span>D${r.level} · ${escape(r.difficulty)}</span>${r.selected?'<span class="pill">61题样本</span>':''}</div><p>${escape(r.core)}</p>${r.note?`<small>${escape(r.note)}</small>`:''}`;
    document.querySelectorAll('[data-grid-pid]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gridPid===pid)));
  }
  function updateGrid() {
    document.querySelectorAll('[data-grid-pid]').forEach(b=>{
      const r=byPid.get(b.dataset.gridPid),excluded=gridScope==='selected'&&!r.selected;
      b.disabled=excluded;b.classList.toggle('out-of-scope',excluded);b.textContent=excluded?'—':`D${r.level}`;
      b.style.background=fill(r.level);
    });
    document.querySelectorAll('[data-grid-scope]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gridScope===gridScope)));
    const current=byPid.get(selectedPid);if(gridScope==='selected'&&!current.selected)selectProblem('P14361');
    $('#grid-scope-note').textContent=gridScope==='all'?'全卷 122 题；点击等级查看题名与代表性解法。':'仅显示所选 61 题；其余题位标为 —。六题卷第4题是 D2T1。';
  }
  document.querySelectorAll('[data-grid-pid]').forEach(b=>b.addEventListener('click',()=>selectProblem(b.dataset.gridPid)));
  document.querySelectorAll('[data-grid-scope]').forEach(b=>b.addEventListener('click',()=>{gridScope=b.dataset.gridScope;updateGrid();}));
  function filterTopics(){
    const q=$('#topic-query').value.trim().toLowerCase(),mode=$('#topic-mode').value;let n=0;
    document.querySelectorAll('tr[data-topic-code]').forEach(row=>{
      const t=data.topics.find(t=>t.code===row.dataset.topicCode);
      const match=(!q||(t.name+' '+t.note).toLowerCase().includes(q))&&(mode==='all'||mode==='zero'&&t.total_count===0||mode==='basic'&&t.code.startsWith('N')||mode==='special'&&!t.code.startsWith('N'));
      row.hidden=!match;if(match)n++;
      const detail=$(`[data-detail-code="${t.code}"]`),button=row.querySelector('button');
      detail.hidden=!match||button.getAttribute('aria-expanded')!=='true';
    });
    $('#topic-count').textContent=`显示 ${n} / ${data.topics.length} 项；主解与替代题目已去重，DP总类不能与子类相加。`;
    $('#topic-empty').hidden=n!==0;
  }
  document.querySelectorAll('[data-topic-toggle]').forEach(b=>b.addEventListener('click',()=>{const expanded=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!expanded));$(`[data-detail-code="${b.dataset.topicToggle}"]`).hidden=expanded;}));
  $('#topic-query').addEventListener('input',filterTopics);$('#topic-mode').addEventListener('change',filterTopics);
  function filterProblems(){
    const query=$('#problem-query').value.trim().toLowerCase(),scope=$('#problem-scope').value,year=$('#problem-year').value,level=$('#problem-level').value;
    $('#problem-table').dataset.scope=scope;let n=0;
    document.querySelectorAll('#problem-body tr').forEach(row=>{
      const r=byPid.get(row.dataset.pid);
      const show=(scope==='all'||r.selected)&&(!year||String(r.year)===year)&&(!level||String(r.level)===level)&&(!query||`${r.pid} ${r.title} ${r.core} ${r.note}`.toLowerCase().includes(query));
      row.hidden=!show;if(show)n++;
    });
    $('#problem-count').textContent=`显示 ${n} 题 · 当前范围：${scope==='all'?'全卷122题':'目标题位61题'} · 难度快照 2026-07-07`;
    $('#problem-empty').hidden=n!==0;
  }
  ['#problem-query','#problem-scope','#problem-year','#problem-level'].forEach(id=>$(id).addEventListener(id==='#problem-query'?'input':'change',filterProblems));
  selectProblem(selectedPid);updateGrid();filterTopics();filterProblems();document.documentElement.dataset.ready='true';
})();
