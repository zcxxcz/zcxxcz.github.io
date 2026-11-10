import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraRay, constraintError, isco, redshift, rk4, traceRay } from '../content/kerr-black-hole/physics.js';

test('Kerr ISCO and horizon limits, including a counter-rotating disk',()=>{
  assert.equal(isco(0),6);
  assert.ok(Math.abs(isco(.998)-1.2369706552)<1e-9);
  assert.ok(Math.abs(isco(-.998)-8.9943744548)<1e-9);
  for(const a of [-.998,-.5,0,.5,.998])assert.ok(isco(a)>1+Math.sqrt(1-a*a));
});
test('finite ZAMO camera launches null rays satisfying both Carter potentials',()=>{
  for(const a of [-.998,0,.8,.998])for(const angle of [5,72,90,175])for(const [x,y] of [[0,0],[3,4],[-20,-8],[15,-12]]){
    const ray=cameraRay(x,y,a,angle*Math.PI/180);
    assert.ok(constraintError(ray.state,a,ray.l,ray.q)<1e-13);
    assert.ok(Number.isFinite(ray.energy) && ray.energy>0);
  }
});
test('Schwarzschild photon capture boundary is b = sqrt(27), through a radial turning point',()=>{
  for(const b of [0,5,Math.sqrt(27)-.0005,Math.sqrt(27)+.0005,6,10]){
    const u=1/80;
    const ray=traceRay({a:0,l:b,q:0,state:[u,0,Math.sqrt(1-b*b*u*u+2*b*b*u**3),0]});
    assert.equal(ray.kind,b<Math.sqrt(27) ? 'captured' : 'escaped',`b=${b}`);
    assert.ok(ray.maxError<1e-7,`constraint drift ${ray.maxError}`);
    if(ray.kind==='escaped')assert.ok(ray.z[2]<0,'radial turning point was crossed');
  }
});
test('Kerr polar and radial motion conserve potentials across signed spins and poles',()=>{
  for(const a of [-.998,0,.8,.998])for(const angle of [5,72,90,175])for(const [x,y] of [[2,3],[-7,4],[10,-8]]){
    const ray=cameraRay(x,y,a,angle*Math.PI/180);
    const result=traceRay({a,...ray,h:.002});
    assert.notEqual(result.kind,'unresolved');
    assert.ok(result.maxError<2e-7,`${a}, ${angle}: ${result.maxError}`);
  }
});
test('RK4 converges at fourth order rather than matching only a rendered silhouette',()=>{
  const a=.8,ray=cameraRay(8,5,a,1.1);
  function exact(h){let z=ray.state;for(let i=0;i<Math.round(.32/h);i++)z=rk4(z,h,a,ray.l,ray.q);return z;}
  const ref=exact(.000125),c=exact(.008),f=exact(.004);
  const err=z=>Math.hypot(...z.map((v,i)=>v-ref[i]));
  assert.ok(err(c)/err(f)>12 && err(c)/err(f)<20);
});
test('frequency shift recovers a Schwarzschild circular emitter and Doppler asymmetry',()=>{
  assert.ok(Math.abs(redshift(10,0,0)-Math.sqrt(.7))<1e-14);
  assert.ok(redshift(10,0,3)>redshift(10,0,-3));
  for(const a of [-.998,0,.998])assert.ok(Number.isFinite(redshift(isco(a)+.01,a,0)));
});
