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

const storageKey = "hn-replay-watch-later-v1";
const pageSize = 24;
const number = new Intl.NumberFormat("zh-CN");
const alphabetic = new Intl.Collator("en", { sensitivity: "base", numeric: true });
const typeLabels = {
  talk: "演讲", lecture: "讲座", course: "课程", documentary: "纪录片",
  explainer: "科普与解说", interview: "访谈", podcast: "播客", tutorial: "教程",
  demo: "演示", news: "新闻", commentary: "评论", comedy: "喜剧", music: "音乐", other: "其他",
};
// These previously shared IDs are outside the HackerTube snapshot.
const legacyVideos = [
  {
    "id": "xDxjbXAqTPg",
    "title": "Automatic 3Dification of Nintendo games: The glEnd() of Zelda",
    "channel": "suckerpinch",
    "description": "Tom Murphy 用《塞尔达传说》等 NES 游戏演示如何把二维游戏场景自动转换为可旋转观看的 3D 场景。"
  },
  {
    "id": "kEB11PQ9Eo8",
    "title": "Non-Euclidean Worlds Engine",
    "channel": "CodeParade",
    "description": "CodeParade 用可漫游的游戏空间展示非欧几何如何挑战人的方向感。"
  },
  {
    "id": "E8I19uA-wGY",
    "title": "Functional programming design patterns by Scott Wlaschin",
    "channel": "Ivan Plyusnin",
    "description": "Scott Wlaschin 用类型和函数组合重新讲解常见的程序设计模式。"
  },
  {
    "id": "TZb0avfQme8",
    "title": "AT&T 1993 \"You Will\" Ads",
    "channel": "appealing",
    "description": "一组 1993 年的 AT&T 广告，想象当时尚未普及的视频通话、远程会议和电子导航。"
  },
  {
    "id": "0wxc3mKqKTk",
    "title": "Meet the Engineer Preserving The Last Analog Motion Graphics Machine",
    "channel": "VICE TV",
    "description": "认识维护 Scanimate 的工程师，看看模拟设备如何生成电视动态图形。"
  },
  {
    "id": "-PX0BV9hGZY",
    "title": "!!Con 2019- Tail Call Optimization: The Musical!! by Anjana Vakil & Natalia Margolis",
    "channel": "Confreaks",
    "description": "两位讲者用音乐剧演示尾调用和栈空间，来自 !!Con 2019。"
  }
].map((video) => ({
  ...video, areas: [], topics: [], years: [], latest: "", score: 0,
  recommenders: 0, mentions: 0, category: "旧收藏",
}));
const aliases = {
  "线性代数": "linear algebra", "向量": "vector", "傅里叶": "fourier",
  "贝塞尔": "bezier", "神经网络": "neural network", "反向传播": "backpropagation",
  "费曼": "feynman", "人工智能": "artificial intelligence", "半导体": "semiconductor",
};
const stanceLabels = {
  strong_rec: "强推荐", rec: "推荐", reference: "引用或提及", joke: "玩笑", critical: "批评",
};
const search = $("#search");
const grid = $("#grid");
const watch = $("#watch");
const about = $("#about");
const player = $("#player");
const sort = $("#sort");
const filters = $("#filters");
const areaSelect = $("#area");
const topicSelect = $("#topic");
const pageNumber = $("#page-number");
const detailCache = new Map();
let videos = [];
const videosById = new Map(legacyVideos.map((video) => [video.id, video]));
let areas = {};
let topics = {};
let view = "all";
let results = [];
let page = 1;
let currentVideo = null;
let searchTimer;

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
const yearRange = (video) => {
  const first = video.years[0];
  const last = video.years.at(-1);
  return first === last ? String(first) : `${first}–${last}`;
};
const orders = {
  recommend: (a, b) => b.score - a.score || b.recommenders - a.recommenders,
  recent: (a, b) => b.latest.localeCompare(a.latest) || b.score - a.score,
  title: (a, b) => alphabetic.compare(a.title, b.title),
};
const evidenceMatches = {
  comment: (video) => video.recommenders > 0,
  across: (video) => video.acrossYears,
  mention: (video) => video.mentions > 0 && !video.recommenders,
};
const thumbnail = (video, size = "mqdefault") => `https://i.ytimg.com/vi/${video.id}/${size}.jpg`;
const queryText = (value) => value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
const videoHash = (video) => "#watch=" + video.id;

function prepareVideo(entry) {
  const areaIds = [...new Set(entry.topics.map((id) => topics[id].area))];
  const category = topics[entry.topics[0]]?.label || "其他";
  const titleKey = queryText(entry.title);
  const searchText = queryText([
    entry.id, entry.title, entry.channel, category, entry.type, typeLabels[entry.type], ...entry.keywords,
    ...areaIds.flatMap((id) => [areas[id].label, areas[id].english]),
    ...entry.topics.flatMap((id) => [topics[id].label, topics[id].english]),
  ].join(" "));
  return { ...entry, areas: areaIds, category, titleKey, searchText };
}

function imageSource(image, video, size = "mqdefault") {
  image.addEventListener("error", () => {
    image.addEventListener("error", () => { image.hidden = true; }, { once: true });
    image.src = thumbnail(video, "default");
  }, { once: true });
  image.src = thumbnail(video, size);
}

function searchInput(value) {
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const id = url.hostname === "youtu.be" ? url.pathname.split("/")[1] :
        ["www.youtube.com", "youtube.com", "m.youtube.com"].includes(url.hostname) &&
        (url.searchParams.get("v") || url.pathname.split("/")[2]);
      if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
    } catch {
      // Search the original text if it is not a video URL.
    }
  }
  return value;
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
  $("#saved-count").textContent = [...videosById.values()].filter(matchesSaved).length;
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
    render(false);
    if (!watch.open) {
      const next = focusTarget && Array.from(grid.querySelectorAll(".card-open")).find((link) => link.hash === focusTarget);
      (next || $(".card-open", grid) || $("#reset")).focus();
    }
  }
}

function createCard(video) {
  const card = $("#card").content.firstElementChild.cloneNode(true);
  const open = $(".card-open", card);
  open.href = videoHash(video);
  open.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    openVideo(video, true);
  });
  imageSource($("img", card), video);
  $(".repeat", card).textContent = video.acrossYears ? "跨年评论推荐" :
    video.recommenders ? "评论推荐" : video.mentions ? "仅提及" : "旧收藏";
  $(".card-category", card).textContent = [video.category, typeLabels[video.type]].filter(Boolean).join(" · ");
  $("h3", card).textContent = video.title;
  $(".card-channel", card).textContent = video.channel;
  $(".card-meta", card).hidden = !video.years.length;
  if (video.years.length) $(".years", card).textContent = yearRange(video);
  $(".score", card).textContent = video.recommenders ? `${video.recommenders} 人推荐` : `${video.mentions} 条评论`;
  const saveButton = $(".card-save", card);
  saveButton.dataset.saveId = video.id;
  setSaveState(saveButton, video);
  saveButton.addEventListener("click", () => toggleSave(video, saveButton));
  return card;
}

function option(select, value, label) {
  select.add(new Option(label, value));
}

function updateTopics() {
  topicSelect.replaceChildren(topicSelect.options[0]);
  for (const [id, area] of Object.entries(areas)) {
    if (areaSelect.value && areaSelect.value !== id) continue;
    const group = document.createElement("optgroup");
    group.label = area.label;
    for (const [key, topic] of Object.entries(topics)) {
      if (topic.area === id) group.append(new Option(topic.label, key));
    }
    if (group.children.length) topicSelect.append(group);
  }
}

function createFilters() {
  const shortcuts = $("#topic-nav");
  const frequent = ["software", "ai-data", "math-theory", "hardware", "design-graphics-media", "politics-history-society"];
  for (const [id, area] of Object.entries(areas)) {
    option(areaSelect, id, area.label);
    if (!frequent.includes(id)) continue;
    const button = document.createElement("button");
    const count = document.createElement("span");
    button.type = "button";
    button.className = "nav-button";
    button.dataset.area = id;
    count.className = "nav-count";
    count.textContent = number.format(videos.filter((video) => video.areas.includes(id)).length);
    button.append(area.label, count);
    button.addEventListener("click", () => {
      changeView("all", id);
      $("#catalog-title").scrollIntoView({ block: "nearest" });
    });
    shortcuts.append(button);
  }
  updateTopics();
  for (const [id, label] of Object.entries(typeLabels)) option($("#type"), id, label);
  const years = [...new Set(videos.flatMap((video) => video.years))].sort((a, b) => b - a);
  for (const year of years) option($("#year"), year, String(year));
}

function showPage(requested = 1, moveFocus = false) {
  const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
  page = Math.min(Math.max(Math.trunc(requested) || 1, 1), pageCount);
  const start = (page - 1) * pageSize;
  grid.replaceChildren(...results.slice(start, start + pageSize).map(createCard));
  $("#pagination").hidden = pageCount < 2;
  $("#previous").disabled = page === 1;
  $("#next").disabled = page === pageCount;
  pageNumber.max = pageCount;
  pageNumber.value = page;
  $("#page-total").textContent = `/ ${number.format(pageCount)}`;
  $("#result-count").textContent = results.length
    ? `${number.format(results.length)} 部视频 · 显示 ${number.format(start + 1)}–${number.format(Math.min(start + pageSize, results.length))}`
    : "0 部视频";
  $("#empty").hidden = results.length > 0;
  if (moveFocus) {
    $("#catalog-title").scrollIntoView({ block: "start" });
    $("#catalog-title").focus({ preventScroll: true });
  }
}

function render(resetPage = true) {
  const query = queryText(searchInput(search.value.trim()));
  const terms = query.split(/\s+/).filter(Boolean);
  const evidence = $("#evidence").value;
  const area = areaSelect.value;
  const topic = topicSelect.value;
  const type = $("#type").value;
  const year = Number($("#year").value);
  const filtered = Boolean(evidence || area || topic || type || year);
  const fallbackOrder = orders.recommend;
  const relevance = (video) => {
    const title = video.titleKey || queryText(video.title);
    if (title === query || queryText(video.id) === query) return terms.length + 2;
    if (title.startsWith(query)) return terms.length + 1;
    return terms.filter((term) => title.includes(term) ||
      (Object.hasOwn(aliases, term) && title.includes(aliases[term]))).length;
  };
  const comparator = sort.value === "auto"
    ? (query ? (a, b) => relevance(b) - relevance(a) || fallbackOrder(a, b) : fallbackOrder)
    : orders[sort.value];
  const candidates = view === "saved" ? [...saved].map((id) => videosById.get(id)).filter(Boolean) : videos;
  results = candidates.filter((video) =>
    (!evidence || evidenceMatches[evidence](video)) &&
    (!area || video.areas.includes(area)) &&
    (!topic || video.topics.includes(topic)) &&
    (!type || video.type === type) &&
    (!year || video.years.includes(year)) &&
    terms.every((term) => {
      const text = video.searchText || queryText(video.title + " " + video.channel + " " + video.id);
      return text.includes(term) || (Object.hasOwn(aliases, term) && text.includes(aliases[term]));
    }),
  ).sort(comparator);

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.view === view));
  });
  document.querySelectorAll("[data-area]").forEach((button) => {
    button.setAttribute("aria-pressed", String(view === "all" && button.dataset.area === area));
  });
  $("#catalog-title").textContent = query ? "搜索结果" : view === "saved" ? "稍后看" : "完整视频库";
  $("#clear-filters").disabled = !filtered && !query;
  $("#empty-message").textContent = view === "saved" && !candidates.length
    ? "稍后看列表还是空的。点击视频封面右上角的书签即可收藏。"
    : "没有符合条件的视频。可以清除筛选，或试试其他关键词。";
  showPage(resetPage ? 1 : page);
}

function resetFilters(area = "") {
  clearTimeout(searchTimer);
  search.value = "";
  for (const select of filters.querySelectorAll("select")) select.value = "";
  areaSelect.value = area;
  updateTopics();
}

function changeView(next, area = "") {
  view = next;
  resetFilters(area);
  sort.value = "auto";
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

function evidenceLink(href, label, date, meta) {
  const row = document.createElement("li");
  const link = document.createElement("a");
  const title = document.createElement("strong");
  const details = document.createElement("span");
  const time = document.createElement("time");
  link.className = "thread-link";
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener";
  title.textContent = label;
  details.className = "thread-details";
  time.dateTime = date;
  time.textContent = date;
  details.append(time);
  for (const item of meta) {
    const span = document.createElement("span");
    span.textContent = item;
    details.append(span);
  }
  link.append(title, icon("external"), details);
  row.append(link);
  return row;
}

const itemUrl = (id) => "https://news.ycombinator.com/item?id=" + id;

function createComment([id, author, month, stance]) {
  return evidenceLink(itemUrl(id), stanceLabels[stance], month, [author, "打开 HN 原评论"]);
}

function createRelated([id, shared]) {
  const video = videosById.get(id);
  const row = document.createElement("li");
  const link = document.createElement("a");
  const title = document.createElement("strong");
  const detail = document.createElement("span");
  link.href = videoHash(video);
  link.className = "thread-link";
  link.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    openVideo(video);
  });
  title.textContent = video.title;
  detail.className = "thread-details";
  detail.textContent = `${shared} 位共同推荐者`;
  link.append(title, icon("arrow"), detail);
  row.append(link);
  return row;
}

async function loadEvidence(video) {
  $("#comment-evidence").hidden = !video.shard;
  $("#related-section").hidden = true;
  $("#comment-retry").hidden = true;
  $("#comments").replaceChildren();
  $("#related-videos").replaceChildren();
  $("#watch-why").hidden = true;
  if (!video.shard) return;

  $("#comment-count").textContent = `${video.mentions} 条 · ${video.recommenders} 位推荐者`;
  $("#comment-note").textContent = "正在读取 HN 评论…";
  if (!detailCache.has(video.shard)) {
    const request = readJson(`details/${video.shard}.json`).catch((error) => {
      detailCache.delete(video.shard);
      throw error;
    });
    detailCache.set(video.shard, request);
  }
  try {
    const detail = (await detailCache.get(video.shard))[video.id];
    if (!watch.open || currentVideo !== video) return;
    if (!video.description) $("#watch-description").textContent = detail.summary;
    if (video.recommenders && detail.why) {
      $("#watch-why").textContent = detail.why;
      $("#watch-why").hidden = false;
    }
    $("#comment-note").textContent = "标签由 HackerTube 整理。打开原评论可核对推荐对象与上下文。";
    $("#comments").append(...detail.comments.map(createComment));
    const related = detail.related.filter(([id]) => videosById.has(id));
    $("#related-section").hidden = !related.length;
    $("#related-videos").append(...related.map(createRelated));
  } catch {
    if (watch.open && currentVideo === video) {
      detailCache.delete(video.shard);
      $("#comment-note").textContent = "评论记录加载失败。";
      $("#comment-retry").hidden = false;
    }
  }
}

function openVideo(video, autoplay = false) {
  if (about.open) about.close();
  const wasOpen = watch.open;
  currentVideo = video;
  $("#watch-title").textContent = video.title;
  $("#watch-channel").textContent = video.channel;
  $("#watch-description").textContent = video.description || "";
  $("#watch-category").textContent = [video.category, typeLabels[video.type]].filter(Boolean).join(" · ");
  $("#youtube-link").href = "https://www.youtube.com/watch?v=" + video.id;
  $("#notice").textContent = "";
  setSaveState($("#watch-save"), video);
  if (autoplay) play(video);
  else showPoster(video);
  if (!watch.open) watch.showModal();
  watch.scrollTop = 0;
  if (location.hash !== videoHash(video)) {
    if (wasOpen) history.replaceState(history.state, "", videoHash(video));
    else history.pushState({ hnReplayWatch: true }, "", videoHash(video));
  }
  loadEvidence(video);
}

function syncHash() {
  const hash = location.hash;
  const video = hash.startsWith("#watch=") && videosById.get(hash.slice(7));
  if (video) {
    if (!watch.open || currentVideo !== video) openVideo(video);
  } else if (watch.open) watch.close();
}

watch.addEventListener("close", () => {
  if (watch.open) return;
  if (currentVideo && location.hash === videoHash(currentVideo)) {
    if (history.state?.hnReplayWatch) history.back();
    else history.replaceState(null, "", location.pathname + location.search);
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
$("#comment-retry").addEventListener("click", () => loadEvidence(currentVideo));
addEventListener("hashchange", syncHash);
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !event.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey &&
      !document.querySelector("dialog[open]") && !event.target.closest("input, textarea, select, [contenteditable]")) {
    event.preventDefault();
    search.focus();
  }
});
$(".search").addEventListener("submit", (event) => event.preventDefault());

async function readJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`无法读取 ${url}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function init() {
  $("#library-error").hidden = true;
  $("#result-count").textContent = "正在读取完整视频库…";
  const library = await readJson("library.json");
  areas = library.areas;
  topics = library.topics;
  videos = library.videos.map(prepareVideo);
  for (const video of videos) videosById.set(video.id, video);
  createFilters();
  updateSavedCount();
  $("#library-count").textContent = number.format(videos.length);
  $("#intro-count").textContent = `${number.format(videos.length)} 部视频，浏览 HN 评论中的推荐与提及。`;
  $("#snapshot").textContent = `HackerTube 快照 ${library.snapshot}`;
  for (const button of document.querySelectorAll("[data-view]")) {
    button.addEventListener("click", () => changeView(button.dataset.view));
  }
  $("#reset").addEventListener("click", () => {
    changeView("all");
    search.focus();
  });
  $("#clear-filters").addEventListener("click", () => {
    resetFilters();
    render();
    search.focus();
  });
  const showSearchResults = () => {
    render();
    const heading = $("#catalog-title");
    if (heading.getBoundingClientRect().top < $(".topbar").offsetHeight) {
      heading.scrollIntoView({ block: "start" });
    }
  };
  search.addEventListener("input", (event) => {
    if (event.isComposing) return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(showSearchResults, 100);
  });
  $(".search").addEventListener("submit", () => {
    clearTimeout(searchTimer);
    showSearchResults();
  });
  filters.addEventListener("change", (event) => {
    if (event.target === areaSelect) updateTopics();
    render();
  });
  sort.addEventListener("change", () => render());
  $("#previous").addEventListener("click", () => showPage(page - 1, true));
  $("#next").addEventListener("click", () => showPage(page + 1, true));
  $("#pagination").addEventListener("submit", (event) => {
    event.preventDefault();
    showPage(pageNumber.valueAsNumber, true);
  });
  search.disabled = false;
  filters.disabled = false;
  sort.disabled = false;
  render();
  syncHash();
}

function loadLibrary() {
  init().catch(() => {
    $("#result-count").textContent = "暂时无法加载完整视频库";
    $("#library-error-message").textContent = "连接中断或加载超时，可以重试。";
    $("#library-error").hidden = false;
  });
}

$("#library-retry").addEventListener("click", loadLibrary);
syncHash();
loadLibrary();
