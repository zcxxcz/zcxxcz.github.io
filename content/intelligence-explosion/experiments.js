(() => {
  function setPressed(buttons, selected) {
    buttons.forEach(button => {
      button.setAttribute("aria-pressed", String(button === selected));
    });
  }

  function attachChoices(container, selector, change) {
    if (!container) return;
    const buttons = Array.from(container.querySelectorAll(selector));
    buttons.forEach((button, index) => {
      button.addEventListener("click", event => {
        event.stopPropagation();
        setPressed(buttons, button);
        change(button);
      });
      button.addEventListener("keydown", event => {
        const backward = event.key === "ArrowLeft" || event.key === "ArrowUp";
        const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
        if (!backward && !forward) {
          if (event.key === " " || event.key === "Enter") event.stopPropagation();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const next = buttons[(index + (backward ? -1 : 1) + buttons.length) % buttons.length];
        next.focus();
        next.click();
      });
    });
  }

  function initialize() {
    const rounds = [
      ["完成第一轮共需", "12"],
      ["完成前两轮共需", "18"],
      ["完成前三轮共需", "21"],
      ["完成前四轮共需", "22.5"]
    ];
    attachChoices(document.getElementById("s5"), "[data-round]", button => {
      const [label, total] = rounds[Number(button.dataset.round)];
      document.getElementById("sx-round-label").textContent = label;
      document.getElementById("sx-round-sum").textContent = total;
    });

    attachChoices(document.getElementById("s6"), "[data-speed]", button => {
      const speed = Number(button.dataset.speed);
      const variable = 9 / speed;
      const days = 1 + variable;
      const format = value => Number.isInteger(value) ? String(value) : value.toFixed(2);
      document.getElementById("sx-work").style.width = (variable * 10) + "%";
      document.getElementById("sx-days").textContent = format(days) + " 天";
      document.getElementById("sx-speedup").textContent = format(10 / days);
    });

    const descriptions = {
      burst: "如果改进接连通过验证，周一刚学会用的研究工具，到周五可能已经帮同行造出了它的下一代。",
      stairs: "如果改进要等下一批芯片或下一次大规模训练才能兑现，研究能力就可能在等待后跃升。",
      plateau: "如果容易验证的改进逐渐用尽，再派更多助手也难有收获，能力增长就可能逐渐停滞。"
    };
    const forks = document.getElementById("s8");
    attachChoices(forks, "[data-scenario]", button => {
      const key = button.dataset.scenario;
      forks.querySelector(".sx-pathfig").dataset.show = key;
      document.getElementById("sx-explanation").textContent = descriptions[key];
      document.getElementById("sx-curve-title").textContent =
        "研究能力随日历时间变化的三种假设，当前突出" + button.textContent + "情景";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
