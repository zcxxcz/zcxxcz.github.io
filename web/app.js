window.addEventListener("DOMContentLoaded", () => {
  try {
    new PagefindUI({
      element: "#search",
      showSubResults: false,
      showImages: false,
      pageSize: 6,
      resetStyles: false,
      translations: {
        placeholder: "试试「学习规划」「拼写」或讲稿中的关键词…",
      },
    });
  } catch {
    document.querySelector("#search").textContent =
      "搜索暂时无法加载，请使用下方内容目录。";
  }
  setupPopular();
  const rows = [...document.querySelectorAll(".library-row")];
  const groups = [...document.querySelectorAll("details.series")];
  const status = document.querySelector("#filter-status");
  // 筛选只认受控主题词（data-topics）。标签是自由关键词，主题才是导航。
  const topicsOf = (el) => (el.dataset.topics || "").split(" ").filter(Boolean);
  const matches = (el, value) => {
    if (value === "全部") return true;
    const topics = topicsOf(el);
    return value === "其他" ? topics.length === 0 : topics.includes(value);
  };
  function filter(value) {
    let count = 0;
    for (const row of rows) {
      const ok = matches(row, value);
      row.hidden = !ok;
      if (ok) count++;
    }
    for (const group of groups) {
      const hit = [...group.querySelectorAll(".library-row")].filter(
        (r) => !r.hidden,
      ).length;
      group.hidden = hit === 0;
      // 筛到某组时自动展开，避免「筛出来了却看不见」。
      if (hit) group.open = value !== "全部";
    }
    status.textContent = count ? `${count} 条内容` : "没有符合的内容";
  }
  document.querySelectorAll("[data-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]").forEach((b) => {
        b.classList.toggle("active", b === button);
        b.setAttribute("aria-pressed", String(b === button));
      });
      filter(button.dataset.filter);
    }),
  );
  const containers = [
    ...document.querySelectorAll(".rows-flat, details.series .series-body"),
  ];
  const originalOrder = new Map(
    containers.map((c) => [c, [...c.querySelectorAll(".library-row")]]),
  );
  document.querySelector("#sort").addEventListener("change", (e) => {
    for (const container of containers) {
      const list = [...container.querySelectorAll(".library-row")];
      if (e.target.value === "title")
        list.sort((a, b) =>
          a
            .querySelector("strong")
            .textContent.localeCompare(
              b.querySelector("strong").textContent,
              "zh",
            ),
        );
      else
        list.sort(
          (a, b) =>
            originalOrder.get(container).indexOf(a) -
            originalOrder.get(container).indexOf(b),
        );
      container.append(...list);
    }
  });
  filter("全部");
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "/" &&
      !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)
    ) {
      e.preventDefault();
      document.querySelector("#search input")?.focus();
    }
  });
});

function setupPopular() {
  const key = "content-hub-visits-v1";
  const template = document.querySelector("#home-card-templates");
  const container = document.querySelector("#popular-cards");
  if (!template || !container) return;
  const cards = new Map(
    [...template.content.querySelectorAll(".card")].map((card) => [
      card.dataset.recordId,
      card,
    ]),
  );
  const defaults = [...container.children].map((card) => card.dataset.recordId);
  const urls = new Map(
    [...cards].map(([id, card]) => [
      new URL(card.href, location.href).href,
      id,
    ]),
  );
  let visits = Object.create(null);
  let available = true;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      for (const [id, n] of Object.entries(saved))
        if (cards.has(id) && Number.isSafeInteger(n) && n > 0) visits[id] = n;
    }
  } catch {
    available = false;
  }
  function render() {
    const ranked = Object.keys(visits).sort(
      (a, b) => visits[b] - visits[a] || a.localeCompare(b),
    );
    const ids = [...new Set([...ranked, ...defaults])].slice(0, 6);
    container.replaceChildren(
      ...ids.map((id, i) => {
        const card = cards.get(id).cloneNode(true);
        card.querySelector(".card-number").textContent = String(i + 1).padStart(
          2,
          "0",
        );
        return card;
      }),
    );
    document.querySelector("#popular-note").textContent = !available
      ? "浏览器无法保存访问记录，暂时显示默认入口。"
      : ranked.length
        ? "按此浏览器的点击次数排序；不足 6 个时补充默认入口。"
        : "还没有访问记录，先从这些入口开始。";
  }
  function record(event) {
    if (event.type === "auxclick" && event.button !== 1) return;
    const link = event.target.closest("a[href]");
    if (!link) return;
    const id = urls.get(new URL(link.href, location.href).href);
    if (!id) return;
    visits[id] = Math.min((visits[id] || 0) + 1, Number.MAX_SAFE_INTEGER);
    try {
      localStorage.setItem(key, JSON.stringify(visits));
    } catch {
      available = false;
    }
    // Keep the activated anchor in place until the browser finishes its navigation.
    setTimeout(render, 0);
  }
  document.addEventListener("click", record);
  document.addEventListener("auxclick", record);
  window.addEventListener("pageshow", render);
  render();
}
