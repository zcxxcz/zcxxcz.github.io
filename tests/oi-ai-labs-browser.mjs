import assert from 'node:assert/strict';
export async function checkOiAiLabs(browser,base='http://127.0.0.1:4173'){
 const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto(`${base}/content/oi-ai-learning-roadmap/`);
 assert.equal(await page.locator('[data-lab-tab]').count(),14);
 assert.equal(await page.locator('.project-demo-link').count(),13);
 const select=async id=>{await page.selectOption('#lab-select',id);const pane=page.locator(`#experiment-${id}`);assert.ok(await pane.isVisible());assert.equal(await page.locator('.experiment-pane:visible').count(),1);return pane;};
 let pane=await select('search');
 await pane.locator('#maze-compare').click();assert.match(await pane.locator('#maze-comparison').innerText(),/17/);
 await pane.locator('#maze-map').selectOption('blocked');await pane.locator('#maze-compare').click();assert.match(await pane.locator('#maze-comparison').innerText(),/不可达/);
 await pane.locator('#maze-map').selectOption('open');await pane.locator('#maze-play').click();await select('minimax');assert.match(await page.locator('#maze-play').innerText(),/自动运行/);
 pane=await select('minimax');await pane.locator('[data-cell="0"]').click();
 const score=await pane.locator('.ttt-board').innerText(),pruned=+(await pane.locator('.experiment-metrics b').nth(1).innerText()).replaceAll(',','');
 await pane.locator('[data-prune]').uncheck();assert.equal(await pane.locator('.ttt-board').innerText(),score);
 assert.ok(+(await pane.locator('.experiment-metrics b').nth(1).innerText()).replaceAll(',','')>pruned);
 await pane.locator('[data-action="ai"]').click();assert.equal(await pane.locator('.ttt-board strong').allTextContents().then(xs=>xs.filter(x=>x==='O').length),1);
 pane=await select('viterbi');await pane.locator('[data-action="all"]').click();assert.match(await pane.locator('.experiment-status').innerText(),/回溯最优天气/);assert.equal(await pane.locator('svg .solution-edge').count(),5);await pane.locator('[data-obs="0"]').click();assert.match(await pane.locator('.experiment-metrics').innerText(),/1 \/ 6/);
 pane=await select('bpe');await pane.locator('[data-corpus]').fill('aaaa');await pane.locator('[data-action="reset"]').click();await pane.locator('[data-action="step"]').click();assert.match(await pane.locator('.experiment-metrics').innerText(),/4 → 2/);assert.match(await pane.locator('.trace-line').innerText(),/实际合并 2 处/);
 pane=await select('qlearning');await pane.locator('[data-slip]').selectOption('0');for(let i=0;i<5;i++)await pane.locator('[data-action="train200"]').click();assert.match(await pane.locator('.experiment-metrics').innerText(),/100.0%/);
 pane=await select('mcts');await pane.locator('[data-position]').selectOption('win');await pane.locator('[data-action="many"]').click();assert.match(await pane.locator('.experiment-metrics').innerText(),/500/);assert.equal(await pane.locator('.ttt-board .suggested').getAttribute('data-cell'),'2');
 pane=await select('autodiff');await pane.locator('[data-action="all"]').click();const loss=+(await pane.locator('.experiment-metrics b').first().innerText());await pane.locator('[data-action="learn"]').click();assert.ok(+(await pane.locator('.experiment-metrics b').first().innerText())<loss);
 pane=await select('language');const before=+(await pane.locator('.experiment-metrics b').nth(1).innerText());await pane.locator('[data-action="train"]').click();assert.ok(+(await pane.locator('.experiment-metrics b').nth(1).innerText())<before);
 const causal=await pane.locator('.lab-matrix span').nth(1).innerText();assert.equal(causal,'0.00');await pane.locator('[data-mask]').uncheck();assert.ok(+(await pane.locator('.lab-matrix span').nth(1).innerText())>0);await pane.locator('[data-action="generate"]').click();assert.match(await pane.locator('.generated-text').innerText(),/栈检查/);
 pane=await select('value');await pane.locator('[data-action="train"]').click();assert.match(await pane.locator('.experiment-metrics').innerText(),/500/);await pane.locator('[data-action="search"]').click();assert.match(await pane.locator('.experiment-view').innerText(),/200 次/);
 pane=await select('tsp');await pane.locator('[data-action="finish"]').click();const length=+(await pane.locator('.experiment-metrics b').first().innerText());await pane.locator('[data-action="improve"]').click();assert.ok(+(await pane.locator('.experiment-metrics b').first().innerText())<=length);await pane.locator('[data-action="exact"]').click();assert.equal(await pane.locator('.exact-tour').count(),7);
 pane=await select('attention');await pane.locator('[data-scale]').selectOption('100');await pane.locator('[data-action="all"]').click();assert.ok(+(await pane.locator('.experiment-metrics b').nth(1).innerText())<1e-10);await pane.locator('[data-block]').selectOption('1');assert.match(await pane.locator('.experiment-metrics').innerText(),/64 \/ 8/);
 pane=await select('ngram');await pane.locator('[data-order]').selectOption('2');await pane.locator('[data-context]').fill('喜欢');await pane.locator('[data-action="generate"]').click();assert.match(await pane.locator('.experiment-view').innerText(),/输出是采样拼接/);
 pane=await select('lora');await pane.locator('[data-action="train"]').click();assert.ok(+(await pane.locator('.experiment-metrics b').nth(1).innerText())<1e-4);await pane.locator('[data-rank]').selectOption('3');assert.match(await pane.locator('.experiment-metrics').innerText(),/36 \/ 36/);
 pane=await select('graph');await pane.locator('[data-bridge]').check();for(let i=0;i<6;i++)await pane.locator('[data-action="step"]').click();assert.match(await pane.locator('.experiment-view').innerText(),/BFS 可达：1、2、3、4、5、6、7/);await pane.locator('[data-node="6"]').focus();await page.keyboard.press('Enter');assert.equal(await pane.locator('.experiment-metrics b').nth(1).innerText(),'7');
 // Deep links select and mount a previously hidden lab after a fresh navigation.
 await page.goto(`${base}/content/oi-ai-learning-roadmap/#experiment-lora`);await page.locator('#experiment-lora [data-rank]').waitFor();assert.ok(await page.locator('#experiment-lora').isVisible());
 // Project links select the matching demo even when another lab is open.
 await page.locator('[data-stage-tab="neural"]').click();await page.locator('#project-p8 .project-demo-link').click();assert.ok(await page.locator('#experiment-language').isVisible());
 // Saved checklists and paper filtering still work with the added module.
 await page.locator('[data-stage-tab="foundation"]').click();await page.locator('#project-p1 details').evaluate(e=>e.open=true);await page.locator('[data-task="p1-0"]').check();assert.match(await page.locator('#progress-total').innerText(),/01 \/ 32/);
 await page.locator('#paper-search').fill('Viterbi');assert.equal(await page.locator('.paper-card:visible').count(),1);await page.locator('#paper-search').fill('');
 for(const width of [390,320]){
 await page.setViewportSize({width,height:844});
 for(const id of ['search','minimax','viterbi','bpe','qlearning','mcts','autodiff','language','value','tsp','attention','ngram','lora','graph']){
 await select(id);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No page overflow at ${width}px in ${id}`);
 }
 }
 await page.emulateMedia({media:'print'});assert.equal(await page.locator('.experiment-pane:visible').count(),14);assert.equal(await page.locator('.experiment-interactive:visible').count(),0);
 assert.deepEqual(errors,[]);console.log('All 14 OI × AI labs: real updates, exact references, deep links, mobile widths, print, and existing controls passed.');
 }finally{await page.close();}
}
