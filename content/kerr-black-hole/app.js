import { isco } from './physics.js';
import { vertex, trace, render, display } from './shaders.js';

const $ = (id) => document.getElementById(id);
const canvas = $('universe'), viewport = $('viewport');
const coarse = matchMedia('(pointer: coarse)').matches;
const state = { spin: .8, inclination: 72, azimuth: 0, zoom: 1, mode: 0,
  quality: 'auto', exposure: 1.3, doppler: true, gravity: true, stars: true,
  paused: matchMedia('(prefers-reduced-motion: reduce)').matches, diagnostic: false };
let gl, programs, rayFbo, imageFbo, hitTexture, metaTexture, imageTexture;
let rayWidth=0, rayHeight=0, dirty=true, paint=true, dragging=false, settleTimer;
let raf=0, lastTime=0, elapsed=0, frameCount=0, fpsStart=0, solveCount=0;
let timerExt, pendingQuery, gpuMs=null, pixelLimit=coarse ? 95000 : 230000;
let running=false, contextLost=false;
const uniforms = new WeakMap();
function program(fragment) {
  const result=gl.createProgram();
  for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
    const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
      const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(message);
    }
    gl.attachShader(result,shader);gl.deleteShader(shader);
  }
  gl.linkProgram(result);
  if(!gl.getProgramParameter(result,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(result));
  uniforms.set(result,new Map());return result;
}
function uniform(p,name,value,type='f') {
  const cache=uniforms.get(p);
  if(!cache.has(name))cache.set(name,gl.getUniformLocation(p,name));
  const location=cache.get(name);
  if(type==='i')gl.uniform1i(location,value);
  else if(Array.isArray(value))gl.uniform2f(location,...value);
  else gl.uniform1f(location,value);
}
function texture(internal,format,type,w,h,linear=false) {
  const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,linear ? gl.LINEAR : gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,linear ? gl.LINEAR : gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,internal,w,h,0,format,type,null);return t;
}
function attach(fbo,textures) {
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  textures.forEach((t,i)=>gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0+i,gl.TEXTURE_2D,t,0));
  gl.drawBuffers(textures.map((_,i)=>gl.COLOR_ATTACHMENT0+i));
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('这台设备无法创建浮点光路缓冲区，请使用支持 WebGL 2 浮点附件的浏览器。');
}
function resize() {
  const bounds=viewport.getBoundingClientRect();
  const dpr=Math.min(devicePixelRatio,coarse ? 1.5 : 1.75);
  const cw=Math.max(2,Math.round(bounds.width*dpr)),ch=Math.max(2,Math.round(bounds.height*dpr));
  if(canvas.width!==cw || canvas.height!==ch){canvas.width=cw;canvas.height=ch;dirty=true;}
  let limit=state.quality==='high' ? (coarse ? 200000 : 600000) : state.quality==='low' ? (coarse ? 55000 : 110000) : pixelLimit;
  if(dragging)limit*=.45;
  const ratio=Math.min(1,Math.sqrt(limit/(cw*ch)));
  const w=Math.max(2,Math.round(cw*ratio)),h=Math.max(2,Math.round(ch*ratio));
  if(w===rayWidth && h===rayHeight)return;
  rayWidth=w;rayHeight=h;
  for(const t of [hitTexture,metaTexture,imageTexture])if(t)gl.deleteTexture(t);
  if(rayFbo)gl.deleteFramebuffer(rayFbo);if(imageFbo)gl.deleteFramebuffer(imageFbo);
  hitTexture=texture(gl.RGBA32F,gl.RGBA,gl.FLOAT,w,h);
  metaTexture=texture(gl.RGBA32F,gl.RGBA,gl.FLOAT,w,h);
  imageTexture=texture(gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,w,h,true);
  rayFbo=gl.createFramebuffer();attach(rayFbo,[hitTexture,metaTexture]);
  imageFbo=gl.createFramebuffer();attach(imageFbo,[imageTexture]);
  dirty=true;
  $('resolution-status').textContent=`${w} × ${h} 光线`;
}
function solve() {
  const p=programs.trace;gl.useProgram(p);
  gl.bindFramebuffer(gl.FRAMEBUFFER,rayFbo);gl.viewport(0,0,rayWidth,rayHeight);
  const settings=state.quality==='high' ? [.0028,2560] : state.quality==='low' ? [.008,512] : [.005,1280];
  uniform(p,'uResolution',[rayWidth,rayHeight]);uniform(p,'uSpin',state.spin);
  const inclination=state.inclination*Math.PI/180;
  uniform(p,'uPolar',[Math.sin(inclination),Math.cos(inclination)]);
  uniform(p,'uOrbit',[Math.cos(state.azimuth),Math.sin(state.azimuth)]);
  uniform(p,'uZoom',state.zoom*Math.min(1,rayWidth/rayHeight/1.5));uniform(p,'uInner',isco(state.spin));
  uniform(p,'uDisk',state.mode!==2 ? 1 : 0,'i');
  uniform(p,'uStep',settings[0]);uniform(p,'uBudget',settings[1],'i');
  if(timerExt && !pendingQuery){pendingQuery=gl.createQuery();gl.beginQuery(timerExt.TIME_ELAPSED_EXT,pendingQuery);}
  gl.drawArrays(gl.TRIANGLES,0,3);
  if(timerExt && pendingQuery && gl.getQuery(timerExt.TIME_ELAPSED_EXT,gl.CURRENT_QUERY))gl.endQuery(timerExt.TIME_ELAPSED_EXT);
  solveCount++;dirty=false;paint=true;
  $('solver-status').textContent=`克尔测地线 · RK4 / ${settings[1]}`;
}
function compose() {
  const p=programs.render;gl.useProgram(p);
  gl.bindFramebuffer(gl.FRAMEBUFFER,imageFbo);gl.viewport(0,0,rayWidth,rayHeight);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,hitTexture);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,metaTexture);
  uniform(p,'uHits',0,'i');uniform(p,'uMeta',1,'i');
  uniform(p,'uResolution',[rayWidth,rayHeight]);uniform(p,'uRayResolution',[rayWidth,rayHeight]);
  uniform(p,'uTime',elapsed);uniform(p,'uSpin',state.spin);uniform(p,'uInner',isco(state.spin));
  uniform(p,'uExposure',state.exposure);uniform(p,'uMode',state.diagnostic ? 3 : state.mode,'i');
  for(const [name,key] of [['uDoppler','doppler'],['uGravity','gravity'],['uStars','stars']])uniform(p,name,state[key] ? 1 : 0,'i');
  gl.drawArrays(gl.TRIANGLES,0,3);
  // Upscale computed radiance. Hit positions and frequencies are never smoothed across edges.
  gl.useProgram(programs.display);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,imageTexture);
  uniform(programs.display,'uImage',0,'i');uniform(programs.display,'uResolution',[canvas.width,canvas.height]);
  gl.drawArrays(gl.TRIANGLES,0,3);paint=false;
}
function pollTimer() {
  if(!pendingQuery || !gl.getQueryParameter(pendingQuery,gl.QUERY_RESULT_AVAILABLE))return;
  if(!gl.getParameter(timerExt.GPU_DISJOINT_EXT)){
    gpuMs=gl.getQueryParameter(pendingQuery,gl.QUERY_RESULT)/1e6;
    if(state.quality==='auto' && !dragging && gpuMs>180 && pixelLimit>45000){pixelLimit=Math.max(45000,Math.round(pixelLimit*.7));dirty=true;}
  }
  gl.deleteQuery(pendingQuery);pendingQuery=null;
}
function frame(now) {
  if(!running || contextLost)return;
  if(document.hidden){lastTime=0;raf=0;return;}
  try{
    const dt=lastTime ? Math.min((now-lastTime)/1000,.1) : 0;lastTime=now;
    if(!state.paused)elapsed+=dt;
    resize();pollTimer();
    if(dirty)solve();
    if(paint || (!state.paused && state.mode===0 && !state.diagnostic)){
      compose();frameCount++;
    }
    $('loading').hidden=true;
    if(!fpsStart)fpsStart=now;
    if(now-fpsStart>=1000){
      const measuredFps=frameCount*1000/(now-fpsStart), staticView=state.paused || state.mode!==0 || state.diagnostic;
      $('fps').textContent=staticView ? '静态观测' : `${Math.round(measuredFps)} FPS`;
      if(!staticView && state.quality==='auto' && !dragging && elapsed>3 && measuredFps<27 && pixelLimit>35000){
        pixelLimit=Math.max(35000,Math.round(pixelLimit*.75));dirty=true;
      }
      fpsStart=now;frameCount=0;
    }
    raf=requestAnimationFrame(frame);
  }catch(error){fail(error);}
}
function fail(error) {
  running=false;cancelAnimationFrame(raf);$('loading').hidden=true;$('failure').hidden=false;
  $('failure-message').textContent=error.message;$('solver-status').textContent='渲染未启动';
  console.error(error);
}
function start() {
  try{
    gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:coarse ? 'default' : 'high-performance'});
    if(!gl)throw Error('当前浏览器不支持 WebGL 2。请启用硬件加速，或尝试更新浏览器。');
    if(!gl.getExtension('EXT_color_buffer_float'))throw Error('当前浏览器不支持浮点颜色附件，无法保存逐像素积分结果。请尝试更新浏览器。');
    timerExt=gl.getExtension('EXT_disjoint_timer_query_webgl2');
    programs={trace:program(trace),render:program(render),display:program(display)};
    gl.bindVertexArray(gl.createVertexArray());gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
    rayWidth=0;rayHeight=0;pendingQuery=null;rayFbo=imageFbo=null;hitTexture=metaTexture=imageTexture=null;
    contextLost=false;running=true;dirty=true;paint=true;lastTime=0;
    $('failure').hidden=true;$('loading').hidden=false;
    raf=requestAnimationFrame(frame);
  }catch(error){fail(error);}
}
function sync() {
  $('spin').value=state.spin;$('inclination').value=state.inclination;
  $('spin-value').value=(state.spin<0 ? '−' : '')+Math.abs(state.spin).toFixed(3);
  $('inclination-value').value=`${Math.round(state.inclination)}°`;
  $('horizon-value').innerHTML=`${(1+Math.sqrt(1-state.spin**2)).toFixed(3)} <small>M</small>`;
  $('isco-value').innerHTML=`${isco(state.spin).toFixed(3)} <small>M</small>`;
  for(const id of ['spin','inclination','exposure']){
    const input=$(id);input.style.setProperty('--fill',`${100*(input.value-input.min)/(input.max-input.min)}%`);
  }
  $('pause').textContent=state.paused ? '▷' : 'Ⅱ';
  $('pause').setAttribute('aria-label',state.paused ? '播放吸积盘动画' : '暂停吸积盘动画');
  $('diagnostic').setAttribute('aria-pressed',state.diagnostic);
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.mode)===state.mode));
  $('shift-legend').hidden=state.mode!==1;
  const captions=['光沿测地线传播。亮的一侧，正朝你而来。','频移因子 g：红色低于发射频率，蓝色高于发射频率。','远方的经纬网，沿同一套克尔测地线被弯曲。'];
  $('mode-caption').lastElementChild.textContent=state.diagnostic ? '积分守恒残差：青色较小，橙色较大，紫色为未收敛光线。' : captions[state.mode];
}
function invalidate(){dirty=true;paint=true;sync();}
for(const [id,key] of [['spin','spin'],['inclination','inclination']])$(id).addEventListener('input',e=>{state[key]=Number(e.target.value);invalidate();});
for(const key of ['doppler','gravity','stars'])$(key).addEventListener('change',e=>{state[key]=e.target.checked;paint=true;});
$('exposure').addEventListener('input',e=>{state.exposure=Number(e.target.value);paint=true;sync();});
$('quality').addEventListener('change',e=>{state.quality=e.target.value;invalidate();});
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{const before=state.mode;state.mode=Number(button.dataset.mode);state.diagnostic=false;if((before===2)!==(state.mode===2))dirty=true;paint=true;sync();}));
$('diagnostic').addEventListener('click',()=>{state.diagnostic=!state.diagnostic;paint=true;sync();});
$('pause').addEventListener('click',()=>{state.paused=!state.paused;paint=true;sync();});
$('reset').addEventListener('click',()=>{Object.assign(state,{spin:.8,inclination:72,azimuth:0,zoom:1});invalidate();});
$('fullscreen').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else{$('model-dialog').showModal();}}catch{}
});
const dialog=$('model-dialog');
$('about').addEventListener('click',()=>dialog.showModal());$('close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left || e.clientX>b.right || e.clientY<b.top || e.clientY>b.bottom)dialog.close();}});
$('retry').addEventListener('click',()=>location.reload());
const pointers=new Map();let pinchDistance=0;
function distance(){const p=[...pointers.values()];return p.length===2 ? Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y) : 0;}
canvas.addEventListener('pointerdown',e=>{
  canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  dragging=true;pinchDistance=distance();clearTimeout(settleTimer);dirty=true;
});
canvas.addEventListener('pointermove',e=>{
  const old=pointers.get(e.pointerId);if(!old)return;
  const dx=e.clientX-old.x,dy=e.clientY-old.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){const d=distance();if(pinchDistance>0)state.zoom=Math.max(.55,Math.min(2.5,state.zoom*d/pinchDistance));pinchDistance=d;}
  else{state.azimuth-=dx*.006;state.inclination=Math.max(5,Math.min(175,state.inclination+dy*.25));}
  invalidate();
});
function pointerEnd(e){pointers.delete(e.pointerId);pinchDistance=distance();if(pointers.size===0){dragging=false;settleTimer=setTimeout(invalidate,120);}}
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,pointerEnd);
canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=Math.max(.55,Math.min(2.5,state.zoom*Math.exp(-e.deltaY*.001)));invalidate();},{passive:false});
canvas.addEventListener('keydown',e=>{
  const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-',' '];if(!keys.includes(e.key))return;e.preventDefault();
  if(e.key==='ArrowLeft')state.azimuth-=.1;if(e.key==='ArrowRight')state.azimuth+=.1;
  if(e.key==='ArrowUp')state.inclination=Math.max(5,state.inclination-3);if(e.key==='ArrowDown')state.inclination=Math.min(175,state.inclination+3);
  if(e.key==='+' || e.key==='=')state.zoom=Math.min(2.5,state.zoom*1.1);if(e.key==='-')state.zoom=Math.max(.55,state.zoom/1.1);
  if(e.key===' ')state.paused=!state.paused;invalidate();
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden && running && !raf){lastTime=0;raf=requestAnimationFrame(frame);}});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);raf=0;lastTime=0;});
window.addEventListener('pageshow',()=>{if(running && !raf)raf=requestAnimationFrame(frame);});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;cancelAnimationFrame(raf);$('solver-status').textContent='GPU 上下文暂时丢失，等待恢复';});
canvas.addEventListener('webglcontextrestored',start);
// Read-only numerical inspection for reproducible GPU/browser validation.
window.kerrLab=Object.freeze({get state(){return {...state};},get stats(){return {rayWidth,rayHeight,solveCount,gpuMs,running,effectiveZoom:state.zoom*Math.min(1,rayWidth/rayHeight/1.5)};},
  sample(x,y){
    if(!gl || contextLost)throw Error('GPU unavailable');
    const hit=new Float32Array(4),meta=new Float32Array(4);
    gl.bindFramebuffer(gl.FRAMEBUFFER,rayFbo);
    const px=Math.max(0,Math.min(rayWidth-1,Math.floor(x*rayWidth))),py=Math.max(0,Math.min(rayHeight-1,Math.floor(y*rayHeight)));
    gl.readBuffer(gl.COLOR_ATTACHMENT0);gl.readPixels(px,py,1,1,gl.RGBA,gl.FLOAT,hit);
    gl.readBuffer(gl.COLOR_ATTACHMENT1);gl.readPixels(px,py,1,1,gl.RGBA,gl.FLOAT,meta);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);return {hit:[...hit],meta:[...meta]};
  }});
sync();start();
