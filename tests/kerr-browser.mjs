import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { cameraRay, traceRay } from '../content/kerr-black-hole/physics.js';

export async function checkKerrLab(browser,base='http://127.0.0.1:4173/content/kerr-black-hole/') {
  let page=await browser.newPage({viewport:{width:1440,height:960}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  await page.waitForFunction(()=>window.kerrLab?.stats.solveCount>0 || !document.getElementById('failure')?.hidden);
  assert.equal(await page.locator('#failure').isVisible(),false,await page.locator('#failure-message').textContent());
  await page.locator('#pause').click();
  const samples=await page.evaluate(()=>{
    const result=[];for(let y=.15;y<.9;y+=.1)for(let x=.15;x<.9;x+=.1)result.push(window.kerrLab.sample(x,y));return result;
  });
  assert.ok(samples.some(s=>s.meta[2]===1),'GPU must hit the emitting disk');
  assert.ok(samples.some(s=>s.meta[2]===2),'GPU must capture rays at the horizon');
  assert.ok(samples.some(s=>s.meta[2]===3),'GPU must reach null infinity');
  assert.ok(samples.every(s=>s.hit.every(Number.isFinite) && s.meta.every(Number.isFinite)));
  assert.ok(samples.filter(s=>s.meta[2]!==0).every(s=>s.meta[3]<.0002),'GPU Carter residual');
  for(const s of samples.filter(s=>s.meta[2]===1)){
    assert.ok(s.hit[0]>=2.9 && s.hit[0]<=20);
    assert.ok(s.hit[3]>0 && s.hit[3]<4,'physical disk frequency shift');
  }
  await mkdir('work/screenshots',{recursive:true});
  await page.screenshot({path:'work/screenshots/kerr-desktop.png'});
  // Animation and display-only experiments reuse the actual ray solution.
  const count=await page.evaluate(()=>window.kerrLab.stats.solveCount);
  const before=await page.locator('canvas').screenshot();
  await page.locator('#doppler').uncheck();
  await page.waitForTimeout(120);
  assert.notDeepEqual(await page.locator('canvas').screenshot(),before);
  assert.equal(await page.evaluate(()=>window.kerrLab.stats.solveCount),count);
  await page.locator('#doppler').check();
  await page.locator('[data-mode="1"]').click();
  assert.equal(await page.locator('#shift-legend').isVisible(),true);
  await page.locator('#diagnostic').click();
  assert.equal(await page.locator('#diagnostic').getAttribute('aria-pressed'),'true');
  await page.locator('#diagnostic').click();
  await page.locator('[data-mode="2"]').click();
  await page.waitForFunction(n=>window.kerrLab.stats.solveCount>n,count);
  await page.setViewportSize({width:960,height:680});
  await page.locator('#quality').selectOption('high');
  // Compare GPU capture/escape decisions to an independent double-precision run.
  for(const a of [-.998,0,.998]){
    const old=await page.evaluate(()=>window.kerrLab.stats.solveCount);
    await page.locator('#spin').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},String(a));
    await page.waitForFunction(n=>window.kerrLab.stats.solveCount>n,old);
    const data=await page.evaluate(()=>({state:window.kerrLab.state,stats:window.kerrLab.stats,
      samples:[[.35,.5],[.45,.6],[.5,.5],[.6,.6],[.7,.7]].map(([x,y])=>({x,y,...window.kerrLab.sample(x,y)}))}));
    for(const sample of data.samples){
      const {rayWidth:w,rayHeight:h,effectiveZoom:z}=data.stats;
      const px=Math.floor(sample.x*w)+.5,py=Math.floor(sample.y*h)+.5;
      const ray=cameraRay((2*px-w)/h*12.5/z,(2*py-h)/h*12.5/z,a,data.state.inclination*Math.PI/180);
      const ref=traceRay({a,...ray,h:.0005,maxSteps:15000});
      assert.equal(sample.meta[2],ref.kind==='captured' ? 2 : 3,`CPU/GPU capture at spin ${a}`);
      assert.ok(sample.meta[3]<.003);
      if(ref.kind==='escaped')assert.ok(Math.abs(sample.meta[0]-ref.z[1])<.015,'escaped sky latitude agrees');
    }
  }
  await page.locator('#reset').click();
  await page.locator('#quality').selectOption('auto');
  await page.locator('[data-mode="0"]').click();
  await page.close();
  const mobileContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  page=await mobileContext.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.waitForFunction(()=>window.kerrLab?.stats.solveCount>0);
  await page.locator('#pause').click();
  await page.waitForFunction(()=>window.kerrLab.stats.rayWidth/window.kerrLab.stats.rayHeight<1.2);
  const stats=await page.evaluate(()=>window.kerrLab.stats);
  assert.ok(stats.rayWidth*stats.rayHeight<96000,'touch devices start with the mobile ray budget');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const mobileCanvas=await page.locator('canvas').boundingBox();
  const mobileControls=await page.locator('.controls').boundingBox();
  assert.ok(mobileCanvas.y+mobileCanvas.height<=mobileControls.y,'mobile controls leave the simulation unobscured');
  await page.screenshot({path:'work/screenshots/kerr-mobile.png'});
  await page.locator('#inclination').evaluate(el=>{el.value='175';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(()=>window.kerrLab.state.inclination===175);
  await page.locator('#about').click();assert.ok(await page.locator('dialog').isVisible());
  await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').isVisible(),false);
  await page.locator('#reset').click();
  await page.locator('canvas').focus();await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(()=>window.kerrLab.state.inclination),75);
  const box=await page.locator('canvas').boundingBox();
  const start=await page.evaluate(()=>window.kerrLab.state.azimuth);
  await page.mouse.move(box.x+box.width*.4,box.y+box.height*.45);
  await page.mouse.down();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.5,{steps:5});await page.mouse.up();
  assert.notEqual(await page.evaluate(()=>window.kerrLab.state.azimuth),start);
  const touch=await mobileContext.newCDPSession(page);
  const zoom=await page.evaluate(()=>window.kerrLab.state.zoom);
  const cx=box.x+box.width/2,cy=box.y+box.height/2;
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-30,y:cy,id:1},{x:cx+30,y:cy,id:2}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-65,y:cy,id:1},{x:cx+65,y:cy,id:2}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(await page.evaluate(()=>window.kerrLab.state.zoom)>zoom,'two-finger pinch changes the field of view');
  await touch.detach();
  await page.setViewportSize({width:844,height:390});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const footer=await page.locator('footer').boundingBox();
  assert.ok(footer.y+footer.height<=391,'landscape keeps the status and controls reachable');
  assert.deepEqual(errors,[]);
  console.log('Kerr GPU/CPU agreement, physical effects, ray caching, keyboard/drag, desktop/mobile passed.');
  await mobileContext.close();
}
