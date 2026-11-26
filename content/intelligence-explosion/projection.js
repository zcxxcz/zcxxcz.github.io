(() => {
  "use strict";
  const slides = Array.from(document.querySelectorAll("#stage > .slide"));
  const byId = id => document.getElementById(id);
  const stage = byId("stage");
  const panel = byId("panel");
  const panelBody = byId("panel-body");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const controls = document.querySelectorAll(".chrome");
  const count = byId("counter");
  const rail = byId("rail");
  const pad = n => String(n).padStart(2, "0");
  let page = -1;
  let animations = [];
  let panelKind = "";
  stage.tabIndex = -1;
  stage.style.outline = "none";

  const ticks = slides.map((slide, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.title = pad(i + 1) + " · " + slide.dataset.title;
    button.setAttribute("aria-label", "跳至第 " + (i + 1) + " 页，" + slide.dataset.title);
    button.addEventListener("click", () => showPage(i));
    rail.append(button);
    return button;
  });

  function readHash() {
    const match = location.hash.match(/^#s?(\d+)$/);
    return match ? Math.max(0, Math.min(slides.length - 1, Number(match[1]) - 1)) : 0;
  }
  function animatePage(current, previous, direction) {
    if (reducedMotion.matches || !current.animate) return;
    const paper = current.matches(".paper,.sx-light");
    const time = paper ? 580 : 660;
    const ease = "cubic-bezier(.19,.73,.18,1)";
    const incoming = paper && previous
      ? [{clipPath: direction > 0 ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)"}, {clipPath:"inset(0 0 0 0)"}]
      : [{opacity:0}, {opacity:1}];
    animations.push(current.animate(incoming, {duration:time, easing:ease}));
    if (previous) {
      previous.classList.add("departing");
      const outgoing = previous.animate([{opacity:1}, {opacity:.3}], {duration:time, easing:ease});
      outgoing.onfinish = () => previous.classList.remove("departing");
      animations.push(outgoing);
    }
    const copy = current.querySelectorAll(".film-copy > :not(button),.text-col,.evidence-content > h2,.numeric-spread,.sx-copy,.sx-figure,.hold-intro,.decisions,.loop-figure");
    copy.forEach((part, i) => {
      animations.push(part.animate([{opacity:0,transform:"translateY(13px)"},{opacity:1,transform:"translateY(0)"}],
        {duration:560, delay:45 + Math.min(i,3)*54, easing:ease, fill:"backwards"}));
    });
    const plate = current.querySelector(".plate");
    if (plate) animations.push(plate.animate([{transform:"scale(1.035)"},{transform:"scale(1)"}],{duration:2600,easing:"cubic-bezier(.19,.68,.25,1)"}));
  }

  function showPage(index, updateURL = true) {
    if (index < 0 || index >= slides.length || index === page) return;
    const oldIndex = page;
    const previous = slides[oldIndex];
    const current = slides[index];
    if (previous?.contains(document.activeElement)) stage.focus({preventScroll:true});
    animations.forEach(animation => animation.cancel());
    animations = [];
    slides.forEach((slide, i) => {
      slide.classList.remove("departing");
      slide.classList.toggle("active", i === index);
      slide.inert = i !== index;
      slide.setAttribute("aria-hidden", String(i !== index));
      if (i === index) ticks[i].setAttribute("aria-current","step");
      else ticks[i].removeAttribute("aria-current");
      ticks[i].classList.toggle("seen",i < index);
    });
    page = index;
    current.scrollTop = 0;
    controls.forEach(control => control.classList.toggle("light",current.matches(".paper,.sx-light")));
    count.textContent = pad(index + 1);
    byId("chapter").textContent = current.dataset.chapter;
    byId("prev").disabled = index === 0;
    byId("next").disabled = index === slides.length - 1;
    byId("announcer").textContent = "第 " + (index + 1) + " 页，共 " + slides.length + " 页。" + current.dataset.title;
    if (updateURL) history.replaceState(null,"","#s" + (index + 1));
    animatePage(current,previous,index > oldIndex ? 1 : -1);
    updateOrbit();
  }

  function openPanel(kind) {
    if (panel.open) panel.close();
    panelKind = kind;
    panelBody.replaceChildren();
    const current = slides[page];
    byId("panel-heading").textContent = kind === "contents" ? "放映目录" : pad(page+1) + " · 讲者手记";
    if (kind === "notes") {
      const body = document.createElement("div");
      body.className = "panel-notes";
      body.append(...Array.from(current.querySelector(".talk-note").children, n => n.cloneNode(true)));
      panelBody.append(body);
    } else {
      slides.forEach((slide,i) => {
        const button = document.createElement("button");
        button.className = "toc-row";
        if (i === page) button.setAttribute("aria-current","page");
        const num = document.createElement("span"), title = document.createElement("span"), chapter = document.createElement("small");
        num.textContent = pad(i+1);
        title.textContent = slide.dataset.title;
        chapter.textContent = slide.dataset.chapter;
        button.append(num,title,chapter);
        button.addEventListener("click", () => { panel.close(); showPage(i); });
        panelBody.append(button);
      });
      const hint = document.createElement("p");
      hint.className = "panel-hint";
      hint.textContent = "方向键或左右滑动翻页 · N 讲者手记 · G 目录 · Esc 关闭面板";
      const download = document.createElement("a");
      download.className = "download-link";
      download.href = "intelligence-explosion.pptx";
      download.download = "智能爆炸.pptx";
      download.textContent = "下载 PowerPoint 演示文稿 ↓";
      panelBody.append(download, hint);
    }
    panel.showModal();
    panel.scrollTop = 0;
    byId("dismiss").focus({preventScroll:true});
  }

  const full = byId("full");
  async function toggleFull() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      byId("announcer").textContent = "当前浏览器未能进入全屏。";
    }
  }
  if (document.fullscreenEnabled) {
    full.addEventListener("click", toggleFull);
    document.addEventListener("fullscreenchange", () => {
      const name = document.fullscreenElement ? "退出全屏" : "进入全屏";
      full.setAttribute("aria-label",name); full.title = name + " (F)";
    });
  } else full.style.display = "none";

  byId("prev").addEventListener("click",() => showPage(page-1));
  byId("next").addEventListener("click",() => showPage(page+1));
  byId("begin").addEventListener("click",() => showPage(1));
  byId("contents").addEventListener("click",() => openPanel("contents"));
  byId("notes").addEventListener("click",() => openPanel("notes"));
  byId("dismiss").addEventListener("click",() => panel.close());
  panel.addEventListener("click", event => {
    if (event.target !== panel) return;
    const r = panel.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) panel.close();
  });
  document.addEventListener("keydown",event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
    const k = event.key.toLowerCase();
    if (panel.open) {
      if ((k === "n" && panelKind === "notes") || (k === "g" && panelKind === "contents")) panel.close();
      return;
    }
    const forward = ["arrowright","pagedown"].includes(k) || (k === " " && !event.target.closest("button,a,input"));
    const backward = ["arrowleft","pageup"].includes(k);
    if (forward || backward) {
      event.preventDefault();
      showPage(page+(forward ? 1 : -1));
    } else if (k === "home" || k === "end") {
      event.preventDefault(); showPage(k === "home" ? 0 : slides.length-1);
    } else if (k === "g") openPanel("contents");
    else if (k === "n") openPanel("notes");
    else if (k === "f" && document.fullscreenEnabled) toggleFull();
  });

  let startTouch = null;
  stage.addEventListener("touchstart",event => {
    startTouch = event.touches.length === 1 && !event.target.closest("button,a,input") ? event.changedTouches[0] : null;
  },{passive:true});
  stage.addEventListener("touchcancel",() => {startTouch=null;},{passive:true});
  stage.addEventListener("touchend",event => {
    if (!startTouch) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - startTouch.clientX, dy = t.clientY - startTouch.clientY;
    if (Math.abs(dx) > 46 && Math.abs(dx) > 1.6*Math.abs(dy)) showPage(page+(dx<0 ? 1 : -1));
    startTouch = null;
  },{passive:true});
  window.addEventListener("hashchange",() => showPage(readHash(),false));

  const canvas = byId("orbit");
  const ctx = canvas.getContext("2d");
  let orbitFrame = 0;
  function drawOrbit(timestamp) {
    if (!ctx || !canvas.clientWidth) return;
    const size = canvas.clientWidth, ratio = Math.min(window.devicePixelRatio || 1,2);
    const pixels = Math.round(size*ratio);
    if (canvas.width !== pixels || canvas.height !== pixels) canvas.width = canvas.height = pixels;
    ctx.setTransform(pixels/520,0,0,pixels/520,0,0);
    ctx.clearRect(0,0,520,520);ctx.translate(260,260);
    const tau = Math.PI*2;
    const phase = reducedMotion.matches ? .8 : timestamp/7000;
    for (let i=0; i<52; i++) {
      ctx.beginPath();
      for (let j=0;j<=200;j++) {
        const t=j/200*tau;
        const ripple=Math.sin(t*3+i*.105+phase*.5)*(.13 + i*.0006);
        const radius=58 + i*1.66;
        const x=Math.cos(t)*(1+ripple)*radius, y=Math.sin(t)*(1+ripple)*radius*.87;
        const rotation=.52;
        const px=x*Math.cos(rotation)-y*Math.sin(rotation),py=x*Math.sin(rotation)+y*Math.cos(rotation);
        if(j===0) ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.closePath();ctx.strokeStyle="rgba(250,"+(132+Math.floor(i*.9))+",100,"+(.12 + i*.006)+")";ctx.lineWidth=.85;ctx.stroke();
    }
    for (const ring of [180,207,216]) {
      ctx.setLineDash(ring===216?[1,6]:[]);ctx.strokeStyle=ring===207?"#cfbc9e88":"#b8cce738";
      ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,ring,0,tau);ctx.stroke();
    }
    ctx.setLineDash([]);
    for(let i=0;i<4;i++) {
      const angle=(i+.5)*tau/4,r=207,x=Math.cos(angle)*r,y=Math.sin(angle)*r;
      ctx.save();ctx.translate(x,y);ctx.rotate(angle+Math.PI/2);
      ctx.beginPath();ctx.moveTo(6,0);ctx.lineTo(-4,-3.6);ctx.lineTo(-4,3.6);ctx.closePath();ctx.fillStyle="#ffac77";ctx.fill();ctx.restore();
      const p=phase+i*tau/4;
      ctx.beginPath();ctx.arc(Math.cos(p)*180,Math.sin(p)*180,2.2,0,tau);ctx.fillStyle="#ffb37f";ctx.fill();
    }
    if (page===2 && !reducedMotion.matches && !document.hidden) orbitFrame=requestAnimationFrame(drawOrbit);
  }
  function updateOrbit() {
    cancelAnimationFrame(orbitFrame);
    if (page===2 && !document.hidden) drawOrbit(performance.now());
  }
  window.addEventListener("resize",updateOrbit);
  document.addEventListener("visibilitychange",updateOrbit);
  reducedMotion.addEventListener("change",updateOrbit);

  document.documentElement.classList.add("js");
  showPage(readHash(),false);
})();
