(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const panels = $$('.stage-panel');
  const tabs = $$('[data-stage-tab]');
  const yearButtons = $$('[data-year]');
  const years = {
    7: ['foundation', '初一 · 24—32 小时 / 年', '从迷宫与井字棋开始。先把状态、动作和正确性讲清楚。'],
    8: ['probability', '初二 · 30—40 小时 / 年', '先做 HMM 与 BPE，让动态规划和字符串算法接上 AI。'],
    9: ['probability', '初三 · 24—32 小时 / 年', '研究 Q-learning 与 MCTS。中考或竞赛紧张时，择一深入。'],
    10: ['neural', '高一 · 48—64 小时 / 年', '补齐导数、向量和矩阵。动手写自动求导，再训练一个小模型。'],
    11: ['research', '高二 · 48—72 小时 / 年', '选择一个方向，用一学期做公平比较，保留原始结果与失败。'],
    12: ['research', '高三 · 16—24 小时 / 年', '复核已有研究，整理可复现报告与答辩，按竞赛安排降低拓展频率。']
  };
  let selectedYear = '7';
  let activeStage = 'foundation';

  function setYear(year) {
    if (!years[year]) return;
    selectedYear = String(year);
    yearButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.year === selectedYear)));
    $('#year-note-title').textContent = years[year][1];
    $('#year-note-text').textContent = years[year][2];
  }

  function setStage(stage, updateHash = false) {
    if (!panels.some(p => p.id === `stage-${stage}`)) return;
    activeStage = stage;
    panels.forEach(p => { p.hidden = p.id !== `stage-${stage}`; });
    tabs.forEach(b => {
      const active = b.dataset.stageTab === stage;
      b.setAttribute('aria-selected', String(active));
      b.tabIndex = active ? 0 : -1;
    });
    if (years[selectedYear][0] !== stage) {
      setYear(Object.keys(years).find(y => years[y][0] === stage));
    }
    if (updateHash) history.replaceState(null, '', `#stage-${stage}`);
  }

  $('.stage-tabs').setAttribute('role', 'tablist');
  panels.forEach(p => p.setAttribute('role', 'tabpanel'));
  tabs.forEach((button, index) => {
    button.setAttribute('role', 'tab');
    button.addEventListener('click', () => setStage(button.dataset.stageTab, true));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next].focus();
      setStage(tabs[next].dataset.stageTab, true);
    });
  });
  yearButtons.forEach(button => button.addEventListener('click', () => {
    setYear(button.dataset.year);
    setStage(years[button.dataset.year][0]);
    history.replaceState(null, '', `#year-${button.dataset.year}`);
  }));

  function followHash() {
    const id = location.hash.slice(1);
    if (id.startsWith('year-') && years[id.slice(5)]) {
      setYear(id.slice(5));
      setStage(years[id.slice(5)][0]);
    } else if (id.startsWith('stage-')) {
      setStage(id.slice(6));
    } else {
      const target = document.getElementById(id);
      const panel = target?.closest('.stage-panel');
      if (panel) {
        setStage(panel.id.slice(6));
        const detail = target.matches('.project-card') ? $('details', target) : target.closest('details');
        if (detail) detail.open = true;
      }
    }
  }
  setStage(activeStage);
  followHash();
  window.addEventListener('hashchange', followHash);

  const storageKey = 'oi-ai-roadmap-progress-v1';
  const checks = $$('[data-task]');
  const validTasks = new Set(checks.map(input => input.dataset.task));
  let saved = [];
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(raw)) saved = raw.filter(id => validTasks.has(id));
  } catch { /* Storage is optional; the page works without it. */ }
  checks.forEach(input => { input.checked = saved.includes(input.dataset.task); });
  function showProgress() {
    const chosen = checks.filter(input => input.checked).map(input => input.dataset.task);
    $('#progress-total').textContent = `${String(chosen.length).padStart(2, '0')} / ${checks.length}`;
    $$('[data-project-count]').forEach(counter => {
      const count = chosen.filter(id => id.startsWith(`${counter.dataset.projectCount}-`)).length;
      counter.textContent = `${count} / 4 项自查`;
    });
    return chosen;
  }
  showProgress();
  checks.forEach(input => input.addEventListener('change', () => {
    const chosen = showProgress();
    try { localStorage.setItem(storageKey, JSON.stringify(chosen)); } catch { /* No persistence available. */ }
  }));

  const paperCards = $$('.paper-card');
  const paperFilters = $$('[data-paper-filter]');
  let paperFilter = 'all';
  function filterPapers() {
    const terms = $('#paper-search').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let count = 0;
    paperCards.forEach(card => {
      const match = (paperFilter === 'all' || card.dataset.group === paperFilter)
        && terms.every(term => card.dataset.search.includes(term));
      card.hidden = !match;
      if (match) count++;
    });
    $('#paper-count').textContent = `找到 ${count} / ${paperCards.length} 篇论文与基础文献`;
    $('#paper-empty').hidden = count !== 0;
  }
  $('#paper-search').addEventListener('input', filterPapers);
  paperFilters.forEach(button => button.addEventListener('click', () => {
    paperFilter = button.dataset.paperFilter;
    paperFilters.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    filterPapers();
  }));

  const maps = {
    detour: ['############', '#S...#.....#', '#.##.#.###.#', '#..#...#...#', '##.###.#.#.#', '#......#.#G#', '#........#.#', '############'],
    open: ['############', '#S.........#', '#.########.#', '#..........#', '#.########.#', '#..........#', '#.........G#', '############'],
    blocked: ['############', '#S...#.....#', '#.##.#.###.#', '#..#...#...#', '##.###.#.###', '#......#.#G#', '#........###', '############']
  };
  let algorithm = 'bfs';
  let mapName = 'detour';
  let frames = [];
  let frameIndex = 0;
  let timer = null;
  let cells = [];
  let result;

  // The demo computes both searches on the actual map; no canned node counts.
  function search(kind, rows) {
    const width = rows[0].length;
    const field = rows.join('');
    const start = field.indexOf('S');
    const goal = field.indexOf('G');
    const heuristic = pos => Math.abs(pos % width - goal % width)
      + Math.abs(Math.floor(pos / width) - Math.floor(goal / width));
    const distances = new Map([[start, 0]]);
    const parent = new Map();
    const closed = new Set();
    const open = [{ pos: start, g: 0, h: heuristic(start), seq: 0 }];
    const history = [];
    let sequence = 1;
    let found = false;
    let last = start;
    while (open.length) {
      if (kind === 'astar') open.sort((a, b) => (a.g + a.h) - (b.g + b.h) || a.h - b.h || a.seq - b.seq);
      const node = open.shift();
      if (closed.has(node.pos) || distances.get(node.pos) !== node.g) continue;
      closed.add(node.pos);
      last = node.pos;
      if (node.pos === goal) found = true;
      else {
        const r = Math.floor(node.pos / width), c = node.pos % width;
        for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= rows.length || nc < 0 || nc >= width) continue;
          const next = nr * width + nc;
          if (field[next] === '#' || closed.has(next)) continue;
          const g = node.g + 1;
          if (g >= (distances.get(next) ?? Infinity)) continue;
          distances.set(next, g);
          parent.set(next, node.pos);
          open.push({ pos: next, g, h: heuristic(next), seq: sequence++ });
        }
      }
      history.push({ visited: [...closed], frontier: [...new Set(open.filter(n => !closed.has(n.pos)).map(n => n.pos))], current: node.pos, done: false });
      if (found) break;
    }
    const path = [];
    if (found) {
      for (let node = goal; node !== undefined; node = parent.get(node)) path.unshift(node);
    }
    const length = found ? distances.get(goal) : null;
    if (history.length) Object.assign(history[history.length - 1], { done: true, path, found });
    return { frames: history, path, found, length, expanded: closed.size, last, start, goal };
  }

  function pause() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    $('#maze-play').textContent = '自动运行';
    $('#maze-play').setAttribute('aria-pressed', 'false');
  }

  function draw() {
    const frame = frameIndex ? frames[frameIndex - 1] : null;
    const visited = new Set(frame?.visited || []);
    const frontier = new Set(frame?.frontier || [result.start]);
    const path = new Set(frame?.done ? result.path : []);
    cells.forEach((cell, index) => {
      cell.classList.toggle('visited', visited.has(index));
      cell.classList.toggle('frontier', frontier.has(index));
      cell.classList.toggle('path', path.has(index));
      cell.classList.toggle('current', frame?.current === index);
    });
    $('#maze-expanded').textContent = String(visited.size);
    $('#maze-length').textContent = frame?.done ? (result.found ? String(result.length) : '无路') : '—';
    if (frame?.done) {
      $('#maze-status').textContent = result.found
        ? `${algorithm === 'bfs' ? 'BFS' : 'A*'} 找到最短路径：${result.length} 条边，展开 ${result.expanded} 个节点。`
        : `${algorithm === 'bfs' ? 'BFS' : 'A*'} 已检查所有可达节点，终点不可达。`;
      $('#maze-step').disabled = true;
      pause();
    } else {
      $('#maze-step').disabled = false;
      $('#maze-status').textContent = frame
        ? `第 ${frameIndex} 步：展开第 ${Math.floor(frame.current / 12) + 1} 行、第 ${frame.current % 12 + 1} 列的节点。`
        : '点击单步，看第一个节点如何展开。';
    }
  }

  function resetMaze() {
    pause();
    const rows = maps[mapName];
    result = search(algorithm, rows);
    frames = result.frames;
    frameIndex = 0;
    $('#maze-comparison').hidden = true;
    const board = $('#maze');
    board.replaceChildren();
    cells = [...rows.join('')].map((symbol, index) => {
      const cell = document.createElement('span');
      cell.className = `cell${symbol === '#' ? ' wall' : ''}${symbol === 'S' ? ' start' : ''}${symbol === 'G' ? ' goal' : ''}`;
      cell.textContent = symbol === 'S' || symbol === 'G' ? symbol : '';
      cell.setAttribute('aria-label', `第 ${Math.floor(index / 12) + 1} 行第 ${index % 12 + 1} 列，${symbol === '#' ? '障碍' : symbol === 'S' ? '起点' : symbol === 'G' ? '终点' : '可通行'}`);
      board.append(cell);
      return cell;
    });
    draw();
  }

  function step() {
    if (frameIndex < frames.length) frameIndex++;
    draw();
  }

  $('#maze-step').addEventListener('click', () => { pause(); step(); });
  $('#maze-reset').addEventListener('click', resetMaze);
  $('#maze-play').addEventListener('click', () => {
    if (timer !== null) { pause(); return; }
    if (frameIndex >= frames.length) resetMaze();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      frameIndex = frames.length;
      draw();
      return;
    }
    const tick = () => {
      timer = null;
      step();
      if (frameIndex < frames.length) {
        timer = setTimeout(tick, 130);
        $('#maze-play').textContent = '暂停';
        $('#maze-play').setAttribute('aria-pressed', 'true');
      }
    };
    tick();
  });
  $$('[data-algorithm]').forEach(button => button.addEventListener('click', () => {
    algorithm = button.dataset.algorithm;
    $$('[data-algorithm]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    resetMaze();
  }));
  $('#maze-map').addEventListener('change', event => {
    mapName = event.target.value;
    resetMaze();
  });
  $('#maze-compare').addEventListener('click', () => {
    pause();
    const results = [['BFS', search('bfs', maps[mapName])], ['A*', search('astar', maps[mapName])]];
    const body = $('#maze-comparison tbody');
    body.replaceChildren();
    for (const [name, data] of results) {
      const row = document.createElement('tr');
      for (const value of [name, data.expanded, data.found ? data.length : '不可达']) {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        row.append(cell);
      }
      body.append(row);
    }
    frameIndex = frames.length;
    draw();
    $('#maze-comparison').hidden = false;
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  document.addEventListener('labchange', event => { if (event.detail.id !== 'search') pause(); });
  resetMaze();

  // Open native details for printing, then restore the reader's view afterwards.
  let printState = null;
  function preparePrint() {
    if (printState) return;
    pause();
    printState = { details: $$('details').map(d => [d, d.open]), hidden: [...panels, ...paperCards].map(el => [el, el.hidden]) };
    printState.details.forEach(([detail]) => { detail.open = true; });
    printState.hidden.forEach(([el]) => { el.hidden = false; });
  }
  function restorePrint() {
    if (!printState) return;
    printState.details.forEach(([detail, open]) => { detail.open = open; });
    printState.hidden.forEach(([el, hidden]) => { el.hidden = hidden; });
    printState = null;
  }
  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('afterprint', restorePrint);
  $('#print-plan').addEventListener('click', () => window.print());
})();
