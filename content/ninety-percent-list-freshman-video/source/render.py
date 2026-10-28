"""Render an original narrated diagram lesson. Python 3 + Pillow, FFmpeg, edge-tts.

Usage: python render.py WORK_DIRECTORY [--preview]
Audio is made separately by make_audio.py. No credentials or external images needed.
Use FONT_CJK and FONT_LATIN to override local font paths on other operating systems.
"""
import os,sys,json,pathlib,math,subprocess,re,html,random
from functools import lru_cache
from PIL import Image,ImageDraw,ImageFont
ROOT=pathlib.Path(__file__).resolve().parents[1]
WORK=pathlib.Path(sys.argv[1]);WORK.mkdir(parents=True,exist_ok=True)
D=json.loads((ROOT/'lesson.json').read_text())
W,H,FPS=1920,1080,12
SPEED=1.065
BG='#f4f3ee';INK='#17313c';TEAL='#147d78';ORANGE='#d97943';MUTED='#647881';LINE='#d9e0dc';PALE='#e3efea';WHITE='#ffffff'
CJK=os.environ.get('FONT_CJK','/System/Library/Fonts/STHeiti Medium.ttc')
LATIN=os.environ.get('FONT_LATIN','/System/Library/Fonts/Avenir Next.ttc')
@lru_cache(None)
def font(size):return ImageFont.truetype(CJK,size)
def tx(draw,xy,text,size=32,fill=INK):draw.text(xy,text,font=font(size),fill=fill,stroke_width=0)
def width(text,size):return font(size).getlength(text)
def wrap(text,maxw,size=32):
    lines=[];line=''
    for c in text:
        if c=='\n':lines.append(line);line='';continue
        if width(line+c,size)>maxw and line:lines.append(line);line=c
        else:line+=c
    if line:lines.append(line)
    return lines
def center(draw,xy,text,size=32,fill=INK,maxw=None):
    lines=wrap(text,maxw,size) if maxw else [text]
    for i,line in enumerate(lines):tx(draw,(xy[0]-width(line,size)/2,xy[1]+i*(size+10)),line,size,fill)
def roundbox(draw,box,fill=WHITE,outline=LINE,radius=22,width_=2):draw.rounded_rectangle(box,radius,fill=fill,outline=outline,width=width_)
def arrow(draw,a,b,color=TEAL,width_=5):
    draw.line([a,b],fill=color,width=width_)
    angle=math.atan2(b[1]-a[1],b[0]-a[0]);n=15
    draw.polygon([b,(b[0]-n*math.cos(angle-.5),b[1]-n*math.sin(angle-.5)),(b[0]-n*math.cos(angle+.5),b[1]-n*math.sin(angle+.5))],fill=color)
def node(draw,c,label,size=32,boxw=205,boxh=100,active=False):
    x,y=c;roundbox(draw,(x-boxw/2,y-boxh/2,x+boxw/2,y+boxh/2),PALE if active else WHITE,TEAL if active else LINE)
    lines=wrap(label,boxw-25,size);center(draw,(x,y-len(lines)*(size+10)/2),label,size,maxw=boxw-25)
def ease(x):x=max(0,min(1,x));return x*x*(3-2*x)
def lines(draw,points,p,color=TEAL,w=7):
    n=max(2,min(len(points),int(len(points)*p)))
    if n>1:draw.line(points[:n],fill=color,width=w,joint='curve')
def pulse(draw,a,b,t):
    p=(t*.18)%1;x=a[0]+(b[0]-a[0])*p;y=a[1]+(b[1]-a[1])*p
    draw.ellipse((x-8,y-8,x+8,y+8),fill=ORANGE)
def base(s,idx):
    im=Image.new('RGB',(W,H),BG);dr=ImageDraw.Draw(im)
    dr.rectangle((0,0,18,H),fill=TEAL)
    tx(dr,(78,38),'THE NINETY PERCENT LIST',25,TEAL)
    tx(dr,(78,82),s['section'],25,MUTED)
    tx(dr,(1555,40),f'大学新生导读   {idx+1:02} / {len(D["scenes"]):02}',23,MUTED)
    size=52
    while width(s['title'],size)>1770:size-=1
    tx(dr,(78,132),s['title'],size)
    tx(dr,(82,209),s['subtitle'],27,MUTED)
    roundbox(dr,(78,282,1224,841),WHITE,LINE,28)
    tx(dr,(110,307),'原理示意',22,MUTED)
    tx(dr,(1300,296),'记住这三点',26,TEAL)
    for i,n in enumerate(s['notes']):
        y=360+i*148
        dr.ellipse((1300,y+8,1331,y+39),fill=PALE)
        tx(dr,(1308,y+9),str(i+1),18,TEAL)
        for j,l in enumerate(wrap(n,454,30)):tx(dr,(1350,y+j*43),l,30)
    tx(dr,(83,861),'图示用于建立直觉；曲线、数值及布局不代表论文的原始测量。',22,MUTED)
    if s['papers']:
        refs=' / '.join(p['title'] for p in s['papers'])
        if width(refs,19)>1640:
            while width(refs+'…',19)>1640:refs=refs[:-1]
            refs+='…'
        tx(dr,(82,1016),'原始材料：'+refs,19,MUTED)
    else:tx(dr,(82,1016),'来源：zxygentoo/the-ninety-percent-list  ·  核对日期 2026-10-28  ·  原始链接见视频页面',19,MUTED)
    return im
def diagram(dr,s,t,dur):
    k=s['kind'];ls=s['labels'];p=ease(t/6);stage=min(2,int(t/dur*3));phase=(t*.45)%len(ls)
    if k in ('flow','build','reason','roadmap','preference','transformer'):
        n=len(ls);xs=[225+i*850/max(1,n-1) for i in range(n)]
        for i in range(n-1):arrow(dr,(xs[i]+100,530),(xs[i+1]-105,530),LINE);pulse(dr,(xs[i]+105,530),(xs[i+1]-105,530),t-i)
        for i,(x,l) in enumerate(zip(xs,ls)):node(dr,(x,530),l,29,195,132,active=i==int(phase))
        if k=='transformer':
            dr.line([(225,452),(225,399),(792,399),(792,452)],fill=ORANGE,width=5)
            center(dr,(510,357),'残差通路',27,ORANGE)
            center(dr,(640,665),'信息访问 + 顺序 + 变换 + 可训练性',32,TEAL)
        elif k=='preference':center(dr,(650,690),'人类偏好 → 奖励信号 → 策略优化',31,TEAL)
        elif k=='roadmap':center(dr,(650,687),'一次只改变一个条件，记录新样本表现',30,TEAL)
        elif k=='reason':center(dr,(650,687),'过程检查 ≠ 结果检查 ≠ 保证正确',30,TEAL)
        else:center(dr,(650,687),'每一步，都能说明输入、操作和输出',30,TEAL)
    elif k=='map':
        colors=[TEAL,'#497f9f',ORANGE,'#886f9e','#8c9255']
        for i,l in enumerate(ls):
            x=125+i*216
            roundbox(dr,(x,405,x+187,645),PALE if i==int(phase) else BG,colors[i],18,3)
            center(dr,(x+94,436),'ABCDE'[i],49,colors[i]);center(dr,(x+94,536),l,28,maxw=160)
            if i<4:arrow(dr,(x+190,524),(x+211,524),colors[i],3)
        center(dr,(650,722),'读材料 → 做最小实验 → 测量 → 提出新问题',31,TEAL)
    elif k=='cards':
        for i,(a,b) in enumerate(zip(['重编','30','1 / 30'],ls)):
            x=145+i*352;roundbox(dr,(x,407,x+310,673),BG)
            center(dr,(x+155,442),a,65,TEAL if i!=2 else ORANGE)
            center(dr,(x+155,574),b,29,maxw=280)
        center(dr,(650,736),'书单提供路径，不提供“学会 90%”的保证',29,MUTED)
    elif k=='compress':
        roundbox(dr,(140,382,1165,472),BG)
        center(dr,(650,407),'ABABABABABABABABABABABAB',38,TEAL)
        arrow(dr,(650,490),(650,548))
        roundbox(dr,(325,568,975,661),PALE,TEAL)
        center(dr,(650,590),'“AB” 重复 12 次',41,TEAL)
        center(dr,(650,710),'短说明来自可复用的规律',32)
        if s['item']==1:center(dr,(650,755),'已有语料 X  →  帮助编码新文本 Y',27,MUTED)
        else:center(dr,(650,755),'随机序列通常没有这样的简短规则',27,MUTED)
    elif k=='mdl':
        tx(dr,(149,377),'目标：L(模型) + L(数据 | 模型)',37,TEAL)
        for y,a,b,lab in [(510,130,650,'方案 A'),(651,310,185,'方案 B')]:
            tx(dr,(142,y-55),lab,29)
            dr.rounded_rectangle((300,y,300+a,y+61),10,fill=TEAL)
            dr.rounded_rectangle((300+a+5,y,300+a+b+5,y+61),10,fill=ORANGE)
            tx(dr,(319+a+b,y+12),'合计',25)
        tx(dr,(302,747),'青色：模型成本    橙色：未解释的数据',26,MUTED)
    elif k=='coffee':
        rng=random.Random(42)
        for j,l in enumerate(ls):
            cx=310+j*340;cy=535;r=121
            dr.ellipse((cx-r-8,cy-r-8,cx+r+8,cy+r+8),fill=LINE)
            for yy in range(-116,117,8):
                for xx in range(-116,117,8):
                    if xx*xx+yy*yy>116**2:continue
                    if j==0:v=xx>0
                    elif j==1:v=math.sin(math.atan2(yy,xx)*3+math.hypot(xx,yy)*.038+t*.035)>0
                    else:v=rng.random()>.5
                    col=('#dcad77' if v else '#6d452f') if j<2 else '#ac8056'
                    dr.rectangle((cx+xx,cy+yy,cx+xx+8,cy+yy+8),fill=col)
            center(dr,(cx,703),l,30)
        center(dr,(650,365),'观察宏观结构，而不只看无序程度',31,TEAL)
    elif k=='loop':
        pts=[(390,423),(900,423),(900,692),(390,692)]
        ends=[((505,423),(775,423)),((900,478),(900,627)),((775,692),(505,692)),((390,627),(390,478))]
        for a,b in ends:arrow(dr,a,b);pulse(dr,a,b,t)
        for i,(a,l) in enumerate(zip(pts,ls)):node(dr,a,l,30,230,110,i==int(phase))
        center(dr,(650,545),'行动与反馈',35,TEAL)
    elif k=='sequence':
        for i in range(4):
            x=235+i*275
            if i<3:arrow(dr,(x+78,542),(x+192,542));pulse(dr,(x+82,542),(x+190,542),t-i)
            node(dr,(x,542),f'状态 {i+1}',29,155,110,i==int(phase))
            center(dr,(x,705),['输入 1','输入 2','输入 3','输入 4'][i],27,MUTED)
            arrow(dr,(x,678),(x,608),MUTED,3)
        dr.line([(235,420),(1060,420)],fill=ORANGE,width=6)
        center(dr,(650,365),'LSTM：门控制信息保留与更新',32,TEAL)
        center(dr,(650,759),'前文压进记忆，按顺序继续计算',28,MUTED)
    elif k=='attention':
        weights=[.12,.22,.66]
        for i,l in enumerate(ls[:3]):
            x=310+i*340
            arrow(dr,(x,470),(650,675),TEAL,int(3+weights[i]*14))
            pulse(dr,(x,475),(650,672),t+i)
            node(dr,(x,420),l,38,180,100)
            center(dr,(x,507),str(weights[i]),26,TEAL)
        node(dr,(650,706),'math',41,250,105,True)
        center(dr,(650,359),'当前生成 math：重点查看“数学”',31,TEAL)
        tx(dr,(145,789),'权重仅为讲解示意，不是模型实测。',23,MUTED)
    elif k=='memory':
        for i in range(3):node(dr,(300+i*330,426),ls[i],30,240,100,i==int(phase)%3)
        node(dr,(650,694),ls[3],33,410,108,True)
        for i in range(3):arrow(dr,(300+i*330,485),(650,632),TEAL,3)
        center(dr,(650,551),'学习“去哪读 / 往哪写”',31,ORANGE)
    elif k=='residual':
        for x,l in zip([260,650,1030],['x','F(x)','x + F(x)']):node(dr,(x,619),l,36,225,113,x==1030)
        arrow(dr,(377,619),(530,619));arrow(dr,(766,619),(907,619))
        dr.line([(260,558),(260,403),(1030,403),(1030,552)],fill=ORANGE,width=7)
        arrow(dr,(1030,490),(1030,552),ORANGE)
        center(dr,(650,355),'允许输入沿恒等通路直接保留',32,ORANGE)
        center(dr,(650,738),'学习修正，不必每层重写全部信息',30,TEAL)
    elif k=='graph':
        pts=[(300,425),(580,384),(850,450),(425,676),(765,680),(1070,640)]
        edges=[(0,1),(1,2),(0,3),(1,3),(1,4),(2,4),(2,5),(3,4),(4,5)]
        for a,b in edges:dr.line([pts[a],pts[b]],fill=LINE,width=6);pulse(dr,pts[a],pts[b],t+a)
        for i,(x,y) in enumerate(pts):
            dr.ellipse((x-39,y-39,x+39,y+39),fill=PALE,outline=TEAL,width=3)
            center(dr,(x,y-20),['C','O','H','C','H','O'][i],33,TEAL)
        center(dr,(650,770),'相邻节点交换消息，再更新自己的表示',30,TEAL)
    elif k=='diffusion':
        rng=random.Random(1)
        for j in range(4):
            x=150+j*270;noise=[1,.65,.3,0][j]
            roundbox(dr,(x,412,x+205,617),BG)
            for yy in range(20):
                for xx in range(20):
                    v=rng.random();shape=(xx-10)**2+(yy-10)**2<45
                    val=(1-noise)*(0.20 if shape else .91)+noise*v
                    color=tuple(int(255*(val*.8+.1)) for _ in range(3))
                    dr.rectangle((x+4+xx*10,416+yy*10,x+13+xx*10,425+yy*10),fill=color)
            if j<3:arrow(dr,(x+214,515),(x+258,515),TEAL,4)
            center(dr,(x+105,655),['噪声','去噪一步','继续去噪','新样本'][j],28)
        center(dr,(650,745),'扩散生成示意：学习分布，逐步构造',31,TEAL)
    elif k=='scale':
        for i,l in enumerate(ls):
            y=427+i*120;tx(dr,(151,y),l,31)
            dr.rounded_rectangle((450,y,1110,y+40),18,fill=BG)
            amount=.25+.55*(.5+.5*math.sin(t*.15+i))
            dr.rounded_rectangle((450,y,450+660*amount,y+40),18,fill=[TEAL,ORANGE,'#698ba6'][i])
        center(dr,(650,759),'预算一定：协调规模、数据和计算',31,TEAL)
    elif k=='icl':
        for i,l in enumerate(ls):
            roundbox(dr,(266,372+i*128,1036,468+i*128),PALE if i==2 else BG)
            center(dr,(650,390+i*128),l,40,TEAL if i==2 else INK)
        center(dr,(650,780),'改变上下文，通常不更新权重',29,TEAL)
    elif k=='generalization':
        for i in range(2):
            x=165+i*535;roundbox(dr,(x,402,x+460,706),BG)
            center(dr,(x+230,425),ls[i],35)
            center(dr,(x+230,508),'训练集：可拟合',30,TEAL)
            center(dr,(x+230,590),'新样本：'+('可能有效' if i==0 else '通常失效'),31,ORANGE)
        center(dr,(650,754),'训练满分，无法单独说明泛化',32,TEAL)
    elif k in ('double','grok','emergence'):
        x0,y0,x1,y1=245,722,1110,386
        arrow(dr,(x0,y0),(x1+25,y0),MUTED,3);arrow(dr,(x0,y0),(x0,y1-25),MUTED,3)
        if k=='double':
            control=[(0,.72),(.14,.36),(.3,.21),(.43,.26),(.53,.93),(.60,.5),(.73,.20),(1,.1)]
            pts=[]
            for i in range(220):
                q=i/219
                for a,b in zip(control,control[1:]):
                    if a[0]<=q<=b[0]:v=a[1]+(b[1]-a[1])*ease((q-a[0])/(b[0]-a[0]));break
                pts.append((x0+q*(x1-x0),y0-v*(y0-y1)))
            lines(dr,pts,min(1,t/7),TEAL)
            center(dr,(690,757),'模型规模 →',29);tx(dr,(132,350),'测试误差',27)
            xx=x0+.53*(x1-x0);dr.line([(xx,y0),(xx,y1)],fill=LINE,width=3)
            center(dr,(xx+20,346),'插值附近',25,ORANGE)
        elif k=='grok':
            for lag,col,lab in [(.15,TEAL,'训练准确率'),(.72,ORANGE,'测试准确率')]:
                pts=[(x0+i/219*(x1-x0),y0-(.05+.9/(1+math.exp(-(i/219-lag)*30)))*(y0-y1)) for i in range(220)]
                lines(dr,pts,min(1,t/8),col)
            tx(dr,(315,361),'训练准确率',27,TEAL);tx(dr,(810,361),'测试准确率',27,ORANGE)
            center(dr,(690,757),'训练步数 →',29)
        else:
            for pow_,col in [(1,TEAL),(5,ORANGE)]:
                pts=[(x0+i/219*(x1-x0),y0-(i/219)**pow_*(y0-y1)) for i in range(220)]
                lines(dr,pts,min(1,t/7),col)
            tx(dr,(340,375),'单步成功率 p',26,TEAL);tx(dr,(735,490),'五步全对 p⁵',26,ORANGE)
            center(dr,(690,757),'底层表现逐渐提高 →',29)
            center(dr,(690,798),'只作评分直觉示意，不代表模型的实测数据',23,MUTED)
    elif k=='induction':
        labels=['A','B','…','A','B ?']
        for i,l in enumerate(labels):node(dr,(226+i*215,570),l,44,130,115,i==4)
        dr.line([(226,503),(226,398),(870,398),(870,503)],fill=TEAL,width=5)
        arrow(dr,(442,641),(1086,641),ORANGE,5)
        center(dr,(650,350),'匹配之前出现的模式',31,TEAL)
        center(dr,(650,730),'过去 A 后面出现 B，帮助预测当前的 B',30,ORANGE)
    elif k=='representation':
        pts=[(-130,-60),(-60,65),(20,-20),(120,70),(140,-90)]
        for j,cx in enumerate([375,910]):
            for a,b in [(0,1),(0,2),(2,3),(2,4),(3,4)]:
                dr.line([(cx+pts[a][0],530+pts[a][1]),(cx+pts[b][0],530+pts[b][1])],fill=LINE,width=4)
            for i,(x,y) in enumerate(pts):
                dr.ellipse((cx+x-15,530+y-15,cx+x+15,530+y+15),fill=[TEAL,ORANGE,'#668fac','#9e83ad','#7c905e'][i])
            center(dr,(cx,695),ls[j],32)
        center(dr,(650,355),'坐标可以不同，样本关系可能相似',31,TEAL)
        center(dr,(650,767),'趋同证据 → 提出假说 → 检查边界与反例',28,MUTED)
    elif k=='pipeline':
        for i in range(3):
            x=175+i*350;roundbox(dr,(x,395,x+270,660),BG,TEAL)
            center(dr,(x+135,417),ls[i],36,TEAL)
            for j in range(3):
                y=505+j*45;dr.rounded_rectangle((x+35,y,x+230,y+28),7,fill=[PALE,'#f2d9c4','#cddfe8'][(j+i)%3])
            if i<2:arrow(dr,(x+279,560),(x+336,560));pulse(dr,(x+280,560),(x+335,560),t-i)
        center(dr,(650,725),'微批次依次流经不同设备上的层',32,TEAL)
        center(dr,(650,777),'计算时间 + 数据搬运 + 设备间通信',27,MUTED)
def clean(text):return html.unescape(text).strip()
def subparts(text):
    # Split at punctuation where possible, then cap two-line subtitles at 66 characters.
    pieces=re.findall(r'[^，。！？；：]+[，。！？；：]?',clean(text))
    out=[];cur=''
    for part in pieces:
        if len(cur+part)>60 and cur:out.append(cur);cur=''
        while len(part)>60:out.append(part[:60]);part=part[60:]
        cur+=part
    if cur:out.append(cur)
    return out or [text]
def timestamp(t,comma=False):
    ms=round(t*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f'{h:02}:{m:02}:{s:02}{"," if comma else "."}{ms:03}'
timeline=[];cues=[];cursor=0
for idx,s in enumerate(D['scenes']):
    a=json.loads((WORK/'audio'/f'{idx:02}.json').read_text())
    duration=math.ceil((a['duration']/SPEED+.6)*FPS)/FPS
    sub=[]
    for e in a['events']:
        start=e['offset']/1e7/SPEED;duration_e=e['duration']/1e7/SPEED;parts=subparts(e['text']);total=sum(len(x) for x in parts)
        for part in parts:
            end=start+duration_e*len(part)/total
            sub.append(dict(start=start+.10,end=end+.10,text=part));start=end
    for c in sub:cues.append(dict(start=cursor+c['start'],end=min(cursor+duration,cursor+c['end']),text=c['text']))
    timeline.append(dict(index=idx,start=cursor,duration=duration,subtitles=sub,**s));cursor+=duration
D['duration']=cursor;D['timeline']=timeline
(ROOT/'timeline.json').write_text(json.dumps(D,ensure_ascii=False,indent=2)+'\n')
def caption(im,text):
    if not text:return
    dr=ImageDraw.Draw(im)
    rows=wrap(text,1680,35)
    if len(rows)>2:raise ValueError('Subtitle exceeds two lines: '+text)
    total=len(rows)*45;y=947-total/2
    for row in rows:
        center(dr,(960,y),row,35,INK);y+=45
def makeframe(s,t,static):
    im=static.copy();dr=ImageDraw.Draw(im)
    diagram(dr,s,t,s['duration'])
    stage=min(2,int(t/s['duration']*3));yy=360+stage*148
    dr.rounded_rectangle((1261,yy,1267,yy+80),3,fill=ORANGE)
    dr.rectangle((78,1059,1842,1064),fill=LINE)
    dr.rectangle((78,1059,78+1764*(s['start']+t)/D['duration'],1064),fill=TEAL)
    current=next((c['text'] for c in s['subtitles'] if c['start']<=t<c['end']),'')
    caption(im,current)
    return im
if '--preview' in sys.argv:
    previews=WORK/'previews';previews.mkdir(exist_ok=True)
    samples=[]
    for idx in [0,1,2,4,6,9,12,15,18,19,24,27,28,30,32,33,35]:
        s=timeline[idx];im=makeframe(s,min(13,s['duration']*.5),base(s,idx));im.save(previews/f'{idx:02}.png');samples.append(im.resize((640,360)))
    sheet=Image.new('RGB',(640*3,360*math.ceil(len(samples)/3)),BG)
    for i,im in enumerate(samples):sheet.paste(im,((i%3)*640,(i//3)*360))
    sheet.save(previews/'contact.png');print(previews/'contact.png');sys.exit()
segments=WORK/'segments';segments.mkdir(exist_ok=True)
for s in timeline:
    idx=s['index'];out=segments/f'{idx:02}.mp4'
    if out.exists():continue
    static=base(s,idx)
    cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-i',str(WORK/'audio'/f'{idx:02}.mp3'),'-map','0:v','-map','1:a','-c:v','libx264','-preset','veryfast','-crf','27','-tune','stillimage','-pix_fmt','yuv420p','-r','24','-c:a','aac','-b:a','72k','-af',f'atempo={SPEED},apad','-t',str(s['duration']),'-movflags','+faststart',str(out)]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    try:
        for fr in range(round(s['duration']*FPS)):proc.stdin.write(makeframe(s,fr/FPS,static).tobytes())
        proc.stdin.close()
        if proc.wait()!=0:raise RuntimeError(f'FFmpeg failed on scene {idx}')
    except BaseException:
        proc.kill();out.unlink(missing_ok=True);raise
    print(f'Rendered {idx+1}/{len(timeline)} {s["title"]}',flush=True)
concat=WORK/'concat.txt';concat.write_text('\n'.join(f"file '{segments / f'{i:02}.mp4'}'" for i in range(len(timeline)))+'\n')
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(ROOT/'ninety-percent-list.mp4')],check=True)
(ROOT/'subtitles.srt').write_text('\n\n'.join(f'{i+1}\n{timestamp(c["start"],True)} --> {timestamp(c["end"],True)}\n{c["text"]}' for i,c in enumerate(cues))+'\n')
(ROOT/'subtitles.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{timestamp(c["start"])} --> {timestamp(c["end"])}\n{c["text"]}' for c in cues)+'\n')
(ROOT/'chapters.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{timestamp(s["start"])} --> {timestamp(s["start"]+s["duration"])}\n{s["title"]}' for s in timeline)+'\n')
(ROOT/'narration.txt').write_text(D['title']+'\n\n'+'\n\n'.join(f'[{timestamp(s["start"])[:8]}] {s["title"]}\n'+'\n'.join(s['narration']) for s in timeline)+'\n')
makeframe(timeline[0],0,base(timeline[0],0)).save(ROOT/'poster.webp',quality=90)
print('Complete:',ROOT/'ninety-percent-list.mp4','seconds',cursor,flush=True)
