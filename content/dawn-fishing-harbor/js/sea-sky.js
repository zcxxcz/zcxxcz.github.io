(function () {
  'use strict';

  const H = window.Harbor = window.Harbor || {};
  const tau = Math.PI * 2;

  // A seamless relief map. R holds cloud density, GB carry the gradient of a
  // second field used to break up very small waves. All samples are periodic.
  function weatherMap() {
    const size = 256;
    const bytes = new Uint8Array(size * size * 4);
    const relief = new Float32Array(size * size);
    function hash(x, y, seed) {
      let h = Math.imul(x + 213 + seed, 1597334677) ^ Math.imul(y + 673, 3812015801);
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
    }
    function sample(x, y, frequency, seed) {
      const ix = Math.floor(x * frequency), iy = Math.floor(y * frequency);
      let a = x * frequency - ix, b = y * frequency - iy;
      a *= a * (3 - 2 * a);
      b *= b * (3 - 2 * b);
      const i = ix % frequency, j = iy % frequency;
      const k = (ix + 1) % frequency, l = (iy + 1) % frequency;
      const p = hash(i, j, seed) * (1 - a) + hash(k, j, seed) * a;
      const q = hash(i, l, seed) * (1 - a) + hash(k, l, seed) * a;
      return p * (1 - b) + q * b;
    }
    for (let j = 0; j < size; ++j) {
      for (let i = 0; i < size; ++i) {
        const x = i / size, y = j / size, k = j * size + i;
        const density = sample(x, y, 4, 1) * .44 + sample(x, y, 8, 2) * .27 +
          sample(x, y, 16, 3) * .16 + sample(x, y, 32, 4) * .085 +
          sample(x, y, 64, 5) * .045;
        bytes[k * 4] = Math.round(255 * density);
        bytes[k * 4 + 3] = 255;
        relief[k] = sample(x, y, 8, 21) + .45 * sample(x, y, 16, 22) + .22 * sample(x, y, 32, 23);
      }
    }
    for (let j = 0; j < size; ++j) {
      for (let i = 0; i < size; ++i) {
        const k = j * size + i;
        const dx = relief[j * size + ((i + 1) & 255)] - relief[j * size + ((i + 255) & 255)];
        const dy = relief[((j + 1) & 255) * size + i] - relief[((j + 255) & 255) * size + i];
        bytes[k * 4 + 1] = Math.min(255, Math.max(0, 128 + dx * 1150));
        bytes[k * 4 + 2] = Math.min(255, Math.max(0, 128 + dy * 1150));
      }
    }
    const map = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.magFilter = THREE.LinearFilter;
    map.generateMipmaps = true;
    map.needsUpdate = true;
    return map;
  }

  const atmosphere = `
    uniform vec3 sunDir;
    uniform vec3 mistTint;
    uniform sampler2D weather;
    uniform float seconds;

    vec3 horizonColor(vec3 d) {
      float east = pow(max(dot(normalize(d.xz + .00001), normalize(sunDir.xz)), 0.0), 2.4);
      return mix(mistTint * 1.06 + vec3(.035,.026,.02), vec3(1.41,.715,.405), east * .86);
    }
    vec3 skyLight(vec3 d) {
      float y = max(d.y, 0.);
      float east = max(0., dot(normalize(d.xz + .00001), normalize(sunDir.xz)));
      vec3 horizon = horizonColor(d);
      vec3 lowSky = mix(vec3(.49,.60,.72), vec3(1.10,.61,.405), east * .76);
      vec3 zenith = vec3(.146,.373,.61);
      vec3 col = mix(horizon, lowSky, smoothstep(-.02,.17,y));
      col = mix(col, zenith, 1. - exp(-3.95 * pow(y,1.12)));
      float mu = max(dot(d, sunDir), 0.);
      col += vec3(.52,.263,.091) * pow(mu, 18.);
      col += vec3(.52,.29,.12) * pow(mu, 125.);
      return col;
    }
  `;

  // Bake a shallow bank of lit marine cumulus onto an angular texture once.
  // A second density sample along the sun gives cavities and a warm silver edge.
  function bakeCloudBank(renderer, shared) {
    const target = new THREE.WebGLRenderTarget(1792,384, {
      depthBuffer:false, minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter
    });
    const material = new THREE.ShaderMaterial({
      uniforms:shared, depthTest:false, depthWrite:false,
      vertexShader:`
        varying vec2 st;
        void main() {
          st=uv;
          gl_Position=vec4(position.xy,0.,1.);
        }
      `,
      fragmentShader:`
        uniform sampler2D weather;
        uniform vec3 sunDir;
        varying vec2 st;
        float vapor(vec3 p) {
          float h=(p.y-.95)/.50;
          vec2 uv=p.xz*vec2(.162,.18)+vec2(.12,.48);
          float broad=texture2D(weather,uv*.44).r;
          float twist=texture2D(weather,uv*1.61+vec2(.34,.21)).r-.5;
          uv+=vec2(twist,-twist)*.089;
          float lobes=texture2D(weather,uv+vec2(h*.032,-h*.038)).r;
          float folds=texture2D(weather,uv*3.63+vec2(h*.12,.23)).r;
          float height=smoothstep(.36,.71,broad)*.75+.17;
          float bottom=smoothstep(-.025,.16,h+twist*.22);
          float top=1.-smoothstep(height-.13,height+.06,h-.20*(folds-.5));
          return smoothstep(.49,.65,.57*lobes+.34*broad+.09*folds)
                *bottom*top;
        }
        void main() {
          float az=(st.x-.5)*6.2831853;
          float elev=mix(.008,.80,st.y);
          float rad=sqrt(1.-elev*elev);
          vec3 ray=vec3(cos(az)*rad,elev,sin(az)*rad);
          float t=.95/elev, stepSize=.50/(20.*elev);
          float east=max(dot(normalize(ray.xz),normalize(sunDir.xz)),0.);
          vec3 light=mix(vec3(1.06,1.01,.94),vec3(1.39,.94,.65),east*.74);
          vec3 shade=mix(vec3(.47,.535,.63),vec3(.68,.521,.51),east*.64);
          vec3 sum=vec3(0.);
          float alpha=0.;
          for(int i=0;i<20;i++){
            vec3 p=ray*(t+(float(i)+.42)*stepSize);
            float v=vapor(p);
            if(v>.012){
              float sunSample=vapor(p+sunDir*.185+vec3(0.,.04,0.));
              float h=clamp((p.y-.95)*2.,0.,1.);
              float lift=clamp(.32+.58*h+1.8*(v-sunSample),0.,1.);
              float frac=(1.-exp(-v*stepSize*3.6))*(1.-alpha);
              sum+=mix(shade,light,lift)*frac; alpha+=frac;
            }
          }
          gl_FragColor=vec4(sum/max(.0001,alpha)*.5,alpha);
        }
      `
    });
    const scene=new THREE.Scene();
    const geometry=new THREE.PlaneGeometry(2,2);
    scene.add(new THREE.Mesh(geometry,material));
    const before=renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.render(scene,new THREE.Camera());
    renderer.setRenderTarget(before);
    geometry.dispose(); material.dispose();
    return target;
  }

  function addSky(ctx, uniforms) {
    let bank = bakeCloudBank(ctx.renderer,uniforms);
    uniforms.cloudBank={value:bank.texture};
    ctx.renderer.domElement.addEventListener('webglcontextrestored', function () {
      bank.dispose();
      bank = bakeCloudBank(ctx.renderer,uniforms);
      uniforms.cloudBank.value = bank.texture;
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthTest: false, depthWrite: false, fog: false,
      uniforms,
      vertexShader: `
        varying vec3 ray;
        void main() {
          ray = position;
          vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.);
          gl_Position = vec4(p.xy, p.w * .99999, p.w);
        }
      `,
      fragmentShader: atmosphere + `
        varying vec3 ray;
        uniform sampler2D cloudBank;
        void main() {
          vec3 d = normalize(ray);
          float y = max(d.y, 0.);
          vec3 col = skyLight(d);
          float east = max(0., dot(normalize(d.xz + .00001), normalize(sunDir.xz)));
          // Project two cloud decks at different heights. The perspective makes
          // their spacing and thickness fall away naturally into the marine layer.
          vec2 plane = d.xz / max(.045, y + .042);
          vec2 wind = vec2(seconds * .00033, -seconds * .00009);
          vec2 cirrusUV = plane * vec2(.042,.145) + wind * .4;
          float silk = texture2D(weather, cirrusUV).r * .77 +
                       texture2D(weather, cirrusUV * 3.3 + .32).r * .23;
          float veil = smoothstep(.44,.72,silk) * smoothstep(.028,.31,y);
          col = mix(col, vec3(.98,1.02,1.0), veil * .26);

          float longitude=atan(d.z,d.x)/6.2831853+.5;
          vec2 bankUV=vec2(fract(longitude+seconds*.000009),clamp((y-.008)/.792,0.,1.));
          vec4 bank=texture2D(cloudBank,bankUV);
          float cover=bank.a*smoothstep(.022,.12,y)*(1.-smoothstep(.57,.79,y));
          col=mix(col,bank.rgb*2.,cover*.81);
          float angle = length(d - sunDir);
          col += vec3(1.5,.84,.37) * exp(-angle * 38.);
          float disc = 1. - smoothstep(.0128,.0147,angle);
          col = mix(col,vec3(5.9,4.1,2.08),disc * (1. - .22 * cover));
          gl_FragColor = vec4(col,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `
    }));
    sky.frustumCulled = false;
    sky.renderOrder = -1000;
    ctx.scene.add(sky);
  }

  function oceanGeometry() {
    const points = [0, 0, 0], indices = [];
    const sectors = 96, rings = 88, endRadius = 3100;
    for (let j = 1; j <= rings; j++) {
      const radius = 1.2 * (Math.exp(Math.log(1 + endRadius / 1.2) * j / rings) - 1);
      for (let i = 0; i < sectors; i++) {
        const a = tau * i / sectors;
        points.push(radius * Math.cos(a), 0, radius * Math.sin(a));
        const here = 1 + (j - 1) * sectors + i;
        const next = 1 + (j - 1) * sectors + (i + 1) % sectors;
        if (j === 1) indices.push(0, next, here);
        else indices.push(here - sectors, next, here, here - sectors, next - sectors, next);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    g.setIndex(indices);
    return g;
  }

  const waterVertex = `
    uniform mat4 reflector;
    uniform float seconds;
    varying vec3 place;
    varying vec4 imageCoord;
    void main() {
      vec2 q = position.xz;
      float a = q.x * .31 + q.y * .52 + seconds * .72;
      float b = q.x * .52 - q.y * .18 + seconds * .67;
      float c = q.x * .87 + q.y * .33 - seconds * .9 + sin(b * .39);
      float height = sin(a) * .062 + sin(b) * .041 + sin(c) * .021;
      place = vec3(q.x,height,q.y);
      imageCoord = reflector * vec4(place,1.);
      gl_Position = projectionMatrix * viewMatrix * vec4(place,1.);
    }
  `;

  const waterFragment = atmosphere + `
    uniform sampler2D reflectionMap;
    uniform vec4 rocks[16];
    uniform int rockCount;
    varying vec3 place;
    varying vec4 imageCoord;
    void main() {
      vec2 q = place.xz;
      vec3 eye = cameraPosition - place;
      float range = length(eye);
      vec3 v = eye / max(.0001,range);
      float a = q.x * .31 + q.y * .52 + seconds * .72;
      float b = q.x * .52 - q.y * .18 + seconds * .67;
      float c = q.x * .87 + q.y * .33 - seconds * .9 + sin(b*.39);
      vec2 slope = .062 * vec2(.31,.52) * cos(a) + .041 * vec2(.52,-.18) * cos(b)
                 + .021 * (vec2(.87,.33) + .39*cos(b*.39)*vec2(.52,-.18)) * cos(c);
      vec2 curl = texture2D(weather, q*.016+vec2(seconds*.0037,-seconds*.001)).gb - .5;
      float s = sin(dot(q,vec2(1.8,2.8)) + seconds*1.09 + curl.x*4.6);
      slope += (vec2(.024,.036)*s + curl*.096) * exp(-range*.003);
      vec2 fineUV = vec2(.095*q.x+.04*q.y,-.039*q.x+.153*q.y) + vec2(seconds*.016,-seconds*.010);
      vec2 ripple = texture2D(weather,fineUV+curl*.11).gb-.5;
      slope += ripple * .138 * exp(-range*.012);
      vec3 n = normalize(vec3(-slope.x,1.,-slope.y));
      vec3 r = reflect(-v,n);
      float fresnel = .095 + .53 * pow(1. - clamp(dot(v,n),0.,1.),2.4);
      float sandBed = exp(-max(0.,q.x+21.)*.17);
      float sweeping = texture2D(weather,q*.012+curl*.068).r;
      vec3 body = mix(vec3(.015,.082,.106),vec3(.047,.192,.190),
                      clamp(.26+sweeping*.5+sandBed*.45,0.,1.));
      body += vec3(.012,.019,.017)*s;
      vec3 reflected = skyLight(normalize(vec3(r.x,max(.014,r.y),r.z)));
      vec2 uv = imageCoord.xy / imageCoord.w;
      vec2 distort = vec2(slope.x * .35 + slope.y * .62, slope.y * .82 - slope.x * .21);
      uv += distort * (.055 + .56 / max(5.,range)) * exp(-range*.0038);
      float safe = smoothstep(.001,.034,min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y)));
      if (imageCoord.w > 0.) reflected = mix(reflected,texture2D(reflectionMap,clamp(uv,.001,.999)).rgb,safe);
      // Blue-green transmission remains visible under the broad sky reflection.
      vec3 col = mix(body,reflected*vec3(.73,.86,.98),fresnel);
      float small = sin(dot(q,vec2(4.2,7.9))+seconds*1.57+curl.x*7.4+ripple.y*2.7);
      float crest = smoothstep(.69,.98,small)*smoothstep(.41,.66,sweeping+.15*ripple.x);
      col += vec3(.025,.049,.052)*crest*exp(-range*.016);
      float spec = max(dot(r,sunDir),0.);
      col += vec3(.55,.32,.11) * pow(spec,76.) * .50;
      col += vec3(2.55,1.53,.61) * pow(spec,1200.) * (.25 + .75 * smoothstep(-.06,.62,s + ripple.y*.8));
      // A moving lace edge around the actual stones at their waterline.
      if (q.x < 42. && q.y > -85. && q.y < 90.) {
        vec2 head = (q-vec2(-4.,-48.))/vec2(38.,12.8);
        float azimuth = atan(head.y,head.x);
        float radius = .98*(1.+.075*sin(3.*azimuth+.7)+.043*cos(7.*azimuth-.9)+.026*sin(12.*azimuth));
        float edge = (length(head)-radius)*12.8;
        float west = -24.+2.2*sin(q.y*.077+.55)+1.1*sin(q.y*.215);
        edge = min(edge,q.x-west);
        for (int i=0; i<16; i++) {
          if (i>=rockCount) break;
          vec4 stone=rocks[i];
          float k=length((q-stone.xy)/stone.zw)-1.;
          edge=min(edge,k*min(stone.z,stone.w));
        }
        float tear = texture2D(weather,q*.105 + vec2(seconds*.012,seconds*.008)).r;
        float wash = .28 + .29*sin(seconds*1.62 + q.x*.135 + q.y*.2);
        float d = edge + (tear-.50)*1.75 - wash;
        float lip = exp(-abs(d)*4.0);
        float froth = smoothstep(.40,.67,tear + .11*sin(edge*6.-seconds*2.))
                    * exp(-abs(d-.62)*1.3);
        col = mix(col,vec3(.83,.90,.83),clamp(.68*lip+.54*froth,0.,.85));
      }
      float haze = 1.-exp(-pow(range*.0032,1.18));
      col=mix(col,horizonColor(-v)*.92,haze);
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;

  function addWater(ctx, shared) {
    const {scene, camera, renderer} = ctx;
    const target = new THREE.WebGLRenderTarget(4, 4, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true,
      generateMipmaps: false
    });
    target.texture.colorSpace = THREE.LinearSRGBColorSpace;
    const mirror = new THREE.PerspectiveCamera();
    const coords = new THREE.Matrix4();
    const reflectUp = new THREE.Vector3(0,1,0);
    const look = new THREE.Vector3();
    const clip = new THREE.Vector4(), farCorner = new THREE.Vector4();
    const plane = new THREE.Plane();
    const viewSize = new THREE.Vector2();
    const rocks = Array.from({length:16}, () => new THREE.Vector4(0,0,1,1));
    const uniforms = Object.assign({}, shared, {
      reflector: {value:coords}, reflectionMap: {value:target.texture},
      rocks: {value:rocks}, rockCount: {value:0}
    });
    const water = new THREE.Mesh(oceanGeometry(),new THREE.ShaderMaterial({
      uniforms, vertexShader:waterVertex, fragmentShader:waterFragment
    }));
    water.frustumCulled = false;
    scene.add(water);
    let last = -10, width = 0, height = 0;
    let lastListLength = -1;
    const fallback = [
      {x:14,z:-43,rx:11,rz:8}, {x:23,z:-35,rx:2.3,rz:1.6},
      {x:5,z:-31.5,rx:2.5,rz:1.8}, {x:-24,z:4,rx:2.6,rz:4.8}
    ];
    ctx.updates.push(function (time) {
      shared.seconds.value = time;
      const list = ctx.foamRocks && ctx.foamRocks.length ? ctx.foamRocks : fallback;
      if (list.length !== lastListLength) {
        lastListLength = list.length;
        uniforms.rockCount.value = Math.min(16,list.length);
        for (let i=0; i<uniforms.rockCount.value; i++) {
          const item = list[i];
          rocks[i].set(item.x,item.z,Math.max(.2,item.rx),Math.max(.2,item.rz));
        }
      }
      // The matrix travels with its image between captures. This keeps reflected
      // landmarks registered while the user drags on a slower mobile device.
      if (time - last < .12 && time >= last) return;
      last = time;
      renderer.getSize(viewSize);
      const scale = Math.min(.53, 670 / Math.max(viewSize.x,viewSize.y));
      const w = Math.max(128,Math.round(viewSize.x * scale));
      const h = Math.max(96,Math.round(viewSize.y * scale));
      if (width !== w || height !== h) {
        target.setSize(w,h); width=w; height=h;
      }
      camera.updateMatrixWorld();
      camera.getWorldPosition(mirror.position);
      mirror.position.y *= -1;
      camera.getWorldDirection(look).reflect(reflectUp).add(mirror.position);
      mirror.up.set(0,1,0).applyQuaternion(camera.quaternion).reflect(reflectUp);
      mirror.lookAt(look);
      mirror.fov = Math.min(140,camera.fov + 7);
      mirror.aspect = camera.aspect; mirror.near = camera.near; mirror.far = camera.far;
      mirror.updateProjectionMatrix();
      mirror.updateMatrixWorld();
      coords.set(.5,0,0,.5, 0,.5,0,.5, 0,0,.5,.5, 0,0,0,1)
        .multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
      // Lift the near clipping plane to the water surface. Submerged hulls
      // consequently never appear in the reflection above their own waterline.
      plane.set(reflectUp,.12).applyMatrix4(mirror.matrixWorldInverse);
      clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
      const m = mirror.projectionMatrix.elements;
      farCorner.set((Math.sign(clip.x)+m[8])/m[0],(Math.sign(clip.y)+m[9])/m[5],-1,(1+m[10])/m[14]);
      clip.multiplyScalar(2/clip.dot(farCorner));
      m[2]=clip.x; m[6]=clip.y; m[10]=clip.z+1; m[14]=clip.w;
      const oldTarget=renderer.getRenderTarget();
      const shadows=renderer.shadowMap.autoUpdate;
      const needsShadow=renderer.shadowMap.needsUpdate;
      const xr=renderer.xr.enabled;
      water.visible=false;
      renderer.xr.enabled=false; renderer.shadowMap.autoUpdate=false; renderer.shadowMap.needsUpdate=false;
      try {
        renderer.setRenderTarget(target);
        renderer.clear();
        renderer.render(scene,mirror);
      } finally {
        renderer.setRenderTarget(oldTarget);
        renderer.shadowMap.autoUpdate=shadows; renderer.shadowMap.needsUpdate=needsShadow;
        renderer.xr.enabled=xr;
        water.visible=true;
      }
    });
  }

  function addSurfSpray(ctx, shared) {
    const stones = ctx.foamRocks || [];
    if (!stones.length) return;
    const starts = [], velocities = [], phases = [];
    const count = Math.min(6,stones.length);
    for (let group=0; group<count; group++) {
      const rock = stones[Math.floor(group * stones.length / count)];
      for (let i=0; i<22; i++) {
        const f = (i*.6180339+group*.2189)%1;
        const g = (i*.38197+group*.76)%1;
        const a = .18 + 1.23*f;
        starts.push(rock.x+Math.cos(a)*rock.rx*.90,.085,rock.z+Math.sin(a)*rock.rz*.91);
        velocities.push(Math.cos(a)*(.15+.48*g),1.7+1.8*f,Math.sin(a)*(.26+.61*g));
        phases.push(group*1.643+g*.19,4.1+group*.37,f);
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(starts,3));
    geo.setAttribute('toss',new THREE.Float32BufferAttribute(velocities,3));
    geo.setAttribute('phase',new THREE.Float32BufferAttribute(phases,3));
    const spray=new THREE.Points(geo,new THREE.ShaderMaterial({
      uniforms:shared, transparent:true, depthWrite:false,
      vertexShader:`
        uniform float seconds;
        attribute vec3 toss, phase;
        varying float opacity;
        void main() {
          float t=mod(seconds+phase.x,phase.y);
          vec3 drop=position+toss*t-vec3(0.,3.6*t*t,0.);
          vec4 mv=modelViewMatrix*vec4(drop,1.);
          gl_Position=projectionMatrix*mv;
          gl_PointSize=clamp((32.+phase.z*34.)/max(1.,-mv.z),1.,4.);
          opacity=smoothstep(.01,.09,t)*(1.-smoothstep(.25,.78,t))*.58;
        }
      `,
      fragmentShader:`
        varying float opacity;
        void main(){
          float dist=length(gl_PointCoord-.5);
          gl_FragColor=vec4(.88,.94,.89,opacity*(1.-smoothstep(.13,.49,dist)));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `
    }));
    spray.frustumCulled=false;
    ctx.scene.add(spray);
  }

  // Low ribbons of salt haze sit between the distant islands and the harbor.
  function addMist(ctx, shared) {
    const vertices = [], uvs = [], starts = [];
    const ribbons = [
      [60,-76,43,1.5], [95,-43,48,2.0], [86,25,40,1.3],
      [46,71,44,1.4], [-27,74,35,1.7], [-65,24,32,1.5], [-38,-80,38,1.5]
    ];
    for (let i=0; i<ribbons.length; ++i) {
      const [x,z,w,h] = ribbons[i], radius=Math.hypot(x,z);
      const crossX=-z/radius, crossZ=x/radius;
      for (const [u,v] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]]) {
        vertices.push(x+(u-.5)*w*crossX, .09+v*h, z+(u-.5)*w*crossZ);
        uvs.push(u,v); starts.push(i*.2187);
      }
    }
    const geom=new THREE.BufferGeometry();
    geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geom.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geom.setAttribute('offset',new THREE.Float32BufferAttribute(starts,1));
    const mesh=new THREE.Mesh(geom,new THREE.ShaderMaterial({
      uniforms: shared, transparent:true, depthWrite:false, side:THREE.DoubleSide,
      vertexShader:`
        attribute float offset;
        varying vec2 st;
        varying float phase;
        void main(){
          st=uv; phase=offset;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
        }
      `,
      fragmentShader:`
        uniform sampler2D weather;
        uniform float seconds;
        varying vec2 st;
        varying float phase;
        void main() {
          float fluff=texture2D(weather,vec2(st.x*.67+phase+seconds*.0007,st.y*.28+phase)).r;
          float taper=sin(3.14159*st.x);
          float lift=clamp(1.-abs(st.y-.33-fluff*.2)*2.4,0.,1.);
          float alpha=pow(taper,1.5)*lift*lift*smoothstep(.29,.67,fluff)*.13;
          gl_FragColor=vec4(1.02,.92,.82,alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `
    }));
    mesh.renderOrder=2;
    ctx.scene.add(mesh);
  }

  // One animated vertex buffer for the flock. Each gull alternates a short
  // sequence of strokes with a gliding turn and has dark outer primary feathers.
  function addGulls(ctx) {
    const template = [], colors = [], rgb = new THREE.Color();
    function point(x,y,z,fold) { return [x,y,z,fold || 0]; }
    function triangle(a,b,c,color) {
      rgb.setHex(color);
      for (const p of [a,b,c]) {
        template.push(p); colors.push(rgb.r,rgb.g,rgb.b);
      }
    }
    const beak=point(0,.038,-.39), neck=point(0,.095,-.20), belly=point(0,-.095,-.03);
    const rump=point(0,.004,.29), tail=point(0,.02,.31);
    for (const sign of [-1,1]) {
      const shoulder=point(sign*.085,.021,-.10);
      triangle(beak,neck,shoulder,0xe1c69b);
      triangle(neck,belly,shoulder,0xdedcce);
      triangle(shoulder,belly,rump,0xb2bdc1);
      triangle(shoulder,rump,neck,0xecebe0);
      triangle(rump,tail,point(sign*.12,.005,.44),0xcbd1cc);
      const edge=point(sign*.05,.055,-.125);
      const rootRear=point(sign*.04,.043,.16);
      const elbow=point(sign*.46,.094,-.071,.44);
      const wrist=point(sign*.68,.059,-.108,.75);
      const wristRear=point(sign*.61,.038,.066,.7);
      const wingTip=point(sign*.93,-.021,.018,1);
      const rearTip=point(sign*.86,-.017,.066,.93);
      const secondary=point(sign*.41,.057,.15,.40);
      triangle(edge,elbow,secondary,0xf1efe7);
      triangle(edge,secondary,rootRear,0xd1d7d6);
      triangle(elbow,wrist,wristRear,0xdce0dc);
      triangle(elbow,wristRear,secondary,0xbdc9cc);
      triangle(wrist,wingTip,wristRear,0x667883);
      triangle(wingTip,rearTip,wristRear,0x475962);
    }
    // cx, cz, circle width/depth, cruising altitude, phase, angular speed
    const paths = [
      [16,-32,10,5.8,9.1,-.85,.112],[29,-35,8,5,11.0,2.25,.098],
      [60,-19,16,8,13,.6,.086],[6,28,13,7,8.5,3.7,.098],
      [-19,-19,13,7,12,1.95,.083],[-12,27,14,9,12.9,5.1,.077]
    ];
    const pos=new Float32Array(paths.length*template.length*3);
    const flockColors=[];
    paths.forEach(()=>flockColors.push(...colors));
    const geometry = new THREE.BufferGeometry();
    const position = new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position',position);
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(flockColors,3));
    const flock = new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({
      side:THREE.DoubleSide,vertexColors:true,fog:true
    }));
    flock.frustumCulled=false;
    ctx.scene.add(flock);
    function fly(time) {
      let k=0;
      for (let i=0;i<paths.length;i++) {
        const [cx,cz,rx,rz,h,phase,rate]=paths[i], theta=time*rate+phase;
        const cs=Math.cos(theta),sn=Math.sin(theta);
        const x=cx+rx*cs,z=cz+rz*sn,y=h+.5*Math.sin(2*theta+phase);
        let fx=-rx*sn,fz=rz*cs;
        const speed=Math.hypot(fx,fz); fx/=speed; fz/=speed;
        const active=THREE.MathUtils.smoothstep(Math.cos(time*.67+phase*3.2),-.27,.69);
        const stroke=Math.sin(time*5.6+phase*6);
        const bank=-.12+.13*Math.sin(theta*2+phase);
        const stretch=.81 + i*.037;
        for (const p of template) {
          const s=p[3],ly=p[1]+s*(.05+active*.29*stroke) -
            s*s*.055*active*Math.cos(time*5.6+phase*6);
          const lx=p[0]*(1-.035*active*Math.abs(stroke));
          const bx=lx*Math.cos(bank)-ly*Math.sin(bank),by=lx*Math.sin(bank)+ly*Math.cos(bank);
          pos[k++]=x+(-fz*bx-fx*p[2])*stretch;
          pos[k++]=y+by*stretch;
          pos[k++]=z+(fx*bx-fz*p[2])*stretch;
        }
      }
      position.needsUpdate=true;
    }
    fly(0);
    ctx.updates.push(fly);
  }

  H.buildSeaSky = function (ctx) {
    const uniforms = {
      sunDir: {value:new THREE.Vector3(.94,.109,-.32).normalize()},
      mistTint: {value:ctx.scene.fog ? ctx.scene.fog.color.clone() : new THREE.Color(0xe3cbc0)},
      weather: {value:weatherMap()},
      seconds: {value:0}
    };
    addSky(ctx,uniforms);
    addMist(ctx,uniforms);
    addSurfSpray(ctx,uniforms);
    addGulls(ctx);
    addWater(ctx,uniforms);
  };
})();
