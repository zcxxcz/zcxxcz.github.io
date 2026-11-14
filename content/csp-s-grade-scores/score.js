const explorer = document.querySelector(".explorer");
const scopeButtons = [...document.querySelectorAll("[data-scope]")];
const tables = [...document.querySelectorAll("[data-scores]")];
const rankSelect = document.querySelector("#rank");
const yearSelect = document.querySelector("#year");
const canvas = document.querySelector("#trend");
const context = canvas.getContext("2d");
const styles = getComputedStyle(document.documentElement);
const grades = [
  { label: "七年级", color: styles.getPropertyValue("--g7").trim(), dash: [] },
  { label: "八年级", color: styles.getPropertyValue("--g8").trim(), dash: [8, 4] },
  { label: "九年级", color: styles.getPropertyValue("--g9").trim(), dash: [2, 4] },
];
const scoreOutputs = [...document.querySelectorAll("[data-score]")];
const selectionSummary = document.querySelector("#selection-summary");

function readTable(section) {
  const columns = [...section.querySelectorAll("thead [data-rank]")];
  return {
    label: section.querySelector("h2").textContent,
    ranks: columns.map(column => Number(column.dataset.rank)),
    years: [...section.querySelectorAll("tbody:first-of-type .year")].map(cell => Number(cell.textContent)),
    grades: [...section.querySelectorAll("tbody")].map(group =>
      [...group.rows].map(row =>
        [...row.querySelectorAll(".rank-score")].map(cell => cell.textContent === "—" ? null : Number(cell.textContent))
      )
    ),
  };
}

const datasets = new Map(tables.map(section => [section.dataset.scores, readTable(section)]));
let dataset;
let plotBounds;

function selectScope(scope) {
  dataset = datasets.get(scope);
  const priorRank = Number(rankSelect.value);
  const selectedRank = dataset.ranks.includes(priorRank) ? priorRank : 100;
  rankSelect.replaceChildren(...dataset.ranks.map(rank => new Option(`第 ${rank} 名`, rank)));
  rankSelect.value = selectedRank;
  for (const button of scopeButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.scope === scope));
  }
  for (const section of tables) {
    section.hidden = section.dataset.scores !== scope;
  }
  update();
}

function drawChart(series, selectedIndex) {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.scale(ratio, ratio);

  const left = 40;
  const right = width - 20;
  const top = 16;
  const bottom = height - 34;
  const step = (right - left) / (dataset.years.length - 1);
  const x = index => left + index * step;
  const y = score => bottom - (score / 400) * (bottom - top);
  plotBounds = { left, right, step };

  context.font = "12px system-ui, sans-serif";
  context.textBaseline = "middle";
  for (let score = 0; score <= 400; score += 100) {
    context.beginPath();
    context.strokeStyle = score === 0 ? "#aebeb2" : "#e0e7de";
    context.moveTo(left, y(score));
    context.lineTo(right, y(score));
    context.stroke();
    context.fillStyle = "#52665e";
    context.textAlign = "right";
    context.fillText(score, left - 9, y(score));
  }

  context.fillStyle = "#eaf1e8";
  const selectedX = x(selectedIndex);
  const markerWidth = Math.min(20, step / 3);
  const start = Math.max(left, selectedX - markerWidth / 2);
  const end = Math.min(right, selectedX + markerWidth / 2);
  context.fillRect(start, top, end - start, bottom - top);
  context.textAlign = "center";
  dataset.years.forEach((year, index) => {
    context.fillStyle = index === selectedIndex ? "#244e3c" : "#52665e";
    context.font = `${index === selectedIndex ? "bold " : ""}12px system-ui, sans-serif`;
    context.fillText(year, x(index), bottom + 19);
  });

  series.forEach((scores, index) => {
    const { color, dash } = grades[index];
    context.lineWidth = 2.25;
    context.strokeStyle = color;
    context.lineCap = "round";
    context.setLineDash(dash);
    context.beginPath();
    let previous = null;
    scores.forEach((score, yearIndex) => {
      if (score !== null) {
        if (previous === null) context.moveTo(x(yearIndex), y(score));
        else context.lineTo(x(yearIndex), y(score));
      }
      previous = score;
    });
    context.stroke();
    context.setLineDash([]);
    scores.forEach((score, yearIndex) => {
      if (score === null) return;
      const selected = yearIndex === selectedIndex;
      context.beginPath();
      context.arc(x(yearIndex), y(score), selected ? 5 : 3.25, 0, Math.PI * 2);
      context.fillStyle = selected ? color : "#fff";
      context.fill();
      context.stroke();
    });
  });
}

function update() {
  const rank = Number(rankSelect.value);
  const year = Number(yearSelect.value);
  const columnIndex = dataset.ranks.indexOf(rank);
  const yearIndex = dataset.years.indexOf(year);
  const series = dataset.grades.map(rows => rows.map(values => values[columnIndex]));
  const summary = [];
  series.forEach((scores, index) => {
    const score = scores[yearIndex];
    scoreOutputs[index].textContent = score ?? "—";
    summary.push(`${grades[index].label}${score === null ? "获奖人数不足" : score + " 分"}`);
  });
  selectionSummary.textContent = `${dataset.label}，${year} 年第 ${rank} 名。${summary.join("，")}。`;
  drawChart(series, yearIndex);
}

if (context) {
  explorer.hidden = false;
  selectScope("national");
  scopeButtons.forEach(button => {
    button.addEventListener("click", () => selectScope(button.dataset.scope));
  });
  rankSelect.addEventListener("change", update);
  yearSelect.addEventListener("change", update);
  canvas.addEventListener("click", event => {
    if (!plotBounds) return;
    const relativeX = event.clientX - canvas.getBoundingClientRect().left;
    const { left, right, step } = plotBounds;
    if (relativeX < left - 12 || relativeX > right + 12) return;
    const index = Math.max(0, Math.min(dataset.years.length - 1, Math.round((relativeX - left) / step)));
    yearSelect.value = dataset.years[index];
    update();
  });
  new ResizeObserver(update).observe(canvas);
}
