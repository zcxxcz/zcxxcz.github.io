import { ages, topics, videos } from "./videos.js";

const cards = document.querySelector("#cards");
const template = document.querySelector("#card-template");
const count = document.querySelector("#count");
const empty = document.querySelector("#empty");
const watch = document.querySelector("#watch");
const watchTitle = document.querySelector("#watch-title");
const watchNote = document.querySelector("#watch-note");
const screen = document.querySelector("#screen");
const ageButtons = document.querySelectorAll("[data-age]");
const topicButtons = document.querySelectorAll("[data-topic]");
const isAndroid = /\bAndroid\b/i.test(navigator.userAgent);
let age = "all";
let topic = "all";

function openVideo(video, unavailable) {
  watchTitle.textContent = video.title;
  watchNote.textContent = unavailable ?? video.note ?? video.description;

  if (video.source && !unavailable) {
    const url = new URL("https://player.bilibili.com/player.html");
    url.search = new URLSearchParams({
      ...video.source,
      autoplay: "false",
      danmaku: "0",
      // Bilibili's phone player uses separate settings after the redirect.
      danmakuClosed: "true",
      danmakuBtn: "0",
      noRecommend: "true",
      hasSendbar: "false",
    });

    const frame = document.createElement("iframe");
    frame.title = video.title + " · 视频播放器";
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
    frame.setAttribute("allow", "fullscreen");
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.src = url.href;
    screen.replaceChildren(frame);
  } else {
    const notice = document.createElement("div");
    notice.className = "unavailable";
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "🎟️";
    const label = document.createElement("p");
    label.textContent = "这部影片暂时放不了，回片单挑一部吧。";
    notice.append(icon, label);
    screen.replaceChildren(notice);
  }

  watch.showModal();
}

function render() {
  const visible = videos.filter(video =>
    (age === "all" || video.age === age || video.age === "both") &&
    (topic === "all" || video.topic === topic)
  );
  count.textContent = `共 ${visible.length} 部影片`;
  empty.hidden = visible.length > 0;
  cards.replaceChildren(...visible.map(video => {
    const card = template.content.firstElementChild.cloneNode(true);
    const label = topics[video.topic] + " · " + ages[video.age];
    const unavailable = video.unavailable ?? (isAndroid ? video.androidNote : undefined);
    const runtime = unavailable ? "暂不可播" : video.runtime;
    card.classList.add(video.color);
    card.querySelector(".poster-age").textContent = ages[video.age];
    card.querySelector(".poster-icon").textContent = video.icon;
    card.querySelector(".runtime").textContent = runtime;
    card.querySelector(".category").textContent = topics[video.topic];
    card.querySelector(".card-title").textContent = video.title;
    card.querySelector(".card-desc").textContent = video.description;
    card.setAttribute("aria-label", `${video.title}，${label}，${runtime}`);
    if (unavailable) {
      card.setAttribute("data-unavailable", "");
      card.querySelector(".play-mark").textContent = "ⓘ";
    }
    card.addEventListener("click", () => openVideo(video, unavailable));
    return card;
  }));
}

function updateFilters() {
  for (const button of ageButtons) button.setAttribute("aria-pressed", button.dataset.age === age);
  for (const button of topicButtons) button.setAttribute("aria-pressed", button.dataset.topic === topic);
  render();
}

for (const button of ageButtons) {
  button.addEventListener("click", () => {
    age = button.dataset.age;
    updateFilters();
  });
}
for (const button of topicButtons) {
  button.addEventListener("click", () => {
    topic = button.dataset.topic;
    updateFilters();
  });
}
document.querySelector("#reset").addEventListener("click", () => {
  age = "all";
  topic = "all";
  updateFilters();
  topicButtons[0].focus();
});

document.querySelector("#close").addEventListener("click", () => watch.close());
watch.addEventListener("close", () => screen.replaceChildren());
render();
