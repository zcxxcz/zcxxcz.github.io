import assert from "node:assert/strict";

const url = "http://127.0.0.1:4173/content/hn-replay/";
const vectors = "fNk_zzaMoSs";
const legacy = "xDxjbXAqTPg";
const expectCount = (page, count) => page.waitForFunction(
  (text) => document.querySelector("#result-count").textContent.startsWith(text),
  count + " 部视频",
);

export async function checkHnReplay(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    // Keep this regression test independent of YouTube and its CDN.
    await page.route(/^https:\/\/(?:i\.ytimg\.com|www\.youtube-nocookie\.com)\//, (route) => route.abort());
    await page.route(url + "library.json", (route) => route.abort(), { times: 1 });
    await page.addInitScript((id) => {
      if (window !== window.top) return;
      if (!localStorage.getItem("hn-replay-watch-later-v1")) {
        localStorage.setItem("hn-replay-watch-later-v1", JSON.stringify([id]));
      }
    }, legacy);
    await page.goto(url);
    await page.locator("#library-retry").waitFor();
    assert.ok(await page.locator("#search").isDisabled());
    assert.equal(await page.locator(".card").count(), 0);
    await page.locator("#library-retry").click();
    await expectCount(page, "6,454");
    assert.equal(await page.locator('[data-view="curated"], #story-evidence').count(), 0);
    assert.equal(await page.locator("#area option").count(), 17);
    assert.equal(await page.locator("#topic option").count(), 151);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

    await page.locator("#next").click();
    assert.match(await page.locator("#result-count").innerText(), /25–48/);
    await page.locator("#page-number").fill("269");
    await page.getByRole("button", { name: "跳转", exact: true }).click();
    assert.match(await page.locator("#result-count").innerText(), /6,433–6,454/);

    await page.locator("#area").selectOption("math-theory");
    await page.locator("#evidence").selectOption("across");
    await page.locator("#search").fill("线性代数 向量");
    const card = page.locator(`.card-open[href="#watch=${vectors}"]`);
    await card.waitFor();
    await page.route("**/details/*.json", (route) => route.abort(), { times: 1 });
    await card.click();
    await page.locator("#comment-retry").click();
    await page.locator("#comments li").first().waitFor();
    assert.equal(await page.locator("#comments li").count(), 20);
    await page.goBack();
    assert.ok(await page.locator("#watch").isHidden());
    assert.equal(page.url(), url);
    assert.equal(await page.locator("#search").inputValue(), "线性代数 向量");
    assert.equal(await page.locator("#area").inputValue(), "math-theory");

    await page.locator(".scope [data-view=saved]").click();
    await expectCount(page, "1");
    await page.goto(url + "#watch=" + legacy);
    await page.locator("#watch[open]").waitFor();
    assert.match(await page.locator("#watch-title").innerText(), /Zelda/);
    assert.ok(await page.locator("#comment-evidence").isHidden());
    await page.locator("#watch [data-close]").click();
    await page.waitForURL(url);
    assert.deepEqual(errors, []);
    console.log("HN Replay: full catalog, mobile filters, pagination, retry, video history and legacy links passed.");
  } finally {
    await page.close();
  }
}
