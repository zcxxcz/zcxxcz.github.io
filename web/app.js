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
      else list.sort((a, b) => originalOrder.get(container).indexOf(a) - originalOrder.get(container).indexOf(b));
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
