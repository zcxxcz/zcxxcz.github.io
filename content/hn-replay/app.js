const $ = (selector, root = document) => root.querySelector(selector);
const icon = (name) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const use = document.createElementNS(svg.namespaceURI, "use");
  svg.setAttribute("class", "icon");
  svg.setAttribute("aria-hidden", "true");
  use.setAttribute("href", "#i-" + name);
  svg.append(use);
  return svg;
};

const categories = new Map([
  ["计算机历史", "#ffab87"],
  ["软件开发", "#a5beff"],
  ["工程与硬件", "#e9c385"],
  ["科学与数学", "#9dd0ad"],
  ["设计与创造", "#dfb4f4"],
  ["文化与社会", "#f4b2bd"],
]);
const storageKey = "hn-replay-watch-later-v1";
const spotlightId = "tc4ROCJYbm0";
const pageSize = 12;
const number = new Intl.NumberFormat("zh-CN");
const search = $("#search");
const grid = $("#grid");
const watch = $("#watch");
const about = $("#about");
const player = $("#player");
const more = $("#more");
const sort = $("#sort");
let videos = [];
let videosById = new Map();
let view = "all";
let category = "";
let limit = pageSize;
let currentVideo = null;

function readSaved() {
  try {
    const ids = JSON.parse(localStorage.getItem(storageKey));
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

let saved = readSaved();
const matchesSaved = (video) => saved.has(video.id);
const first = (video) => video.threads[0].date;
const last = (video) => video.threads.at(-1).date;
const yearRange = (video) => first(video).slice(0, 4) + "–" + last(video).slice(0, 4);
const peak = (video) => Math.max(...video.threads.map((thread) => thread.score));
const order = {
  repeat: (a, b) => b.threads.length - a.threads.length || peak(b) - peak(a),
  score: (a, b) => peak(b) - peak(a) || b.threads.length - a.threads.length,
  recent: (a, b) => last(b).localeCompare(last(a)) || peak(b) - peak(a),
};
const thumbnail = (video, size = "mqdefault") => `https://i.ytimg.com/vi/${video.id}/${size}.jpg`;
const queryText = (value) => value.normalize("NFKC").toLowerCase().trim();
const searchText = (video) => queryText([
  video.title, video.channel, video.category, video.description, yearRange(video),
].join(" "));
const videoHash = (video) => "#watch=" + video.id;

function imageSource(image, video, size) {
  image.hidden = false;
  image.addEventListener("error", () => { image.hidden = true; }, { once: true });
  image.src = thumbnail(video, size);
}

function setSaveState(button, video) {
  const active = matchesSaved(video);
  const label = active ? "移出稍后看" : "稍后看";
  button.setAttribute("aria-pressed", String(active));
  button.setAttribute("aria-label", label + " · " + video.title);
  button.title = label;
  const text = $("span", button);
  if (text) text.textContent = label;
}

function updateSavedCount() {
  $("#saved-count").textContent = videos.filter(matchesSaved).length;
}

function toggleSave(video, button) {
  if (matchesSaved(video)) saved.delete(video.id);
  else saved.add(video.id);
  try {
    localStorage.setItem(storageKey, JSON.stringify([...saved]));
  } catch {
    if (watch.open) $("#notice").textContent = "此浏览器无法保存到下次访问，列表仅在本次打开期间有效。";
  }
  setSaveState(button, video);
  const cardButton = $("[data-save-id='" + video.id + "']", grid);
  if (cardButton && cardButton !== button) setSaveState(cardButton, video);
  updateSavedCount();
  if (view === "saved") {
    const focusTarget = button.closest(".card")?.nextElementSibling?.querySelector(".card-open")?.hash;
    render();
    if (!watch.open) {
      const next = focusTarget && Array.from(grid.querySelectorAll(".card-open")).find((link) => link.hash === focusTarget);
      (next || $(".card-open", grid) || $("#reset")).focus();
    }
  }
}

function createCard(video) {
  const card = $("#card").content.firstElementChild.cloneNode(true);
  card.style.setProperty("--topic-color", categories.get(video.category));
  const open = $(".card-open", card);
  open.href = videoHash(video);
  open.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    openVideo(video, true);
  });
  imageSource($("img", card), video);
  $(".repeat", card).textContent = `${video.threads.length} 次推荐`;
  $(".card-category", card).textContent = video.category;
  $("h3", card).textContent = video.title;
  $(".card-channel", card).textContent = video.channel;
  $(".years", card).textContent = yearRange(video);
  $(".score", card).textContent = `最高 ${number.format(peak(video))} 分`;
  const saveButton = $(".card-save", card);
  saveButton.dataset.saveId = video.id;
  setSaveState(saveButton, video);
  saveButton.addEventListener("click", () => toggleSave(video, saveButton));
  return card;
}

function createTopics() {
  const nav = $("#topic-nav");
  const chips = $("#topic-chips");
  for (const [label, color] of [["全部", ""], ...categories]) {
    const value = color ? label : "";
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.category = value;
    chip.textContent = label;
    chips.append(chip);
    if (value) {
      const item = document.createElement("button");
      const dot = document.createElement("span");
      const count = document.createElement("span");
      item.type = "button";
      item.className = "nav-button";
      item.dataset.category = value;
      item.style.setProperty("--topic-color", color);
      dot.className = "dot";
      dot.setAttribute("aria-hidden", "true");
      count.className = "topic-count";
      count.textContent = videos.filter((video) => video.category === value).length;
      item.append(dot, label, count);
      nav.append(item);
    }
  }
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.closest("#topic-nav")) {
        search.value = "";
        view = "all";
        window.scrollTo(0, 0);
      }
      category = button.dataset.category;
      limit = pageSize;
      render();
    });
  });
}

function render(focusNewCard = false) {
  const terms = queryText(search.value).split(/\s+/).filter(Boolean);
  const results = videos.filter((video) =>
    (view !== "saved" || matchesSaved(video)) &&
    (!category || video.category === category) &&
    terms.every((term) => video.searchText.includes(term)),
  ).sort(order[sort.value]);

  document.querySelectorAll("[data-view]").forEach((button) => {
    const selected = button.dataset.view === view && (view === "saved" || !category);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.querySelectorAll("[data-category]").forEach((button) => {
    const selected = button.dataset.category === category &&
      (view !== "saved" || button.closest("#topic-chips"));
    button.setAttribute("aria-pressed", String(Boolean(selected)));
  });
  $("#spotlight").hidden = !videosById.has(spotlightId) || terms.length > 0 || !!category || view === "saved";
  $("#catalog-title").textContent = terms.length ? "搜索结果" : view === "saved" ? "稍后看" : category || "视频档案";
  $("#result-count").textContent = `${results.length} 部视频`;
  const start = focusNewCard ? grid.children.length : 0;
  if (!focusNewCard) grid.replaceChildren();
  grid.append(...results.slice(start, limit).map(createCard));
  $("#empty").hidden = results.length > 0;
  $("#empty-message").textContent = view === "saved" && !saved.size
    ? "你的稍后看列表还是空的。点视频封面右上角的书签就能加入。"
    : "没有符合条件的视频，试试其他关键词或主题。";
  more.hidden = results.length <= limit;
  if (focusNewCard) $(".card-open", grid.children[start])?.focus();
}

function changeView(next) {
  view = next;
  category = "";
  search.value = "";
  limit = pageSize;
  window.scrollTo(0, 0);
  render();
}

function play(video) {
  const iframe = document.createElement("iframe");
  iframe.title = video.title;
  iframe.src = `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&playsinline=1`;
  iframe.allow = "autoplay; encrypted-media; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  player.replaceChildren(iframe);
}

function showPoster(video) {
  const button = document.createElement("button");
  const image = document.createElement("img");
  const label = document.createElement("span");
  button.className = "poster";
  button.type = "button";
  label.className = "primary";
  label.append(icon("play"), "播放视频");
  image.alt = "";
  imageSource(image, video, "hqdefault");
  button.append(image, label);
  button.addEventListener("click", () => {
    play(video);
    $("#youtube-link").focus({ preventScroll: true });
  });
  player.replaceChildren(button);
}

function createThread(thread) {
  const row = document.createElement("li");
  const link = document.createElement("a");
  const title = document.createElement("strong");
  const details = document.createElement("span");
  const time = document.createElement("time");
  link.className = "thread-link";
  link.href = "https://news.ycombinator.com/item?id=" + thread.id;
  link.target = "_blank";
  link.rel = "noopener";
  title.textContent = thread.title;
  details.className = "thread-details";
  time.dateTime = thread.date;
  time.textContent = thread.date;
  details.append(time);
  for (const item of [thread.by, number.format(thread.score) + " 分", number.format(thread.comments) + " 条评论"]) {
    const span = document.createElement("span");
    span.textContent = item;
    details.append(span);
  }
  link.append(title, icon("external"), details);
  row.append(link);
  return row;
}

function openVideo(video, autoplay = false) {
  if (about.open) about.close();
  currentVideo = video;
  $("#watch-title").textContent = video.title;
  $("#watch-channel").textContent = video.channel;
  $("#watch-description").textContent = video.description;
  $("#watch-category").textContent = video.category;
  $("#watch-category").style.setProperty("--topic-color", categories.get(video.category));
  $("#youtube-link").href = "https://www.youtube.com/watch?v=" + video.id;
  $("#thread-count").textContent = `${video.threads.length} 条 · ${yearRange(video)}`;
  $("#threads").replaceChildren(...video.threads.toReversed().map(createThread));
  $("#notice").textContent = "";
  setSaveState($("#watch-save"), video);
  if (autoplay) play(video);
  else showPoster(video);
  if (!watch.open) watch.showModal();
  watch.scrollTop = 0;
  if (location.hash !== videoHash(video)) history.replaceState(null, "", videoHash(video));
}

function syncHash() {
  const hash = location.hash;
  const video = hash.startsWith("#watch=") && videosById.get(hash.slice(7));
  if (video) openVideo(video);
  else if (watch.open) watch.close();
}

watch.addEventListener("close", () => {
  if (watch.open) return;
  if (currentVideo && location.hash === videoHash(currentVideo)) {
    history.replaceState(null, "", location.pathname + location.search);
  }
  currentVideo = null;
  player.replaceChildren();
});
for (const dialog of [watch, about]) {
  $("[data-close]", dialog).addEventListener("click", () => dialog.close());
}
for (const id of ["about-button", "footer-about"]) {
  $("#" + id).addEventListener("click", () => about.showModal());
}
$("#share").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    $("#notice").textContent = "链接已复制";
  } catch {
    $("#notice").textContent = "可以从浏览器地址栏复制视频链接。";
  }
});
$("#watch-save").addEventListener("click", (event) => toggleSave(currentVideo, event.currentTarget));
addEventListener("hashchange", syncHash);
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !event.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey &&
      !document.querySelector("dialog[open]") && !event.target.closest("input, textarea, select, [contenteditable]")) {
    event.preventDefault();
    search.focus();
  }
});
$(".search").addEventListener("submit", (event) => event.preventDefault());

async function init() {
  const response = await fetch("videos.json");
  if (!response.ok) throw new Error("Failed to load video archive");
  videos = (await response.json()).map((video) => ({ ...video, searchText: searchText(video) }));
  videosById = new Map(videos.map((video) => [video.id, video]));
  createTopics();
  updateSavedCount();
  $("#snapshot").textContent = "数据核对日期 2026-11-04";
  const spotlight = videosById.get(spotlightId);
  if (spotlight) {
    imageSource($("#spotlight-image"), spotlight, "sddefault");
    $("#spotlight-description").textContent = spotlight.description;
    $("#spotlight-meta").textContent = `${spotlight.threads.length} 次推荐 · ${yearRange(spotlight)}`;
    $("#spotlight-play").addEventListener("click", () => openVideo(spotlight, true));
  }
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => changeView(button.dataset.view));
  });
  $("#reset").addEventListener("click", () => {
    changeView("all");
    search.focus();
  });
  search.addEventListener("input", () => {
    limit = pageSize;
    render();
  });
  sort.addEventListener("change", () => {
    limit = pageSize;
    render();
  });
  more.addEventListener("click", () => {
    limit += pageSize;
    render(true);
  });
  render();
  syncHash();
}

init().catch((error) => {
  $("#result-count").textContent = "视频档案加载失败，请刷新页面重试。";
  console.error(error);
});
