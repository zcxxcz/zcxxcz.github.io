/* 放映逻辑：点一下（或按 →）走一步，没有任何自动翻页。
   每屏的 data-steps 是这一屏要点几下。元素上：
     data-in="k"    点到第 k 步时出现
     data-out="k"   点到第 k 步时消失
     data-dim="k"   点到第 k 步时变淡
     data-lit="k"   点到第 k 步时加重（荧光笔、划线）
     data-cls="1:a 2:b"  点到第 1 步时加上 class a，第 2 步时加上 class b（图表换状态用）
   往回翻瞬间到位，不重放动画。讲稿写在每屏末尾的 <template class="say"> 里。
   同一个浏览器里开两个窗口，翻页会同步：一个窗口共享给观众，另一个按 N 看讲稿。 */
(() => {
  const stage = document.getElementById("stage");
  const slides = [...stage.querySelectorAll(".slide")];
  const params = new URLSearchParams(location.search);
  const capture = params.has("capture");
  if (capture) document.body.classList.add("capture");
  const D = window.DECK_DATA;

  // ---------- 629 个方块：一格是一个 3 分钟以上的公开视频，按发布顺序 ----------
  const sorted = [...D.videoSubs].sort((a, b) => b - a);
  const hitLine = sorted[19]; // 带来订阅最多的 20 个
  for (const g of stage.querySelectorAll(".grid")) {
    const frag = document.createDocumentFragment();
    D.videoSubs.forEach((s, i) => {
      const el = document.createElement("i");
      const c = [];
      if (s >= hitLine) c.push("hit");
      else if (s <= 20) c.push("lowv");
      if (i > 72) c.push("late"); // 第 73 个之后的；封面上把它们调淡
      el.className = c.join(" ");
      frag.append(el);
    });
    g.append(frag);
  }

  // ---------- 头 73 个视频各带来多少订阅：前 72 个灰，第 73 个绿（点第 2 下才出现） ----------
  const f73 = stage.querySelector("#c-f73");
  if (f73) {
    const H = 430, top = D.videoSubs[72];
    f73.innerHTML = D.videoSubs.slice(0, 73).map((v, i) =>
      `<i${i === 72 ? ' class="hit flat" data-in="2"' : ""} style="width:17px;height:${Math.max(3, (v / top) * H).toFixed(1)}px"></i>`).join("");
  }

  // ---------- 头两年的累计订阅（2020-02 到 2021-12） ----------
  const first = stage.querySelector("#c-first");
  if (first) {
    const W = 1500, H = 440, M0 = 1, M1 = 23, YMAX = 22000;
    const cum = []; D.subs.reduce((a, s, i) => (cum[i] = a + s), 0);
    const x = m => ((m - M0) / (M1 - M0)) * W, y = v => H - (v / YMAX) * H;
    const pts = []; for (let m = M0; m <= M1; m++) pts.push([x(m), y(cum[m])]);
    const line = p => p.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)} ${b.toFixed(1)}`).join(" ");
    const before = pts.slice(0, 19), after = pts.slice(18); // 到 2021-08 为止 / 之后
    const area = p => `${line(p)} L${p[p.length - 1][0].toFixed(1)} ${H} L${p[0][0].toFixed(1)} ${H} Z`;
    first.innerHTML =
      `<svg width="${W}" height="${H + 44}" viewBox="0 0 ${W} ${H + 44}">` +
      `<line class="gridl" x1="0" x2="${W}" y1="${y(10000)}" y2="${y(10000)}"/><line class="gridl" x1="0" x2="${W}" y1="${y(20000)}" y2="${y(20000)}"/>` +
      `<text x="${W + 14}" y="${y(10000) + 8}">1万</text><text x="${W + 14}" y="${y(20000) + 8}">2万</text>` +
      `<path d="${area(before)}" fill="#c8beb0" opacity="0.55"/><path d="${line(before)}" fill="none" stroke="#15140f" stroke-width="5" stroke-linejoin="round"/>` +
      `<g data-in="2" class="flat"><path d="${area(after)}" fill="#238343" opacity="0.28"/><path d="${line(after)}" fill="none" stroke="#238343" stroke-width="6" stroke-linejoin="round"/></g>` +
      `<line class="ax" x1="0" x2="${W}" y1="${H}" y2="${H}"/>` +
      `<text x="0" y="${H + 36}">2020年2月</text><text x="${x(12)}" y="${H + 36}" text-anchor="middle">2021年1月</text><text x="${W}" y="${H + 36}" text-anchor="end">2021年12月</text>` +
      `</svg>`;
    for (const el of stage.querySelectorAll("[data-m]")) {
      const m = Number(el.dataset.m);
      el.style.left = 120 + x(m) + "px";
      if (el.classList.contains("dot")) el.style.top = 360 + y(cum[m]) + "px";
    }
  }

  // ---------- 83 个月：每月订阅净增、每月发的视频 ----------
  const fillBars = (el, arr, maxH, cls) => {
    if (!el) return;
    const max = Math.max(...arr);
    el.innerHTML = arr.map((v, i) => `<i class="${cls(v, i)}" style="width:15px;height:${Math.max(2, (v / max) * maxH).toFixed(1)}px"></i>`).join("");
  };
  const top3 = [...D.subs].sort((a, b) => b - a)[2];
  const monthCls = (v, i) => [i >= 42 && i <= 47 ? "h2m" : "", i === 48 || i === 49 ? "jfm" : ""].join(" ");
  fillBars(stage.querySelector("#c-subs"), D.subs, 330, (v, i) => (v >= top3 ? "t3 " : "") + monthCls(v, i));
  fillBars(stage.querySelector("#c-up"), D.uploads, 110, monthCls);
  const yrs = stage.querySelector("#c-yrs");
  if (yrs) yrs.innerHTML = [2020, 2021, 2022, 2023, 2024, 2025, 2026].map((yv, j) => `<span class="yr" style="left:${(j * 12 * 20.305 + (j === 6 ? 5.5 : 6) * 20.305).toFixed(0)}px">${yv}</span>`).join("");

  // ---------- 612 个视频的点击率，每 0.5% 一档 ----------
  const ctr = stage.querySelector("#c-ctr");
  if (ctr) {
    const max = Math.max(...D.ctrBins);
    ctr.innerHTML = D.ctrBins.map(v => `<i style="width:44px;height:${v ? Math.max(4, (v / max) * 380).toFixed(1) : 0}px"></i>`).join("");
  }

  // ---------- 放映 ----------
  const steps = s => Number(s.dataset.steps || 0);
  const says = slides.map(s => {
    const t = s.querySelector("template.say");
    if (!t) return { mean: "", how: [], cues: [], dirs: [] };
    const q = sel => [...t.content.querySelectorAll(sel)].map(e => e.textContent.trim());
    return { mean: q(".mean")[0] || "", how: q("li"), cues: q(".cue"), dirs: q(".dir") };
  });
  const hasNotes = says.some(n => n.mean || n.how.length);
  // 页码前带上现在讲到哪一部分（每个整页绿的问题页开一部分）
  let part = "";
  for (const [i, s] of slides.entries()) {
    if (s.dataset.part) part = s.dataset.part;
    const pg = s.querySelector(".pg");
    if (pg) { pg.textContent = `${part ? part + "　" : ""}${i + 1} / ${slides.length}`; pg.setAttribute("aria-hidden", "true"); }
    // 个人站的网页版读这两样：这一页的标题、属于哪一部分
    if (!s.dataset.title) {
      const h = s.querySelector(".h, .qtext, h1");
      if (h) s.dataset.title = h.innerText.replace(/\s*\n\s*/g, "").trim();
    }
    if (part && !s.dataset.chapter) s.dataset.chapter = part;
  }

  let si = 0, k = 0;

  function apply(s, step, instant) {
    if (instant) stage.classList.add("instant");
    for (const el of s.querySelectorAll("[data-in]")) el.classList.toggle("on", step >= Number(el.dataset.in));
    for (const el of s.querySelectorAll("[data-out]")) el.classList.toggle("away", step >= Number(el.dataset.out));
    for (const el of s.querySelectorAll("[data-dim]")) el.classList.toggle("dim", step >= Number(el.dataset.dim));
    for (const el of s.querySelectorAll("[data-lit]")) el.classList.toggle("lit", step >= Number(el.dataset.lit));
    for (const el of s.querySelectorAll("[data-cls]")) {
      for (const pair of el.dataset.cls.split(" ")) {
        const [n, c] = pair.split(":");
        if (c.startsWith("-")) el.classList.toggle(c.slice(1), step < Number(n));
        else el.classList.toggle(c, step >= Number(n));
      }
    }
    if (instant) {
      void stage.offsetWidth;
      requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove("instant")));
    }
  }

  // 两个窗口同步翻页
  let chan = null;
  try { chan = capture ? null : new BroadcastChannel("deck-zimeiti-shouyi"); } catch {}

  function show(i, step, instant = false, fromRemote = false) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    const s = slides[i];
    step = Math.max(0, Math.min(steps(s), step));
    if (i !== si || !s.classList.contains("cur")) {
      slides[si]?.classList.remove("cur");
      s.classList.add("cur");
      si = i;
      apply(s, -1, true);
      if (instant) apply(s, step, true);
      else requestAnimationFrame(() => requestAnimationFrame(() => slides[si] === s && apply(s, k, false)));
    } else apply(s, step, instant);
    k = step;
    if (!capture) history.replaceState(null, "", `#${si + 1}.${k}`);
    if (chan && !fromRemote) chan.postMessage({ si, k });
    renderNotes();
  }
  // 新开的窗口先问一句「现在放到哪了」，已经开着的窗口回答；新窗口不会把别的窗口带回第一屏
  if (chan) chan.onmessage = e => {
    const m = e.data || {};
    if (m.hello) chan.postMessage({ si, k });
    else if (Number.isInteger(m.si) && (m.si !== si || m.k !== k)) show(m.si, m.k, true, true);
  };
  const next = () => (k < steps(slides[si]) ? show(si, k + 1) : si < slides.length - 1 && show(si + 1, 0));
  const prev = () => (k > 0 ? show(si, k - 1, true) : si > 0 && show(si - 1, steps(slides[si - 1]), true));

  // ---------- 讲稿栏 ----------
  const notes = document.createElement("aside");
  notes.id = "notes";
  document.body.append(notes);
  let t0 = null;
  function renderNotes() {
    if (!document.body.classList.contains("notes")) return;
    const n = says[si], total = steps(slides[si]);
    const sec = t0 ? Math.floor((Date.now() - t0) / 1000) : 0;
    const cues = n.cues.map((c, j) => `<div class="cue ${j + 1 === k + 1 ? "now" : j + 1 <= k ? "done" : ""}">${j + 1 === k + 1 ? "下一下 → " : ""}${c}</div>`).join("");
    notes.innerHTML =
      `<div class="pos"><span>第 ${si + 1}/${slides.length} 屏 · 第 ${k}/${total} 下</span><span>${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}</span></div>` +
      `<div class="mean">${n.mean}</div><ul>${n.how.map(h => `<li>${h}</li>`).join("")}</ul>` +
      n.dirs.map(d => `<div class="dir">${d}</div>`).join("") +
      `<div class="cues">${cues || '<div class="cue">这一屏不用点，直接 → 下一屏</div>'}${k >= total ? '<div class="cue now">下一下 → 下一屏</div>' : ""}</div>` +
      `<div class="keys">→ / 空格 / 翻页笔：走一步　← 退一步　N 收起讲稿　F 全屏<br>直播时：再开一个窗口共享给观众，两个窗口会一起翻页，这个窗口留给自己看讲稿。</div>`;
  }
  setInterval(() => t0 && renderNotes(), 1000);

  function fit() {
    const withNotes = document.body.classList.contains("notes");
    const kk = Math.min((withNotes ? innerWidth * 0.72 - 24 : innerWidth) / 1920, innerHeight / 1080);
    stage.style.setProperty("--k", kk.toFixed(5));
    // 位置也按窗口的实际宽高算，手机上不会偏
    stage.style.left = (withNotes ? kk * 960 + 12 : innerWidth / 2) + "px";
    stage.style.top = innerHeight / 2 + "px";
    const rot = document.getElementById("rotate");
    if (rot) rot.style.top = innerHeight / 2 + 540 * kk + 14 + "px";
  }

  if (!capture) {
    addEventListener("keydown", e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      if (["ArrowRight", "ArrowDown", " ", "PageDown", "Enter"].includes(key)) { e.preventDefault(); t0 ??= Date.now(); next(); }
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(key)) { e.preventDefault(); prev(); }
      else if (key === "Home") show(0, 0, true);
      else if (key === "End") show(slides.length - 1, 99, true);
      else if ((key === "n" || key === "N") && hasNotes) { document.body.classList.toggle("notes"); fit(); renderNotes(); }
      else if (key === "f" || key === "F") { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
      else if (key === "r" || key === "R") show(si, 0, true);
    });
    // 点画面右边走一步，点最左边四分之一退一步（手机上也这样）
    stage.addEventListener("click", e => {
      if (e.target.closest("a")) return;
      const r = stage.getBoundingClientRect();
      t0 ??= Date.now();
      (e.clientX - r.left) / r.width < 0.25 ? prev() : next();
    });
    let idle;
    addEventListener("mousemove", () => {
      document.body.classList.remove("idle");
      clearTimeout(idle);
      idle = setTimeout(() => document.body.classList.add("idle"), 1500);
    });
    addEventListener("resize", fit);
    addEventListener("orientationchange", fit);
    window.visualViewport?.addEventListener("resize", fit);
    try { new ResizeObserver(fit).observe(document.documentElement); } catch {}
    fit();
    const rot = document.createElement("div");
    rot.id = "rotate";
    rot.textContent = "把手机横过来看更清楚。点画面右边走一步，点最左边退一步。";
    document.body.append(rot);
    let seen = false;
    try { seen = sessionStorage.getItem("zimeiti-deck-keys") === "1"; sessionStorage.setItem("zimeiti-deck-keys", "1"); } catch {}
    if (!seen) {
      const toast = document.createElement("div");
      toast.id = "toast";
      toast.textContent = hasNotes ? "→ 或点一下：走一步　← 退一步　N 讲稿　F 全屏" : "→ 或点一下：走一步　← 退一步　F 全屏";
      document.body.append(toast);
      setTimeout(() => (toast.style.opacity = "0"), 5000);
      setTimeout(() => toast.remove(), 5800);
    }
  }

  // says：每屏讲稿的正文（不含提示），个人站生成网页版时读它；deckShowFinal：直接显示第 i 屏点完最后一下的样子
  window.deckAPI = { count: slides.length, steps: slides.map(steps), says: says.map(n => n.how), show };
  window.deckShowFinal = i => show(i, steps(slides[i]), true, true);
  const m = /^#(\d+)(?:\.(\d+))?$/.exec(location.hash);
  const [hi, hk] = capture ? [Number(params.get("s") || 1) - 1, Number(params.get("k") || 0)] : m ? [Number(m[1]) - 1, Number(m[2] || 0)] : [0, 0];
  show(hi, hk, capture || hk > 0, true);
  if (chan && !m) chan.postMessage({ hello: true });
})();
