import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { Reflector } from './vendor/Reflector.js';

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
const defaultPosition = mobile ? V(65,29,77) : V(56,27,67);
function resetCamera(){camera.position.copy(defaultPosition);controls.target.set(0,mobile?12:12.5,0);controls.update();}
resetCamera();
// Move the projection's optical axis so that the model sits in the open side of the composition.
function framing(){camera.aspect=innerWidth/innerHeight;camera.setViewOffset(innerWidth,innerHeight,mobile?-innerWidth*.045:-innerWidth*.115,0,innerWidth,innerHeight);camera.updateProjectionMatrix();}
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
  gold:material('#cfa14b',.3,.52), tile:material('#ba7e2a',.27,.15,{side:THREE.DoubleSide}),
  tileEdge:material('#e0b45c',.3,.2), wood:material('#482f23'),
  stone:material('#b4b5a4'), stoneDark:material('#777f74'), brick:material('#59605a'),
  earth:material('#5b6450'), tree:material('#31493e'), bark:material('#4b4436'),
};
// Snow accumulates on upward-facing roof surfaces, rather than covering vertical gables.
for(const m of [mats.tile,mats.tileEdge,mats.gold,mats.stone,mats.stoneDark]){
  m.onBeforeCompile=shader=>{
    shader.uniforms.uSnow=snowUniform;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSnowNormal; varying vec3 vSnowPosition;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvSnowNormal = normalize(mat3(modelMatrix) * objectNormal); vSnowPosition = (modelMatrix * vec4(transformed,1.)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uSnow; varying vec3 vSnowNormal; varying vec3 vSnowPosition;').replace('#include <color_fragment>','#include <color_fragment>\nfloat powder = smoothstep(.18,.75,vSnowNormal.y) * uSnow; float grain = .92 + .08*sin(vSnowPosition.x*28.)*sin(vSnowPosition.z*25.); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.84,.9,.94)*grain, powder*.94);');
  };
}
function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const brickTexture=canvasTexture(1024,1024,(ctx,w,h)=>{
  ctx.fillStyle='#6a6c60';ctx.fillRect(0,0,w,h);
  for(let row=0;row<32;row++)for(let col=-1;col<8;col++){
    const x=col*144+(row%2)*72,y=row*32,g=85+random()*34;
    ctx.fillStyle=`rgb(${g+6},${g+8},${g})`;ctx.fillRect(x+2,y+2,140,28);
    for(let n=0;n<12;n++){ctx.fillStyle=`rgba(18,22,17,${random()*.12})`;ctx.fillRect(x+random()*140,y+random()*28,2+random()*10,1+random()*3);}
    ctx.fillStyle='#b7b4a34a';ctx.fillRect(x+3,y+2,138,1);
  }
});brickTexture.wrapS=brickTexture.wrapT=THREE.RepeatWrapping;brickTexture.repeat.set(1.8,1.05);brickTexture.anisotropy=4;
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
 diffuseColor.rgb*=.83+tone*.32; diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.23,.24,.205),min(mortar,1.)*.35);`);
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

// A corner of the enceinte: the two wall arms continue inward, the moat wraps their outside.
box(-24,4.8,-2.5,57,9.6,11.4,mats.brick);
box(-2.5,4.8,-24,11.4,9.6,57,mats.brick);
box(0,4.8,0,15,9.6,15,mats.brick);
box(0,.45,0,16.2,.9,16.2,mats.stoneDark);
for(let side=0;side<2;side++){
  for(let i=0;i<29;i++){
    const r=-50+i*1.9;
    if(side===0){box(r,9.77,3.3,1.85,.32,1.05,mats.stoneDark);box(r,10.17,3.3,1.04,.65,.92,mats.brick);box(r,10.53,3.3,1.13,.12,1.03,mats.stone);}
    else{box(3.3,9.77,r,1.05,.32,1.85,mats.stoneDark);box(3.3,10.17,r,.92,.65,1.04,mats.brick);box(3.3,10.53,r,1.03,.12,1.13,mats.stone);}
  }
  for(let i=0;i<25;i++){
    const t=-50+i*2;
    side===0?box(t,9.82,-7.92,1.98,.47,.48,mats.brick):box(-7.92,9.82,t,.48,.47,1.98,mats.brick);
  }
}
box(-25,9.67,-2.4,55,.18,9.9,mats.stoneDark);box(-2.4,9.67,-25,9.9,.18,55,mats.stoneDark);
// Interior earth and perimeter stone banks.
box(-178,-.35,-178,348,1,348,mats.earth);
box(214,-.35,0,280,1,700,mats.earth);box(0,-.35,214,700,1,280,mats.earth);
box(-1,-.1,-1,17,.7,17,mats.stoneDark);
box(9.5,.08,-26,1.1,.8,70,mats.stoneDark);box(-26,.08,9.5,70,.8,1.1,mats.stoneDark);
box(-21,-.1,70,190,.8,3,mats.stoneDark);box(70,-.1,-21,3,.8,190,mats.stoneDark);
box(-21,.15,73,196,.55,4,mats.earth);box(73,.15,-21,4,.55,196,mats.earth);

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
    sideBox(side,0,14.7,r,w,.48,.3,paintMat);
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
  for(let i=0;i<13;i++){const u=-4.35+i*.725;if(Math.abs(u)>1.95)dougong(side,u,14.93,4.38,3,.9);}
  for(let i=0;i<7;i++)dougong(side,-1.9+i*.633,14.93,front,3,.9);
  sideBox(side,0,16.75,3.65,7.35,.7,.32,paintMat);
  for(let i=0;i<10;i++)dougong(side,-3.5+i*.777,17.05,3.64,3,.8);
  sideBox(side,0,16.78,front,3.9,.58,.3,paintMat);
  for(let i=0;i<7;i++)dougong(side,-1.9+i*.633,17.05,front,3,.8);
  sideBox(side,0,19.65,2.75,5.55,.74,.3,paintMat);
  for(let i=0;i<7;i++)dougong(side,-2.7+i*.9,20.03,2.75,4,.88);
}

const tileData={p:[],i:[],c:[]};
const tileColors=[new THREE.Color('#ba812e'),new THREE.Color('#d5a449'),new THREE.Color('#c69136'),new THREE.Color('#daa748')];
const roofBase=material('#98702e',.64,.06,{side:THREE.DoubleSide});roofBase.onBeforeCompile=mats.tile.onBeforeCompile;
const ridgeGroup=new THREE.Group();ridgeGroup.name='72条屋脊';architecture.add(ridgeGroup);
const ridgeRegistry=[];
const gables=[];
function ridge(points,type,tier,r=.105){const m=line(points,r,mats.tileEdge,ridgeGroup);m.userData={type,tier};ridgeRegistry.push(m);return m;}
function roofPatch(fn,width,lanes){
  const rows=10, cols=6, pp=[],idx=[];
  for(let v=0;v<=rows;v++)for(let u=0;u<=cols;u++){const p=fn(u/cols,v/rows);pp.push(p.x,p.y,p.z);}
  for(let v=0;v<rows;v++)for(let u=0;u<cols;u++){const a=v*(cols+1)+u,b=a+cols+1;idx.push(a,b,a+1,a+1,b,b+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pp,3));geo.setIndex(idx);geo.computeVertexNormals();mesh(geo,roofBase);
  const count=lanes||Math.ceil(width/.185),rad=.065;
  for(let lane=0;lane<count;lane++){
    const start=tileData.p.length/3,color=tileColors[Math.floor(random()*tileColors.length)];
    for(let t=0;t<=rows;t++)for(let j=0;j<=4;j++){
      const uu=(lane+.5+(j/4-.5)*.78)/count,p=fn(uu,t/rows);
      p.y+=.025+Math.sin(j/4*Math.PI)*rad;
      tileData.p.push(p.x,p.y,p.z);
      const shade=t%2===0?.88:1;tileData.c.push(color.r*shade,color.g*shade,color.b*shade);
    }
    for(let t=0;t<rows;t++)for(let j=0;j<4;j++){const a=start+t*5+j,b=a+5;tileData.i.push(a,b,a+1,a+1,b,b+1);}
    const end=fn((lane+.5)/count,1);sphere(end.x,end.y+.025,end.z,.085,mats.tileEdge,.8);
  }
  // Dark wooden fascia with a gold edge below every eave.
  const edge=Array.from({length:13},(_,j)=>{const p=fn(j/12,1);p.y-=.07;return p;});
  line(edge,.085,mats.redLight);line(edge.map(p=>p.clone().add(V(0,.08,0))),.027,mats.gold);
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
skirt(4.35,6.05,16.23,15.02,1);
skirt(3.3,4.9,19.02,17.48,2);
skirt(2.45,4.2,22.28,20.47,3);
// Lower half-slope waist eaves around the four projections.
for(let side=0;side<4;side++){
  const end=4.365+(side<2?1.6:3.98),w=2.7,r0=4.45,r1=end+.8;
  roofPatch((u,v)=>pt(side,(u*2-1)*lerp(1.86,w,v),lerp(16.2,15.02,Math.sin(v*Math.PI/2))+.36*v*v*Math.pow(Math.abs(u*2-1),7),lerp(end-.7,r1,v)),w*2);
  for(const sign of [-1,1]){
    roofPatch((u,v)=>pt(side,sign*lerp(1.86,w,v),lerp(16.2,15.02,Math.sin(v*Math.PI/2))+.36*v*v*Math.pow(u,6),lerp(r0,r1,u)),r1-r0);
    ridge(Array.from({length:9},(_,j)=>{const v=j/8;return pt(side,sign*lerp(1.86,w,v),lerp(16.2,15.02,Math.sin(v*Math.PI/2))+.36*v*v,lerp(end-.7,r1,v));}),'下檐角脊',1);
  }
  // Twelve segments of the enclosing ridge, interrupted by the cruciform arms.
  ridge([pt(side,-4.35,16.25,4.35),pt(side,-1.86,16.25,4.35)],'围脊',1,.08);
  ridge([pt(side,1.86,16.25,4.35),pt(side,4.35,16.25,4.35)],'围脊',1,.08);
  ridge([pt(side,-1.86,16.23,end-.7),pt(side,1.86,16.23,end-.7)],'围脊',1,.08);
}
// Xieshan wings: paired broad slopes, a triangular gable, a front hip, and diagonal hips.
function gableWing(side,{start,end,width,peak,eave,tier,hips=true,ridgeMain=true,offsetX=0,offsetZ=0}){
  const W=(u,y,r)=>pt(side,u,y,r).add(V(offsetX,0,offsetZ));
  const half=width/2,gw=half*.65,breakY=lerp(eave,peak,.38),gEnd=end-.7;
  for(const s of [-1,1]){
    roofPatch((u,v)=>{const r=lerp(start,gEnd+.7*Math.pow(v,2),u),lateral=s*half*v;const corner=.30*Math.pow(v,6)*Math.pow(u,7);return W(lateral,lerp(peak,eave,Math.sin(v*Math.PI/2))+corner,r);},(gEnd-start)*1.1,Math.max(8,Math.ceil((gEnd-start)/.18)));
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
    gableWing(side,{start:2.7,end:6.7,width:5.3,peak:19.14,eave:17.55,tier:2});
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
// Rafter ends and ornamental fascia beneath the three eave belts.
for(let side=0;side<4;side++)for(const [r,y,w]of[[5.8,14.93,11.6],[4.67,17.4,9.2],[4.0,20.35,7.8]])for(let i=0;i<Math.floor(w/.28);i++){
  const u=-w/2+i*.28,p=pt(side,u,y-.14,r-.12);box(p.x,p.y,p.z,.09,.11,.55,mats.teal,side*Math.PI/2);
}

// Low trees inside the city; sparse branching willows on the opposite bank.
function tree(x,z,size=1,willow=false){
  cylinder(x,size*2,z,.17*size,size*4,mats.bark);
  for(let b=0;b<5;b++){
    const angle=b*2.4+random(),r=(1.2+random())*size,a=V(x,size*(2+random()),z),end=V(x+Math.cos(angle)*r,size*(4+random()*2),z+Math.sin(angle)*r);
    poleBetween(a,end,.07*size,mats.bark);
    if(willow){for(let j=0;j<4;j++){const p=end.clone().add(V((random()-.5)*size,0,(random()-.5)*size));line([p,p.clone().add(V(.25*size,-1.6*size,0)),p.clone().add(V(.4*size,-3*size,.2))],.025*size,mats.tree,world);}}
    else{sphere(end.x,end.y,end.z,(.85+random()*.5)*size,mats.tree,1.3);}
  }
}
for(let i=0;i<33;i++){const x=-12-random()*85,z=-12-random()*85;tree(x,z,.7+random()*.6);}
for(let i=0;i<15;i++){tree(74, -45+i*8,.8+random()*.4,true);tree(-45+i*8,74,.8+random()*.4,true);}
for(const {geo,mat,items}of pools.values()){
  const inst=new THREE.InstancedMesh(geo,mat,items.length);inst.castShadow=true;inst.receiveShadow=true;
  items.forEach((item,i)=>{dummy.position.copy(item.pos);dummy.scale.copy(item.scale);dummy.rotation.set(0,item.rotation||0,0);if(item.quaternion)dummy.quaternion.copy(item.quaternion);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);});inst.computeBoundingSphere();architecture.add(inst);
}

architecture.scale.y=27.5/25.23;
// Gradient sky. The sky dome is also rendered by the reflection camera.
const skyUniforms={top:{value:new THREE.Color('#567e83')},horizon:{value:new THREE.Color('#e2cfaa')},bottom:{value:new THREE.Color('#8da49a')}};
const sky= new THREE.Mesh(new THREE.SphereGeometry(290,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:skyUniforms,vertexShader:'varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 top;uniform vec3 horizon;uniform vec3 bottom;varying vec3 vWorld;void main(){float h=normalize(vWorld).y;vec3 c=mix(horizon,top,pow(max(h,0.),.55));c=mix(c,bottom,1.-smoothstep(-.25,0.,h));gl_FragColor=vec4(c,1.);#include <colorspace_fragment>\n}'}));
// Includes must begin a new line in GLSL.
sky.material.fragmentShader=sky.material.fragmentShader.replace(';#include',';\n#include');scene.add(sky);
const glowTexture=canvasTexture(128,128,(c)=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'#fffff7');g.addColorStop(.09,'#fff5c2');g.addColorStop(.18,'#ffe3a56b');g.addColorStop(1,'#ffe3a500');c.fillStyle=g;c.fillRect(0,0,128,128);});
const sunSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:0xffe1ac,transparent:true,depthWrite:false,fog:false}));sunSprite.position.set(-75,31,-125);sunSprite.scale.set(37,37,1);scene.add(sunSprite);
const moon=new THREE.Mesh(new THREE.SphereGeometry(2.1,24,16),new THREE.MeshBasicMaterial({color:0xe5edf2,fog:false}));moon.position.set(-55,40,-120);scene.add(moon);moon.visible=false;
// Real-time planar reflection plus a world-space ripple field (no image-based water texture).
const waterShader={
  uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null},time:{value:0},waterColor:{value:new THREE.Color('#395e58')},ripple:{value:1}},
  vertexShader:`uniform mat4 textureMatrix;varying vec4 vUv;varying vec3 vWorld;varying vec3 vView;void main(){vUv=textureMatrix*vec4(position,1.);vWorld=(modelMatrix*vec4(position,1.)).xyz;vView=cameraPosition-vWorld;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform vec3 waterColor;uniform sampler2D tDiffuse;uniform float time;uniform float ripple;varying vec4 vUv;varying vec3 vWorld;varying vec3 vView;
  void main(){vec2 p=vWorld.xz;float w=sin(p.y*2.8+time*.7+p.x*.5)+sin(p.x*1.9-time*.5+p.y*.75)*.5;vec4 uv=vUv;uv.x+=sin(p.y*3.2+time)*.00032*uv.w*ripple;uv.y+=w*.00065*uv.w*ripple;vec3 reflection=texture2DProj(tDiffuse,uv).rgb;float fresnel=pow(1.-max(dot(normalize(vView),vec3(0.,1.,0.)),0.),2.);vec3 col=mix(waterColor,reflection,.57+fresnel*.36);float thread=pow(max(0.,sin(p.y*9.+sin(p.x*.6+time*.2)*2.+time*.4)),50.);col+=vec3(.006,.009,.007)*thread;gl_FragColor=vec4(col,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`
};
const water=new Reflector(new THREE.PlaneGeometry(550,550),{clipBias:.005,textureWidth:mobile?640:1024,textureHeight:mobile?640:1024,shader:waterShader,multisample:0});water.rotation.x=-Math.PI/2;water.position.y=-.35;scene.add(water);
// Soft, warm interior light in winter, visible through the lattice and in the river.
const lanternLights=[];
for(let s=0;s<4;s++){const p=pt(s,0,13,4.365+(s<2?1.6:3.98)+.25);const l=new THREE.PointLight(0xffb35c,0,12,2);l.position.copy(p);scene.add(l);lanternLights.push(l);}
const flakes=mobile?750:1700,flakePositions=new Float32Array(flakes*3),flakeSpeed=new Float32Array(flakes);
for(let i=0;i<flakes;i++){flakePositions[i*3]=(random()-.5)*105;flakePositions[i*3+1]=random()*55;flakePositions[i*3+2]=(random()-.5)*105;flakeSpeed[i]=.8+random()*1.1;}
const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.BufferAttribute(flakePositions,3));
const snowTexture=canvasTexture(32,32,c=>{const g=c.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'white');g.addColorStop(.3,'#ffffffe0');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,32,32);});
const snow=new THREE.Points(snowGeo,new THREE.PointsMaterial({color:0xecf5ff,size:.17,map:snowTexture,transparent:true,opacity:.85,depthWrite:false}));snow.visible=false;scene.add(snow);
const starGeo=new THREE.BufferGeometry(),stars=[];for(let i=0;i<300;i++){const a=random()*Math.PI*2,h=.12+random()*.8;stars.push(Math.cos(a)*190*Math.sqrt(1-h*h),h*190,Math.sin(a)*190*Math.sqrt(1-h*h));}starGeo.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));const starField=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xd9e8ef,size:.25,transparent:true,opacity:.6,depthWrite:false,fog:false}));scene.add(starField);starField.visible=false;

const moods={
  morning:{top:'#527b81',horizon:'#ead3ab',bottom:'#91a79a',fog:'#a5b3a1',water:'#49695f',sun:'#ffe1aa',hemi:'#c8dfde',ground:'#484d37',sunPower:4.2,hemiPower:2.15,fill:1.05,exposure:1.22,pos:V(-35,38,35),snow:0,poem:'晨光初上，金瓦映水。',time:'卯时 · 清晨'},
  dusk:{top:'#484b6d',horizon:'#eda978',bottom:'#7e7975',fog:'#b49b8d',water:'#5d6264',sun:'#ffbb71',hemi:'#c7c2d6',ground:'#473e43',sunPower:3.8,hemiPower:1.45,fill:.8,exposure:1.15,pos:V(18,15,-52),snow:0,poem:'日色渐收，城影入河。',time:'酉时 · 黄昏'},
  snow:{top:'#0e1b32',horizon:'#66758b',bottom:'#34495e',fog:'#4c5e73',water:'#1e3446',sun:'#b7d9ff',hemi:'#a3b9d2',ground:'#273d53',sunPower:2,hemiPower:1.45,fill:1.1,exposure:1.13,pos:V(-38,65,-35),snow:1,poem:'飞雪无声，宫灯未眠。',time:'亥时 · 雪夜'}
};
let mode='morning',transition=null,orbiting=false,orbitStart=0,orbitAngle=0,elapsed=0;
function snapshot(){return {top:skyUniforms.top.value.clone(),horizon:skyUniforms.horizon.value.clone(),bottom:skyUniforms.bottom.value.clone(),fog:scene.fog.color.clone(),water:water.material.uniforms.waterColor.value.clone(),sun:sun.color.clone(),hemi:hemi.color.clone(),ground:hemi.groundColor.clone(),sunPower:sun.intensity,hemiPower:hemi.intensity,fill:fill.intensity,exposure:renderer.toneMappingExposure,pos:sun.position.clone(),snow:snowUniform.value};}
function setMode(next){mode=next;document.body.dataset.mode=next;transition={from:snapshot(),to:moods[next],start:elapsed};$('[data-mode][aria-pressed=true]')?.setAttribute('aria-pressed','false');$(`[data-mode="${next}"]`).setAttribute('aria-pressed','true');$('#scene-poem').textContent=moods[next].poem;$('#scene-time').textContent=moods[next].time;snow.visible=next==='snow';moon.visible=next==='snow';starField.visible=next==='snow';windowMat.emissiveIntensity=next==='snow'?1.7:next==='dusk'?.45:.04;lanternLights.forEach(l=>l.intensity=next==='snow'?24:next==='dusk'?7:0);}
function updateMood(){if(!transition)return;renderer.shadowMap.needsUpdate=true;const {from:f,to:t,start}=transition;let p=THREE.MathUtils.clamp((elapsed-start)/(reducedMotion ? .01 : 1.8),0,1);p=p*p*(3-2*p);for(const key of ['top','horizon','bottom'])skyUniforms[key].value.copy(f[key]).lerp(new THREE.Color(t[key]),p);scene.fog.color.copy(f.fog).lerp(new THREE.Color(t.fog),p);water.material.uniforms.waterColor.value.copy(f.water).lerp(new THREE.Color(t.water),p);sun.color.copy(f.sun).lerp(new THREE.Color(t.sun),p);hemi.color.copy(f.hemi).lerp(new THREE.Color(t.hemi),p);hemi.groundColor.copy(f.ground).lerp(new THREE.Color(t.ground),p);sun.intensity=lerp(f.sunPower,t.sunPower,p);hemi.intensity=lerp(f.hemiPower,t.hemiPower,p);fill.intensity=lerp(f.fill,t.fill,p);renderer.toneMappingExposure=lerp(f.exposure,t.exposure,p);sun.position.copy(f.pos).lerp(t.pos,p);snowUniform.value=lerp(f.snow,t.snow,p);sunSprite.material.opacity=mode==='snow'?1-p:1;sunSprite.material.color.set(mode==='dusk'?'#ffbb7f':'#ffe5b8');sunSprite.position.y=mode==='dusk'?14:31;if(p>=1)transition=null;}
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>setMode(b.dataset.mode));
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
