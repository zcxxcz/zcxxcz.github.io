import * as THREE from 'three';
import { OrbitControls } from '../palace-corner-tower/vendor/OrbitControls.js';
import { Reflector } from '../palace-corner-tower/vendor/Reflector.js';

// All geometry and textures are generated here. Research and modeling decisions: SOURCES.md.
const $ = (s) => document.querySelector(s);
const mobile = matchMedia('(max-width: 800px)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const V = (x,y,z) => new THREE.Vector3(x,y,z);
let seed = 1420;
function random(){ seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }
const scene = new THREE.Scene();
let renderer;
try {
  renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
} catch(e){ $('#error').hidden=false; $('#loading').hidden=true; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.35 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.25;
$('#scene').appendChild(renderer.domElement);
renderer.domElement.tabIndex=0;
renderer.domElement.setAttribute('aria-label','角楼三维画布。方向键旋转，按加号减号缩放。');
renderer.domElement.addEventListener('webglcontextlost', (e)=>{e.preventDefault();$('#error').hidden=false;});
const camera = new THREE.PerspectiveCamera(37, innerWidth/innerHeight, .5, 650);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=.065; controls.enablePan=false;
controls.minDistance=23;controls.maxDistance=120;
controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.485;
controls.target.set(0,12.5,0);
const defaultPosition = mobile ? V(63,17,85) : V(48,16,74);
function resetCamera(){camera.position.copy(defaultPosition);controls.target.set(0,mobile?11:9,0);controls.update();}
resetCamera();
// Move the projection's optical axis so that the model sits in the open side of the composition.
function framing(){camera.aspect=innerWidth/innerHeight;camera.setViewOffset(innerWidth,innerHeight,mobile?-innerWidth*.04:-innerWidth*.10,mobile?innerHeight*.075:innerHeight*.055,innerWidth,innerHeight);camera.updateProjectionMatrix();}
framing();
const hemi=new THREE.HemisphereLight(0xd4e3dd,0x31413a,2.1);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffdda7,4.2);sun.position.set(-35,38,35);sun.castShadow=true;
sun.shadow.mapSize.set(mobile?1024:1536,mobile?1024:1536);
Object.assign(sun.shadow.camera,{left:-45,right:45,top:40,bottom:-40,near:1,far:170});
sun.shadow.normalBias=.06;sun.shadow.bias=-.0002;scene.add(sun);
const fill=new THREE.DirectionalLight(0xb1d6e2,1);fill.position.set(25,24,-45);scene.add(fill);
scene.fog=new THREE.FogExp2(0x95aaa2,.0048);
const world = new THREE.Group();scene.add(world);
const architecture=new THREE.Group();architecture.name='东北角楼与城垣';world.add(architecture);
const snowUniform={value:0};
function material(color,roughness=.7,metalness=0,extra={}){return new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});}
const mats={
  red:material('#7e3027'), redLight:material('#a14b35'), darkRed:material('#422725'),
  teal:material('#236763'), blue:material('#174a59'), green:material('#417963'),
  gold:material('#b48b49',.38,.42), tile:material('#ba7e2a',.27,.15,{side:THREE.DoubleSide}),
  tileEdge:material('#c59444',.4,.16), wood:material('#482f23'),
  stone:material('#b4b5a4'), stoneDark:material('#777f74'), brick:material('#777679',.92,0,{side:THREE.DoubleSide}),
  earth:material('#5b6450'), tree:material('#31493e'), bark:material('#4b4436'),
};
// Snow coats upward surfaces. World coordinates keep the drift continuous across tiles.
function snowCoating(shader) {
  shader.uniforms.uSnow = snowUniform;
  const varyings = '\nvarying vec3 vSnowNormal; varying vec3 vSnowPosition;';
  shader.vertexShader = shader.vertexShader.replace('#include <common>','#include <common>'+varyings)
    .replace('#include <worldpos_vertex>',`
      #include <worldpos_vertex>
      vec4 snowPosition = vec4(transformed,1.);
      vec3 snowNormal = objectNormal;
      #ifdef USE_INSTANCING
      snowPosition = instanceMatrix * snowPosition;
      snowNormal = mat3(instanceMatrix) * snowNormal;
      #endif
      vSnowPosition = (modelMatrix * snowPosition).xyz;
      vSnowNormal = normalize(mat3(modelMatrix) * snowNormal);
    `);
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>','#include <common>'+varyings+'\nuniform float uSnow;')
    .replace('#include <color_fragment>',`
      #include <color_fragment>
      float drift = sin(vSnowPosition.z*1.3+sin(vSnowPosition.x*1.1))*sin(vSnowPosition.x*2.4+vSnowPosition.z*.7);
      float powder = smoothstep(.26,.70,abs(vSnowNormal.y)+drift*.16) * uSnow;
      float grain = .91 + .09*sin(vSnowPosition.x*26.)*sin(vSnowPosition.z*21.);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.71,.80,.90)*grain, powder*.91);
    `);
}
for (const surface of [mats.tile,mats.tileEdge,mats.gold,mats.stone,mats.stoneDark]) {
  surface.onBeforeCompile = snowCoating;
}
function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
// World coordinates keep brick courses at masonry scale on both long and short faces.
mats.brick.onBeforeCompile=shader=>{
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vBrickPosition; varying vec3 vBrickNormal;').replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
 vec4 brickPosition=vec4(transformed,1.);
 #ifdef USE_INSTANCING
 brickPosition=instanceMatrix*brickPosition;
 #endif
 vBrickPosition=(modelMatrix*brickPosition).xyz; vBrickNormal=normalize(mat3(modelMatrix)*objectNormal);`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vBrickPosition; varying vec3 vBrickNormal;').replace('#include <color_fragment>',`#include <color_fragment>
 float yy=vBrickPosition.y/.245; float row=floor(yy); float xx=(abs(vBrickNormal.x)>.5?vBrickPosition.z:vBrickPosition.x)/.83+mod(row,2.)*.5;
 vec2 cell=vec2(fract(xx),fract(yy)); float mortar=(1.-smoothstep(.018,.04,cell.x))+(1.-smoothstep(.025,.07,cell.y)); float tone=fract(sin(dot(vec2(floor(xx),row),vec2(12.9898,78.233)))*43758.5453);
 float weather = sin(vBrickPosition.x*.29+sin(vBrickPosition.z*.3))*sin(vBrickPosition.z*.31+vBrickPosition.y*.63);
 float streak = sin(vBrickPosition.x*5.3+vBrickPosition.z*5.3+sin(vBrickPosition.y*.27))*sin(vBrickPosition.x*1.7+vBrickPosition.z*2.2);
 float damp = smoothstep(-.25,2.2,vBrickPosition.y+weather*.65);
 diffuseColor.rgb *= (.83+tone*.19+weather*.085+streak*.035)*mix(.57,1.,damp);
 diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.26,.25,.235),min(mortar,1.)*.23);`);
};
const painting=canvasTexture(1024,128,(c,w,h)=>{
  c.fillStyle='#194c53';c.fillRect(0,0,w,h);
  c.strokeStyle='#ae9a58';c.lineWidth=2;c.strokeRect(3,5,w-6,h-10);c.strokeRect(9,12,w-18,h-24);
  for(let i=0;i<8;i++){
    const x=i*128;c.fillStyle=i%2?'#286966':'#184f5a';c.fillRect(x+14,18,100,92);
    c.strokeStyle='#d4b367';c.lineWidth=2;c.beginPath();c.moveTo(x+17,64);c.quadraticCurveTo(x+45,20,x+75,55);c.quadraticCurveTo(x+114,96,x+97,44);c.quadraticCurveTo(x+70,12,x+54,56);c.quadraticCurveTo(x+28,101,x+17,64);c.stroke();
    for(let j=0;j<3;j++){c.beginPath();c.ellipse(x+38+j*27,64,18,26,j*.6,0,Math.PI*1.7);c.stroke();}
    c.fillStyle='#d1b879';for(const dx of [12,116]){c.beginPath();c.arc(x+dx,64,4,0,7);c.fill();}
  }
});painting.anisotropy=4;
const paintMat=material('#ffffff',.7,0,{map:painting});
const windowMat=material('#583c25',.56,.03,{emissive:0xdca66a,emissiveIntensity:.04});
const pools=new Map();const unitBox=new THREE.BoxGeometry(1,1,1),unitCylinder=new THREE.CylinderGeometry(1,1,1,10),unitSphere=new THREE.SphereGeometry(1,8,6);
const dummy=new THREE.Object3D();
function instance(geo,mat,pos,scale,rotation=0){const key=geo.uuid+mat.uuid;if(!pools.has(key))pools.set(key,{geo,mat,items:[]});pools.get(key).items.push({pos,scale,rotation});}
function box(x,y,z,w,h,d,mat,rotation=0){instance(unitBox,mat,V(x,y,z),V(w,h,d),rotation);}
function cylinder(x,y,z,r,h,mat){instance(unitCylinder,mat,V(x,y,z),V(r,h,r));}
function sphere(x,y,z,r,mat,squash=1){instance(unitSphere,mat,V(x,y,z),V(r,r*squash,r));}
function mesh(geo,mat,parent=architecture){const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function line(points,r,mat=mats.gold,parent=architecture){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>p.clone())),Math.max(3,points.length*4),r,6,false),mat,parent);}
function poleBetween(a,b,width,mat=mats.gold){const delta=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5);const key=unitCylinder.uuid+mat.uuid;if(!pools.has(key))pools.set(key,{geo:unitCylinder,mat,items:[]});pools.get(key).items.push({pos:mid,scale:V(width,delta.length(),width),quaternion:new THREE.Quaternion().setFromUnitVectors(V(0,1,0),delta.normalize())});}
const pt=(side,u,y,r)=>side===0?V(u,y,r):side===1?V(r,y,-u):side===2?V(-u,y,-r):V(-r,y,u);
function sideBox(side,u,y,r,w,h,d,mat){const p=pt(side,u,y,r);box(p.x,p.y,p.z,w,h,d,mat,side*Math.PI/2);}

// Battered masonry follows a continuous outline around the corner and the wall walks.
const walk = material('#77766b');
const coping = material('#858276');
for (const surface of [walk,coping]) surface.onBeforeCompile=mats.stone.onBeforeCompile;
const bank = material('#656663');
const lawn = material('#525a3e');
const path = material('#8b8070');
for (const surface of [lawn,path,bank]) surface.onBeforeCompile=mats.stone.onBeforeCompile;
function profileWall(top, bottom, height, mat) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const indices = [];
  for (let i = 0; i < top.length; i++) {
    const j = (i + 1) % top.length;
    positions.push(bottom[i][0],-.45,bottom[i][1],top[i][0],height,top[i][1],
                   bottom[j][0],-.45,bottom[j][1],top[j][0],height,top[j][1]);
    const n = 4*i;
    indices.push(n,n+1,n+2,n+2,n+1,n+3);
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  mesh(geometry,mat);
}
const wallRun = 610;
const wallTop = [[-wallRun,-7],[-8,-7],[-8,-wallRun],[5,-wallRun],[5,-9],[7,-7],[7,7],[-8,7],[-10,5],[-wallRun,5]];
const wallBase = [[-wallRun,-8],[-9,-8],[-9,-wallRun],[6.5,-wallRun],[6.5,-9],[8.4,-7],[8.4,8.4],[-8,8.4],[-10,6.5],[-wallRun,6.5]];
profileWall(wallTop,wallBase,9.6,mats.brick);
const paving = new THREE.BufferGeometry().setFromPoints(wallTop.map(([x,z])=>V(x,9.61,z)));
paving.setIndex(THREE.ShapeUtils.triangulateShape(wallTop.map(([x,z])=>new THREE.Vector2(x,z)),[]).flat());
paving.computeVertexNormals();
walk.side=THREE.DoubleSide;
const pavedWalk = mesh(paving,walk);
pavedWalk.castShadow = false;
pavedWalk.receiveShadow = false;
walk.onBeforeCompile = (shader) => {
  snowCoating(shader);
  shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>',`
    #include <roughnessmap_fragment>
    vec2 pavers = vSnowPosition.xz / vec2(1.1,.63);
    pavers.x += mod(floor(pavers.y),2.)*.5;
    vec2 edges = min(fract(pavers),1.-fract(pavers));
    vec2 antialias = min(fwidth(pavers),vec2(.35));
    vec2 seams = 1.-smoothstep(vec2(.012),vec2(.032)+antialias,edges);
    float variation = fract(sin(dot(floor(pavers),vec2(78.233,31.37)))*43758.5);
    diffuseColor.rgb *= .925 + variation*.15 - max(seams.x,seams.y)*.135;
  `);
};
for (let side = 0; side < 2; side++) {
  sideBox(side,side===0?-305:305,9.77,4.7,596,.35,.75,mats.brick);
  sideBox(side,side===0?-305:305,9.94,4.7,596,.12,.84,coping);
  // The two wall walks meet the corner tower at right angles.
  for (let i = 0; i < 295; i++) {
    const longitudinal = -606 + i * 2.04;
    const along = side === 0 ? longitudinal : -longitudinal;
    sideBox(side,along,9.77,4.7,1.98,.31,.75,mats.brick);
    sideBox(side,along,10.2,4.7,1.17,.68,.73,mats.brick);
    sideBox(side,along,10.57,4.7,1.28,.12,.85,coping);
    sideBox(side,along,9.78,-7.3,1.99,.42,.47,mats.brick);
  }
}
for (let i = 0; i < 7; i++) {
  const u = -6.2 + i * 1.95;
  for (const side of [0,1]) {
    sideBox(side,u,9.85,6.72,1.94,.45,.46,mats.brick);
    sideBox(side,u,10.2,6.72,1.04,.61,.44,mats.brick);
    sideBox(side,u,10.52,6.72,1.13,.1,.55,coping);
  }
}

// The moat is bounded by narrow masonry banks and paths. Long runs fade into the atmosphere.
box(-453,-.35,-453,892,1.3,892,lawn);
for (let side = 0; side < 2; side++) {
  const along = side === 0 ? -298 : 298;
  sideBox(side,along,-.18,8.15,606,.83,1.85,bank);
  sideBox(side,along,.28,7.95,606,.11,1.31,bank);
  sideBox(side,along,-.1,61,900,1.25,2.4,bank);
  sideBox(side,along,.51,62.4,900,.12,2.16,path);
  sideBox(side,along,.25,460,900,.38,794,lawn);
}
box(0,-.17,0,17.25,.69,17.25,bank);
// Xumizuo and the white stone railing follow the cruciform footprint.
box(0,10.12,0,11.6,.7,11.6,mats.stoneDark);box(0,10.49,0,11.95,.2,11.95,mats.stone);
for(let side=0;side<4;side++){
  const end=side<2?6.8:9.0;
  sideBox(side,0,10.18,(4.8+end)/2,5.8,.65,end-4.8,mats.stoneDark);
  sideBox(side,0,10.52,(4.8+end)/2,6.15,.17,end-4.65,mats.stone);
  // short portions are omitted at the wing junctions to keep a walkable railing.
  for(let s=-1;s<=1;s+=2){for(let j=0;j<4;j++){
    const u=s*(3.2+j*.77),p=pt(side,u,11,5.82);cylinder(p.x,p.y,p.z,.1,.9,mats.stone);sphere(p.x,11.5,p.z,.14,mats.stone,.65);
    if(j<3){sideBox(side,u+s*.38,11.25,5.82,.66,.13,.12,mats.stone);sideBox(side,u+s*.38,10.88,5.82,.66,.12,.1,mats.stone);}
  }}
  for(let j=0;j<7;j++){
    const u=-2.8+j*.93,p=pt(side,u,11,end);cylinder(p.x,p.y,p.z,.1,.9,mats.stone);sphere(p.x,11.5,p.z,.14,mats.stone,.65);
    if(j<6){sideBox(side,u+.46,11.24,end,.8,.14,.12,mats.stone);sideBox(side,u+.46,10.88,end,.8,.12,.12,mats.stone);for(let n=1;n<3;n++)sideBox(side,u+n*.3,11.06,end,.07,.28,.07,mats.stone);}
  }
}
// Red perimeter columns and lattice windows. The central hall is 8.73 m square.
box(0,12.7,0,8.73,4.15,8.73,mats.darkRed);
for(let side=0;side<4;side++){
  const depth=side<2?1.6:3.98,front=4.365+depth;
  sideBox(side,0,12.65,(4.15+front)/2,3.65,4.1,front-4.15,mats.darkRed);
  for(let wing=0;wing<2;wing++){
    const r=wing?front:4.38,w=wing?3.65:8.73;
    sideBox(side,0,11.1,r,w,.63,.2,mats.redLight);
    sideBox(side,0,14.41,r,w,.44,.3,paintMat);
    const count=wing?3:7;
    for(let i=0;i<count;i++){
      const u=(i-(count-1)/2)*(w/count);
      if(!wing && Math.abs(u)<1.9)continue;
      const p=pt(side,u,12.8,r+.04);cylinder(p.x,p.y,p.z,.135,4.15,mats.red);
    }
    for(let i=0;i<count*2;i++){
      const u=(i-(count*2-1)/2)*(w/(count*2));
      if(!wing&&Math.abs(u)<1.95)continue;
      sideBox(side,u,12.65,r+.06,w/(count*2)-.06,2.48,.085,windowMat);
      sideBox(side,u,12.65,r+.13,.045,2.5,.05,mats.redLight);
      for(let k=0;k<8;k++){
        const y=11.6+k*.3;
        sideBox(side,u,y,r+.14,w/(count*2)-.09,.025,.035,mats.gold);
        for(const direction of [-1,1]){
          const a=pt(side,u-.22, y-.13*direction,r+.15),b=pt(side,u+.22,y+.13*direction,r+.15);poleBetween(a,b,.014,mats.gold);
        }
      }
      sideBox(side,u,11.7,r+.17,w/(count*2)-.09,.16,.06,mats.red);
    }
  }
  for(const u of [-1.92,1.92]){const p=pt(side,u,12.75,front);cylinder(p.x,p.y,p.z,.18,4.2,mats.red);cylinder(p.x,10.91,p.z,.24,.22,mats.stone);}
}

box(0,16.76,0,7.21,1.42,7.21,mats.darkRed);
box(0,19.69,0,5.4,1.89,5.4,mats.darkRed);
// Interlocking dougong clusters: stacked blocks, bowed arms and projecting ang.
function dougong(side,u,y,r,steps=3,scale=1){
  for(let k=0;k<steps;k++){
    const yy=y+k*.16*scale,reach=(.19+k*.14)*scale;
    sideBox(side,u,yy,r+reach*.35,.25*scale,.13*scale,.23*scale,mats.green);
    sideBox(side,u,yy+.08*scale,r+reach*.55,(.42+k*.25)*scale,.1*scale,.17*scale,k%2?mats.teal:mats.blue);
    for(const s of [-1,1])sideBox(side,u+s*(.17+k*.1)*scale,yy+.145*scale,r+reach*.55,.12*scale,.13*scale,.2*scale,mats.gold);
    sideBox(side,u,yy+.1*scale,r+reach,.12*scale,.1*scale,(.28+k*.12)*scale,mats.teal);
  }
  const a=pt(side,u,y+.12,r),b=pt(side,u,y+.52*scale,r+.82*scale);poleBetween(a,b,.065*scale,mats.wood);
}
for(let side=0;side<4;side++){
  const front=4.365+(side<2?1.6:3.98);
  for(let i=0;i<13;i++){const u=-4.35+i*.725;if(Math.abs(u)>1.95)dougong(side,u,14.54,4.38,3,.73);}
  for(let i=0;i<7;i++)dougong(side,-1.9+i*.633,14.50,front,3,.69);
  sideBox(side,0,16.75,3.65,7.35,.7,.32,paintMat);
  for(let i=0;i<10;i++)dougong(side,-3.5+i*.777,17.05,3.64,3,.8);
  sideBox(side,0,16.78,front,3.9,.58,.3,paintMat);
  for(let i=0;i<7;i++)dougong(side,-1.9+i*.633,16.94,front-.16,3,.68);
  sideBox(side,0,19.74,2.75,5.55,.64,.24,paintMat);
  sideBox(side,0,19.36,2.75,5.56,.12,.26,mats.redLight);
  for (let slot=0; slot<7; slot++) {
    sideBox(side,-2.5+slot*.83,19.06,2.72,.14,.61,.12,mats.red);
  }
  for(let i=0;i<7;i++)dougong(side,-2.7+i*.9,20.03,2.75,4,.88);
}

const tileData={p:[],i:[],c:[]};
const tileColors=[new THREE.Color('#ba812e'),new THREE.Color('#d5a449'),new THREE.Color('#c69136'),new THREE.Color('#daa748')];
const roofBase=material('#98702e',.64,.06,{side:THREE.DoubleSide});roofBase.onBeforeCompile=mats.tile.onBeforeCompile;
const ridgeGroup=new THREE.Group();ridgeGroup.name='72条屋脊';architecture.add(ridgeGroup);
const ridgeRegistry=[];
const gables=[];
function ridge(points,type,tier,r=.105){const m=line(points,r,mats.tileEdge,ridgeGroup);m.userData={type,tier};ridgeRegistry.push(m);return m;}
function roofPatch(fn,width,lanes, finishEdge = true){
  const rows=16, cols=8, pp=[],idx=[];
  for(let v=0;v<=rows;v++)for(let u=0;u<=cols;u++){const p=fn(u/cols,v/rows);pp.push(p.x,p.y,p.z);}
  for(let v=0;v<rows;v++)for(let u=0;u<cols;u++){const a=v*(cols+1)+u,b=a+cols+1;idx.push(a,b,a+1,a+1,b,b+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pp,3));geo.setIndex(idx);geo.computeVertexNormals();mesh(geo,roofBase);
  const count=lanes||Math.ceil(width/.17),rad=.039;
  for(let lane=0;lane<count;lane++){
    const start=tileData.p.length/3,color=tileColors[Math.floor(random()*tileColors.length)];
    for(let t=0;t<=rows;t++)for(let j=0;j<=4;j++){
      const uu=(lane+.5+(j/4-.5)*.78)/count,p=fn(uu,t/rows);
      p.y+=.025+Math.sin(j/4*Math.PI)*rad;
      tileData.p.push(p.x,p.y,p.z);
      const shade = .90 + .10 * (t % 3) / 2;tileData.c.push(color.r*shade,color.g*shade,color.b*shade);
    }
    for(let t=0;t<rows;t++)for(let j=0;j<4;j++){const a=start+t*5+j,b=a+5;tileData.i.push(a,b,a+1,a+1,b,b+1);}
    if (finishEdge) {
      const end = fn((lane + .5) / count, 1);
      sphere(end.x, end.y + .025, end.z, .066, mats.tileEdge, .82);
    }
  }
  if (!finishEdge) return fn;
  // The roof edge includes the fascia and the drip tile course.
  const edge=Array.from({length:13},(_,j)=>{const p=fn(j/12,1);p.y-=.07;return p;});
  line(edge,.071,mats.wood);
  line(edge.map(p=>p.clone().add(V(0,.065,0))),.024,mats.tileEdge);
  for (let k=0;k<count;k+=2) {
    const u=(k+.5)/count;
    const tip=fn(u,1).add(V(0,-.16,0)),root=fn(u,.83).add(V(0,-.21,0));
    if(tip.distanceTo(root)>.08) poleBetween(root,tip,.033,mats.wood);
  }
  return fn;
}
const lerp=THREE.MathUtils.lerp;
// Curved skirt around a square core, with a gentle uplift at the wing tips.
function skirt(inner,outer,yTop,yEdge,tier){
  for(let side=0;side<4;side++){
    roofPatch((u,v)=>{const w=lerp(inner,outer,v),s=(u*2-1);return pt(side,s*w,lerp(yTop,yEdge,Math.sin(v*Math.PI/2))+.35*v*v*Math.pow(Math.abs(s),7),w);},outer*2);
  }
  for(let s=0;s<4;s++){
    const points=Array.from({length:9},(_,j)=>{const t=j/8,w=lerp(inner,outer,t);return pt(s,w,lerp(yTop,yEdge,Math.sin(t*Math.PI/2))+.35*t*t,w);});
    ridge(points,'中央角脊',tier);
  }
}
skirt(3.3,4.9,18.18,17.45,2);
skirt(2.45,4.2,21.72,20.47,3);
// One connected waist roof. The hip and valley boundaries are shared by adjacent patches.
for (let side = 0; side < 4; side++) {
  const wing = 4.365 + (side < 2 ? 1.6 : 3.98);
  const inner = [[-4.37,4.37],[-1.89,4.37],[-1.89,wing],[1.89,wing],[1.89,4.37],[4.37,4.37]];
  const outer = [[-6.04,6.04],[-2.62,6.04],[-2.62,wing+1.16],[2.62,wing+1.16],[2.62,6.04],[6.04,6.04]];
  const lifts = [.36, .03, .52, .52, .03, .36];
  function waist(u,v,segment) {
    const [a,b] = [inner[segment],inner[segment+1]];
    const [c,d] = [outer[segment],outer[segment+1]];
    const x = lerp(lerp(a[0],b[0],u),lerp(c[0],d[0],u),v);
    const z = lerp(lerp(a[1],b[1],u),lerp(c[1],d[1],u),v);
    const lift = lifts[segment] * (1-u)**5 + lifts[segment+1] * u**5;
    return pt(side,x,lerp(16.18,14.98,Math.sin(v*Math.PI/2)) + lift*v*v,z);
  }
  for (let j = 0; j < 5; j++) {
    const length = Math.hypot(outer[j][0]-outer[j+1][0],outer[j][1]-outer[j+1][1]);
    roofPatch((u,v) => waist(u,v,j),length);
  }
  for (const j of [0,2,3]) {
    ridge(Array.from({length:9},(_,i) => waist(0,i/8,j)),'下檐角脊',1,.075);
  }
  for (const [start,end] of [[0,1],[1,4],[4,5]]) {
    const points = inner.slice(start,end+1).map(([u,r]) => pt(side,u,16.21,r));
    ridge(points,'围脊',1,.065);
  }
}
// Xieshan wings: paired broad slopes, a triangular gable, a front hip, and diagonal hips.
function gableWing(side,{start,end,width,peak,eave,tier,hips=true,ridgeMain=true,offsetX=0,offsetZ=0}){
  const W=(u,y,r)=>pt(side,u,y,r).add(V(offsetX,0,offsetZ));
  const half=width/2,gw=half*.65,breakY=lerp(eave,peak,.38),gEnd=end-.7;
  for(const s of [-1,1]){
    roofPatch((u,v)=>{const r=lerp(start,gEnd+.7*Math.pow(v,2),u),lateral=s*half*v;const corner=.30*Math.pow(v,6)*Math.pow(u,7);return W(lateral,lerp(peak,eave,Math.sin(v*Math.PI/2))+corner,r);},(gEnd-start)*1.1,Math.max(8,Math.ceil((gEnd-start)/.18)));
  }
  if (tier === 2) {
    const halfWidth = width*.315;
    const front = end-.55;
    const support = W(0,17.08,(start+front)/2);
    box(support.x,support.y,support.z,halfWidth*2,.84,front-start,mats.darkRed,side*Math.PI/2);
    const fascia = W(0,17.34,front);
    box(fascia.x,fascia.y,fascia.z,halfWidth*2,.27,.11,paintMat,side*Math.PI/2);
    for (const sign of [-1,1]) {
      const sideFascia = W(sign*halfWidth,17.33,(start+front)/2);
      box(sideFascia.x,sideFascia.y,sideFascia.z,front-start,.27,.11,paintMat,(side+1)*Math.PI/2);
      for (let k=0;k<4;k++) {
        const a = W(sign*(halfWidth+.005),17.04,lerp(start+.16,front,k/3));
        box(a.x,a.y,a.z,.12,.53,.12,mats.redLight);
      }
    }
    for (let k=0;k<5;k++) {
      const a = W(lerp(-halfWidth,halfWidth,k/4),17.04,front+.01);
      box(a.x,a.y,a.z,.12,.53,.12,mats.redLight);
    }
  }
  // Small triangular red gable with gold bargeboards and painted inset tracery.
  const a=W(-gw,breakY,gEnd),b=W(gw,breakY,gEnd),c=W(0,peak-.025,gEnd);
  const gg=new THREE.BufferGeometry().setFromPoints([a,b,c]);gg.setIndex([0,1,2]);gg.computeVertexNormals();gables.push(mesh(gg,material('#8c3d2d',.7,0,{side:THREE.DoubleSide})));
  for(const sign of [-1,1]){
    ridge([W(sign*gw,breakY+.08,gEnd+.04),W(sign*gw*.5,lerp(breakY,peak,.5)+.05,gEnd+.04),W(0,peak+.06,gEnd+.04)],'山花垂脊',tier,.085);
    poleBetween(W(sign*gw*.75,breakY+.12,gEnd+.065),W(0,peak-.23,gEnd+.065),.035,mats.gold);
  }
  const beam=W(0,breakY+.02,gEnd);box(beam.x,beam.y,beam.z,gw*2,.15,.13,mats.green,side*Math.PI/2);
  for(let j=0;j<7;j++){
    const u=(j-3)*gw*.22,y=breakY+.22;
    if(Math.abs(u)<gw*.9){const p=W(u,y,gEnd+.08);sphere(p.x,p.y,p.z,.09,mats.gold,.7);}
  }
  roofPatch((u,v)=>W((u*2-1)*lerp(gw,half,v),lerp(breakY,eave,Math.sin(v*Math.PI/2))+.30*v*v*Math.pow(Math.abs(u*2-1),7),lerp(gEnd,end,v)),width);
  if(ridgeMain)ridge([W(0,peak+.04,start),W(0,peak+.04,gEnd)],'正脊',tier,.115);
  if(hips)for(const sign of [-1,1]){
    ridge(Array.from({length:9},(_,j)=>{const v=j/8;return W(sign*lerp(gw,half,v),lerp(breakY,eave,Math.sin(v*Math.PI/2))+.3*v*v,lerp(gEnd,end,v));}),'抱厦角脊',tier);
  }
  // Simplified chiwen: coiled tail, head, mane and open snout at each ridge end.
  const head=W(0,peak+.34,gEnd-.08);sphere(head.x,head.y,head.z,.22,mats.tileEdge,1.2);
  const snout=W(0,peak+.32,gEnd-.34);box(snout.x,snout.y,snout.z,.29,.2,.35,mats.tileEdge,side*Math.PI/2);
  line([W(0,peak+.12,gEnd+.13),W(0,peak+.5,gEnd+.34),W(0,peak+.98,gEnd+.12),W(0,peak+.8,gEnd-.03)],.105,mats.tileEdge);
  for(let k=0;k<3;k++){const p=W(0,peak+.43+k*.13,gEnd+.26-k*.045);sphere(p.x,p.y,p.z,.11,mats.gold,.7);}
  // Three small walking beasts sit along each projecting hip.
  if(hips)for(const sign of [-1,1])for(let k=0;k<3;k++){
    const t=.42+k*.19,p=W(sign*lerp(gw,half,t),lerp(breakY,eave,Math.sin(t*Math.PI/2))+.3*t*t+.16,lerp(gEnd,end,t));
    sphere(p.x,p.y,p.z,.105,mats.tileEdge,.75);const q=W(sign*(lerp(gw,half,t)+.06),p.y+.12,lerp(gEnd,end,t)+.045);sphere(q.x,q.y,q.z,.08,mats.tileEdge,1.35);
  }
}
for(let side=0;side<4;side++){
  if(side<2){
    gableWing(side,{start:2.7,end:6.7,width:5.3,peak:19.10,eave:17.48,tier:2});
  }else{
    // The inner, deep wings turn their ridge by 90 degrees: eaves face the city,
    // and two gables face sideways. With the two outer and four top gables: ten.
    const center=pt(side,0,0,(2.7+8.65)/2),axis=(side+1)%4;
    for(const direction of [axis,(axis+2)%4]){
      gableWing(direction,{start:0,end:2.65,width:5.95,peak:19.14,eave:17.55,tier:2,ridgeMain:false,offsetX:center.x,offsetZ:center.z});
    }
    const left=pt(axis,0,19.18,1.95).add(center),right=pt((axis+2)%4,0,19.18,1.95).add(center);
    ridge([left,V(center.x,19.18,center.z),right],'正脊',2,.115);
  }
  gableWing(side,{start:0,end:3.35,width:3.6,peak:23.17,eave:21.25,tier:3,hips:false});
}
if(ridgeRegistry.length!==72)throw new Error(`Roof topology: expected 72 ridges, got ${ridgeRegistry.length}`);
const tilesGeo=new THREE.BufferGeometry();tilesGeo.setAttribute('position',new THREE.Float32BufferAttribute(tileData.p,3));tilesGeo.setAttribute('color',new THREE.Float32BufferAttribute(tileData.c,3));tilesGeo.setIndex(tileData.i);tilesGeo.computeVertexNormals();
const coloredTile=mats.tile.clone();coloredTile.vertexColors=true;coloredTile.color.set('#ffffff');coloredTile.onBeforeCompile=mats.tile.onBeforeCompile;mesh(tilesGeo,coloredTile);
// Turned, gilded copper finial at the intersection of the cross ridges.
const profile=[[0,23.18],[.47,23.18],[.49,23.32],[.31,23.49],[.25,23.65],[.48,23.88],[.49,24.1],[.39,24.3],[.15,24.49],[.16,24.64],[.29,24.75],[.24,24.91],[.12,25.04],[.02,25.23]].map(([r,y])=>new THREE.Vector2(r,y));
mesh(new THREE.LatheGeometry(profile,24),mats.gold);
// Tree crowns consist of irregular clusters and hanging sprays. Winter reveals the branching.
const foliage = ['#405647','#576a4c','#616d47','#6c7450','#454e39'].map(c => material(c,.94));
const leafMeshes = [];
const crown = new THREE.SphereGeometry(1,9,6);
const positions = crown.attributes.position;
for (let i = 0; i < positions.count; i++) {
  const p = V(positions.getX(i),positions.getY(i),positions.getZ(i));
  const scallop = 1 + .13*Math.sin(7*p.x+5*p.y)*Math.sin(9*p.z-5*p.y) + .09*Math.cos(p.z*16);
  p.multiplyScalar(scallop);
  positions.setXYZ(i,p.x,p.y,p.z);
}
crown.computeVertexNormals();
function tree(x,z,size,willow=false,base=.35) {
  const height = (willow ? 8.7 : 9.2) * size;
  const foot = V(x,base,z);
  const fork = foot.clone().add(V(.37*size,height*.55,-.26*size));
  poleBetween(foot,fork,.23*size,mats.bark);
  for (let j = 0; j < 7; j++) {
    const angle = j*2.399 + random()*.72, reach = size*(1.65+random()*1.9);
    const elbow = fork.clone().add(V(Math.cos(angle)*reach*.54,height*.16,Math.sin(angle)*reach*.54));
    const tip = fork.clone().add(V(Math.cos(angle)*reach,height*(.25+random()*.18),Math.sin(angle)*reach));
    poleBetween(fork,elbow,.13*size,mats.bark);
    poleBetween(elbow,tip,.087*size,mats.bark);
    for (let k = 0; k < 4; k++) {
      const a = angle+(k-1.5)*.47;
      const twigBase = elbow.clone().lerp(tip,.79);
      const tip2 = tip.clone().add(V(Math.cos(a)*size*(.55+random()*.8),size*(.4+random()*.9),Math.sin(a)*size*(.55+random()*.8)));
      poleBetween(twigBase,tip2,.025*size,mats.bark);
      const radius = size*(.68+random()*.52);
      const yScale = willow?1.7+random()*.65:.69+random()*.61;
      const offset = willow?-.85*size:.05;
      instance(crown,foliage[(j+k)%foliage.length],tip2.clone().add(V(0,offset,0)),V(radius,radius*yScale,radius*.85),angle);
      if (willow) {
        const arc=tip2.clone().add(V(Math.cos(a)*size*.47,-size*.38,Math.sin(a)*size*.47));
        const droop=arc.clone().add(V(Math.cos(a)*size*.20,-size*(1.08+random()),Math.sin(a)*size*.20));
        poleBetween(tip2,arc,.013*size,mats.bark);
        poleBetween(arc,droop,.009*size,mats.bark);
      }
    }
  }
}
for (let i = 0; i < 52; i++) {
  const depth = 11 + random()*17, along = 12 + i*3.45 + random()*6;
  tree(-along,-depth,.62+random()*.59,i%5===0);
  tree(-depth-1,-along,.56+random()*.66,i%6===0);
  if (i%2===0) tree(-along,-depth-19,.75+random()*.56);
}
for (let i = 0; i < 79; i++) {
  const x = -40-random()*236, z = -55-random()*217;
  tree(x,z,.6+random()*.76,i%9===0);
}
for (let i = 0; i < 26; i++) {
  const along = -135+i*8 + random()*5;
  if (along < -7 || along > 125) {
    tree(65+random()*4,along,.68+random()*.37,true);
    tree(along,65+random()*4,.68+random()*.37,true);
  }
}
for(const {geo,mat,items}of pools.values()){
  const inst=new THREE.InstancedMesh(geo,mat,items.length);inst.castShadow=true;inst.receiveShadow=true;
  items.forEach((item,i)=>{dummy.position.copy(item.pos);dummy.scale.copy(item.scale);dummy.rotation.set(0,item.rotation||0,0);if(item.quaternion)dummy.quaternion.copy(item.quaternion);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);});inst.computeBoundingSphere();architecture.add(inst);if (foliage.includes(mat)) leafMeshes.push(inst);
}

architecture.scale.y=27.5/25.23;
// The dome is seen by both cameras. Broad high clouds and a lit horizon use directional noise.
const skyUniforms = {
  top: {value: new THREE.Color()},
  horizon: {value: new THREE.Color()},
  bottom: {value: new THREE.Color()},
  cloudColor: {value: new THREE.Color()},
  fogTint: {value: new THREE.Color()},
  cloudAmount: {value: .42},
  lightDir: {value: V(-.65,.16,-.50).normalize()},
};
const sky = new THREE.Mesh(new THREE.SphereGeometry(500,40,24),new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: skyUniforms,
  vertexShader: `
    varying vec3 vWorld;
    void main() {
      vWorld=(modelMatrix*vec4(position,1.)).xyz;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
    }
  `,
  fragmentShader: `
    uniform vec3 top,horizon,bottom,cloudColor,lightDir,fogTint;
    uniform float cloudAmount;
    varying vec3 vWorld;
    float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p) {
      vec2 f=fract(p),i=floor(p);
      f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
    }
    float clouds(vec2 p) {
      return noise(p)*.5+noise(p*2.01+21.)*.25+noise(p*4.03-19.)*.14+noise(p*8.06)*.07+noise(p*16.12)*.04;
    }
    void main() {
      vec3 dir=normalize(vWorld-cameraPosition);
      float h=dir.y;
      float sunSide=pow(max(dot(dir,lightDir),0.),5.);
      vec3 c=mix(horizon,top,1.-exp(-max(h,0.)*5.1));
      c=mix(c,bottom,1.-smoothstep(-.29,.013,h));
      c=mix(c,cloudColor,sunSide*.32*exp(-max(h,0.)*1.5));
      vec2 p=dir.xz/max(.11,h+.23);
      p=vec2(p.x*2.8,p.y*5.7)+vec2(2.2,-3.7);
      float texture=clouds(p+vec2(0.,noise(p*.7))*.34);
      float mask=smoothstep(.40,.73,texture)*smoothstep(-.012,.072,h);
      vec3 vapor=mix(top*.83,cloudColor,smoothstep(.39,.72,texture)*.68+sunSide*.17);
      c=mix(c,vapor,mask*cloudAmount);
      float horizonMist = 1.-smoothstep(.046,.165,abs(h+.018));
      c=mix(c,fogTint,horizonMist);
      gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
    }
  `,
}));
scene.add(sky);
const glowTexture=canvasTexture(128,128,(c)=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#fffff7');g.addColorStop(.09,'#fff5c2');g.addColorStop(.18,'#ffe3a56b');g.addColorStop(1,'#ffe3a500');c.fillStyle=g;c.fillRect(0,0,128,128);});
const sunSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:0xffe1ac,transparent:true,depthWrite:false,fog:false}));sunSprite.position.set(-75,31,-125);sunSprite.scale.set(54,54,1);scene.add(sunSprite);
const moonTexture = canvasTexture(128,128,(ctx) => {
  const glow = ctx.createRadialGradient(64,64,0,64,64,64);
  glow.addColorStop(0,'#eef4fa');
  glow.addColorStop(.39,'#e6eff8');
  glow.addColorStop(.44,'#d7e5f1b0');
  glow.addColorStop(.49,'#ccdbe734');
  glow.addColorStop(1,'#c2d0e200');
  ctx.fillStyle=glow;
  ctx.fillRect(0,0,128,128);
});
const moon = new THREE.Sprite(new THREE.SpriteMaterial({map:moonTexture,transparent:true,depthWrite:false,fog:false}));
moon.scale.set(10.4,10.4,1);
moon.position.set(-86,47,-126);
scene.add(moon);
moon.visible=false;
// Real-time planar reflection plus a world-space ripple field (no image-based water texture).
const waterShader={
  uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null},time:{value:0},waterColor:{value:new THREE.Color('#395e58')},ripple:{value:1},fogTint:{value:skyUniforms.fogTint.value}},
  vertexShader:`uniform mat4 textureMatrix;varying vec4 vUv;varying vec3 vWorld;varying vec3 vView;void main(){vUv=textureMatrix*vec4(position,1.);vWorld=(modelMatrix*vec4(position,1.)).xyz;vView=cameraPosition-vWorld;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `
    uniform vec3 waterColor,fogTint;
    uniform sampler2D tDiffuse;
    uniform float time,ripple;
    varying vec4 vUv;
    varying vec3 vWorld,vView;
    void main() {
      vec2 p=vWorld.xz;
      float d=length(vView),facing=max(dot(normalize(vView),vec3(0,1,0)),0.);
      float chop=sin(p.y*.81+p.x*.49+time*.55)*sin(p.x*.14-p.y*.37)+.43*sin(p.y*2.39-p.x*.19-time*.74);
      float crossWave=sin(p.x*.54+p.y*.68-time*.25)*cos(p.y*.32+time*.22);
      vec2 uv=vUv.xy/vUv.w+vec2(crossWave*.00078,chop*.00165)*ripple;
      float blur=(.00065+clamp(d/115.,0.,1.)*.001);
      vec3 reflection=texture2D(tDiffuse,uv).rgb*.38;
      reflection+=(texture2D(tDiffuse,uv+vec2(blur,0)).rgb+texture2D(tDiffuse,uv-vec2(blur,0)).rgb)*.20;
      reflection+=(texture2D(tDiffuse,uv+vec2(0,blur*1.5)).rgb+texture2D(tDiffuse,uv-vec2(0,blur*1.5)).rgb)*.11;
      float fresnel=pow(1.-facing,3.);
      vec3 col=mix(waterColor,reflection*(.80+.2*fresnel),.37+fresnel*.41);
      float rings=sin(p.y*3.8+sin(p.x*.57+p.y*.052)*2.3+time*.64)*sin(p.x*.36+p.y*.19-time*.26);
      col+=vec3(.051,.070,.074)*pow(max(rings,0.),5.)*(1.-smoothstep(16.,60.,d));
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      vec3 haze = mix(fogTint*12.92,1.055*pow(fogTint,vec3(1./2.4))-.055,step(.00313,fogTint));
      gl_FragColor.rgb=mix(gl_FragColor.rgb,haze,smoothstep(112.,325.,d));
    }
  `
};
const water=new Reflector(new THREE.PlaneGeometry(1100,1100),{clipBias:.005,textureWidth:mobile?640:1024,textureHeight:mobile?640:1024,shader:waterShader,multisample:0});water.rotation.x=-Math.PI/2;water.position.y=-.35;scene.add(water);
// Soft, warm interior light in winter, visible through the lattice and in the river.
const lanternLights=[];
for(let s=0;s<4;s++){const p=pt(s,0,13,4.365+(s<2?1.6:3.98)+.25);const l=new THREE.PointLight(0xffb35c,0,12,2);l.position.copy(p);scene.add(l);lanternLights.push(l);}
const flakes=mobile?1030:2400,flakePositions=new Float32Array(flakes*3),flakeSpeed=new Float32Array(flakes);
for(let i=0;i<flakes;i++){flakePositions[i*3]=(random()-.5)*105;flakePositions[i*3+1]=random()*55;flakePositions[i*3+2]=(random()-.5)*105;flakeSpeed[i]=.8+random()*1.1;}
const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.BufferAttribute(flakePositions,3));
const snowTexture=canvasTexture(32,32,c=>{const g=c.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'white');g.addColorStop(.3,'#ffffffe0');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,32,32);});
const snow=new THREE.Points(snowGeo,new THREE.PointsMaterial({color:0xecf5ff,size:.23,map:snowTexture,transparent:true,opacity:.66,depthWrite:false}));snow.visible=false;scene.add(snow);
const starGeo=new THREE.BufferGeometry(),stars=[];for(let i=0;i<300;i++){const a=random()*Math.PI*2,h=.12+random()*.8;stars.push(Math.cos(a)*190*Math.sqrt(1-h*h),h*190,Math.sin(a)*190*Math.sqrt(1-h*h));}starGeo.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));const starField=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xd9e8ef,size:.25,transparent:true,opacity:.6,depthWrite:false,fog:false}));scene.add(starField);starField.visible=false;

const moods = {
  morning: {
    top:'#598a9b',horizon:'#dac7ac',bottom:'#a4b6b1',cloudColor:'#f2d7bc',cloudAmount:.55,
    fog:'#a3b2ae',water:'#344e55',sun:'#ffe0b3',hemi:'#c8e3ec',ground:'#62665c',
    sunPower:3.8,hemiPower:2.4,fill:1.05,exposure:1.16,pos:V(-37,33,48),snow:0,
    sunAt:V(-70,39,-125),poem:'晨光初上，金瓦映水。',time:'卯时 · 清晨',
  },
  dusk: {
    top:'#45486f',horizon:'#e4a58c',bottom:'#9e859a',cloudColor:'#f7ba9d',cloudAmount:.91,
    fog:'#b58f91',water:'#3f3e59',sun:'#ffc195',hemi:'#aaaacb',ground:'#61587b',
    sunPower:3.1,hemiPower:1.8,fill:.85,exposure:1.1,pos:V(37,17,-37),snow:0,
    sunAt:V(-129,13,-22),poem:'日色渐收，城影入河。',time:'酉时 · 黄昏',
  },
  snow: {
    top:'#14223b',horizon:'#536b88',bottom:'#485b73',cloudColor:'#7588a0',cloudAmount:.62,
    fog:'#536683',water:'#253851',sun:'#b7d9ff',hemi:'#aac4e5',ground:'#435774',
    sunPower:2.25,hemiPower:1.68,fill:1.2,exposure:1.13,pos:V(-36,50,-38),snow:1,
    sunAt:V(-86,47,-126),poem:'飞雪无声，宫灯未眠。',time:'亥时 · 雪夜',
  },
};
const colorTargets = {
  top: skyUniforms.top.value, horizon: skyUniforms.horizon.value, bottom: skyUniforms.bottom.value,
  cloudColor: skyUniforms.cloudColor.value, fog: scene.fog.color, water: water.material.uniforms.waterColor.value,
  sun: sun.color, hemi: hemi.color, ground: hemi.groundColor,
};
for (const mood of Object.values(moods)) {
  for (const key of Object.keys(colorTargets)) mood[key] = new THREE.Color(mood[key]);
}
let mode='morning',transition=null,orbiting=false,orbitStart=0,orbitAngle=0,elapsed=0;
function snapshot() {
  const colors = Object.fromEntries(Object.entries(colorTargets).map(([key,color]) => [key,color.clone()]));
  return {
    ...colors, sunPower:sun.intensity, hemiPower:hemi.intensity, fill:fill.intensity,
    exposure:renderer.toneMappingExposure, pos:sun.position.clone(), snow:snowUniform.value,
    cloudAmount:skyUniforms.cloudAmount.value, sunAt:sunSprite.position.clone(),
  };
}
function setMode(next) {
  mode=next;
  document.body.dataset.mode=next;
  transition={from:snapshot(),to:moods[next],start:elapsed};
  $('button[data-mode][aria-pressed=true]')?.setAttribute('aria-pressed','false');
  $(`button[data-mode="${next}"]`).setAttribute('aria-pressed','true');
  $('#scene-poem').textContent=moods[next].poem;
  $('#scene-time').textContent=moods[next].time;
  snow.visible=next==='snow';
  moon.visible=next==='snow';
  starField.visible=next==='snow';
  for (const leaves of leafMeshes) leaves.visible=next!=='snow';
  windowMat.emissiveIntensity=next==='snow'?1.24:next==='dusk'?.29:.025;
  lanternLights.forEach(light => light.intensity=next==='snow'?19:next==='dusk'?3:0);
}
function updateMood() {
  if (!transition) return;
  renderer.shadowMap.needsUpdate=true;
  const {from,to,start}=transition;
  const t=THREE.MathUtils.clamp((elapsed-start)/(reducedMotion ? .01 : 1.5),0,1);
  const mix=t*t*(3-2*t);
  for (const [key,color] of Object.entries(colorTargets)) color.copy(from[key]).lerp(to[key],mix);
  sun.intensity=lerp(from.sunPower,to.sunPower,mix);
  hemi.intensity=lerp(from.hemiPower,to.hemiPower,mix);
  fill.intensity=lerp(from.fill,to.fill,mix);
  renderer.toneMappingExposure=lerp(from.exposure,to.exposure,mix);
  sun.position.copy(from.pos).lerp(to.pos,mix);
  snowUniform.value=lerp(from.snow,to.snow,mix);
  skyUniforms.cloudAmount.value=lerp(from.cloudAmount,to.cloudAmount,mix);
  sunSprite.material.opacity=mode==='snow'?1-mix:1;
  sunSprite.position.copy(from.sunAt).lerp(to.sunAt,mix);
  skyUniforms.lightDir.value.copy(sunSprite.position).normalize();
  scene.fog.density=.0064;
  skyUniforms.fogTint.value.copy(scene.fog.color);
  water.material.uniforms.fogTint.value.copy(scene.fog.color);
  if(t>=1)transition=null;
}
for(const b of document.querySelectorAll('button[data-mode]'))b.addEventListener('click',()=>setMode(b.dataset.mode));
function stopOrbit(){orbiting=false;$('#orbit').setAttribute('aria-pressed','false');$('#orbit-label').textContent='环游一周';}
$('#orbit').addEventListener('click',()=>{if(orbiting){stopOrbit();return;}orbiting=true;orbitStart=elapsed;orbitAngle=controls.getAzimuthalAngle();$('#orbit').setAttribute('aria-pressed','true');$('#orbit-label').textContent='暂停环游';});
controls.addEventListener('start',stopOrbit);
$('#reset').addEventListener('click',()=>{stopOrbit();resetCamera();});
$('#about-open').addEventListener('click',()=>$('#about').showModal());
$('#about').addEventListener('click',e=>{if(e.target===$('#about')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
function clean(value){document.body.classList.toggle('clean',value);$('#immersive').setAttribute('aria-pressed',String(value));}
$('#immersive').addEventListener('click',()=>clean(!document.body.classList.contains('clean')));
renderer.domElement.addEventListener('dblclick',()=>clean(!document.body.classList.contains('clean')));
document.addEventListener('keydown',e=>{if(e.key==='Escape')clean(false);});
renderer.domElement.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key))return;
  e.preventDefault();stopOrbit();const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  if(e.key==='ArrowLeft')spherical.theta-=.1;if(e.key==='ArrowRight')spherical.theta+=.1;if(e.key==='ArrowUp')spherical.phi-=.07;if(e.key==='ArrowDown')spherical.phi+=.07;if(e.key==='+'||e.key==='=')spherical.radius*=.91;if(e.key==='-')spherical.radius*=1.1;spherical.radius=THREE.MathUtils.clamp(spherical.radius,controls.minDistance,controls.maxDistance);spherical.phi=THREE.MathUtils.clamp(spherical.phi,controls.minPolarAngle,controls.maxPolarAngle);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();
});
const highlightMat=new THREE.MeshBasicMaterial({color:0xffe29a,depthTest:true});
$('#details-toggle').addEventListener('click',()=>{const on=$('#details-toggle').getAttribute('aria-pressed')!=='true';$('#details-toggle').setAttribute('aria-pressed',String(on));$('#details-toggle').textContent=on?'72 脊 · 收起':'看屋脊';ridgeRegistry.forEach(m=>m.material=on?highlightMat:mats.tileEdge);});
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{renderer.setSize(innerWidth,innerHeight);framing();},80);});
let last=performance.now(),frameCount=0,first=true;
function animate(now){requestAnimationFrame(animate);if(document.hidden){last=now;return;}const rawDt=Math.max(0,(now-last)/1000),dt=Math.min(rawDt,.15);last=now;elapsed+=rawDt;updateMood();
  if(orbiting){const p=Math.min(1,(elapsed-orbitStart)/48),angle=orbitAngle+p*Math.PI*2,sph=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));sph.theta=angle;camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph));if(p>=1)stopOrbit();}
  controls.update();water.material.uniforms.time.value=reducedMotion?0:elapsed;
  if(snow.visible&&!reducedMotion){for(let i=0;i<flakes;i++){flakePositions[i*3+1]-=dt*flakeSpeed[i]*1.6;flakePositions[i*3]+=Math.sin(elapsed*.3+i)*dt*.3;if(flakePositions[i*3+1]<0)flakePositions[i*3+1]=55;}snowGeo.attributes.position.needsUpdate=true;}
  $('#compass-needle').setAttribute('transform',`rotate(${-controls.getAzimuthalAngle()*180/Math.PI},40,40)`);
  renderer.render(scene,camera);frameCount++;
  if(first){first=false;$('#loading').classList.add('done');document.body.dataset.ready='true';}
}
// A small, read-only inspection surface used by the browser checks.
window.cornerTower={get state(){return {ready:!first,mode,ridges:ridgeRegistry.length,gables:gables.length,tiers:ridgeRegistry.reduce((a,r)=>(a[r.userData.tier]=(a[r.userData.tier]||0)+1,a),{}),orbiting,camera:camera.position.toArray(),azimuth:controls.getAzimuthalAngle(),snow:snow.visible,snowCover:snowUniform.value,reflection:water.isReflector,frames:frameCount,lighting:{exposure:renderer.toneMappingExposure,sun:sun.color.toArray(),intensity:sun.intensity,hemi:hemi.color.toArray(),fog:scene.fog.color.toArray(),sky:skyUniforms.top.value.toArray()},drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}};
setMode('morning');requestAnimationFrame(animate);
