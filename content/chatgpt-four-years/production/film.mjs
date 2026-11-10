import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const require = createRequire(process.env.TRIBUTE_NODE_MODULES ? path.join(process.env.TRIBUTE_NODE_MODULES, '../package.json') : import.meta.url);
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

// Original procedural motion design. No OpenAI footage, logo, UI capture, or music.
const W=1920,H=1080,FPS=30,DURATION=54,BEAT=60/160;
const OUT=path.resolve(process.env.TRIBUTE_OUTPUT || new URL('../', import.meta.url).pathname);
fs.mkdirSync(OUT,{recursive:true});
for(const [file,family] of [
 ['/System/Library/Fonts/Supplemental/Arial.ttf','FilmSans'],
 ['/System/Library/Fonts/Supplemental/Arial Bold.ttf','FilmBold'],
 ['/System/Library/Fonts/Hiragino Sans GB.ttc','FilmCJK'],
 ['/System/Library/Fonts/Menlo.ttc','FilmMono'],
 [process.env.TRIBUTE_CJK_FONT,'FilmCJK'],
 [process.env.TRIBUTE_SANS_FONT,'FilmSans'],
]) if(file&&fs.existsSync(file)) GlobalFonts.registerFromPath(file,family);

const C={paper:'#f0efe7',black:'#10120f',lime:'#d4fa52',orange:'#ff754d',green:'#a7c2a6',gray:'#93978c',blue:'#9dbde5'};
const canvas=createCanvas(W,H),ctx=canvas.getContext('2d');
const prev=createCanvas(W,H),pc=prev.getContext('2d');
const next=createCanvas(W,H),nc=next.getContext('2d');
let g=ctx;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=x=>1-Math.pow(1-clamp(x),3);
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const fract=x=>x-Math.floor(x);
const rand=n=>fract(Math.sin(n*127.1+311.7)*43758.5453123);
const pulse=t=>Math.exp(-fract(t/BEAT)*7);
const TAU=Math.PI*2;
function alpha(a,fn){g.save();g.globalAlpha*=clamp(a);fn();g.restore()}
function rect(x,y,w,h,color,r=0){g.fillStyle=color;g.beginPath();g.roundRect(x,y,Math.max(0,w),Math.max(0,h),r);g.fill()}
function line(x1,y1,x2,y2,col,w=1){g.strokeStyle=col;g.lineWidth=w;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()}
function circle(x,y,r,col,stroke=false,w=1){g.beginPath();g.arc(x,y,Math.max(0,r),0,TAU);g[stroke?'strokeStyle':'fillStyle']=col;g.lineWidth=w;stroke?g.stroke():g.fill()}
function txt(s,x,y,size=40,col=C.paper,opt={}){
 g.save();g.fillStyle=col;g.strokeStyle=col;g.lineWidth=opt.lineWidth||1;
 g.textAlign=opt.align||'left';g.textBaseline='alphabetic';
 g.font=`${opt.weight||400} ${size}px "${opt.mono?'FilmMono':opt.bold?'FilmBold':'FilmSans'}", "FilmCJK", sans-serif`;
 if(opt.tracking&&g.letterSpacing!==undefined)g.letterSpacing=opt.tracking+'px';
 opt.stroke?g.strokeText(s,x,y):g.fillText(s,x,y);g.restore();
}
function kin(s,x,y,size,col,u,opt={}){
 const delay=opt.delay||0,p=ease((u-delay)/.55);
 g.save();g.translate(0,(1-p)*(opt.rise||80));alpha(p,()=>txt(s,x,y,size,col,opt));g.restore();
}
function chars(s,x,y,size,col,u,opt={}){
 let xx=x;
 for(let i=0;i<[...s].length;i++){
  const ch=[...s][i],p=ease((u-i*.026)/.42);
  alpha(p,()=>txt(ch,xx,y+(1-p)*90,size,col,opt));
  g.font=`${opt.bold?700:400} ${size}px "${opt.bold?'FilmBold':'FilmSans'}", "FilmCJK", sans-serif`;
  xx+=g.measureText(ch).width+(opt.tracking||0);
 }
}
function label(s,x,y,col=C.gray){txt(s,x,y,23,col,{mono:true})}
function pill(s,x,y,w,col=C.paper,bg=C.black){rect(x,y,w,52,bg,26);txt(s,x+w/2,y+34,22,col,{align:'center',mono:true})}
function arrow(x,y,size,col=C.black,rot=0){g.save();g.translate(x,y);g.rotate(rot);line(-size/2,0,size/2,0,col,4);line(size/5,-size*.32,size/2,0,col,4);line(size/5,size*.32,size/2,0,col,4);g.restore()}
function cross(x,y,col,size=8){line(x-size,y,x+size,y,col);line(x,y-size,x,y+size,col)}
function grid(t,col,spacing=80,opacity=.1){alpha(opacity,()=>{for(let x=64;x<W;x+=spacing)line(x,120,x,936,col);for(let y=136;y<950;y+=spacing)line(64,y,1856,y,col)})}
function glow(x,y,r,col,a=.5){alpha(a,()=>{const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,col);gr.addColorStop(1,col+'00');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)})}
function stripeField(t,color,opacity=.1){alpha(opacity,()=>{for(let i=0;i<60;i++){const x=(i*57+t*160)%2200-140;line(x,120,x+220,940,color,.7)}})}

const scenes=[
 {year:'2022—2026',date:'A FOURTH-ANNIVERSARY TRIBUTE',name:'问号之后',source:'周年纪念预制片 / 资料截止 2026.11.11',light:false},
 {year:'2022',date:'2022.11.30',name:'ChatGPT',source:'[01] openai.com/index/chatgpt',light:true},
 {year:'2023',date:'2023.03.14',name:'GPT-4',source:'[02] openai.com/index/gpt-4-research',light:false},
 {year:'2023',date:'2023.11.06',name:'GPT-4 Turbo',source:'[03] OpenAI DevDay / [04] Introducing GPTs',light:true},
 {year:'2024',date:'2024.05.13',name:'GPT-4o',source:'[05] openai.com/index/hello-gpt-4o',light:false},
 {year:'2024',date:'2024.05.13',name:'320 ms',source:'[05] GPT-4o 发布文 · 模型音频响应能力数据',light:true},
 {year:'2024',date:'2024.09.12',name:'o1-preview',source:'[06] openai.com/index/introducing-openai-o1-preview',light:false},
 {year:'2025',date:'2025.03.25',name:'4o image generation',source:'[07] openai.com/index/introducing-4o-image-generation',light:true},
 {year:'2025',date:'2025.04.16',name:'o3 + o4-mini',source:'[08] openai.com/index/introducing-o3-and-o4-mini',light:false},
 {year:'2025',date:'2025.08.07',name:'GPT-5',source:'[09] openai.com/index/introducing-gpt-5',light:true},
 {year:'2026',date:'2026.09.03',name:'GPT-6 Astra',source:'[10] GPT-6 Astra 发布文 / [13] ChatGPT Release Notes',light:false},
 {year:'2026',date:'2026.10.07',name:'GPT-6 + Intelligent UI',source:'[11] openai.com/index/gpt-6-for-everyone',light:true},
 {year:'2026',date:'2026.10.26',name:'GPT-6.1 Terra',source:'[12] GPT-6.1 Terra 发布文 / [13] ChatGPT Release Notes',light:false},
 {year:'2026',date:'2026.10.07 · OPENAI 公布',name:'1.2B+',source:'[11] GPT-6 and Intelligent UI for everyone · 周使用人数',light:true},
 {year:'2022—2026',date:'FOUR YEARS / MANY FIRSTS',name:'时间的回声',source:'关键节点回顾 · 完整来源见影片页面',light:false},
 {year:'2022—2026',date:'FOR EVERY CURIOUS MIND',name:'每一次提问',source:'原创概念动效 / 非 ChatGPT 实际输出展示',light:true},
 {year:'2022—2026',date:'2022.11.30 — 2026.11.30',name:'四周年致敬',source:'第四周年纪念日：2026.11.30',light:false},
 {year:'2022—2026',date:'THE CONVERSATION CONTINUES',name:'对话，继续。',source:'独立创作 / 原创画面与配乐 / 无官方素材复用',light:true},
];

function framing(i,u,t){
 const sc=scenes[i],fg=sc.light?C.black:C.paper,dim=sc.light?'#70756b':'#a4aa9b';
 label('Z / INDEPENDENT TRIBUTE',68,61,fg);
 rect(1585,32,271,39,sc.light?C.black:C.paper,19);
 txt('第三方致敬 · 非官方',1720,59,21,sc.light?C.paper:C.black,{align:'center'});
 line(64,88,1856,88,fg,1);
 label(sc.date,68,136,dim);
 txt(String(i+1).padStart(2,'0')+' / 18',1852,136,23,dim,{mono:true,align:'right'});
 line(64,956,1856,956,fg,1);
 txt(sc.source,68,997,21,dim);
 const ys=['2022','2023','2024','2025','2026'];
 const active=ys.indexOf(sc.year);
 ys.forEach((y,j)=>{const x=68+j*288,col=(active===j||active<0)?fg:dim;line(x,1033,x+260,1033,dim,.7);txt(y,x,1061,18,col,{mono:true});if(active===j||active<0)rect(x,1030,260,4,sc.light?C.black:C.lime,2)});
 for(let j=0;j<28;j++){const h=4+15*(.5+.5*Math.sin(j*.8+t*11))* (.3+.7*pulse(t));rect(1555+j*10,1060-h,4,h,fg,2)}
 txt('160 BPM',1850,1061,18,dim,{mono:true,align:'right'});
}

function scene0(u,t){
 glow(1430,530,660,'#6a9246',.38);stripeField(t,C.paper,.08);
 const e=ease(u/.7);g.save();g.translate(1435,535);g.rotate(-.13+u*.025);
 for(let k=0;k<6;k++){const r=220+k*35;g.beginPath();g.ellipse(0,0,r,r*.78,0,-Math.PI*.7,Math.PI*(.7+e*.6));g.strokeStyle=k%2?C.lime:'#526044';g.lineWidth=k===0?3:1;g.stroke();}
 txt('4',0,190,620,C.lime,{align:'center',bold:true});g.restore();
 label('AFTER THE QUESTION',75,245,C.lime);chars('问号之后',65,453,156,C.paper,u,{bold:true});
 kin('ChatGPT · 四周年致敬',73,548,52,C.paper,u,{delay:.2});
 line(76,622,750,622,'#6b7660');
 kin('2022.11.30',75,706,49,C.paper,u,{mono:true,delay:.4});
 kin('2026.11.30',75,781,49,C.lime,u,{mono:true,delay:.65});arrow(680,744,80,C.lime,Math.PI/2);
 label('一段对话，打开无数可能。',75,878,C.paper);
 const words=['ASK','LEARN','CREATE','BUILD'];words.forEach((s,j)=>{const a=(j*.25+u*.05)*TAU;txt(s,1435+Math.cos(a)*390,535+Math.sin(a)*310,21,C.paper,{mono:true,align:'center'})});
}
function scene1(u,t){
 grid(t,C.black,110,.06);
 kin('一切，从一次提问开始。',72,258,62,C.black,u);
 chars('ChatGPT',62,465,210,C.black,u,{bold:true});
 pill('RESEARCH PREVIEW',80,525,310,C.paper,C.black);pill('GPT-3.5',407,525,190,C.black,C.lime);
 for(let j=0;j<3;j++){
  const p=ease((u-.25-j*.13)/.6),y=640+j*77;
  rect(80+(1-p)*200,y,820*p,59,j===0?C.black:'#dedfd5',14);
  const s=['你好，ChatGPT。','帮我理解一个新概念。','把一个想法，变成第一步。'][j];
  alpha(p,()=>txt(s.slice(0,Math.floor(clamp((u-.5-j*.2)/.6)*s.length)),105,y+40,29,j===0?C.paper:C.black));
 }
 g.save();g.translate(1430+Math.sin(u*2)*35,550+Math.cos(u*2)*22);g.rotate(-.12+Math.sin(u*2)*.07);
 for(let j=5;j>=0;j--){rect(-285+j*13,-280+j*14,570,570,j%2?'#d0d6c3':'#dce2d0',24)}
 rect(-285,-280,570,570,C.lime,24);
 txt('?',0,150+Math.sin(u*2)*8,440,C.black,{bold:true,align:'center'});
 for(let j=0;j<10;j++){const x=-245+j*52;line(x,230,x,245,C.black,2)}
 g.restore();label('2022 / 免费研究预览上线',1125,900,C.black);
}
function scene2(u,t){
 grid(t,C.paper,95,.09);glow(1400,520,520,'#516a42',.2);
 kin('理解，更进一步。',75,275,66,C.paper,u);
 chars('GPT-4',60,510,236,C.paper,u,{bold:true});
 kin('2023.03.14',80,593,36,C.lime,u,{mono:true,delay:.2});
 kin('图像 + 文本输入的多模态模型',78,699,45,C.paper,u,{delay:.25});
 label('发布时：ChatGPT 开放文本输入能力',82,768,C.gray);
 const p=ease((u-.25)/.9),xx=1290,yy=530;
 for(let j=0;j<24;j++){const a=j/24*TAU-Math.PI/2+u*.3,r=220+pulse(t)*13;line(xx+Math.cos(a)*r,yy+Math.sin(a)*r,xx+Math.cos(a)*(r+30),yy+Math.sin(a)*(r+30),j>=21?C.lime:'#485141',j>=21?18:10)}
 txt('约前10%',xx,yy+31,88,C.lime,{bold:true,align:'center'});
 txt('模拟律师资格考试成绩',xx,yy+115,30,C.paper,{align:'center'});
 label('OpenAI 公布的评测结果',1110,865,C.gray);
 const a=-Math.PI/2+u*1.7;circle(xx+Math.cos(a)*285,yy+Math.sin(a)*285,11,C.orange);
}
function scene3(u,t){
 stripeField(t,C.black,.045);
 kin('GPT-4 Turbo',65,332,155,C.black,u,{bold:true});
 kin('128K',67,596,270,C.black,u,{bold:true,delay:.12});
 pill('API 上下文窗口',82,649,285,C.paper,C.black);
 kin('也有了，可以定制的 GPTs。',80,817,51,C.black,u,{delay:.4});
 const names=['WRITING','MATH','RESEARCH','CODE','IDEAS','LEARNING'];
 for(let j=0;j<6;j++){
  const x=1120+(j%2)*315,y=230+Math.floor(j/2)*206,pp=ease((u-j*.075)/.6);
  g.save();g.translate(x+(1-pp)*400+Math.sin(u*2+j)*14,y+Math.cos(u*2+j)*18);g.rotate(Math.sin(u*1.6+j)*.045);
  rect(0,0,286,179,j%3===0?C.lime:j%3===1?C.black:'#dbe0cf',18);
  const col=j%3===1?C.paper:C.black;
  for(let k=0;k<3;k++)circle(42+k*31,52,11+k*3,col,k===1,2);
  label(names[j],24,144,col);g.restore();
 }
 label('DEV DAY / 2023',1130,898,C.black);
}
function scene4(u,t){
 glow(1000,580,650,'#5b8569',.4);
 chars('GPT-4o',68,370,202,C.paper,u,{bold:true});
 kin('能看，也能听。',77,474,66,C.lime,u,{delay:.1});
 const modes=['TEXT','AUDIO','VISION'];
 for(let j=0;j<3;j++){
  const x=80+j*595,p=ease((u-.3-j*.12)/.6);rect(x,555+(1-p)*100,565,294,'#20271d',20);
  label('0'+(j+1),x+28,599,C.gray);label(modes[j],x+28,812,C.paper);
  if(j===0){['Aa','你好','{ }'].forEach((s,k)=>txt(s,x+100+k*122,722+Math.sin(u*3+k)*12,k===1?54:72,C.paper,{align:'center'}));}
  if(j===1){for(let k=0;k<48;k++){const h=(30+70*Math.abs(Math.sin(k*.45+u*5)))*(.6+.4*Math.cos(k*.1));rect(x+43+k*10,704-h/2,5,h,C.lime,3)}}
  if(j===2){const cx=x+285,cy=703;for(let k=0;k<4;k++){g.beginPath();g.ellipse(cx,cy,130-k*28,68-k*12,Math.sin(u)*.1,0,TAU);g.strokeStyle=k%2?C.lime:C.paper;g.lineWidth=3;g.stroke()}circle(cx,cy,23+pulse(t)*5,C.orange)}
 }
 label('o = omni / 多模态原生融合',82,915,C.gray);
}
function scene5(u,t){
 grid(t,C.black,80,.07);
 const n=Math.min(320,Math.round(lerp(90,320,ease(u/.8))));
 kin(String(n),65,607,405,C.black,u,{bold:true});
 kin('ms',795,606,130,C.black,u,{delay:.15});
 kin('GPT-4o 音频响应，平均 320 毫秒。',85,730,54,C.black,u,{delay:.2});
 label('官方模型能力数据 / 非所有场景的实际延迟承诺',87,796,'#686e62');
 const cx=1475,cy=500,r=245;
 for(let j=0;j<80;j++){const a=j/80*TAU-Math.PI/2,k=j<Math.floor(clamp(u/1.1)*80);line(cx+Math.cos(a)*r,cy+Math.sin(a)*r,cx+Math.cos(a)*(r+(j%5===0?35:15)),cy+Math.sin(a)*(r+(j%5===0?35:15)),k?C.black:'#d3d6c8',j%5===0?4:2)}
 for(let k=0;k<5;k++){const rr=80+fract(u*1.8-k*.2)*165;circle(cx,cy,rr,'#bac5a7',true,1)}
 const angle=u*3.4-Math.PI/2;line(cx,cy,cx+Math.cos(angle)*215,cy+Math.sin(angle)*215,C.black,4);circle(cx+Math.cos(angle)*215,cy+Math.sin(angle)*215,9,C.orange);
 circle(cx,cy,67,C.lime);arrow(cx,cy,60,C.black,-Math.PI*.25+u*.4);
 label('更自然的交互节奏',1310,886,C.black);
}
function scene6(u,t){
 stripeField(t,C.lime,.05);
 kin('先想一想。',75,300,86,C.paper,u);
 chars('o1',65,592,310,C.lime,u,{bold:true});
 kin('preview',430,590,105,C.paper,u,{delay:.2});
 kin('回答之前，花更多时间推理。',85,772,52,C.paper,u,{delay:.35});
 label('新的推理模型系列 / 2024.09.12',87,851,C.gray);
 const cx=1440,cy=530;
 for(let j=0;j<14;j++){
  const rad=38+j*22+Math.sin(u*3+j*.3)*12,ang=u*.75+j*.33;
  g.beginPath();g.arc(cx,cy,rad,ang,ang+Math.PI*1.6);g.strokeStyle=j%3===0?C.lime:'#45533a';g.lineWidth=4;g.stroke();
 }
 for(let j=0;j<7;j++){const a=j/7*TAU+u*.2;circle(cx+Math.cos(a)*340,cy+Math.sin(a)*340,6,j%2?C.orange:C.paper)}
 circle(cx,cy,9,C.paper);
}
function art(x,y,w,h,j,u){
 g.save();g.beginPath();g.roundRect(x,y,w,h,16);g.clip();
 const cols=[C.lime,'#becde1',C.orange,'#d9dfd0'];rect(x,y,w,h,cols[j%4]);
 g.translate(x+w/2,y+h/2);g.rotate((j%2?1:-1)*(.25+u*.27));
 for(let k=9;k>=0;k--){g.save();g.rotate(k*.21+u*.12);g.strokeStyle=j%2?C.black:C.paper;g.lineWidth=6;g.strokeRect(-80-k*8,-80-k*8,160+k*16,160+k*16);g.restore()}
 circle(0,0,40+Math.sin(u*2+j)*9,j%2?C.lime:C.black);g.restore();
}
function scene7(u,t){
 kin('想法，有了画面。',73,269,80,C.black,u);
 label('GPT-4o / 原生图像生成',77,332,C.black);
 for(let j=0;j<6;j++){
  const x=80+j*304-40+Math.sin(u*.9+j)*14,y=405+Math.sin(j*2)*20;
  const pp=ease((u-.1-j*.06)/.65);
  g.save();g.translate((1-pp)*80,(1-pp)*150);art(x,y,278,365,j,u);g.restore();
  alpha(pp,()=>label(['IMAGINE','COMPOSE','REFINE','SHAPE','EXPLORE','CREATE'][j],x+14,826,C.black));
 }
 label('2025.03.25 / 原创抽象视觉，非模型输出展示',80,914,'#737a6b');
}
function scene8(u,t){
 grid(t,C.paper,80,.07);
 kin('o3',74,340,180,C.lime,u,{bold:true});kin('+ o4-mini',330,339,120,C.paper,u,{delay:.1});
 kin('推理，连接工具。',82,447,69,C.paper,u,{delay:.2});
 const nodes=[['SEARCH',245,720],['PYTHON',706,720],['VISION',1167,720],['IMAGES',1628,720]];
 line(245,720,1628,720,'#4e5c43',2);
 nodes.forEach(([s,x,y],j)=>{
  const p=ease((u-.3-j*.13)/.6),yy=y+Math.sin(u*2.5+j*1.4)*35,rr=102*p+9*pulse(t);
  line(x,y,x,yy,'#7c9165',2);circle(x,yy,rr,j%2?'#2e3b26':C.lime);
  circle(x,yy,123*p+17*fract(u*1.4),'#6d8058',true,2);
  txt(s,x,yy+9,27,j%2?C.paper:C.black,{align:'center',mono:true});
  if(j<3){const px=lerp(x+126,x+335,fract(u*1.6-j*.2));circle(px,y,5,C.orange);}
 });
 label('在 ChatGPT 中，自主组合搜索、数据分析、视觉与图像工具',84,915,C.gray);
}
function scene9(u,t){
 grid(t,C.black,120,.06);
 chars('GPT-5',64,397,220,C.black,u,{bold:true});
 kin('快答，或深想。',82,503,75,C.black,u,{delay:.12});
 const p=ease((u-.25)/.7);line(130,690,650,690,C.black,4);circle(650,690,17,C.orange);
 line(650,690,940,603,C.black,3);line(650,690,940,798,C.black,3);
 rect(940,553,770*p,106,C.lime,18);rect(940,746,770*p,106,C.black,18);
 alpha(p,()=>{txt('QUICK RESPONSE',980,621,42,C.black,{mono:true});txt('DEEPER REASONING',980,814,42,C.paper,{mono:true})});
 for(let j=0;j<6;j++){const xx=lerp(130,640,fract(u*1.8+j/6));circle(xx,690,4,C.black)}
 for(let j=0;j<10;j++){const pp=fract(u*1.3+j*.1),destY=j%2?798:603;circle(lerp(650,930,pp),lerp(690,destY,pp),6,j%2?C.black:C.orange)}
 label('一个统一系统，按问题选择响应方式。',84,915,'#6a7162');
}
function scene10(u,t){
 glow(1320,540,640,'#326158',.35);glow(1530,460,300,'#c4944d',.14);
 const cx=1400,cy=548;
 for(let j=0;j<1100;j++){
  const a=rand(j+4)*TAU+u*.15, b=(rand(j+390)*2-1),r=200+120*Math.sin(j*.28+u*.3);
  let x=Math.cos(a)*r,y=b*300,z=Math.sin(a)*r;
  const rot=.28+u*.1,xx=x*Math.cos(rot)-z*Math.sin(rot),zz=x*Math.sin(rot)+z*Math.cos(rot),scale=800/(800+zz);
  alpha(.3+.7*(zz+350)/700,()=>circle(cx+xx*scale,cy+y*scale,(1.3+rand(j+8)*2)*scale,j%7===0?C.orange:j%3?C.paper:C.lime));
 }
 for(let j=0;j<8;j++){g.beginPath();g.ellipse(cx,cy,320+j*9,60+j*13,-.4+u*.06,0,TAU);g.strokeStyle='#496956';g.lineWidth=.7;g.stroke()}
 kin('GPT-6',73,373,174,C.paper,u,{bold:true});kin('Astra',75,525,156,C.lime,u,{delay:.15});
 kin('从理解，到行动。',82,690,66,C.paper,u,{delay:.25});
 label('计算机操作 · 专业任务 · 多步骤工作',86,779,C.gray);
 label('2026.09.03 / 首批向有限组织推出',86,895,C.paper);
}
function scene11(u,t){
 kin('GPT-6',72,297,144,C.black,u,{bold:true});
 kin('答案，也可以用起来。',81,400,73,C.black,u,{delay:.12});
 pill('INTELLIGENT UI',85,451,300,C.paper,C.black);
 const pp=ease((u-.2)/.65);
 g.save();g.translate(0,(1-pp)*120);
 rect(83,560,540,323,'#dae2d0',20);label('COMPARE',111,604,C.black);
 for(let j=0;j<5;j++){const h=(65+j*27+Math.sin(u*3+j)*29)*ease((u-.25-j*.1)/.65);rect(123+j*85,829-h,50,h,j%2?C.black:C.green,6)}
 rect(650,560,540,323,C.black,20);label('EXPLORE',678,604,C.paper);
 for(let j=0;j<5;j++){g.beginPath();g.ellipse(920,730,135,28+j*11,u*.3+j*.5,0,TAU);g.strokeStyle=j%2?C.lime:C.paper;g.lineWidth=2;g.stroke()}
 rect(1217,560,617,323,'#dddde9',20);label('INTERACT',1245,604,C.black);
 line(1275,711,1760,711,'#7f8594',5);const xx=1275+(Math.sin(u*2)*.5+.5)*485;circle(xx,711,18,C.orange);
 ['−','+','↗'].forEach((s,j)=>{rect(1270+j*165,762,128,70,C.paper,10);txt(s,1335+j*165,809,33,C.black,{align:'center'})});g.restore();
 label('文字 + 视觉 + 可交互元素 / 概念动效',87,921,'#6b7163');
}
function cursor(x,y,col=C.paper){g.save();g.translate(x,y);g.beginPath();g.moveTo(0,0);g.lineTo(0,61);g.lineTo(17,47);g.lineTo(30,73);g.lineTo(44,66);g.lineTo(31,40);g.lineTo(53,38);g.closePath();g.fillStyle=col;g.fill();g.strokeStyle=C.black;g.lineWidth=3;g.stroke();g.restore()}
function scene12(u,t){
 grid(t,C.paper,95,.065);glow(1550,500,460,'#8c753b',.25);
 kin('GPT-6.1',72,330,153,C.paper,u,{bold:true});kin('Terra',72,511,177,C.orange,u,{bold:true,delay:.12});
 kin('把工作，向前推进。',80,666,60,C.paper,u,{delay:.25});
 label('在 ChatGPT Work 与 Codex 推出',85,758,C.gray);
 const x=1130,y=250,p=ease((u-.15)/.6);rect(x,y,650,600*p,'#252e23',20);
 if(p>.5){label('FROM INTENT TO ACTION',x+30,y+60,C.lime);
  ['理解任务','操作软件','交付结果'].forEach((s,j)=>{const yy=y+125+j*140,pp=ease((u-.5-j*.33)/.4);rect(x+30,yy,590,102,'#36422e',14);rect(x+30,yy+96,590*fract(u*.55+j*.33),6,C.lime,3);circle(x+75,yy+51,18+4*pulse(t),pp>.8?C.lime:'#70815e');txt(s,x+122,yy+65,36,C.paper);if(pp>.8){line(x+66,yy+52,x+73,yy+59,C.black,3);line(x+73,yy+59,x+86,yy+43,C.black,3)}});
 }
 cursor(1490+Math.sin(u*2)*175,500+Math.cos(u*2)*170);
 label('2026.10.26 / 视觉理解与计算机操作',85,900,C.paper);
}
function scene13(u,t){
 const cx=1430,cy=520;
 for(let j=0;j<1500;j++){
  const theta=j*2.399963,yy=1-j/750,rr=Math.sqrt(Math.max(0,1-yy*yy)),ang=theta+u*.16;
  const zz=Math.sin(ang)*rr,xx=Math.cos(ang)*rr;
  if(zz>-.2)circle(cx+xx*330,cy+yy*330,zz>0?2.6:1.6,zz>.4?'#788b5f':'#c4cdb9');
 }
 kin('1.2B+',65,544,319,C.black,u,{bold:true});
 kin('超过 12 亿人',83,657,76,C.black,u,{delay:.13});
 kin('每周使用 ChatGPT',85,739,48,C.black,u,{delay:.25});
 pill('截至 2026.10.07 的官方披露',87,807,444,C.black,C.lime);
 for(let j=0;j<3;j++){const r=360+fract(u*.35-j*.33)*140;alpha(.23,()=>circle(cx,cy,r,C.black,true,1))}
}
function scene14(u,t){
 const names=['GPT-3.5','GPT-4','GPT-4 Turbo','GPT-4o','o1-preview','4o Images','o3 / o4-mini','GPT-5','GPT-6 Astra','Intelligent UI','GPT-6.1 Terra'];
 const shift=u*180;
 for(let j=-2;j<8;j++){
  const yy=240+j*142-(shift%142),idx=(j+Math.floor(shift/142)+names.length)%names.length;
  alpha(.12+(.5-Math.abs(yy-530)/1000),()=>txt(names[idx],j%2?230:70,yy,115,j%3===0?C.lime:C.paper,{bold:true}));
 }
 rect(1080,320,700,410,C.lime,22);
 label('CAPABILITIES, UNFOLDING',1120,380,C.black);
 ['对话','感知','推理','行动'].forEach((s,j)=>{
  const pp=ease((u-j*.18)/.4);alpha(pp,()=>txt(s,1120+(j%2)*298,500+Math.floor(j/2)*135,78,C.black,{bold:true}));
 });
 label('2022 → 2026',1120,695,C.black);
}
function scene15(u,t){
 grid(t,C.black,100,.055);
 const words=['写下','学会','构建','探索','想象','理解'];
 for(let j=0;j<12;j++){
  const x=(j%4)*500-80+Math.sin(u*1.2+j)*60+((Math.floor(j/4)%2?1:-1)*u*35),y=260+Math.floor(j/4)*275;
  alpha(.08,()=>txt(words[j%6],x,y,150,C.black,{bold:true}));
 }
 kin('每一次提问',70,417,143,C.black,u,{bold:true});
 kin('都在拓宽可能。',75,602,143,C.black,u,{bold:true,delay:.2});
 for(let j=0;j<10;j++){const p=fract(u*.3+j*.1);circle(80+p*1730,790+Math.sin(p*TAU+j)*60,7+j%3*4,j%3===0?C.orange:C.black,j%2===0,2)}
 label('TO THE PEOPLE WHO KEEP ASKING.',85,908,C.black);
}
function scene16(u,t){
 glow(1530,540,620,'#849d45',.34);stripeField(t,C.paper,.06);
 const p=ease(u/.6);g.save();g.translate(1460,570);g.rotate(.05*Math.sin(u*2));g.scale(1+.025*pulse(t),1+.025*pulse(t));
 txt('4',0,245,830,C.lime,{align:'center',bold:true});
 for(let j=0;j<6;j++){g.beginPath();g.ellipse(0,0,320+j*30,390+j*27,-.12+u*.03,0,TAU);g.strokeStyle=j%2?'#7b8b52':'#3c4a2a';g.lineWidth=1;g.stroke()}g.restore();
 kin('ChatGPT',73,371,175,C.paper,u,{bold:true});
 kin('四周年致敬',82,521,96,C.lime,u,{delay:.15});
 label('2022.11.30 — 2026.11.30',85,639,C.paper);
 line(85,696,850,696,'#64734f',1);
 kin('致敬所有',86,776,41,C.paper,u,{delay:.3});
 kin('把好奇变成行动的人。',86,846,52,C.paper,u,{delay:.4});
}
function scene17(u,t){
 grid(t,C.black,125,.055);
 chars('对话，继续。',78,393,151,C.black,u,{bold:true});
 kin('THE CONVERSATION CONTINUES.',86,487,42,C.black,u,{mono:true,delay:.15});
 line(86,550,1835,550,'#959d8d',1);
 kin('独立第三方致敬作品',90,644,40,C.black,u,{delay:.2});
 kin('非 OpenAI 出品、赞助或背书',90,708,35,'#536047',u,{delay:.25});
 kin('资料核验截止 2026.11.11 · 四周年纪念预制片',90,789,32,C.black,u,{delay:.3});
 kin('原创动效 / 原创器乐配乐 / 54 秒',90,845,27,'#536047',u,{delay:.35});
 pill('Z / 2026',1540,787,290,C.paper,C.black);
 const rr=110+Math.sin(u*1.5)*8;circle(1640,337,rr,C.black,true,2);arrow(1640,337,90,C.black,Math.sin(u*.6)*.1);
}
const painters=[scene0,scene1,scene2,scene3,scene4,scene5,scene6,scene7,scene8,scene9,scene10,scene11,scene12,scene13,scene14,scene15,scene16,scene17];

// One shared timeline: 144 beats = 36 bars = 54 seconds at 160 BPM.
function renderScene(target,i,u,t){
 g=target;g.resetTransform();g.globalAlpha=1;g.clearRect(0,0,W,H);
 rect(0,0,W,H,scenes[i].light?C.paper:C.black);
 g.save();g.beginPath();g.rect(0,160,W,785);g.clip();
 // A gentle camera push and a small per-beat pulse keep the composition alive.
 g.save();const zoom=1+.009*pulse(t)+.012*clamp(u/3);g.translate(W/2,H/2);g.scale(zoom,zoom);g.translate(-W/2,-H/2);painters[i](u,t);g.restore();
 // Beat-synchronous edge tracers: motion remains dense while facts hold still.
 const fg2=scenes[i].light?C.black:C.lime;
 const beatIndex=Math.floor(t/BEAT),phase=fract(t/BEAT);
 for(let k=0;k<4;k++){
  const x=1840-k*12,yy=190+fract(t*.45+k*.22)*710;
  alpha(.16+.22*pulse(t),()=>line(x,yy,x,yy+26,fg2,2));
 }
 alpha(.25*pulse(t),()=>{line(35,185,35,245,fg2,3);line(35,185,95,185,fg2,3)});
 for(let k=0;k<8;k++)rect(68+k*16,936,10,3,k===beatIndex%8?fg2:(scenes[i].light?'#ced1c3':'#333c2b'));
 g.restore();framing(i,u,t);
 // Small editorial registration marks, no flashing full-frame overlays.
 const fg=scenes[i].light?C.black:C.paper;cross(32,32,fg,7);cross(1888,1048,fg,7);
}
function frame(t){
 const i=Math.min(17,Math.floor(t/3)),u=t-i*3;
 renderScene(nc,i,u,t);
 ctx.resetTransform();ctx.globalAlpha=1;
 if(i>0&&u<.23){
  renderScene(pc,i-1,3+u,t);ctx.drawImage(prev,0,0);
  const p=clamp(u/.23);
  for(let s=0;s<8;s++){
   const pp=ease(clamp(p*1.5-s*.07));ctx.save();ctx.beginPath();ctx.rect(s*240,0,240,H*pp);ctx.clip();ctx.drawImage(next,0,0);ctx.restore();
  }
 } else ctx.drawImage(next,0,0);
}

if(process.argv.includes('--stills')){
 const times=[1.4,4.5,7.6,10.5,13.7,16.7,19.7,22.6,25.6,28.6,31.6,34.6,37.6,40.6,43.6,46.6,49.7,52.7];
 for(let i=0;i<times.length;i++){frame(times[i]);fs.writeFileSync(path.join(OUT,`frame-${String(i).padStart(2,'0')}.png`),canvas.toBuffer('image/png'));}
 frame(49.7);fs.writeFileSync(path.join(OUT,'poster.png'),canvas.toBuffer('image/png'));
 const contact=createCanvas(1920,1350),cg=contact.getContext('2d');
 const {loadImage}=require('@napi-rs/canvas');
 for(let i=0;i<times.length;i++){const im=await loadImage(path.join(OUT,`frame-${String(i).padStart(2,'0')}.png`));cg.drawImage(im,(i%4)*480,Math.floor(i/4)*270,480,270);}
 fs.writeFileSync(path.join(OUT,'contact-sheet.png'),contact.toBuffer('image/png'));console.log('Stills exported:',OUT);
}else{
 const enc=spawn('ffmpeg',['-y','-f','rawvideo','-pixel_format','rgba','-video_size',`${W}x${H}`,'-framerate',String(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',path.join(OUT,'picture.mp4')],{stdio:['pipe','ignore','inherit']});
 enc.stdin.on('error',()=>{});
 for(let f=0;f<DURATION*FPS;f++){
  frame(f/FPS);const bytes=canvas.data();if(!enc.stdin.write(bytes))await once(enc.stdin,'drain');
  if(f%90===0)console.log(`Rendered ${f/FPS}s / ${DURATION}s`);
 }
 enc.stdin.end();const [status]=await once(enc,'close');if(status)process.exit(status);
 console.log('Picture master complete.');
}
