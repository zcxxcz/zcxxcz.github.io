import { chromium } from "playwright";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const child = spawn(process.execPath, ["scripts/serve.mjs"], {
  stdio: "ignore",
});
let browser;
try {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch("http://127.0.0.1:4173")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4173");
  await page.locator("#search input[type=text]").waitFor();
  assert.ok((await page.locator(".card").count()) >= 6);
  assert.equal(
    await page.locator(".card").filter({ hasText: "星球点名" }).count(),
    0,
  );
  await page.locator("#search input[type=text]").fill("谁是卧底");
  await page.locator(".pagefind-ui__result-link").first().waitFor();
  assert.match(
    await page.locator(".pagefind-ui__results").innerText(),
    /谁是卧底/,
  );
  await page.locator("#search input[type=text]").fill("木桶效应");
  await page.waitForFunction(() =>
    document
      .querySelector(".pagefind-ui__results")
      ?.textContent.includes("木桶"),
  );
  await page.locator("#search input[type=text]").fill("自造数据");
  await page.waitForFunction(() =>
    document
      .querySelector(".pagefind-ui__results")
      ?.textContent.includes("检查"),
  );
  await page.locator("#search input[type=text]").fill("");
  // 筛选按钮由主题词表自动生成，且必须覆盖到全部主题。
  assert.ok((await page.locator(".filter-bar button").count()) >= 4);
  await page.getByRole("button", { name: "家庭游戏", exact: true }).click();
  assert.equal(await page.locator(".library-row:visible").count(), 3);
  // 关键回归：点「信奥」必须能筛出 hub 里那些自建内容，而不是只剩课程章节。
  await page.getByRole("button", { name: "信奥", exact: true }).click();
  const xinaoRows = await page.locator(".library-row:visible").allInnerTexts();
  assert.ok(xinaoRows.some((t) => t.includes("信奥知识图谱")));
  assert.ok(xinaoRows.some((t) => t.includes("优化算法")));
  assert.ok(xinaoRows.some((t) => t.includes("CSP-S")));
  await page.getByRole("button", { name: "全部", exact: true }).click();
  assert.ok((await page.locator(".library-row").count()) >= 47);
  // 同源内容折叠成组：默认收起，展开后才可见。
  assert.ok((await page.locator("details.series").count()) >= 1);
  assert.equal(await page.locator(".library-row:visible").count(), 16);
  await page.locator("details.series > summary").first().click();
  assert.ok((await page.locator(".library-row:visible").count()) >= 50);
  await mkdir("work/screenshots", { recursive: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: "work/screenshots/desktop.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "work/screenshots/mobile.png",
    fullPage: false,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "Desktop/mobile rendering, filters, Chinese search, and excluded entries passed.",
  );
} finally {
  await browser?.close();
  child.kill();
}
