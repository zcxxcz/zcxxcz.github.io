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
const spotlightId = "tc4ROCJYbm0";
const pageSize = 24;
const number = new Intl.NumberFormat("zh-CN");
const alphabetic = new Intl.Collator("en", { sensitivity: "base", numeric: true });
const typeLabels = {
  talk: "演讲", lecture: "讲座", course: "课程", documentary: "纪录片",
  explainer: "科普与解说", interview: "访谈", podcast: "播客", tutorial: "教程",
  demo: "演示", news: "新闻", commentary: "评论", comedy: "喜剧", music: "音乐", other: "其他",
};
const curatedAreas = {
  "计算机历史": "computing-history-culture", "软件开发": "software",
  "工程与硬件": "hardware", "科学与数学": "math-theory",
  "设计与创造": "design-graphics-media", "文化与社会": "politics-history-society",
};
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
let videosById = new Map();
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
  recommend: (a, b) => b.score - a.score || b.recommenders - a.recommenders || b.peak - a.peak,
  recent: (a, b) => b.latest.localeCompare(a.latest) || b.score - a.score,
  score: (a, b) => b.peak - a.peak || b.threads.length - a.threads.length || b.score - a.score,
  title: (a, b) => alphabetic.compare(a.title, b.title),
  curated: (a, b) => b.threads.length - a.threads.length || b.peak - a.peak,
};
const evidenceMatches = {
  comment: (video) => video.recommenders > 0,
  across: (video) => video.acrossYears,
  story: (video) => video.threads.length > 0,
  mention: (video) => video.mentions > 0 && !video.recommenders && !video.threads.length,
};
const thumbnail = (video, size = "mqdefault") => `https://i.ytimg.com/vi/${video.id}/${size}.jpg`;
const queryText = (value) => value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
const videoHash = (video) => "#watch=" + video.id;

function mergeVideo(entry, curated) {
  const threads = curated?.threads || [];
  const topicIds = entry?.topics || [];
  const areaIds = [...new Set(topicIds.map((id) => topics[id].area))];
  if (!areaIds.length && curated) areaIds.push(curatedAreas[curated.category]);
  const video = {
    score: 0, mentions: 0, recommenders: 0, latest: "", ...entry, ...curated, threads,
    topics: topicIds, areas: areaIds,
    years: [...new Set([...(entry?.years || []), ...threads.map((thread) => Number(thread.date.slice(0, 4)))])].sort((a, b) => a - b),
    peak: Math.max(0, ...threads.map((thread) => thread.score)),
  };
  const lastPost = threads.at(-1)?.date.slice(0, 7);
  if (lastPost && lastPost > video.latest) video.latest = lastPost;
  video.category = curated?.category || topics[topicIds[0]]?.label || "其他";
  video.titleKey = queryText(video.title);
  video.searchText = queryText([
    video.id, video.title, video.channel, video.category, video.description,
    video.type, typeLabels[video.type], ...(entry?.keywords || []),
    ...areaIds.flatMap((id) => [areas[id]?.label, areas[id]?.english]),
    ...topicIds.flatMap((id) => [topics[id].label, topics[id].english]),
  ].join(" "));
  return video;
}

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
  $(".repeat", card).textContent = video.threads.length ? "跨年投稿" :
    video.acrossYears ? "跨年评论推荐" : video.recommenders ? "评论推荐" : "仅提及";
  $(".card-category", card).textContent = [video.category, typeLabels[video.type]].filter(Boolean).join(" · ");
  $("h3", card).textContent = video.title;
  $(".card-channel", card).textContent = video.channel;
  $(".years", card).textContent = yearRange(video);
  $(".score", card).textContent = video.threads.length ? `${video.threads.length} 条投稿` :
    video.recommenders ? `${video.recommenders} 人推荐` : `${video.mentions} 条评论`;
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
  const query = queryText(search.value);
  const terms = query.split(/\s+/).filter(Boolean);
  const evidence = $("#evidence").value;
  const area = areaSelect.value;
  const topic = topicSelect.value;
  const type = $("#type").value;
  const year = Number($("#year").value);
  const filtered = Boolean(evidence || area || topic || type || year);
  const fallbackOrder = view === "curated" ? orders.curated : orders.recommend;
  const relevance = (video) => video.titleKey === query ? terms.length + 2 :
    video.titleKey.startsWith(query) ? terms.length + 1 :
    terms.filter((term) => video.titleKey.includes(term) || (aliases[term] && video.titleKey.includes(aliases[term]))).length;
  const comparator = sort.value === "auto"
    ? (query ? (a, b) => relevance(b) - relevance(a) || fallbackOrder(a, b) : fallbackOrder)
    : orders[sort.value];
  results = videos.filter((video) =>
    (view !== "curated" || video.threads.length) &&
    (view !== "saved" || matchesSaved(video)) &&
    (!evidence || evidenceMatches[evidence](video)) &&
    (!area || video.areas.includes(area)) &&
    (!topic || video.topics.includes(topic)) &&
    (!type || video.type === type) &&
    (!year || video.years.includes(year)) &&
    terms.every((term) => video.searchText.includes(term) || (aliases[term] && video.searchText.includes(aliases[term]))),
  ).sort(comparator);

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.view === view));
  });
  document.querySelectorAll("[data-area]").forEach((button) => {
    button.setAttribute("aria-pressed", String(view === "all" && button.dataset.area === area));
  });
  $("#spotlight").hidden = !videosById.get(spotlightId)?.threads.length || Boolean(query) || filtered || view !== "curated";
  $("#catalog-title").textContent = query ? "搜索结果" : view === "saved" ? "稍后看" : view === "curated" ? "跨年投稿" : "完整视频库";
  $("#clear-filters").disabled = !filtered && !query;
  $("#empty-message").textContent = view === "saved" && !videos.some(matchesSaved)
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

function createThread(thread) {
  return evidenceLink(itemUrl(thread.id), thread.title, thread.date, [
    thread.by, number.format(thread.score) + " 分", number.format(thread.comments) + " 条评论",
  ]);
}

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
      $("#comment-note").textContent = "评论记录加载失败，重新打开视频可重试。";
    }
  }
}

function openVideo(video, autoplay = false) {
  if (about.open) about.close();
  currentVideo = video;
  $("#watch-title").textContent = video.title;
  $("#watch-channel").textContent = video.channel;
  $("#watch-description").textContent = video.description || "";
  $("#watch-category").textContent = [video.category, typeLabels[video.type]].filter(Boolean).join(" · ");
  $("#youtube-link").href = "https://www.youtube.com/watch?v=" + video.id;
  $("#story-evidence").hidden = !video.threads.length;
  $("#thread-count").textContent = `${video.threads.length} 条`;
  $("#threads").replaceChildren(...video.threads.toReversed().map(createThread));
  $("#notice").textContent = "";
  setSaveState($("#watch-save"), video);
  if (autoplay) play(video);
  else showPoster(video);
  if (!watch.open) watch.showModal();
  watch.scrollTop = 0;
  if (location.hash !== videoHash(video)) history.replaceState(null, "", videoHash(video));
  loadEvidence(video);
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

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`无法读取 ${url}`);
  return response.json();
}

async function init() {
  const [source, existing] = await Promise.allSettled([readJson("library.json"), readJson("videos.json")]);
  if (source.status === "rejected" && existing.status === "rejected") throw source.reason;
  const library = source.value;
  const curated = existing.value || [];
  areas = library?.areas || Object.fromEntries(Object.entries(curatedAreas).map(([label, id]) => [id, { label }]));
  topics = library?.topics || {};
  const curatedById = new Map(curated.map((video) => [video.id, video]));
  videos = (library?.videos || []).map((entry) => {
    const legacy = curatedById.get(entry.id);
    curatedById.delete(entry.id);
    return mergeVideo(entry, legacy);
  });
  videos.push(...Array.from(curatedById.values(), (video) => mergeVideo(null, video)));
  videosById = new Map(videos.map((video) => [video.id, video]));
  createFilters();
  updateSavedCount();
  $("#library-count").textContent = number.format(videos.length);
  $("#curated-count").textContent = number.format(curated.length);
  $("#intro-count").textContent = source.status === "rejected" || existing.status === "rejected"
    ? `已加载 ${number.format(videos.length)} 部视频。部分数据加载失败，可刷新重试。`
    : `${number.format(videos.length)} 部视频，涵盖 HN 评论推荐、引用与跨年投稿。`;
  $("#snapshot").textContent = `HackerTube 快照 ${library?.snapshot || "暂不可用"} · 跨年投稿核对于 2026-11-04`;
  const spotlight = videosById.get(spotlightId);
  if (spotlight?.threads.length) {
    imageSource($("#spotlight-image"), spotlight, "sddefault");
    $("#spotlight-description").textContent = spotlight.description;
    $("#spotlight-meta").textContent = `${spotlight.threads.length} 条投稿 · ${yearRange(spotlight)}`;
    $("#spotlight-play").addEventListener("click", () => openVideo(spotlight, true));
  }

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => changeView(button.dataset.view));
  });
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
  pageNumber.addEventListener("change", () => showPage(pageNumber.valueAsNumber, true));
  pageNumber.addEventListener("keydown", (event) => {
    if (event.key === "Enter") showPage(pageNumber.valueAsNumber, true);
  });
  filters.disabled = false;
  sort.disabled = false;
  render();
  syncHash();
}

init().catch((error) => {
  $("#result-count").textContent = "视频档案加载失败，请刷新页面重试。";
  console.error(error);
});
