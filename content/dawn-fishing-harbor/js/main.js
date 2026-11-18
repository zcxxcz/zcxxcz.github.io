(function () {
  'use strict';
  const H = window.Harbor;
  const T = THREE;
  const canvas = document.querySelector('canvas');
  const renderer = new T.WebGLRenderer({
    canvas, antialias: true, alpha: false, powerPreference: 'high-performance'
  });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.07;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  const scene = new T.Scene();
  scene.background = new T.Color(0xc5ccca);
  scene.environment = H.makeEnvironment();
  scene.fog = new T.FogExp2(0xc2cbc9, .0069);
  const camera = new T.PerspectiveCamera(57, 1, .12, 4500);
  const navigate = H.navigate(camera, canvas);
  const daylight = new T.HemisphereLight(0xffeedb, 0x89a7ab, 1.40);
  scene.add(daylight);
  const sun = new T.DirectionalLight(0xffdbab, 2.75);
  sun.target.position.set(0, 2, -12);
  sun.position.copy(sun.target.position).add(new T.Vector3(.94,.109,-.32).normalize().multiplyScalar(145));
  Object.assign(sun.shadow.camera,{ left:-76, right:76, top:47, bottom:-47, near:30, far:260 });
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.bias = -.00012;
  sun.shadow.normalBias = .028;
  sun.castShadow = true;
  scene.add(sun, sun.target);

  // The coast's physical waterline also drives the foam in the sea shader.
  const ctx = { scene, camera, renderer, updates: [], foamRocks: [], ...H.makeResources(renderer) };
  H.buildCoast(ctx);
  H.buildHarbor(ctx);
  H.buildSeaSky(ctx);
  const film = H.film(renderer, scene, camera);
  let quality = 1, lost = false, elapsed = 0, previousTime = 0;
  let slowSeconds = 0, cost = 16.7;
  function resize() {
    const w = Math.max(1,canvas.clientWidth), h = Math.max(1,canvas.clientHeight);
    const scale = Math.min(devicePixelRatio || 1,1.55,1750 / Math.max(w,h)) * quality;
    renderer.setPixelRatio(scale);
    renderer.setSize(w,h,false);
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
    film.resize();
  }
  resize();
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',() => { previousTime = 0; slowSeconds = 0; });
  canvas.addEventListener('webglcontextlost',() => { lost = true; });
  canvas.addEventListener('webglcontextrestored',() => {
    lost = false; previousTime = 0; renderer.shadowMap.needsUpdate = true; resize();
  });

  function draw(now) {
    requestAnimationFrame(draw);
    if (lost || document.hidden) return;
    const gap = previousTime ? Math.max(0, now-previousTime) : 16.67;
    previousTime = now;
    const dt = Math.min(.075,gap / 1000);
    elapsed += dt;
    navigate(elapsed,dt);
    for (const update of ctx.updates) update(elapsed,dt);
    film.render(elapsed);
    if (gap < 250) cost += (gap - cost)*.055;
    // A short slow frame while compiling shaders should not lower the resolution.
    slowSeconds = cost > 30 ? slowSeconds + dt : Math.max(0,slowSeconds - dt);
    if (slowSeconds > 3 && quality > .72) {
      quality = Math.max(.72,quality-.12);
      slowSeconds = 0; cost = 16.7; resize();
    }
  }
  requestAnimationFrame(draw);
})();
