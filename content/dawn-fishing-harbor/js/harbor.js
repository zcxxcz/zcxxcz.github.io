/* Wooden working pier, tide-worn fishing boats and the south harbour. */
(function () {
  "use strict";

  window.Harbor = window.Harbor || {};
  window.Harbor.buildHarbor = function (ctx) {
    const T = THREE;
    const TAU = Math.PI * 2;
    const staticWorld = new T.Group();
    let seed = 0x9aa627e1;
    function random() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    const between = (a, b) => a + (b - a) * random();
    const pick = (array) => array[Math.floor(random() * array.length)];
    const v = (x, y, z) => new T.Vector3(x, y, z);
    const make = (kind, color, options) => ctx.mat(kind, color, options);
    const boards = ["#a48a6b", "#9e876e", "#b29a7c", "#ac9476", "#a08d79", "#b6a289"].map(c => make("wood", c));
    const pileWood = make("wood", "#8b7560");
    const tideWood = make("wood", "#5b6259");
    const oldWood = make("wood", "#987d60");
    const timber = make("wood", "#b89a72");
    const iron = make("metal", "#425359");
    const zinc = make("metal", "#a5a69c");
    const rust = make("metal", "#94755d");
    const tar = make("plain", "#47493f");
    const hemp = make("plain", "#a68b62");
    const ropeLight = make("plain", "#c6b18d");
    const tire = make("plain", "#394443");
    const white = make("metal", "#e4ddc6");
    const orange = make("metal", "#d57c45");
    const signalRed = make("metal", "#ab4d3e");
    const coolGreen = make("metal", "#668e7e");
    const glass = make("plain", "#4a6b70", { roughness: 0.29 });
    const paleGlass = make("plain", "#709296", { roughness: 0.3 });
    const foam = make("plain", "#abc1b3");
    const stone = make("stone", "#aaa590");
    const stoneDark = make("stone", "#797e73");
    const geoCache = new Map();
    const up = v(0, 1, 0);
    function cached(key, build) {
      if (!geoCache.has(key)) geoCache.set(key, build());
      return geoCache.get(key);
    }
    function mesh(parent, geometry, material, x, y, z, cast) {
      const shape = new T.Mesh(geometry, material);
      shape.position.set(x || 0, y || 0, z || 0);
      shape.castShadow = cast !== false;
      shape.receiveShadow = true;
      parent.add(shape);
      return shape;
    }

    // Eight clipped corners soften long planks and catch grazing morning light.
    function bevelBox(w, h, d, radius) {
      return cached(["box", w, h, d, radius].join(","), function () {
        const b = Math.min(radius, w * 0.2, h * 0.22, d * 0.2);
        const positions = [], uv = [];
        const rings = [[-h/2, b], [-h/2+b, 0], [h/2-b, 0], [h/2,b]].map(([y,inset]) => {
          const x = w/2-inset, z = d/2-inset, k = Math.max(b - inset * 0.58, 0.0001);
          return [[-x+k,y,z], [x-k,y,z], [x,y,z-k], [x,y,-z+k],
                  [x-k,y,-z], [-x+k,y,-z], [-x,y,-z+k], [-x,y,z-k]];
        });
        function face(a,bv,c, projection) {
          positions.push(...a,...bv,...c);
          for (const p of [a,bv,c]) {
            if (projection === 0) {
              uv.push(w >= d ? p[0]/w+.5 : p[2]/d+.5, w >= d ? p[2]/d+.5 : p[0]/w+.5);
            } else {
              const horizontal = projection === 1 ? p[0]/w+.5 : p[2]/d+.5;
              uv.push(horizontal, p[1]/h+.5);
            }
          }
        }
        for (let i = 0; i < 8; i++) {
          const j = (i+1) % 8;
          face([0,h/2,0], rings[3][i], rings[3][j], 0);
          face([0,-h/2,0], rings[0][j], rings[0][i], 0);
          for (let r=0; r<3; r++) {
            const low=rings[r], high=rings[r+1];
            const projection = Math.abs(low[i][0]-low[j][0]) > Math.abs(low[i][2]-low[j][2]) ? 1 : 2;
            face(low[i], low[j], high[i], projection);
            face(low[j], high[j], high[i], projection);
          }
        }
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.Float32BufferAttribute(positions,3));
        g.setAttribute("uv", new T.Float32BufferAttribute(uv,2));
        g.computeVertexNormals();
        return g;
      });
    }
    function box(parent, x, y, z, w, h, d, material, bevel) {
      return mesh(parent, bevelBox(w,h,d,bevel === undefined ? 0.022 : bevel), material, x,y,z);
    }
    function cylinder(parent, x,y,z, rt,rb,h, material, sides, woodUV) {
      const geometry = cached(["c",rt,rb,h,sides||12,woodUV].join(","), () => {
        const g = new T.CylinderGeometry(rt,rb,h,sides||12);
        if (woodUV) {
          const uv=g.attributes.uv;
          for (let i=0;i<uv.count;i++) uv.setXY(i,uv.getY(i),uv.getX(i));
        }
        return g;
      });
      return mesh(parent,geometry,material,x,y,z);
    }
    function beam(parent, a,b, radius, material, sides) {
      const p=v(...a), q=v(...b), axis=q.clone().sub(p);
      const geo = cached("rod"+(sides||7), () => new T.CylinderGeometry(1,1,1,sides||7));
      const shape=mesh(parent,geo,material,0,0,0,radius>.045);
      shape.scale.set(radius,axis.length(),radius);
      shape.position.copy(p).lerp(q,.5);
      shape.quaternion.setFromUnitVectors(up,axis.normalize());
      return shape;
    }
    function pipe(parent, points, radius, material, rings, sides) {
      const curve = new T.CatmullRomCurve3(points.map(p=>v(...p)), false, "centripetal");
      return mesh(parent,new T.TubeGeometry(curve,rings || Math.max(8,points.length*3),radius,sides||5,false),material,0,0,0,radius>.055);
    }
    function torus(parent,x,y,z,r,tube,material,rotationX,rotationY) {
      const g=cached(["t",r,tube].join(","),()=>new T.TorusGeometry(r,tube,8,24));
      const m=mesh(parent,g,material,x,y,z,tube>.04);
      m.rotation.set(rotationX||0,rotationY||0,0);
      return m;
    }
    function sphere(parent,x,y,z,rx,ry,rz,material) {
      const g=cached("ball",()=>new T.SphereGeometry(1,12,8));
      const m=mesh(parent,g,material,x,y,z,ry>.08);
      m.scale.set(rx,ry,rz);
      return m;
    }
    function sag(parent,a,b,sagAmount,radius,material) {
      const mid=a.map((n,i)=>(n+b[i])/2);
      mid[1]-=sagAmount;
      return pipe(parent,[a,mid,b],radius,material,14,5);
    }
    // Each saw cut samples a different strip of a painted plank atlas. Long irregular
    // checks follow the fibres past knots, and broad salt stains bleach the upper face.
    function pierWoodAtlas() {
      const canvas=document.createElement("canvas");
      canvas.width=1024; canvas.height=1024;
      const c=canvas.getContext("2d"), rowHeight=128;
      const shades=["#a49680","#aaa18d","#978d7c","#a09481","#ad9e86","#a59e8b","#918777","#a79a86"];
      for(let row=0;row<8;row++) {
        c.save(); c.translate(0,row*rowHeight);
        c.fillStyle=shades[row]; c.fillRect(0,0,1024,rowHeight);
        c.beginPath();c.rect(0,0,1024,rowHeight);c.clip();
        for(let i=0;i<54;i++) {
          const x=between(0,1024),y=between(0,rowHeight);
          c.save();c.translate(x,y);c.scale(between(3,9),1);
          const radius=between(5,37), haze=c.createRadialGradient(0,0,1,0,0,radius);
          const dark=random()<.44;
          haze.addColorStop(0,dark?"rgba(84,72,51,.21)":"rgba(223,216,197,.36)");
          haze.addColorStop(1,dark?"rgba(84,72,51,0)":"rgba(223,216,197,0)");
          c.fillStyle=haze;c.fillRect(-radius,-radius,radius*2,radius*2);c.restore();
        }
        const knotX=between(170,880),knotY=between(16,104),bow=between(4,13);
        for(let i=0;i<225;i++) {
          const start=between(-180,1040),span=between(6,490),y=between(-1,rowHeight+1);
          c.beginPath();
          const phase=between(0,TAU);
          for(let j=0;j<=11;j++) {
            const x=start+span*j/11;
            const warp=Math.sign(y-knotY)*bow*Math.exp(-Math.pow((x-knotX)/62,2)-Math.pow((y-knotY)/31,2));
            const yy=y+warp+1.05*Math.sin(x*.012+phase)+.54*Math.sin(x*.035+phase);
            if(j===0)c.moveTo(x,yy);else c.lineTo(x,yy);
          }
          c.lineWidth=between(.38,1.65);c.strokeStyle=random()<.53?"rgba(80,69,54,.24)":"rgba(235,223,198,.29)";c.stroke();
        }
        if(row%3!==1) {
          c.save();c.translate(knotX,knotY);c.rotate(between(-.12,.12));
          for(let r=0;r<4;r++) {
            c.beginPath();c.ellipse(0,0,5+r*3.6,1.6+r*1.32,0,0,TAU);
            c.strokeStyle='rgba(78,67,48,.27)';c.stroke();
          }
          c.restore();
        }
        for(let j=0;j<6;j++) {
          const side=j%2, x=side?1024:0,y=between(6,122),len=between(10,122)*(side?-1:1);
          c.beginPath();c.moveTo(x,y);c.lineTo(x+.43*len,y+between(-2,2));c.lineTo(x+len,y-.5);
          c.strokeStyle="rgba(69,59,48,.41)";c.lineWidth=between(.8,1.8);c.stroke();
        }
        c.restore();
      }
      const map=new T.CanvasTexture(canvas);
      map.colorSpace=T.SRGBColorSpace;
      map.anisotropy=ctx.renderer ? Math.min(8,ctx.renderer.capabilities.getMaxAnisotropy()) : 2;
      return map;
    }
    const plankAtlas=pierWoodAtlas();
    const pierWood=new T.MeshStandardMaterial({map:plankAtlas,bumpMap:plankAtlas,bumpScale:.006,roughness:.94});
    const pileSurface=new T.MeshStandardMaterial({map:plankAtlas,color:"#b6ada0",bumpMap:plankAtlas,bumpScale:.009,roughness:.96});
    function saltWood(geometry,row,flip) {
      const g=geometry.clone(),uv=g.attributes.uv;
      for(let i=0;i<uv.count;i++) {
        const u=uv.getX(i), v=uv.getY(i);
        uv.setXY(i, flip?1-u:u,(row+.018+v*.964)/8);
      }
      return g;
    }
    const ropeFiber=(function() {
      const canvas=document.createElement("canvas");canvas.width=128;canvas.height=64;
      const c=canvas.getContext("2d"),pic=c.createImageData(128,64);
      for(let y=0;y<64;y++)for(let x=0;x<128;x++){
        const phase=TAU*(3*y/64+x/128), strand=Math.pow(.5+.5*Math.cos(phase),.48);
        const fuzz=between(-5,5)+3*Math.sin(6*phase+Math.sin(x*.11));
        const idx=(y*128+x)*4;
        pic.data[idx]=105+strand*63+fuzz;pic.data[idx+1]=91+strand*58+fuzz;pic.data[idx+2]=68+strand*51+fuzz;pic.data[idx+3]=255;
      }
      c.putImageData(pic,0,0);
      const map=new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;map.colorSpace=T.SRGBColorSpace;
      return new T.MeshStandardMaterial({map,bumpMap:map,bumpScale:.009,roughness:.99});
    })();
    function laidRope(parent,p,radius,segments) {
      const curve=new T.CatmullRomCurve3(p.map(pt=>v(...pt)),false,"centripetal");
      const geometry=new T.TubeGeometry(curve,segments,radius,8,false);
      const uv=geometry.attributes.uv,turns=curve.getLength()/(radius*3.8);
      for(let i=0;i<uv.count;i++) uv.setX(i,uv.getX(i)*turns);
      return mesh(parent,geometry,ropeFiber);
    }
    const contact=(function(){
      const canvas=document.createElement("canvas");canvas.width=canvas.height=64;
      const c=canvas.getContext("2d"),g=c.createRadialGradient(32,32,4,32,32,32);
      g.addColorStop(0,"rgba(60,52,43,.24)");g.addColorStop(.68,"rgba(60,52,43,.17)");g.addColorStop(1,"rgba(60,52,43,0)");
      c.fillStyle=g;c.fillRect(0,0,64,64);
      const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
      return new T.MeshBasicMaterial({map,transparent:true,depthWrite:false});
    })();
    function stain(parent,x,y,z,width,depth) {
      const o=mesh(parent,new T.PlaneGeometry(width,depth),contact,x,y,z,false);
      o.rotation.x=-Math.PI/2;
    }
    function coil(parent,x,y,z,rx,rz,toX,toZ) {
      const p=[];
      for(let i=0;i<=133;i++) {
        const u=i/133,a=TAU*(3.80*u-.05);
        const r=.35+.69*u+.03*Math.sin(a*1.6)+.027*Math.cos(a*2);
        p.push([x+Math.cos(a)*rx*r+.036*Math.sin(u*7),y+.026+.003*Math.cos(a),z+Math.sin(a)*rz*r+.033*Math.sin(u*7+.3)]);
      }
      const last=p[p.length-1];
      p.push([(last[0]+toX)*.5,y+.026,(last[2]+toZ)*.5],[toX-.11,y+.06,toZ+.084]);
      for(let i=0;i<=20;i++) {
        const a=2.60+TAU*i/20*1.2;
        p.push([toX+.09*Math.cos(a),y+.08+.049*i/20,toZ+.081*Math.sin(a)]);
      }
      laidRope(parent,p,.024,194);
      stain(parent,x,y+.009,z,rx*2.42,rz*2.52);
    }
    function endCapMaterial() {
      const canvas=document.createElement("canvas");
      canvas.width=canvas.height=128;
      const paint=canvas.getContext("2d");
      paint.fillStyle="#ac977b"; paint.fillRect(0,0,128,128);
      for(let radius=6;radius<95;radius+=between(2,5)) {
        paint.beginPath();
        for(let n=0;n<=64;n++) {
          const a=n/64*TAU;
          const r=radius*(1+.028*Math.sin(a*3+radius*.07))+.8*Math.sin(4*a);
          const x=58+Math.cos(a)*r,y=68+Math.sin(a)*r*.88;
          if(n===0) paint.moveTo(x,y); else paint.lineTo(x,y);
        }
        paint.strokeStyle="rgba(79,66,51,.31)"; paint.lineWidth=between(.6,1.4); paint.stroke();
      }
      for(let n=0;n<6;n++) {
        const a=between(0,TAU); paint.beginPath(); paint.moveTo(64+Math.cos(a)*80,64+Math.sin(a)*80);
        paint.lineTo(64+Math.cos(a+.03)*42,64+Math.sin(a+.03)*42);
        paint.lineTo(64+Math.cos(a-.02)*between(20,35),64+Math.sin(a-.02)*between(20,35));
        paint.strokeStyle="rgba(53,45,36,.53)";paint.lineWidth=1.2;paint.stroke();
      }
      const texture=new T.CanvasTexture(canvas); texture.colorSpace=T.SRGBColorSpace;
      return new T.MeshStandardMaterial({map:texture,roughness:.96});
    }
    const endCap=endCapMaterial();
    function pile(parent,x,z,top,r,withCollar) {
      const sides=21, radial=[],rim=[];
      for(let i=0;i<sides;i++) {radial.push(r*between(.945,1.028));rim.push(top+between(-.012,.010));}
      const row=Math.floor(random()*8), pos=[],uv=[],indices=[];
      const levels=[[-.6,1],[.58,.99],[1.74,.97],[top-.024,.934],[top,.907]];
      levels.forEach(function([yy,width],j) {
        for(let i=0;i<=sides;i++) {
          const angle=i*TAU/sides, index=i%sides, rr=radial[index]*width;
          const y=j===4?rim[index]:yy;
          pos.push(rr*Math.cos(angle),y,rr*Math.sin(angle)); uv.push((y+.62)/(top+.64),(row+.025+.94*i/sides)/8);
          if(j>0 && i<sides) {
            const a=(j-1)*(sides+1)+i,b=a+sides+1;
            indices.push(a,b,a+1,a+1,b,b+1);
          }
        }
      });
      const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(pos,3));g.setAttribute("uv",new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
      mesh(parent,g,pileSurface,x,0,z);
      cylinder(parent,x,.025,z,r*.99,r*1.025,.77,tideWood,16,true);
      const cp=[0,top-.003,0], cu=[.5,.5],ci=[];
      for(let i=0;i<sides;i++) {
        const a=i*TAU/sides,rr=radial[i]*.907;cp.push(rr*Math.cos(a),rim[i],rr*Math.sin(a));cu.push(.5+.48*Math.cos(a),.5+.48*Math.sin(a));ci.push(0,(i+1)%sides+1,i+1);
      }
      const cap=new T.BufferGeometry();cap.setAttribute("position",new T.Float32BufferAttribute(cp,3));cap.setAttribute("uv",new T.Float32BufferAttribute(cu,2));cap.setIndex(ci);cap.computeVertexNormals();
      mesh(parent,cap,endCap,x,0,z,false);
      if(withCollar) {
        const strap=cylinder(parent,x,top-.18,z,r*.979,r*.99,.060,rust,20);
        strap.rotation.z=between(-.018,.018);
        for (let n=0;n<3;n++) {
          const angle=n*TAU/3+.37,rr=r*.99;
          const bx=x+Math.cos(angle)*rr,bz=z+Math.sin(angle)*rr;
          const bolt=cylinder(parent,bx,top-.18,bz,.024,.030,.023,iron,6);
          bolt.quaternion.setFromUnitVectors(up,v(Math.cos(angle),0,Math.sin(angle)));
          const a2=angle+.05;
          const streak=make("plain","#817566");
          beam(parent,[x+Math.cos(angle)*rr,top-.213,z+Math.sin(angle)*rr],[x+Math.cos(a2)*r*.958,top-between(.29,.41),z+Math.sin(a2)*r*.958],.005,streak,4);
        }
        stain(parent,x,1.759,z,r*3.2,r*3.25);
      }
    }
    function cleat(parent,x,y,z) {
      box(parent,x,y+.025,z,.38,.05,.15,iron);
      cylinder(parent,x,y+.12,z,.072,.083,.18,iron,10);
      sphere(parent,x,y+.218,z,.23,.046,.064,iron);
      for(const dx of [-.145,.145]) cylinder(parent,x+dx,y+.053,z,.018,.018,.017,zinc,6);
    }
    function crate(parent,x,y,z,w,h,d,paint) {
      box(parent,x,y+.12*h,z,w*.92,.19*h,d*.92,pick(boards),.014);
      for(const a of [-1,1]) for(const b of [-1,1]) {
        box(parent,x+a*(w/2-.07),y+h*.52,z+b*(d/2-.07),.088,h*.96,.088,oldWood,.012);
      }
      for(let i=0;i<3;i++) {
        const yy=y+(i+.51)*h/3;
        for(const s of [-1,1]) {
          box(parent,x,y+(i+.51)*h/3,z+s*(d/2-.028),w,h*.25,.055,paint,.008);
          box(parent,x+s*(w/2-.025),yy,z,.05,h*.25,d-.06,paint,.008);
        }
      }
    }
    const plateY=1.75,pierStart=-20.77,pierEnd=6.54;
    [-1.61,-.65,.65,1.61].forEach(z=>box(staticWorld,(pierEnd+pierStart)/2,1.44,z,pierEnd-pierStart,.36,.18,oldWood,.032));
    const nailHead=make("plain","#878478",{roughness:.85});
    let plankIndex=0;
    for(let edge=pierStart;edge<pierEnd-.035;) {
      const width=Math.min(pierEnd-edge,between(.236,.325)), gap=between(.008,.014),x=edge+width*.5;
      const deckY=plateY+between(-.004,.003),toSplit=plankIndex%9===3||plankIndex%17===7;
      const splice=plankIndex%2?.65:-.65;
      const pieces=toSplit?[[-2.11,splice-.006],[splice+.006,2.11]]:[[-2.11,2.11]];
      for(const [a,b] of pieces) {
        const g=saltWood(bevelBox(width-gap,.17,b-a,.013),Math.floor(random()*8),random()<.5);
        const plank=mesh(staticWorld,g,pierWood,x,deckY-.085,(a+b)/2);
        plank.rotation.y=between(-.0015,.0015);
      }
      for(const z of toSplit?[-1.61,splice-.076,splice+.076,1.61]:[-1.61,1.61]) {
        for(const dx of [-.064,.063]) {
          const bolt=cylinder(staticWorld,x+dx+between(-.007,.007),deckY+.0006,z+between(-.021,.021),.0105,.0115,.0042,nailHead,7);
          bolt.castShadow=false;
        }
      }
      edge+=width;plankIndex++;
    }
    for(const x of [-19.45,-15.52,-11.68,-7.72,-3.8,.18,4.22,6.48]) {
      for(const s of [-1,1]) {
        const z=2.04*s;
        const tall=[-19.45,-11.68,-3.8,4.22,6.48].includes(x);
        pile(staticWorld,x,z,tall?between(2.39,2.60):1.79,between(.137,.175),tall);
      }
      box(staticWorld,x,1.19,0,.24,.24,4.46,pileWood,.022);
    }
    for(const s of [-1,1]) {
      box(staticWorld,-7.11,1.48,s*2.105,27.31,.28,.117,pileWood,.02);
      for(const x of [-13.1,-5.6,2.6]) {
        const r=.235;
        torus(staticWorld,x,1.02,s*2.238,r,.064,tire,0,0);
        sag(staticWorld,[x-.14,1.74,s*1.99],[x-.12,1.24,s*2.23],.042,.018,tar);
        sag(staticWorld,[x+.14,1.74,s*1.99],[x+.12,1.24,s*2.23],.042,.018,tar);
      }
    }
    for(const x of [-16,-8.95,1.8,5.73]) cleat(staticWorld,x,plateY,1.83);
    for(const x of [-12.94,-.85,5.65]) cleat(staticWorld,x,plateY,-1.87);
    // A worn mooring line turns around the nearest post and runs down to the cleat.
    const wrapped=[];
    for(let i=0;i<=45;i++) {
      const u=i/45, angle=u*2.8*TAU;
      wrapped.push([4.22+Math.cos(angle)*.168,2.02+u*.143,-2.04+Math.sin(angle)*.168]);
    }
    wrapped.push([4.45,1.90,-1.96],[4.79,1.79,-1.83],[5.15,1.79,-1.88],[5.52,1.90,-1.88]);
    laidRope(staticWorld,wrapped,.019,80);
    coil(staticWorld,5.14,plateY,-1.39,.48,.32,5.65,-1.87);
    coil(staticWorld,-9.38,plateY,1.48,.46,.27,-8.95,1.83);
    crate(staticWorld,-16.3,plateY,1.49,.9,.61,.73,timber);
    crate(staticWorld,-15.26,plateY,1.66,.62,.44,.58,oldWood);
    // Two bent ladder handrails at the end of the pier, and submerged rungs.
    for(const z of [.36,.91]) {
      pipe(staticWorld,[[6.16,1.78,z],[6.19,2.06,z],[6.37,2.16,z],[6.60,2.10,z],[6.70,1.92,z],[6.70,-.37,z]],.032,zinc,32,8);
    }
    for(let y=-.20;y<1.8;y+=.32) beam(staticWorld,[6.7,y,.36],[6.7,y,.91],.025,zinc,8);

    function bollard(parent,x,z,top) {
      box(parent,x,top+.032,z,.50,.064,.43,iron);
      cylinder(parent,x,top+.18,z,.13,.18,.29,iron);
      cylinder(parent,x,top+.34,z,.20,.16,.09,iron);
    }
    const quayStone=["#94998c","#a3a08e","#989b8f","#8d9386","#aaa494"].map(c=>make("stone",c));
    const dampStone=["#737e72","#7e877a","#82887a"].map(c=>make("stone",c));
    const mineral=make("stone","#a7ab97");
    function quay(x,z,w,d,top) {
      box(staticWorld,x,(top-.80)/2,z,w,top+.80,d,stoneDark,.067);
      box(staticWorld,x,top-.105,z,w+.13,.21,d+.13,stone,.039);
      // Different courses cover the caissons; the darker lowest blocks mark high water.
      for(const wall of [[x,z-d/2,w,1,0,0,-1],[x+w/2,z,d,0,1,1,0]]) {
        const [cx,cz,len,tx,tz,nx,nz]=wall;
        for(const [yy,h,course] of [[.16,.60,dampStone],[.82,.66,quayStone],[1.34,.36,quayStone]]) {
          let left=-len*.5;
          while(left<len*.5-.012) {
            const remaining=len*.5-left,L=Math.min(remaining,between(1.19,2.26));
            const u=left+L/2, relief=between(.006,.031);
            const bx=cx+tx*u+nx*relief,bz=cz+tz*u+nz*relief;
            const block=box(staticWorld,bx,yy+between(-.009,.008),bz,tx?Math.max(.02,L-.021):.073,h-.015,tz?Math.max(.02,L-.021):.073,pick(course),.021);
            block.rotation.z=between(-.003,.003);block.rotation.x=between(-.003,.003);
            if(yy>.5&&random()<.13) {
              const sx=bx+nx*.041,sz=bz+nz*.041;
              beam(staticWorld,[sx,yy+h*.5,sz],[sx+tx*.012,yy+h*.5-between(.11,.25),sz+tz*.012],.010,mineral,4);
            }
            left+=L;
          }
        }
        for(let u=-len*.5+1.3;u<len*.5-.24;u+=between(2.0,3.1)) {
          const px=cx+tx*u,pz=cz+tz*u;
          const joint=box(staticWorld,px+nx*.03,top-.001,pz+nz*.03,tx?.013:.14,.008,tz?.013:.14,stoneDark,.002);
          joint.castShadow=false;
        }
      }
    }
    quay(-21.38,0,5.41,14.1,1.75);
    quay(-21.83,13.35,5.3,13.0,1.73);
    quay(-14.69,14.18,9.7,2.26,1.66);
    quay(-6.7,26.85,35.2,10.2,1.75);
    quay(9.2,19.12,3.4,5.44,1.75);
    for (let i=0;i<17;i++) {
      const x=-23.43+i*1.99;
      if(i%3===1) {
        torus(staticWorld,x,.81,21.54,.30,.093,tire,0,0);
        beam(staticWorld,[x,1.69,21.63],[x,1.09,21.52],.022,tar);
      }
      if(i%4===1) bollard(staticWorld,x,22.04,1.75);
    }
    for(const [x,z] of [[-11.12,13.30],[-16.73,13.32],[8.28,16.89],[10.18,16.89],[-19.4,3],[-19.4,-4.4]]) bollard(staticWorld,x,z,1.75);

    // Layered plating follows the sheer line and the fuller stern of each boat.
    const stations=[[-.5,.69],[-.46,.85],[-.34,.96],[-.15,1],[.05,.99],[.22,.9],[.35,.69],[.45,.36],[.5,.015]];
    function buildHull(g,L,W,H,body,boot,band) {
      const levels=[[-.70,.12],[-.46,.65],[-.1,.87],[.09,.94],[.16,.96],[.63,1],[.70,1.005]];
      function station(i,level,side) {
        const [s,width]=stations[i], [y,flare]=levels[level];
        const sheer=.045+Math.pow(Math.max(0,s+.045)*1.97,2.1)*.52+Math.max(0,-s-.26)*.42;
        const lift=level<3?.38:.88;
        return [s*L,H*(y+sheer*lift),side*W*.5*width*flare];
      }
      // Rings in each strip share vertices, so the bow curves smoothly in the light.
      for(let lv=0;lv<levels.length-1;lv++) {
        const material=lv<2?boot:lv===3||lv===5?band:body;
        for(const s of [-1,1]) {
          const pos=[],uv=[],index=[];
          for(let i=0;i<stations.length;i++) {
            const u=stations[i][0]+.5;
            pos.push(...station(i,lv,s),...station(i,lv+1,s));
            uv.push(u,0,u,1);
            if(i>0) {
              const a=(i-1)*2,b=a+1,c=i*2,d=c+1;
              if(s>0) index.push(a,c,b,c,d,b); else index.push(a,b,c,c,b,d);
            }
          }
          const geo=new T.BufferGeometry();
          geo.setAttribute("position",new T.Float32BufferAttribute(pos,3));
          geo.setAttribute("uv",new T.Float32BufferAttribute(uv,2)); geo.setIndex(index); geo.computeVertexNormals();
          mesh(g,geo,material);
        }
        const p=[station(0,lv,-1),station(0,lv,1),station(0,lv+1,1),station(0,lv+1,-1)];
        quad(g,p,material);
      }
      const deck=make("wood","#bf9e78");
      for(let i=1;i<stations.length;i++) {
        const p=[station(i-1,6,1),station(i,6,1),station(i,6,-1),station(i-1,6,-1)];
        for(const pt of p) pt[1]-=.065;
        quad(g,p,deck);
      }
      for(const s of [-1,1]) {
        pipe(g,stations.map((_,i)=>station(i,6,s)),.04,band,36,7);
        pipe(g,stations.map((_,i)=>station(i,4,s)),.017,body,32,5);
      }
    }
    function quad(parent,p,material,repeat) {
      const geo=new T.BufferGeometry();
      geo.setAttribute("position",new T.Float32BufferAttribute(p.flat(),3));
      geo.setAttribute("uv",new T.Float32BufferAttribute([0,0,repeat||1,0,repeat||1,1,0,1],2));
      geo.setIndex([0,1,3,1,2,3]);geo.computeVertexNormals();
      return mesh(parent,geo,material);
    }
    function label(parent,text,x,y,z,width,height,ink,side) {
      const canvas=document.createElement("canvas"); canvas.width=512; canvas.height=100;
      const c=canvas.getContext("2d");
      c.fillStyle=ink; c.font='600 61px "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
      c.textAlign="center";c.textBaseline="middle";c.fillText(text,256,52,480);
      const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;
      const material=new T.MeshStandardMaterial({map:t,transparent:true,alphaTest:.16,depthWrite:false,roughness:.9});
      const m=mesh(parent,new T.PlaneGeometry(width,height),material,x,y,z,false);
      if(side===-1) m.rotation.y=Math.PI;
    }
    function ringBuoy(parent,x,y,z,r) {
      torus(parent,x,y,z,r,r*.235,orange);
      for(let i=0;i<4;i++) {
        const a=i*Math.PI/2+.55;
        const g=cached("ringband"+r,()=>new T.TorusGeometry(r,r*.249,7,4,.33));
        mesh(parent,g,white,x,y,z).rotation.z=a;
      }
    }
    function crateFish(parent,x,y,z,w,h,d,color) {
      box(parent,x,y+h/2,z,w,h,d,color);
      for(const s of [-1,1]) {
        box(parent,x+s*(w/2-.017),y+h*.97,z,.04,.065,d+.045,color,.01);
        box(parent,x,y+h*.97,z+s*(d/2-.011),w+.045,.065,.045,color,.01);
      }
      box(parent,x,y+h+.006,z,w*.82,.023,d*.73,make("plain","#798b82"),.008);
    }
    function boat(spec) {
      const g=new T.Group();
      const {L,W,H,kind}=spec, cap=make("metal",spec.cabin), body=make("metal",spec.body), trim=make("metal",spec.trim);
      const boot=make("metal",spec.boot);
      buildHull(g,L,W,H,body,boot,trim);
      const deckY=H*.74;
      const cx=kind===2?.12*L:.055*L, cw=W*(kind===2?.65:.72), cl=L*(kind===2?.30:.285), cabinBase=deckY-.025;
      const tall=kind===2?1.03:1.34, windowHeight=tall*.46, sill=cabinBase+tall*.46;
      const roofY=cabinBase+tall;
      box(g,cx,cabinBase+tall/2,0,cl,tall,cw,cap,.069);
      box(g,cx,sill-.045,0,cl+.055,.072,cw+.053,trim,.016);
      for(const side of [-1,1]) {
        for(let i=0;i<3;i++) {
          const ww=cl*.247, xx=cx+cl*(i-1)*.288;
          box(g,xx,sill+windowHeight*.49,side*(cw/2+.006),ww+.044,windowHeight+.047,.034,iron,.021);
          box(g,xx,sill+windowHeight*.49,side*(cw/2+.026),ww,windowHeight,.018,i===1?paleGlass:glass,.019);
        }
        const aft=cx-cl/2-.06, sideZ=side*(cw/2-.08);
        beam(g,[aft,cabinBase+.11,sideZ],[aft,roofY-.05,sideZ],.024,white,7);
        beam(g,[cx-cl*.41,roofY+.10,side*(cw*.37)],[cx+cl*.4,roofY+.10,side*(cw*.37)],.022,zinc);
        // Reliably visible vessel numbers are painted on the cabin apron.
        label(g,spec.name,cx,cabinBase+tall*.23,side*(cw/2+.014),cl*.76,tall*.27,"#34585c",side);
      }
      for(const s of [-1,1]) {
        const width=cw*.37;
        box(g,cx+cl/2+.005,sill+windowHeight*.49,s*cw*.213,.036,windowHeight+.056,width+.06,iron,.018);
        box(g,cx+cl/2+.028,sill+windowHeight*.49,s*cw*.213,.018,windowHeight,width,paleGlass,.016);
      }
      box(g,cx,roofY+.004,0,cl+.21,.105,cw+.23,trim,.035);
      box(g,cx,roofY+.073,0,cl+.17,.063,cw+.19,cap,.022);
      const mast=cx-cl*.43, mastTop=roofY+(kind===1?2.85:2.22);
      beam(g,[mast,roofY,0],[mast,mastTop,0],.049,white,10);
      beam(g,[mast,mastTop-.65,-cw*.36],[mast,mastTop-.65,cw*.36],.035,white);
      const flagX=mast, flagY=mastTop-.09, flagZ=.015;
      const flagMat=make("plain",spec.flag,{side:T.DoubleSide});
      quad(g,[[flagX,flagY-.32,flagZ],[flagX-.30,flagY-.285,flagZ+.07],[flagX-.31,flagY+.025,flagZ+.07],[flagX,flagY,flagZ]],flagMat);
      quad(g,[[flagX-.30,flagY-.285,flagZ+.07],[flagX-.61,flagY-.31,flagZ+.015],[flagX-.62,flagY+.032,flagZ+.015],[flagX-.31,flagY+.025,flagZ+.07]],flagMat);
      const aerialX=cx+cl*.23;
      beam(g,[aerialX,roofY,0],[aerialX+.12,roofY+1.53,0],.012,iron,5);
      const lamp=make("plain","#efc990",{emissive:0xd89144,emissiveIntensity:.35});
      cylinder(g,mast,mastTop+.036,0,.067,.068,.125,lamp,10);
      for(const side of [-1,1]) {
        const z=side*W*.41;
        sag(g,[mast,mastTop-.27,0],[-L*.37,deckY+.26,z],.07,.012,tar);
        sag(g,[mast,mastTop-.4,0],[L*.34,deckY+.55,side*W*.25],.04,.011,tar);
        // Curved bow railing rises with the hull.
        const railPts=[[.215,.86],[.33,.68],[.422,.44],[.482,.16]].map(([u,w])=>[L*u,deckY+.36+u*u*1.4,side*W*.5*w]);
        for(const pt of railPts) beam(g,[pt[0],pt[1]-.36,pt[2]],pt,.019,zinc);
        pipe(g,railPts,.021,white,16,6);
        for(const u of [-.34,-.15,.16]) {
          const z=W*.5*(u===-.34?.96:1);
          const f=torus(g,u*L,deckY-.22,side*(z+.04),.17,.052,tire);
          f.rotation.z=u;
          sag(g,[u*L-.07,deckY+.043,side*z],[u*L,deckY-.065,side*(z+.05)],.013,.014,hemp);
        }
      }
      // Aft bollards, deck machinery and net hauler distinguish the working boats.
      for(const s of [-1,1]) cleat(g,-L*.396,deckY+.008,s*W*.299);
      const rear=-L*.29;
      if(kind!==2) {
        box(g,rear,deckY+.125,0,.71,.25,.88,cap);
        cylinder(g,rear,deckY+.53,0,.30,.30,.67,coolGreen,18).rotation.x=Math.PI/2;
        for(const flip of [-1,1]) cylinder(g,rear,deckY+.53,flip*.34,.352,.352,.059,trim,18).rotation.x=Math.PI/2;
        for(let i=-3;i<=3;i++) torus(g,rear,deckY+.53,i*.073,.30,.018,hemp);
        const boom=rear-.49;
        for(const s of [-1,1]) beam(g,[boom-.12,deckY,s*.38],[boom+.06,deckY+1.54,s*.43],.048,trim);
        beam(g,[boom+.06,deckY+1.54,-.43],[boom+.06,deckY+1.54,.43],.051,trim);
        beam(g,[boom+.04,deckY+1.46,0],[boom-.84,deckY+1.95,0],.043,white);
        sag(g,[boom-.84,deckY+1.95,0],[boom-.77,deckY+.83,0],.09,.014,tar);
      } else {
        crateFish(g,rear,deckY,-.24,.7,.29,.48,coolGreen);
        crateFish(g,rear+.28,deckY,.30,.64,.24,.42,white);
      }
      ringBuoy(g,cx-cl*.32,cabinBase+.40,cw/2+.09,.21);
      const ex=cx-.26*cl;
      cylinder(g,ex,roofY+.28,-cw*.26,.067,.078,.53,iron,10);
      cylinder(g,ex,roofY+.56,-cw*.26,.075,.075,.06,tar,10);
      if(kind===1) {
        cylinder(g,cx+.22*cl,roofY+.19,.04,.16,.21,.22,white,16);
        box(g,cx+.22*cl,roofY+.34,.04,.23,.09,.93,white);
      }
      ctx.batch(g);ctx.scene.add(g);
      g.position.set(spec.x,0,spec.z);g.rotation.y=spec.yaw;
      const phase=random()*TAU, depart=spec.depart;
      ctx.updates.push(function(t) {
        g.position.y=.055*Math.sin(t*.83+phase)+.032*Math.sin(t*.47+phase*2);
        g.rotation.x=.016*Math.sin(t*.72+phase);
        g.rotation.z=.007*Math.sin(t*.93+phase);
        if(depart) {
          const advance=Math.sin(t*.021)*6;
          g.position.x=spec.x+advance*Math.cos(spec.yaw);
          g.position.z=spec.z-advance*Math.sin(spec.yaw);
        }
      });
      return g;
    }
    boat({x:-4.40,z:5.34,L:8.70,W:2.64,H:1.07,yaw:-.045,kind:0,body:"#447f82",boot:"#655748",trim:"#bdd0b3",cabin:"#e5d9b9",flag:"#bd6546",name:"潮 見 丸"});
    boat({x:1.5,z:19.10,L:9.85,W:3.1,H:1.16,yaw:Math.PI-.075,kind:1,body:"#46697a",boot:"#876145",trim:"#d9af75",cabin:"#d2d1b8",flag:"#b5674d",name:"千 鳥 丸"});
    boat({x:-13.35,z:10.76,L:6.6,W:2.18,H:.89,yaw:.08,kind:2,body:"#a66c50",boot:"#505e58",trim:"#d5c89f",cabin:"#ccd6c4",flag:"#628b96",name:"第 八 旭 丸"});
    const outgoing=boat({x:31,z:-11.5,L:8.19,W:2.46,H:.99,yaw:-.49,kind:0,depart:true,body:"#6b8f91",boot:"#5b6662",trim:"#d9b482",cabin:"#e0d5b6",flag:"#c36f50",name:"朝 凪 丸"});

    for(const a of [
      [[-7.83,1.09,4.13],[-8.95,1.94,1.83]], [[-.75,1.25,4.32],[1.81,1.94,1.83]],
      [[-15.9,.88,11.66],[-16.73,2.03,13.32]],[[-10.9,.98,11.76],[-11.12,2.05,13.3]],
      [[-2.38,1.14,20.43],[-5.5,2.02,22.04]],[[5.33,1.09,20.52],[8.4,2.0,21.98]]
    ]) sag(staticWorld,a[0],a[1],.40,.034,hemp);

    // Only scattered crests of the wake sit above the moving sea surface.
    const wake=new T.Group();
    for(const side of [-1,1]) {
      for(let i=0;i<19;i++) {
        const x=-2.8-i*.52, distance=.58+i*.13;
        const z=side*(distance+between(-.13,.13));
        const len=between(.21,.57);
        const ripple=sphere(wake,x,.076+between(-.018,.014),z,len,.013,between(.04,.075),foam);
        ripple.rotation.y=side*.18;
      }
    }
    ctx.batch(wake);ctx.scene.add(wake);
    ctx.updates.push(function(t) {
      wake.position.set(outgoing.position.x,.014*Math.sin(t*1.4),outgoing.position.z);
      wake.rotation.y=outgoing.rotation.y;
    });

    function buoy(x,z,color,phase) {
      const g=new T.Group();
      cylinder(g,0,-.08,0,.44,.28,.40,color,24);
      cylinder(g,0,.21,0,.29,.44,.20,color,24);
      cylinder(g,0,.42,0,.145,.28,.22,color,20);
      cylinder(g,0,.62,0,.08,.14,.22,white,16);
      cylinder(g,0,.917,0,.054,.072,.40,color,12);
      torus(g,0,1.13,0,.083,.018,iron);
      const streak=make("metal","#776b57");
      cylinder(g,0,.008,0,.444,.444,.035,streak,24);
      ctx.batch(g);ctx.scene.add(g);g.position.set(x,0,z);
      ctx.updates.push(function(t) {
        g.position.y=.077*Math.sin(t*.97+phase);
        g.rotation.z=.054*Math.sin(t*.72+phase*2);
        g.rotation.x=.037*Math.sin(t*.78+phase);
      });
    }
    buoy(16.7,-11.3,signalRed,1.4);
    buoy(26.6,1.8,coolGreen,4.3);

    function warehouse(x,z,w,d,h,wall,roof) {
      const base=1.75;
      box(staticWorld,x,base+h*.5,z,w,h,d,wall,.035);
      const rise=d*.23, edge=base+h;
      for(const s of [-1,1]) {
        const len=Math.hypot(d*.5+.33,rise+.15);
        const r=box(staticWorld,x,edge+rise*.49,z+s*d*.244,w+.65,.13,len,roof,.025);
        r.rotation.x=s*Math.atan2(rise,d/2);
      }
      const gableMat=wall;
      for(const s of [-1,1]) {
        const xx=x+s*(w/2+.012);
        const p=[[xx,edge,z-d/2],[xx,edge,z+d/2],[xx,edge+rise,z],[xx,edge+rise,z]];
        if(s>0) p.reverse();
        quad(staticWorld,p,gableMat);
      }
      beam(staticWorld,[x-w*.5-.27,edge+rise+.058,z],[x+w*.5+.27,edge+rise+.058,z],.045,roof);
      const fz=z-d/2-.029;
      const doorWidth=w*.36, doorHeight=h*.75, doorX=x-w*.12;
      box(staticWorld,doorX,base+doorHeight/2,fz,doorWidth,doorHeight,.065,make("metal","#72908a"));
      for(let i=1;i<12;i++) box(staticWorld,doorX,base+doorHeight*i/12,fz-.04,doorWidth-.04,.018,.018,iron,.005);
      box(staticWorld,doorX,base+doorHeight+.081,fz-.016,doorWidth+.17,.155,.17,wall);
      const frame=make("wood","#9f957d"), batten=make("wood","#827b64");
      const wooden=w<8,winWidth=wooden?1.24:1.50,winHeight=wooden?.83:.94;
      for(const s of [-1,1]) {
        const wx=x+s*w*.364, wy=base+h*.57;
        box(staticWorld,wx,wy,fz,winWidth+.17,winHeight+.16,.10,frame);
        box(staticWorld,wx,wy,fz-.058,winWidth,winHeight,.047,glass);
        for(const u of [-.25,.25]) {
          box(staticWorld,wx+winWidth*u,wy+winHeight*.247,fz-.092,winWidth*.463,winHeight*.441,.013,paleGlass,.006);
        }
        box(staticWorld,wx,wy,fz-.101,.047,winHeight,.043,white,.007);
        box(staticWorld,wx,wy-.01,fz-.101,winWidth,.047,.041,white,.006);
        box(staticWorld,wx,wy-winHeight*.5-.045,fz-.12,winWidth+.22,.10,.23,batten,.012);
        box(staticWorld,wx,wy+winHeight*.5+.083,fz-.12,winWidth+.27,.055,.31,zinc,.012).rotation.x=-.13;
      }
      // Threshold, boarding and a little sag in the rain gutters reveal the building's age.
      box(staticWorld,x,base+.153,fz-.01,w-.13,.31,.07,wooden?batten:stoneDark);
      for(const s of [-1,1]) {
        box(staticWorld,doorX+s*(doorWidth/2+.051),base+doorHeight*.51,fz-.078,.105,doorHeight*1.02,.095,batten);
        box(staticWorld,x+s*(w/2-.11),base+h*.5,fz-.045,.16,h,.105,frame);
      }
      const bracketWood=make("wood","#927b5e"),drip=make("metal","#82908b");
      const rafterCount=Math.max(5,Math.round(w/.81));
      for(let i=0;i<rafterCount;i++) {
        const bx=x+(i/(rafterCount-1)-.5)*(w-.24);
        box(staticWorld,bx,edge-.05,fz-.12,.09,.13,.47,bracketWood,.012).rotation.x=-.2;
      }
      pipe(staticWorld,[[x-w/2-.2,edge-.04,fz-.31],[x+.1,edge-.09,fz-.31],[x+w/2+.2,edge-.10,fz-.31]],.054,drip,12,8);
      box(staticWorld,x,edge-.13,fz-.05,w+.03,.124,.122,bracketWood);
      const awningWidth=doorWidth+.57,awningY=base+doorHeight+.29;
      box(staticWorld,doorX,awningY,fz-.43,awningWidth,.076,.94,wooden?make("roof","#9e826c"):make("roof","#748d86")).rotation.x=-.15;
      for(const side of [-1,1]) {
        const xx=doorX+side*(awningWidth/2-.17);
        beam(staticWorld,[xx,awningY-.48,fz-.045],[xx,awningY-.10,fz-.77],.039,batten);
        box(staticWorld,xx,awningY-.115,fz-.44,.076,.10,.81,bracketWood,.011);
      }
      // A louvred vent breaks up the gable. Pipework and a shut-off box serve the ice room.
      const ventX=x+w*.22,ventY=base+h*.81;
      box(staticWorld,ventX,ventY,fz-.064,.67,.35,.105,iron);
      for(let i=0;i<4;i++) box(staticWorld,ventX,ventY-.11+i*.074,fz-.137,.65,.046,.085,drip,.007).rotation.x=-.23;
      const serviceX=x+w*.472;
      box(staticWorld,serviceX,base+1.07,fz-.075,.36,.51,.145,drip);
      box(staticWorld,serviceX,base+1.07,fz-.16,.305,.445,.029,zinc);
      pipe(staticWorld,[[serviceX,base+1.32,fz-.098],[serviceX,edge-.34,fz-.098],[serviceX-.13,edge-.24,fz-.098],[ventX,edge-.24,fz-.098]],.018,iron,14,6);
      const chimneyX=x+w*(wooden?-.32:.33);
      cylinder(staticWorld,chimneyX,edge+rise+.22,z,.091,.104,.53,iron,10);
      cylinder(staticWorld,chimneyX,edge+rise+.52,z,.061,.16,.086,drip,10);
      // Gooseneck exterior lamp and its amber enamel shade.
      const lx=doorX-doorWidth*.5-.29;
      pipe(staticWorld,[[lx,base+doorHeight+.21,fz],[lx,base+doorHeight+.39,fz-.14],[lx,base+doorHeight+.37,fz-.32],[lx,base+doorHeight+.25,fz-.36]],.022,iron,12,6);
      cylinder(staticWorld,lx,base+doorHeight+.19,fz-.36,.065,.18,.10,iron);
      sphere(staticWorld,lx,base+doorHeight+.139,fz-.36,.092,.047,.092,make("plain","#efcf88",{emissive:0xffbc63,emissiveIntensity:.45}));
      for(const s of [-1,1]) {
        pipe(staticWorld,[[x+s*(w/2-.21),edge-.06,fz-.10],[x+s*(w/2-.21),edge-.14,fz-.19],[x+s*(w/2-.21),base+.24,fz-.19]],.048,zinc,10,8);
      }
    }
    const shedWall=make("plaster","#c3baa1"),roofMetal=make("roof","#6a8081");
    warehouse(-6.60,28.03,10.9,6.19,3.31,shedWall,roofMetal);
    warehouse(4.04,28.76,7.39,4.80,2.92,make("wood","#a68d72"),make("roof","#968879"));
    box(staticWorld,-7.65,4.72,24.87,2.69,.35,.1,make("metal","#dfd0ac"));
    label(staticWorld,"港 漁 業 倉 庫",-7.65,4.72,24.809,2.58,.33,"#526863",-1);

    const binBlue=make("metal","#79999b");
    crateFish(staticWorld,-3.55,1.75,24.12,.87,.39,.58,binBlue);
    crateFish(staticWorld,-3.56,2.14,24.15,.84,.34,.56,white);
    crateFish(staticWorld,-2.62,1.75,24.10,.84,.39,.58,white);
    function dryingNet(x,z) {
      for(const dx of [-2.83,0,2.83]) {
        beam(staticWorld,[x+dx,1.73,z-.18],[x+dx,4.76,z],.068,pileWood,9);
        beam(staticWorld,[x+dx,1.75,z+.82],[x+dx,4.45,z],.047,pileWood,8);
      }
      beam(staticWorld,[x-3.12,4.52,z],[x+3.12,4.52,z],.067,timber,9);
      const twine=make("plain","#76877c");
      function part(u,t) {
        const yy=4.36-.25*Math.sin(u*2*Math.PI)**2-t*(1.46+.46*Math.sin(u*7.51+.5)**2);
        return [x+(u-.5)*5.45+.062*t*Math.sin(7*u),yy,z+.10+.095*t+.075*Math.sin(u*23+t*1.23)*t];
      }
      for(let n=0;n<=33;n++) {
        const p=[];
        for(let j=0;j<=7;j++) p.push(part(n/33,j/7));
        pipe(staticWorld,p,.012,twine,9,4);
      }
      for(let j=0;j<=8;j++) {
        const p=[];
        for(let n=0;n<=20;n++) p.push(part(n/20,j/8));
        pipe(staticWorld,p,j===0?.022:.011,twine,24,4);
      }
      for(let n=0;n<15;n++) {
        const pt=part(n/14,0);
        sphere(staticWorld,pt[0],pt[1]+.036,pt[2],.078,.056,.048,n%4===0?orange:ropeLight);
      }
    }
    dryingNet(-15.9,23.91);
    for(let i=0;i<7;i++) {
      const x=2.8+(i%4)*1.12,z=23.52+Math.floor(i/4)*.81;
      crate(staticWorld,x,1.75,z,.94,.55,.70,i%3===0?timber:oldWood);
      if(i===2||i===5) crate(staticWorld,x+.035,2.30,z,.93,.49,.68,timber);
    }
    for(let i=0;i<12;i++) {
      const x=-14.1+(i%5)*.41, z=22.74+Math.floor(i/5)*.37;
      sphere(staticWorld,x,1.94+between(-.02,.05),z,.222,.206,.208,i%3===0?orange:(i%3===1?white:coolGreen));
    }

    // Short protection arm at the southern mouth, leaving the dawn horizon open eastward.
    function tetrapod(parent,x,z,angle) {
      const group=new T.Group(), center=v(0,.41,0);
      const directions=[v(.91,-.34,0),v(-.455,-.34,.79),v(-.455,-.34,-.79),v(0,1,0)];
      directions.forEach(function(dir) {
        const tip=center.clone().addScaledVector(dir,.91);
        const stem=cylinder(group,0,0,0,.157,.31,.92,stoneDark,7);
        stem.position.copy(center).lerp(tip,.5);
        stem.quaternion.setFromUnitVectors(up,dir.normalize());
      });
      group.position.set(x,-.12,z); group.rotation.set(between(-.5,.5),angle,between(-.45,.45));parent.add(group);
    }
    const arm=new T.Group();
    box(arm,0,.05,0,13.4,1.41,2.0,stoneDark,.11);
    box(arm,0,.72,0,13.48,.25,2.12,stone,.045);
    for(let i=0;i<24;i++) tetrapod(arm,-6.05+(i%12)*1.09+between(-.16,.16),1.5+Math.floor(i/12)*.64,between(0,TAU));
    arm.position.set(16.49,0,25.08);arm.rotation.y=-.26;staticWorld.add(arm);
    ctx.batch(staticWorld);
    ctx.scene.add(staticWorld);
  };
})();
