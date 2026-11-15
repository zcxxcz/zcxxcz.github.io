const get = id => document.getElementById(id);
const groups = {
  beijing: { label: "北京省队 A/B", color: "#20563f", dash: [] },
  beijingE: { label: "北京省队 A/B/E", color: "#20563f", dash: [] },
  gold: { label: "全国 NOI 金牌", color: "#97511c", dash: [7, 4] },
};
const years = Array.from({ length: 8 }, (_, index) => 2019 + index);
const grades = { 7: "七年级", 8: "八年级", 9: "九年级", 10: "高一", 11: "高二", 12: "高三" };
const metric = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });
const num = value => value == null ? "—" : metric.format(value);
const percent = value => value == null ? "—" : `${num(value)}%`;
const rawRange = row => row.low === null ? "—" : `${num(row.low)}–${num(row.high)}`;
const findNote = row => {
  if (row.event === "NOIP" && row.previous === 2022) {
    return row.group === "gold" ? "部分赛区停赛" : "北京赛区停赛";
  }
  if (row.event === "NOIP" && row.previous === 2019) return "当年未举办 NOIP";
  if (row.census === null) return "超出数据范围";
  return "";
};
const maxScore = row => row.previous === 2018 || (row.previous === 2019 && row.event === "CSP-S") ? 600 : 400;
let event = "CSP-S";
let data;
let current = [];
const lagControl = get("lag");
const yearControl = get("focus-year");
const teamControl = get("include-e");
const buttons = [...document.querySelectorAll("[data-event]")];
const charts = [
  { canvas: get("score-chart"), pick: row => row.median === null ? null : (100 * row.median / maxScore(row)), max: () => 100 },
  { canvas: get("rank-chart"), pick: row => row.fraction, max: values => {
    const largest = Math.max(0, ...values);
    return largest > 60 ? 100 : largest > 30 ? 60 : largest > 12 ? 30 : largest > 6 ? 12 : 6;
  }},
];

function node(tag, label, cls) {
  const el = document.createElement(tag);
  if (label != null) el.textContent = label;
  if (cls) el.className = cls;
  return el;
}

function table(container, title, type, headings, rows) {
  const caption = node("h3", title, "table-title");
  caption.id = container.id + "-caption";
  const wrapper = node("div", null, "table-wrap");
  wrapper.tabIndex = 0;
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-labelledby", caption.id);
  const result = node("table", null, type + "-table");
  const thead = result.createTHead().insertRow();
  for (const heading of headings) {
    const cell = node("th", heading);
    cell.scope = "col";
    thead.append(cell);
  }
  const tbody = result.createTBody();
  for (const [index, values] of rows.entries()) {
    const tr = tbody.insertRow();
    if (index % 2 === 1) tr.className = "cohort-end";
    const label = node("th", values[0]);
    label.scope = "row";
    tr.append(label);
    for (const value of values.slice(1)) {
      tr.append(node("td", value, value === "—" ? "muted" : null));
    }
  }
  wrapper.append(result);
  container.replaceChildren(caption, wrapper);
}

function renderTables(team, lag) {
  const selectedGrades = data.grades.filter(row => row.event === event && (row.group === team || row.group === "gold"));
  const paired = years.flatMap((_, index) => current.map(series => series[index]));
  table(get("yearly-dynamic"), `${event} · NOI 前 ${lag} 年`, "year",
    ["NOI 届次", "选手范围", "成绩年份", "匹配 / 人次", "分数中位数", "分数范围", "全国名次中位数", "全国名次占比", "北京名次中位数", "北京前 20", "说明"],
    paired.map(row => [
      row.year, groups[row.group].label, row.previous, `${row.matched} / ${row.sample}`, num(row.median), rawRange(row),
      num(row.national), percent(row.fraction), num(row.local), num(row.top20), findNote(row),
    ]),
  );
  table(get("grade-dynamic"), `${event} · 同年级排名`, "grade",
    ["参赛年级", "选手范围", "可核对记录", "全国同年级名次中位数", "全国同年级名次占比", "北京同年级名次中位数"],
    Object.entries(grades).flatMap(([grade, label]) =>
      selectedGrades.filter(row => row.grade === Number(grade)).map(row => [
        label, groups[row.group].label, row.matched, num(row.national), percent(row.fraction), num(row.local),
      ])
    ),
  );
}

function draw(chart, focusIndex) {
  const {canvas, pick, max} = chart;
  const {width, height} = canvas.getBoundingClientRect();
  if (!width || !height) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.scale(ratio, ratio);

  const left = 39, right = width - 19, top = 17, bottom = height - 29;
  const step = (right - left) / (years.length - 1);
  chart.left = left;
  chart.step = step;
  const x = i => left + step * i;
  const cap = max(current.flat().map(pick).filter(value => value != null));
  const y = value => bottom - value / cap * (bottom - top);

  ctx.fillStyle = "#ecf2e9";
  ctx.fillRect(x(focusIndex) - 6, top, 12, bottom - top);
  ctx.font = "11px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const tick = cap * i / 4;
    ctx.strokeStyle = i === 0 ? "#aabbb0" : "#dfe7de";
    ctx.beginPath();
    ctx.moveTo(left, y(tick));
    ctx.lineTo(right, y(tick));
    ctx.stroke();
    ctx.fillStyle = "#52675d";
    ctx.fillText(`${num(tick)}%`, left - 6, y(tick));
  }
  ctx.textAlign = "center";
  years.forEach((year, index) => {
    ctx.fillStyle = index === focusIndex ? "#20563f" : "#52675d";
    ctx.font = `${index === focusIndex ? "bold " : ""}11px system-ui, sans-serif`;
    ctx.fillText(width < 430 ? String(year).slice(-2) : year, x(index), bottom + 16);
  });
  for (const rows of current) {
    const {color, dash} = groups[rows[0].group];
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.setLineDash(dash);
    ctx.beginPath();
    let contiguous = false;
    rows.forEach((row, index) => {
      const value = pick(row);
      if (value !== null) {
        if (contiguous) ctx.lineTo(x(index), y(value));
        else ctx.moveTo(x(index), y(value));
      }
      contiguous = value !== null;
    });
    ctx.stroke();
    ctx.setLineDash([]);
    rows.forEach((row, index) => {
      const value = pick(row);
      if (value === null) return;
      ctx.beginPath();
      ctx.arc(x(index), y(value), index === focusIndex ? 4.7 : 3.1, 0, Math.PI * 2);
      ctx.fillStyle = index === focusIndex ? color : "white";
      ctx.fill();
      ctx.stroke();
    });
  }
}

function focus() {
  const index = years.indexOf(Number(yearControl.value));
  const previous = current[0][index].previous;
  const title = node("strong", `NOI ${years[index]} · ${previous} 年 ${event}`);
  const details = current.map(rows => {
    const row = rows[index];
    const info = row.matched
      ? `${num(row.median)} 分，全国名次占比中位数 ${percent(row.fraction)}（${row.matched}/${row.sample} 可核对）`
      : findNote(row) || `0/${row.sample} 可核对`;
    return node("span", `${groups[row.group].label}：${info}`);
  });
  get("readout").replaceChildren(title, ...details);
  charts.forEach(chart => draw(chart, index));
}

function render() {
  const team = teamControl.checked ? "beijingE" : "beijing";
  const lag = Number(lagControl.value);
  const subset = data.rows.filter(row => row.event === event && row.lag === lag);
  current = [team, "gold"].map(group => subset.filter(row => row.group === group));
  get("legend-beijing").textContent = groups[team].label;
  const hasData = current.some(rows => rows.some(row => row.matched > 0));
  get("chart-empty").hidden = hasData;
  document.querySelector(".chart-grid").hidden = !hasData;
  buttons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.event === event)));
  renderTables(team, lag);
  focus();
}

async function start() {
  const response = await fetch("data.json");
  if (!response.ok) throw new Error("Could not load statistics");
  data = await response.json();
  yearControl.replaceChildren(...years.map(year => new Option(`${year} 届`, year)));
  yearControl.value = 2026;
  buttons.forEach(button => button.addEventListener("click", () => {
    event = button.dataset.event;
    render();
  }));
  lagControl.addEventListener("change", render);
  teamControl.addEventListener("change", render);
  yearControl.addEventListener("change", focus);
  document.querySelector(".filters").addEventListener("submit", event => event.preventDefault());
  for (const chart of charts) {
    chart.canvas.addEventListener("click", event => {
      if (!chart.step) return;
      const relative = event.clientX - chart.canvas.getBoundingClientRect().left;
      const index = Math.round((relative - chart.left) / chart.step);
      if (!years[index]) return;
      yearControl.value = years[index];
      focus();
    });
  }
  document.querySelectorAll(".interactive").forEach(el => { el.hidden = false; });
  render();
  get("yearly-static").hidden = true;
  get("grade-static").hidden = true;
  const observer = new ResizeObserver(focus);
  charts.forEach(chart => observer.observe(chart.canvas));
}

start().catch(() => {
  document.querySelectorAll(".interactive").forEach(el => { el.hidden = true; });
  document.querySelector(".load-error").hidden = false;
  get("yearly-static").hidden = false;
  get("grade-static").hidden = false;
});
