(function (H) {
  'use strict';

  H.buildCoast = function (ctx) {
    const { scene, rng, updates, mat, batch } = ctx;
    const T = THREE, tau = Math.PI * 2;
    const land = new T.Group();
    land.name = 'Sea cliffs, lighthouse and western hamlet';
    const groundCover = mat('sand', 0xffffff, { vertexColors: true });
    const crag = mat('stone', 0xffffff, { vertexColors: true });
    const plaster = mat('plaster', 0xe8dbbf), red = mat('metal', 0xad4437);
    const iron = mat('metal', 0x464b47), copper = mat('metal', 0x706359);
    const gold = mat('metal', 0xac8c59), putty = mat('plaster', 0xdacba8);
    const timber = mat('wood', 0x806147), umber = mat('wood', 0x685240);
    const trim = mat('wood', 0x927250), concrete = mat('stone', 0xbbad90);
    const oldGlass = mat('plain', 0x586f70, { roughness: .27 });
    const cozy = mat('plain', 0xffc37b, { emissive: 0xff8f37, emissiveIntensity: .65 });
    const lanternGlass = mat('plain', 0xffda8a, { emissive: 0xffaf51, emissiveIntensity: 1.35 });
    const granite = [0x777975, 0x929087, 0x716f68, 0x89867b, 0x656d68, 0x999183].map(c => mat('stone', c));
    const foliage = [0x496343, 0x395b46, 0x687a46, 0x526f48, 0x78854b].map(c => mat('plain', c, {vertexColors:true}));
    const rockForms = [], leafForms = [];
    const boxes = new Map(), cylinders = new Map();
    const vec = (x, y, z) => new T.Vector3(x, y, z);
    const lerp = T.MathUtils.lerp, clamp = T.MathUtils.clamp;
    const range = (a, b) => a + rng() * (b - a);
    const pick = a => a[Math.floor(rng() * a.length)];
    const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);
    const color = (a, b, t) => new T.Color(a).lerp(new T.Color(b), clamp(t, 0, 1));

    function add(g, geo, m, x, y, z) {
      const o = new T.Mesh(geo, m);
      o.position.set(x, y, z);
      o.castShadow = true;
      o.receiveShadow = true;
      g.add(o);
      return o;
    }
    function group(g, x, y, z, angle = 0) {
      const o = new T.Group();
      o.position.set(x, y, z);
      o.rotation.y = angle;
      g.add(o);
      return o;
    }
    // Three samples at each end of a box let light turn gently around worn edges.
    function block(g, x, y, z, w, h, d, m, radius = 0) {
      const fineTrim = (g.userData.village || (g.parent && g.parent.userData.village)) && Math.min(w, h, d) < .31;
      const r = fineTrim ? 0 : Math.min(radius, w * .23, h * .23, d * .23);
      const key = [w, h, d, r].join('/');
      let geo = boxes.get(key);
      if (!geo) {
        geo = new T.BoxGeometry(w, h, d, r ? 3 : 1, r ? 3 : 1, r ? 3 : 1);
        if (r) {
          const p = geo.attributes.position, n = geo.attributes.normal;
          const half = [w / 2, h / 2, d / 2];
          for (let i = 0; i < p.count; i++) {
            const v = [p.getX(i), p.getY(i), p.getZ(i)];
            const center = v.map((c, j) => Math.sign(c) * (half[j] - r));
            const normal = vec(...v.map((c, j) => Math.abs(c) > half[j] * .95 ? Math.sign(c) : 0)).normalize();
            p.setXYZ(i, center[0] + r * normal.x, center[1] + r * normal.y, center[2] + r * normal.z);
            n.setXYZ(i, normal.x, normal.y, normal.z);
          }
        }
        boxes.set(key, geo);
      }
      return add(g, geo, m, x, y, z);
    }
    function cylinder(g, x, y, z, top, bottom, h, m, sides = 18) {
      const key = [top, bottom, h, sides].join('/');
      if (!cylinders.has(key)) cylinders.set(key, new T.CylinderGeometry(top, bottom, h, sides));
      return add(g, cylinders.get(key), m, x, y, z);
    }
    function rod(g, a, b, r, m, r2 = r, sides = 7) {
      const direction = vec(...b).sub(vec(...a)), length = direction.length();
      const o = cylinder(g, (a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2, r2, r, length, m, sides);
      o.quaternion.setFromUnitVectors(vec(0, 1, 0), direction.normalize());
      return o;
    }
    function geoFromGrid(rows, cols, sample) {
      const vertices=[], colors=[], uvs=[], indices=[];
      for (let i=0; i<=rows; i++) for (let j=0; j<=cols; j++) {
        const [x,y,z,c] = sample(i/rows, j/cols);
        vertices.push(x,y,z); colors.push(c.r,c.g,c.b); uvs.push(x*.095,z*.095);
        if (i && j) {
          const k=i*(cols+1)+j, a=k-cols-2, b=k-1, d=k-cols-1;
          indices.push(a,b,d,b,k,d);
        }
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(vertices,3));
      geo.setAttribute('color', new T.Float32BufferAttribute(colors,3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(uvs,2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    }
    function bumpForm(seed, leafy) {
      const geo = new T.IcosahedronGeometry(1, leafy ? 1 : 2);
      const p = geo.attributes.position;
      for (let i=0; i<p.count; i++) {
        const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
        const warp=1+.10*Math.sin(4*x+seed)*Math.cos(5*z-seed)+.055*Math.sin(9*y+3*x+seed);
        const s=leafy ? 1.4 : .78;
        const fy=leafy ? y : Math.sign(y)*Math.pow(Math.abs(y),.84);
        const edge=leafy ? .085*Math.sin(11*x+seed*.7)*Math.cos(8*z+4*y) : 0;
        const width = a => leafy ? a : Math.sign(a)*Math.pow(Math.abs(a),.73);
        p.setXYZ(i, width(x)*(warp+edge) + y*.19*s, fy*(warp+edge+.10*Math.sin(z*5+seed)), width(z)*(warp+edge));
      }
      geo.computeVertexNormals();
      // Retain the broad, planar face of a rock and soften only a portion of each seam.
      const n=geo.attributes.normal;
      for(let i=0;i<p.count;i++){
        const a=vec(n.getX(i),n.getY(i),n.getZ(i)).lerp(vec(p.getX(i),p.getY(i),p.getZ(i)).normalize(),leafy?.55:.28).normalize();
        n.setXYZ(i,a.x,a.y,a.z);
      }
      if (leafy) {
        const c=[];
        for(let i=0;i<p.count;i++){
          const y=p.getY(i), x=p.getX(i), z=p.getZ(i);
          const k=.76+.18*y+.14*Math.sin(x*7+seed)*Math.cos(z*5+y);
          c.push(k*1.01,k+.023,k*.89+.042);
        }
        geo.setAttribute('color',new T.Float32BufferAttribute(c,3));
      }
      return geo;
    }
    for(let i=0;i<6;i++){ rockForms.push(bumpForm(i*13,false));leafForms.push(bumpForm(i*11,true)); }
    function stone(g,x,y,z,w,h,d,shade=pick(granite)) {
      const o=add(g,pick(rockForms),shade,x,y,z);
      o.scale.set(w,h,d);o.rotation.set(range(-.16,.16),range(0,tau),range(-.18,.18));
      return o;
    }
    function leaves(g,x,y,z,w,h,d,m) {
      const o=add(g,pick(leafForms),m,x,y,z);o.scale.set(w,h,d);o.rotation.y=range(0,tau);
    }

    // The cap has a single connected sloping body under the exposed slabs.
    const capeX=-4, capeZ=-48, capeW=38, capeD=12.8;
    const rimShape = a => 1+.075*Math.sin(3*a+.7)+.043*Math.cos(7*a-.9)+.026*Math.sin(12*a);
    function capHeight(x,z) {
      const u=(x-capeX)/capeW, v=(z-capeZ)/capeD, a=Math.atan2(v,u);
      const r=Math.hypot(u,v)/rimShape(a);
      return 5.06 - 6.30*smooth(.57,1.09,r)
        + (.33*Math.sin(x*.17-z*.13)+.23*Math.cos(z*.31+x*.07))*(.32+.68*smooth(.47,.91,r));
    }
    const capeGeo=geoFromGrid(34,150,(t,s)=>{
      const a=-s*tau, r=(.001+1.095*t)*rimShape(a);
      const x=capeX+capeW*Math.cos(a)*r, z=capeZ+capeD*Math.sin(a)*r, y=capHeight(x,z);
      const noise=.5+.30*Math.sin(x*.43+z*.71)+.16*Math.cos(z*.95-x*.31);
      const green=color(0x62774b,0x99a665,noise);
      const grey=color(0x58645e,0xaaa18b,.24+.52*smooth(.45,3.4,y)+noise*.25);
      const terrainColor=grey.lerp(green,smooth(2.1,4.7,y)*(.70+.29*noise));
      const pathZ=-41.4+1.03*Math.sin((x+11)/27*Math.PI);
      const pathFootprint=smooth(-10,-8,x)*(1-smooth(14.3,16.0,x))*(1-smooth(.28,.72,Math.abs(z-pathZ)+.11*Math.sin(x*4.1)));
      return [x,y,z,terrainColor.lerp(new T.Color(0xc7b58e),pathFootprint*.53)];
    });
    add(land,capeGeo,crag,0,0,0);

    // Clusters follow the strike of the headland, with a low tide-darkened foot.
    const foamRocks = ctx.foamRocks || (ctx.foamRocks = []);
    for (let i=0;i<165;i++) {
      const a=range(-2.6,2.97), r=range(.77,1.19)*rimShape(a);
      const x=capeX+capeW*r*Math.cos(a),z=capeZ+capeD*r*Math.sin(a);
      const y=capHeight(x,z);
      const size=range(.53,2.6);
      const rock = stone(land,x,Math.max(-.44,y-.35*size),z,size*1.2,size*range(.53,.85),size*range(.68,.99));
      if (r > 1.00 && size > 1.5 && z > capeZ && foamRocks.length < 16)
        foamRocks.push({x,z,rx:rock.scale.x*.88,rz:rock.scale.z*.96});
    }

    // Laminated ledges project from the turf above the tide-worn stones.
    const ledgeShapes=[];
    for (let i=0;i<4;i++){
      const layers=[[.001,.91],[.70,.90],[.94,.68],[1,.39],[.95,.22],[1.01,.12],[.98,-.18],[.83,-.52],[.61,-.78]];
      const geo=geoFromGrid(layers.length-1,11,(t,s)=>{
        const [r,y]=layers[Math.round(t*(layers.length-1))], angle=-s*tau;
        const length=r*(1+.10*Math.sin(3*angle+i)+.08*Math.cos(5*angle+i));
        const x=length*Math.cos(angle),z=length*Math.sin(angle);
        const shade=color(0x706e65,0xb1aa96,.23+.48*y+.19*Math.sin(angle*4+i));
        if (t===.5)shade.multiplyScalar(.79);
        return [x,y+x*.14+z*.09+.09*Math.sin(angle*2+i)*r,z,shade];
      });ledgeShapes.push(geo);
    }
    for(let i=0;i<82;i++){
      const a=range(-.78,2.69),r=range(.81,1.02)*rimShape(a);
      const x=capeX+capeW*r*Math.cos(a),z=capeZ+capeD*r*Math.sin(a),w=range(1.12,3.2);
      const o=add(land,pick(ledgeShapes),crag,x,capHeight(x,z)-w*.15,z);
      o.scale.set(w,w*range(.25,.52),w*range(.55,.91));o.rotation.y=range(-.40,.11);
    }

    function shoreX(z){return -24+2.2*Math.sin(z*.077+.55)+1.1*Math.sin(z*.215);}
    function westHeight(x,z){
      const d=shoreX(z)-x;
      return -.03+d*.165 + 2.2*smooth(15,31,d) + 3.1*smooth(32,51,d)
        + (1.33*Math.sin(z*.075+d*.062)+.82*Math.cos(z*.138-d*.11))*smooth(3,24,d)
        + 7.1*Math.sin(z*.045-.4)*smooth(45,100,d);
    }
    const westGeo=geoFromGrid(92,51,(s,t)=>{
      const z=lerp(-165,165,s),d=lerp(137,-4.5,t),x=shoreX(z)-d,y=westHeight(x,z);
      const stain=.5+.23*Math.sin(x*.31+z*.195)+.19*Math.cos(z*.29-x*.43);
      const bank=color(0x7b8659,0xa9a772,stain).lerp(color(0x526d51,0x78935e,stain),smooth(15,65,d));
      const sand=color(0xaa9c87,0xe2c7a1,.25+stain*.45+.18*smooth(0,5,d));
      return [x,y,z,sand.lerp(bank,smooth(5,13,d+Math.sin(z*.3)*1.3))];
    });
    add(land,westGeo,groundCover,0,0,0);

    function pine(x,y,z,h) {
      const g=group(land,x,y,z,range(0,tau));
      const bend=range(-.23,.29)*h, lean=range(-.12,.17)*h;
      const broad=rng()>.40, trunkH=broad?.29:.41;
      const layers=broad?4:6, spread=h*(broad?range(.36,.50):range(.29,.40));
      rod(g,[0,0,0],[bend*.27,h*.44,lean*.22],h*.043,umber,h*.035);
      rod(g,[bend*.27,h*.44,lean*.22],[bend,h*.84,lean],h*.035,umber,h*.015);
      const base=Math.floor(range(0,3));
      for(let k=0;k<layers;k++){
        const t=k/layers, a=k*2.4+.32, layerY=h*(trunkH+t*(.92-trunkH));
        const w=spread*(.89-.53*t), ax=bend*(.32+.65*t),az=lean*(.27+.68*t);
        const dx=Math.cos(a)*w*.64, dz=Math.sin(a)*w*.64;
        rod(g,[ax,layerY,az],[ax+dx,layerY+h*.12,az+dz],h*.023,umber,h*.011);
        leaves(g,ax+dx,layerY+h*.17,az+dz,w,h*(broad?.19:.124),w*range(.67,.94),foliage[(base+k%2)%5]);
        for(let j=0;j<3;j++){
          const a2=a+j*1.86+.32, xx=ax+dx+Math.cos(a2)*w*.72,zz=az+dz+Math.sin(a2)*w*.56;
          leaves(g,xx,layerY+h*range(.13,.21),zz,w*range(.28,.53),h*range(.063,.123),w*.45,foliage[(base+(j===1?2:0))%5]);
        }
      }
      leaves(g,bend,h*.94,lean,spread*.46,h*range(.075,.14),spread*.41,foliage[base+1]);
    }
    function bush(x,y,z,s) {
      leaves(land,x,y+.21*s,z,s*.83,s*.48,s*.68,pick(foliage));
      leaves(land,x+.32*s,y+.29*s,z+.06*s,s*.60,s*.41,s*.51,pick(foliage));
    }
    for(let i=0;i<45;i++){
      const a=range(0,tau),r=range(.46,.79)*rimShape(a);
      const x=capeX+capeW*Math.cos(a)*r,z=capeZ+capeD*Math.sin(a)*r;
      if(x>-.7 && x<19 && z>-49.5) continue;
      if(i%6===0) pine(x,capHeight(x,z)-.15,z,range(3.0,5.2));
      else bush(x,capHeight(x,z)-.14,z,range(.71,1.67));
    }
    // Patches of salt grass are grouped by their position above the tide line.
    const blades=[], bladeColors=[], bladeUV=[];
    function tuft(x,y,z,s) {
      for(let i=0;i<8;i++){
        const a=range(0,tau),l=s*range(.45,1.09),dx=Math.cos(a),dz=Math.sin(a);
        const xx=x+dx*range(0,.16)*s, zz=z+dz*range(0,.16)*s;
        const w=l*.07, tip=[xx+dx*l*.32+l*.13,y+l,zz+dz*l*.32];
        const c=color(0x777c49,0xc8b87f,range(0,1));
        blades.push(xx-dz*w,y,zz+dx*w, xx+dz*w,y,zz-dx*w, ...tip);
        for(let j=0;j<3;j++)bladeColors.push(c.r,c.g,c.b);
        bladeUV.push(0,0,1,0,.5,1);
      }
    }
    for(let i=0;i<480;i++){
      if(i%3===0){
        const z=range(-47,59),x=shoreX(z)-range(4.0,10);
        tuft(x,westHeight(x,z)-.05,z,range(.12,.49));
      } else {
        const a=range(0,tau),r=range(.52,.87)*rimShape(a);
        const x=capeX+capeW*Math.cos(a)*r,z=capeZ+capeD*Math.sin(a)*r;
        tuft(x,capHeight(x,z)-.06,z,range(.14,.50));
      }
    }
    const grassGeo=new T.BufferGeometry();
    grassGeo.setAttribute('position',new T.Float32BufferAttribute(blades,3));
    grassGeo.setAttribute('color',new T.Float32BufferAttribute(bladeColors,3));
    grassGeo.setAttribute('uv',new T.Float32BufferAttribute(bladeUV,2));
    grassGeo.computeVertexNormals();
    const grasses=add(land,grassGeo,mat('plain',0xffffff,{vertexColors:true,side:T.DoubleSide}),0,0,0);
    grasses.castShadow=false;

    function windowFrame(g,x,y,z,w,h,lit=false) {
      block(g,x,y,z,w,h,.09,umber,.025);
      block(g,x,y,z+.053,w-.13,h-.14,.055,lit?cozy:oldGlass,.016);
      block(g,x,y,z+.09,.063,h-.07,.046,trim);
      block(g,x,y-.06*h,z+.09,w-.06,.054,.046,trim);
      block(g,x,y-h/2,z+.08,w+.17,.081,.19,trim,.016);
    }
    function gableRoof(g,w,d,wallH,rise,roofMat) {
      const halfD=d/2+.45, halfW=w/2+.46;
      const run=Math.hypot(halfD,rise), slope=Math.atan2(rise,halfD);
      for (const sign of [-1,1]) {
        const panel=block(g,0,wallH+rise/2,sign*halfD/2,halfW*2,.17,run,roofMat,.036);
        panel.rotation.x=sign*slope;
        block(g,0,wallH-.025,sign*halfD,halfW*2,.19,.13,umber,.028);
        for (const side of [-1,1]) {
          const e=block(g,side*(halfW-.055),wallH+rise/2+.093,sign*halfD/2,.11,.092,run+.03,roofMat,.025);
          e.rotation.x=sign*slope;
        }
        for (let r=1;r<=3;r++) {
          const f=r/4;
          block(g,0,wallH+(1-f)*rise+.083,sign*f*halfD,halfW*2,.032,.058,roofMat);
        }
      }
      rod(g,[-halfW-.05,wallH+rise+.13,0],[halfW+.05,wallH+rise+.13,0],.116,roofMat,.116,10);
      // Closed plaster triangular gables viewed between adjacent cottages.
      const geo=new T.BufferGeometry(),v=[],uv=[];
      for(const side of [-1,1]){
        const x=side*(w/2-.02);
        const pts=[[x,wallH-.09,-d/2],[x,wallH-.09,d/2],[x,wallH+rise-.11,0]];
        if(side>0)pts.reverse();
        v.push(...pts.flat());uv.push(0,0,1,0,.5,1);
      }
      geo.setAttribute('position',new T.Float32BufferAttribute(v,3));
      geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();
      add(g,geo,putty,0,0,0);
    }
    const wallTones=[0xddcbb2,0xbba48b,0xc8bfa7,0xbba88c,0xd3bb9f].map(c=>mat('plaster',c));
    const roofs=[0x566265,0x787c78,0x656a68,0x9d725d,0x77736a].map(c=>mat('roof',c));
    const blueSiding=mat('wood',0x7b9090),weathered=mat('wood',0x958674);
    const shutterGreen=mat('wood',0x718478),roofGreen=mat('roof',0x688076);
    const awning=mat('plain',0xb9a37e),indigo=mat('plain',0x677d83);
    function shutters(g,x,y,z,width,height,m) {
      for(const side of [-1,1]){
        const cx=x+side*(width*.50+.195);
        block(g,cx,y,z,.33,height,.077,m,.025);
        for(let i=-2;i<=2;i++)block(g,cx,y+i*height*.156,z+.048,.285,.026,.045,timber);
      }
    }
    function roofLean(g,x,y,z,w,depth,m){
      const panel=block(g,x,y,z,w,.14,depth,m,.028);
      panel.rotation.x=.18;
      block(g,x,y-.085*depth,z+depth*.47,w,.11,.10,umber);
      for (let j=0;j<=Math.floor(w/.67);j++){
        const px=x-w*.46+j*(w*.92/Math.max(1,Math.floor(w/.67)));
        const seam=block(g,px,y+.087,z,.031,.031,depth,m);
        seam.rotation.x=.18;
      }
    }
    function house(x,y,z,w,d,h,heading,keeper=false,style=0) {
      const g=group(land,x,y,z,heading), front=d/2;
      g.userData.village = !keeper;
      const wall=keeper?plaster:style===1?weathered:style===3?blueSiding:pick(wallTones);
      const roof=keeper?mat('roof',0x985d4d):style===1?roofGreen:pick(roofs);
      block(g,0,-.47,0,w+.33,1.09,d+.33,concrete,.05);
      block(g,0,h/2,0,w,h,d,wall,.055);
      gableRoof(g,w,d,h,keeper?1.68:range(1.1,1.9),roof);
      const timberHeight=keeper?.59:h*.31;
      block(g,0,timberHeight/2,front+.012,w-.025,timberHeight,.058,timber);
      for(let k=0;k<=8;k++)block(g,-w/2+w*k/8,timberHeight/2,front+.054,.035,timberHeight,.029,trim);
      for(const side of [-1,1])block(g,side*(w/2-.045),h/2,front+.005,.115,h,.14,trim,.019);
      const doorX=keeper?.23*w:-.22*w, windowX=keeper?-.195*w:.208*w;
      block(g,doorX,1.07,front+.069,.99,2.14,.11,trim,.026);
      block(g,doorX,1.04,front+.132,.80,1.98,.045,keeper?mat('wood',0x6d807b):timber,.014);
      block(g,doorX,1.49,front+.162,.51,.59,.025,keeper?cozy:oldGlass);
      block(g,doorX+.26,1.04,front+.197,.064,.06,.057,gold,.014);
      block(g,doorX,.035,front+.305,1.34,.18,.56,concrete,.035);
      windowFrame(g,windowX,h*.56,front+.033,Math.min(2.05,w*.31),.98,keeper);
      const sideFrame=group(g,w/2+.014,0,0,Math.PI/2);
      windowFrame(sideFrame,0,h*.54,0,1.45,.94,keeper);
      if(h>4.2){
        windowFrame(g,-w*.2,h-.86,front+.04,1.43,.78);
        windowFrame(g,w*.19,h-.86,front+.04,1.43,.78);
        block(g,0,h-1.77,front+.16,w,.11,.32,trim,.022);
      }
      if(keeper){
        shutters(g,windowX,h*.56,front+.15,Math.min(2.05,w*.31),1.04,shutterGreen);
        const wash=mat('wood',0xc1b69b);
        for(let j=0;j<5;j++) block(g,-w*.37,1.12+j*.27,-.98,1.53,.039,1.27,wash);
        // A low attached scullery makes the keeper's dwelling asymmetric in silhouette.
        const gx=-w*.54-.63;
        block(g,gx,1.03,-.14,2.52,2.13,2.85,plaster,.055);
        roofLean(g,gx,2.23,-.14,2.85,3.14,roofGreen);
        windowFrame(g,gx,1.26,1.305,1.25,.70,true);
        for(let i=0;i<6;i++)block(g,gx-.95+i*.37,.42,1.315,.036,.81,.033,timber);
        // Clay ridge caps and the discreet drip edge catch the low morning sun.
        for(let i=-7;i<=7;i++){
          const batten=block(g,i*.45,h+.83,front*.54,.049,.034,Math.hypot(front+.42,1.68),roof,.01);
          batten.rotation.x=Math.atan2(1.68,front+.45);batten.position.y+=.10;
        }
        block(g,-w*.28,h+.73,-d*.2,.71,2.64,.71,mat('stone',0xa47d66),.04);
        block(g,-w*.28,h+2.03,-d*.2,.88,.17,.88,putty,.03);
        const shaded=block(g,doorX,2.33,front+.41,2.07,.13,1.03,roof,.046);shaded.rotation.x=.12;
        for(const side of [-1,1])rod(g,[doorX+side*.76,1.93,front+.06],[doorX+side*.76,2.25,front+.66],.045,timber);
        const chimney=cylinder(g,w*.14,h+1.31,-d*.23,.085,.09,1.1,copper,10);
        cylinder(g,chimney.position.x,h+1.87,chimney.position.z,.127,.127,.07,iron,12);
      }else if(rng()>.4){
        const e=block(g,windowX,h*.56+.69,front+.33,Math.min(2.53,w*.40),.10,.85,roof,.026);
        e.rotation.x=.16;
      }
      if(!keeper){
        if(style===0 || style===3){
          const wide=w*(style===0?.83:.56),sx=style===0?0:.12*w;
          roofLean(g,sx,2.36,front+.69,wide+.34,1.65,style===0?roofGreen:roofs[3]);
          for(const side of [-1,1])block(g,sx+side*(wide/2-.045),1.09,front+1.32,.106,2.23,.106,umber,.022);
          block(g,sx,.10,front+.66,wide+.22,.20,1.56,timber,.027);
          if(style===3)for(let n=0;n<4;n++){
            const xx=sx-wide*.30+n*wide*.20;
            block(g,xx,1.81,front+1.39,wide*.187,.54+.04*(n%2),.033,n===3?awning:indigo);
          }
          if(style===0){
            block(g,-wide*.25,.65,front+1.32,wide*.44,.083,.088,trim,.016);
            for(let n=0;n<6;n++)block(g,-wide*.46+n*wide*.077,.41,front+1.32,.06,.48,.065,trim);
          }
        } else if(style===1){
          // A low timber repair shed, with boarded sliding door and louvred vent.
          const ex=.42*w+.64;
          block(g,ex,1.00,front-.42,2.12,2.03,2.08,weathered,.035);
          roofLean(g,ex,2.20,front-.4,2.47,2.37,roofs[3]);
          block(g,ex,1.00,front+.64,1.39,1.85,.068,umber,.013);
          for(let j=-3;j<=3;j++)block(g,ex+j*.18,1.0,front+.694,.031,1.75,.021,trim);
          for(let j=0;j<5;j++)block(g,-w*.27,2.18+j*.075,front+.123,1.10,.044,.056,shutterGreen);
        } else if(style===2){
          const small=group(g,.19*w,0,front-.05);
          const gw=Math.min(w*.49,2.7);
          block(small,0,1.13,.13,gw,2.29,2.18,wall,.036);
          const ridge=group(small,0,0,.13,Math.PI/2);
          gableRoof(ridge,2.18,gw,2.30,.93,roof);
          windowFrame(small,0,1.27,1.25,gw*.66,.82,false);
          shutters(small,0,1.29,1.35,gw*.66,.85,shutterGreen);
        } else {
          shutters(g,windowX,h*.56,front+.15,Math.min(2.05,w*.31),1.00,style===4?shutterGreen:weathered);
          if(style===5){
            const sx=-.24*w;
            block(g,sx,1.15,front+.23,w*.39,1.93,.33,timber,.032);
            windowFrame(g,sx,1.40,front+.42,w*.34,1.22);
            roofLean(g,sx,2.24,front+.23,w*.46,.85,roof);
          }else{
            for(let i=-1;i<=1;i++)block(g,w*.20+i*.42,.21,front+.44,.34,.39,.46,trim,.016);
          }
        }
      }
      if(!keeper && rng()>.57){
        const ax=range(-w*.31,w*.31);
        rod(g,[ax,h+1.15,0],[ax,h+2.82,0],.035,iron,.023);
        rod(g,[ax-.56,h+2.59,0],[ax+.56,h+2.59,0],.025,iron);
        for(let k=0;k<3;k++)rod(g,[ax-.42+.42*k,h+2.59,-.19],[ax-.42+.42*k,h+2.59,.19],.018,iron);
      }
      return g;
    }

    const lx=15,lz=-42,ly=capHeight(lx,lz)-.05;
    const tower=group(land,lx,ly,lz,-.24);
    cylinder(tower,0,-.36,0,2.70,2.94,.99,concrete,48);
    cylinder(tower,0,.13,0,2.48,2.59,.25,putty,48);
    cylinder(tower,0,.35,0,2.22,2.39,.23,plaster,48);
    // An offset retaining drum carries the outer edge of the level base down into bedrock.
    cylinder(tower,0,-1.38,0,2.52,2.76,2.07,mat('stone',0x948b79),36);
    for(let i=0;i<15;i++){
      const a=i*tau/15, x=lx+2.47*Math.cos(a), z=lz+2.47*Math.sin(a);
      const y=capHeight(x,z),o=add(land,pick(ledgeShapes),crag,x,y-.14,z);
      o.scale.set(range(.85,1.38),Math.max(.39,(ly-y)*.86),range(.61,.98));o.rotation.y=a;
    }
    const baseRadius=1.92, topRadius=1.30, shaftH=11.95;
    const bands=[[.43,3.95,plaster],[3.95,6.97,red],[6.97,9.9,plaster],[9.9,12.38,red]];
    const radiusAt = y => lerp(baseRadius,topRadius,(y-.43)/shaftH);
    for(const [lo,hi,m] of bands)cylinder(tower,0,(lo+hi)/2,0,radiusAt(hi),radiusAt(lo),hi-lo,m,64);
    cylinder(tower,0,12.41,0,1.61,1.31,.28,plaster,48);
    cylinder(tower,0,12.67,0,1.96,1.60,.25,plaster,48);
    cylinder(tower,0,12.87,0,2.08,1.95,.17,iron,48);
    cylinder(tower,0,12.99,0,2.09,2.08,.105,copper,48);
    for(let j=0;j<24;j++){
      const a=j*tau/24,x=1.94*Math.sin(a),z=1.94*Math.cos(a);
      cylinder(tower,x,13.43,z,.037,.050,.85,iron,7);
    }
    function ring(y,r,t,m) {
      const g=new T.TorusGeometry(r,t,6,64), o=add(tower,g,m,0,y,0);
      o.rotation.x=Math.PI/2;return o;
    }
    ring(13.88,1.94,.057,iron);ring(13.55,1.94,.027,iron);
    cylinder(tower,0,13.20,0,1.28,1.35,.34,iron,24);
    cylinder(tower,0,13.42,0,1.30,1.29,.11,gold,24);
    cylinder(tower,0,14.17,0,.59,.53,1.50,lanternGlass,24);
    for(let i=0;i<10;i++){
      const y=13.62+i*.12,r=.62+.16*Math.sin(i*Math.PI/9);
      cylinder(tower,0,y,0,r-.035,r,.10,i%3===0?gold:lanternGlass,34);
    }
    // The lantern cage stays see-through, so the rotating Fresnel array is visible.
    for(let i=0;i<10;i++){
      const a=i*tau/10, x=1.22*Math.sin(a), z=1.22*Math.cos(a);
      cylinder(tower,x,14.16,z,.049,.055,1.50,iron,8);
    }
    ring(14.15,1.22,.026,gold);
    cylinder(tower,0,14.97,0,1.42,1.32,.17,iron,32);
    cylinder(tower,0,15.12,0,1.54,1.45,.16,red,36);
    cylinder(tower,0,15.52,0,.70,1.52,.66,red,40);
    cylinder(tower,0,15.95,0,.26,.72,.23,red,36);
    cylinder(tower,0,16.18,0,.105,.24,.25,iron,20);
    cylinder(tower,0,16.48,0,.025,.074,.49,gold,12);
    for(const [yy,ang] of [[2.05,.12],[5.42,-.47],[8.48,.16],[11.1,-.44]]){
      const g=group(tower,0,yy,0,ang),r=radiusAt(yy);
      if(yy<3){
        block(g,0,-.14,r-.015,1.09,2.78,.20,putty,.075);
        block(g,0,-.19,r+.099,.82,2.41,.108,mat('wood',0x687c78),.054);
        block(g,0,.36,r+.159,.51,.67,.025,oldGlass,.025);
        for(let j=0;j<3;j++)block(g,0,-1.60-j*.135,r+.29+j*.24,1.49+j*.13,.16,.40,concrete,.035);
      }else windowFrame(g,0,0,r-.046,.60,.89,yy>11);
    }

    const keeperX=2.7,keeperZ=-44, ky=capHeight(keeperX,keeperZ)-.09;
    house(keeperX,ky,keeperZ,6.22,4.39,3.08,.48,true);
    function fence(x1,z1,x2,z2,count){
      let prev=null;
      for(let i=0;i<=count;i++){
        const x=lerp(x1,x2,i/count),z=lerp(z1,z2,i/count),y=capHeight(x,z);
        block(land,x,y+.47,z,.13,1.07,.13,putty,.025);
        if(prev)for(const h of [.36,.75])rod(land,[prev[0],prev[1]+h,prev[2]],[x,y+h,z],.044,putty,.044,5);
        prev=[x,y,z];
      }
    }
    fence(-4.9,-40.4,3.3,-40.0,6);fence(6.0,-40.25,10.6,-40.35,4);
    fence(18.6,-41.3,20.2,-47.3,4);

    // A belt of coastal houses follows the contour lines in three staggered rows.
    const houseSites=[];
    for(let row=0;row<3;row++){
      const spacing=row===0?8.8:9.3;
      for(let j=-7;j<=7;j++){
        const z=j*spacing+row*3.11+range(-1.1,1.1);
        if(row===0 && z>13 && z<32)continue;
        const x=shoreX(z)-[10.9,25,40][row]+range(-1.44,1.44);
        const w=range(4.2,6.5),d=range(3.7,5.7),h=range(2.75,4.0)+(row===1&&j%3===0?1.67:0);
        house(x,westHeight(x,z)-.18,z,w,d,h,range(.87,2.27),false,(j+9+row*3)%6);
        houseSites.push([x,z]);
      }
    }
    for(let i=0;i<125;i++){
      const z=range(-120,117), x=shoreX(z)-range(9,86);
      if(houseSites.some(p=>Math.abs(p[0]-x)<4.3&&Math.abs(p[1]-z)<4.3))continue;
      const y=westHeight(x,z)-.22;
      if(i%5===0 || x<-81)pine(x,y,z,range(3.2,8));
      else bush(x,y,z,range(1.2,3.8));
    }
    // Variegated connected tree crowns on the upper hillside. Individual branches
    // show through at the edge, where foliage thins towards the village.
    function grove(cx,cz,rx,rz,h,ground,treeTone=0x53693f) {
      const seed=range(0,12);
      const crown=geoFromGrid(6,47,(t,s)=>{
        const a=-s*tau,ruffle=1+.12*Math.sin(5*a+seed)+.10*Math.sin(9*a-seed);
        const x=cx+rx*t*ruffle*Math.cos(a),z=cz+rz*t*ruffle*Math.sin(a);
        const lumps=.16*Math.sin(x*1.21+seed)*Math.cos(z*.88)+.10*Math.cos(x*.46-z*.80);
        const thickness=Math.max(0,(.85+lumps)*Math.pow(1-Math.pow(t,3.1),.64));
        const top=ground(x,z)-.23+h*thickness;
        const shade=color(treeTone,0x869051,.18+.21*thickness+.59*lumps+.052*Math.sin(x*1.47));
        return [x,top,z,shade];
      });
      const canopy=add(land,crown,mat('plain',0xffffff,{vertexColors:true}),0,0,0);canopy.castShadow=false;
      for(let n=0;n<8;n++){
        const a=range(0,tau),r=range(.53,.94),px=cx+rx*r*Math.cos(a),pz=cz+rz*r*Math.sin(a);
        const py=ground(px,pz),w=range(.57,1.18)*h;
        leaves(land,px,py+w*.48,pz,w*.77,w*.62,w*.85,pick(foliage));
      }
    }
    for(let i=-5;i<=5;i++){
      const z=i*15+range(-3,3),x=shoreX(z)-range(47,67);
      grove(x,z,range(9,16),range(10,17),range(4.3,7.6),westHeight);
      if(i%2===0)grove(x-21,z+7,17,18,range(6.1,9.8),westHeight,0x496546);
    }
    for(const [cx,cz,rx,rz] of [[-11,-47,6.5,2.6],[-22,-43,4.1,1.7],[-5,-51,5.8,2.6],[22,-47,5.5,2.2]]){
      grove(cx,cz,rx,rz,range(1.36,2.19),capHeight);
    }
    for(const [x,z,h] of [[-4.1,-45.1,3.8],[-12,-49,5.3],[-14.3,-47.4,3.9],[-17.1,-48.5,4.83]]){
      pine(x,capHeight(x,z)-.18,z,h);
    }
    const wallStone=mat('stone',0x908c78);
    for(let i=-5;i<=5;i++){
      const z=i*9.9+.84, x=shoreX(z)-range(17,19),len=range(4.5,8.1);
      const y=westHeight(x,z);
      const wall=group(land,x,y-.27,z,.07*Math.sin(z*.12));
      for(let j=0;j<6;j++){
        const offset=(j/5-.5)*len,dy=westHeight(x,z+offset)-y;
        const brick=add(wall,pick(ledgeShapes),wallStone,0,dy+.08,offset);
        brick.scale.set(.60,range(.48,.73),len/8);
      }
      for(let j=0;j<3;j++)bush(x-1.0,y-.15,z+(j-1)*1.57,range(.84,1.34));
    }
    const road=geoFromGrid(100,1,(s,t)=>{
      const z=lerp(-82,82,s),x=shoreX(z)-6.7+(t-.5)*2.36;
      return [x,westHeight(x,z)+.052,z,new T.Color(1,1,1)];
    });
    add(land,road,mat('sand',0xafa590),0,0,0);
    // Sagging paired wires, ceramic insulators and timber crossarms.
    const cable=mat('metal',0x59594f), ceramic=mat('plain',0xb6b6a2);
    let past=null;
    for(let i=-4;i<=4;i++){
      const z=i*15+2.0,x=shoreX(z)-7.8,y=westHeight(x,z);
      const hh=range(6.25,7.15),g=group(land,x,y,z);
      cylinder(g,0,hh/2,0,.103,.164,hh,timber,12);
      block(g,0,hh-.53,0,1.69,.125,.13,umber,.025);
      const next=[];
      for(const side of [-1,1]){
        const dx=.69*side;
        cylinder(g,dx,hh-.40,0,.089,.097,.17,ceramic,9);
        cylinder(g,dx,hh-.31,0,.064,.086,.053,ceramic,9);
        next.push([x+dx,y+hh-.30,z]);
      }
      if(past)for(let k=0;k<2;k++) {
        let a=past[k],b=next[k],last=a;
        for(let j=1;j<=9;j++){
          const t=j/9,pt=[lerp(a[0],b[0],t),lerp(a[1],b[1],t)-.77*4*t*(1-t),lerp(a[2],b[2],t)];
          rod(land,last,pt,.020,cable,.020,4);last=pt;
        }
      }
      past=next;
    }
    const vz=1.18,vx=shoreX(vz)-7.9,vend=group(land,vx,westHeight(vx,vz),vz,1.37);
    const enamel=mat('metal',0xaf493f);
    block(vend,0,1.01,0,1.12,2.02,.74,enamel,.074);
    block(vend,0,1.44,.377,.91,.80,.055,mat('plain',0xb2c9be),.025);
    for(let row=0;row<2;row++)for(let j=0;j<5;j++)
      cylinder(vend,-.34+j*.17,1.28+row*.31,.43,.046,.048,.18,[cozy,plaster,red,ceramic][(j+row)%4],8);
    block(vend,.38,.82,.387,.16,.29,.038,iron,.015);
    block(vend,0,.35,.397,.65,.185,.041,umber,.02);

    // Layered distant landforms leave the sunrise open over the eastern water.
    const hills=[
      [-127, -172,134,56,29,0x8da39d],[-9,-220,115,41,21,0x94aaa2],
      [95,-240,72,38,13,0xa8b7ac],[189,-117,32,20,5.0,0xa3afa6],
      [172,89,38,18,7.7,0x9aaea7],[115,185,83,44,20,0x95a7a0],
      [-4,210,101,51,33,0x88a098],[-138,150,96,65,45,0x80988b],
      [-178,23,82,80,54,0x718b75],[-136,-94,58,44,36,0x78937e],
      [-43,129,50,31,18,0x849780],[-47,-128,68,32,18,0x82978b],
      [65,-112,19,9,5.2,0x859a91],[95,-68,11,5.0,2.55,0x8a9c93],
      [111,48,13,7.6,3.0,0x8d9e93]
    ];
    hills.forEach(([cx,cz,rx,rz,hh,tone],i)=>{
      const hillslope=(x,z)=>{
        const u=(x-cx)/rx,v=(z-cz)/rz;
        const spine=.18*Math.sin(u*4.3+i*.71)+.12*Math.sin(u*8.5-i*.61);
        const width=.79+.13*Math.sin(u*6+i),tail=Math.max(0,1-Math.abs(u)**2.5);
        const q=(v-spine)/width;
        const crest=.65+.22*Math.sin(u*5.5+i)+.14*Math.sin(u*11.8-.8*i);
        const flutes=.08*Math.sin(v*11+u*16+i)*Math.sin(v*3.1);
        return -2.1+hh*tail**.73*Math.max(0,1-q*q)**1.47*Math.max(.2,crest+flutes);
      };
      const hill=geoFromGrid(17,42,(t,s)=>{
        const x=cx+rx*lerp(-1.07,1.07,s),z=cz+rz*lerp(-1.19,1.19,t),y=hillslope(x,z);
        const c=color(tone,0x6b8167,.39+.14*Math.cos(x*.23+z*.17)+.13*Math.sin(z*.26-x*.09));
        return [x,y,z,c];
      });
      const o=add(land,hill,groundCover,0,0,0);o.castShadow=false;
      // Sparse crowns mark the ridge line of the closer headlands.
      if(Math.hypot(cx,cz)<170){
        for(let k=0;k<3;k++){
          const x=cx+rx*range(-.72,.72),z=cz+rz*range(-.38,.41);
          if(hillslope(x,z)<.6)continue;
          grove(x,z,rx*range(.09,.18),rz*range(.16,.29),Math.min(5.2,1.0+hh*.13),hillslope,0x607858);
        }
      }
    });

    // Keep village geometry out of the eastern sea view. The spatial groups
    // also give each island its own useful frustum bounds after material merging.
    const sectors = new Map();
    for (const node of [...land.children]) {
      const { x, z } = node.position;
      let key = 'cape';
      if (x < -24) key = 'west' + Math.floor((z + 18) / 40);
      if (x === 0 && z === 0 && node.isMesh) {
        node.geometry.computeBoundingSphere();
        const bounds = node.geometry.boundingSphere;
        if (Math.hypot(bounds.center.x, bounds.center.z) > 70)
          key = 'islands' + Math.round(Math.atan2(bounds.center.x,bounds.center.z) * 2);
      }
      if (!sectors.has(key)) sectors.set(key,new T.Group());
      sectors.get(key).add(node);
    }
    for (const [key, sector] of sectors) {
      sector.name = key;
      land.add(batch(sector));
    }
    scene.add(land);

    const lightHead=group(scene,lx,ly+14.19,lz);
    function beam(side,reach){
      const g=new T.ConeGeometry(2.08,reach,28,1,true);
      g.translate(0,-reach/2,0);g.rotateZ(side*Math.PI/2);
      const m=new T.ShaderMaterial({
        uniforms:{ tint:{value:new T.Color(0xffdb94)} },
        vertexShader:'varying float along; varying vec3 n,v; void main(){ along=uv.y; vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',
        fragmentShader:'uniform vec3 tint; varying float along; varying vec3 n,v; void main(){float edge=pow(abs(dot(normalize(n),normalize(v))),0.65); float a=.081*pow(along,1.8)*edge;gl_FragColor=vec4(tint,a);}',
        side:T.DoubleSide,transparent:true,depthWrite:false,blending:T.AdditiveBlending
      });
      const o=new T.Mesh(g,m);lightHead.add(o);
    }
    beam(1,32);beam(-1,24);
    updates.push((t)=>{lightHead.rotation.y=t*.34;});
  };
})(window.Harbor = window.Harbor || {});
