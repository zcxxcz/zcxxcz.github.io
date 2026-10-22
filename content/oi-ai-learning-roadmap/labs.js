import * as M from './lab-models.js';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(x,d=3)=>Number.isFinite(x)?x.toFixed(d):'—';
const pct=x=>`${(x*100).toFixed(1)}%`;
const button=(action,text,primary=false)=>`<button type="button" data-action="${action}"${primary?' class="lab-primary"':''}>${text}</button>`;
const metric=(label,value)=>`<div><span>${esc(label)}</span><b>${esc(value)}</b></div>`;
const svg=(body,label,w=640,h=320)=>`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${body}</svg>`;
const line=(a,b,cls='')=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="${cls}"/>`;
const txt=(x,y,text,cls='')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="middle">${esc(text)}</text>`;
const node=(x,y,label,sub='',cls='')=>`<g class="${cls}"><circle cx="${x}" cy="${y}" r="24"/>${txt(x,y+5,label)}${sub?txt(x,y+43,sub,'svg-small'):''}</g>`;
const bars=rows=>`<div class="lab-bars">${rows.map(r=>`<div class="bar-row"><span>${esc(r.label)}</span><div class="bar-track"><i style="width:${Math.max(0,Math.min(100,r.p*100))}%"></i></div><b>${esc(r.value??pct(r.p))}</b></div>`).join('')}</div>`;
const matrix=(values,label,mode='signed')=>`<div class="matrix-wrap"><span class="matrix-caption">${esc(label)}</span><div class="lab-matrix" style="--cols:${values[0]?.length||1}">${values.flatMap((row,i)=>row.map((x,j)=>`<span title="第 ${i+1} 行，第 ${j+1} 列：${num(x,6)}" style="background:${mode==='prob'?`rgba(44,97,74,${.04+.84*x})`:`${x>=0?'rgba(44,97,74,':'rgba(188,90,53,'}${.06+Math.min(.8,Math.abs(x)*.45)})`};color:${mode==='prob'&&x>.6?'white':'#183b32'}">${num(x,2)}</span>`)).join('')}</div></div>`;
function ui(root,controls){root.innerHTML=`<div class="experiment-controls">${controls}</div><div class="experiment-view"></div><div class="experiment-metrics"></div><p class="experiment-status" role="status" aria-live="polite"></p>`;return {view:$('.experiment-view',root),metrics:$('.experiment-metrics',root),status:$('.experiment-status',root)};}
function actions(root,handlers){root.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(el&&root.contains(el))handlers[el.dataset.action]?.(el);});}
function tttBoard(board,scores=[],on=false,best=-1){return `<div class="ttt-board" role="group" aria-label="井字棋棋盘，格子从左到右编号 1 至 9">${board.map((v,i)=>`<button type="button" data-cell="${i}" ${!on||v||!M.tttMoves(board).length?'disabled':''} class="${i===best?'suggested':''}" aria-label="格 ${i+1}，${v===1?'X':v===-1?'O':'空格'}"><strong>${v===1?'X':v===-1?'O':'·'}</strong><small>${v?'':scores.find(s=>s.move===i)?.label??i+1}</small></button>`).join('')}</div>`;}
const controllers={};
controllers.minimax=root=>{
 let board=Array(9).fill(0),pruning=true;
 const o=ui(root,`${button('reset','重新开局')}<label><input type="checkbox" data-prune checked> 启用 α–β 剪枝</label>${button('ai','让 O 搜索并落子',true)}`);
 function render(){const turn=M.tttPlayer(board),terminal=!M.tttMoves(board).length,analysis=board.some(Boolean)&&!terminal?M.tttAnalyze(board,turn,pruning):null;
 o.view.innerHTML=tttBoard(board,analysis?.scores.map(s=>({...s,label:s.value===1?'可强制胜':s.value===0?'可保平':'会输'})),turn===1,analysis?.move);
 o.metrics.innerHTML=metric('当前行动方',terminal?'结束':turn===1?'你 · X':'程序 · O')+metric('本次递归调用',analysis?analysis.calls.toLocaleString():'先落一子')+metric('剪枝次数',analysis?.cutoffs??0);
 o.status.textContent=terminal?(M.tttWinner(board)?`${M.tttWinner(board)===1?'X':'O'} 获胜。`:'双方最优应对时，井字棋可以保平。'):turn===1?'点击空格落 X；格内文字是当前行动方在双方最优应对下的精确结果。':'轮到 O。可先切换剪枝，比较递归调用数，再让程序落子。';
 $('[data-action="ai"]',root).disabled=terminal||turn!==-1;
 }
 root.addEventListener('click',e=>{const cell=e.target.closest('[data-cell]');if(cell&&!cell.disabled){board[+cell.dataset.cell]=1;render();}});
 actions(root,{reset:()=>{board=Array(9).fill(0);render();},ai:()=>{if(M.tttPlayer(board)===-1&&M.tttMoves(board).length){board[M.tttSolve(board,-1).move]=-1;render();}}});
 $('[data-prune]',root).onchange=e=>{pruning=e.target.checked;render();};render();
};
controllers.viterbi=root=>{
 let obs=[1,1,0,1,0,0],stay=.75,step=1;
 const o=ui(root,`<label>天气保持概率 <input data-stay type="range" min="0.1" max="0.9" step="0.05" value="0.75"></label>${button('step','推进一天',true)}${button('all','完成并回溯')}${button('reset','重走 DP')}`);
 function render(){const result=M.hmmViterbi(obs,stay),pos=(t,s)=>[52+t*105,75+s*125];let body='';
 for(let t=1;t<step;t++)for(let s=0;s<2;s++)for(let p=0;p<2;p++)body+=line(pos(t-1,p),pos(t,s),result.prev[t][s]===p?'chosen-edge':'');
 if(step===obs.length)for(let t=1;t<step;t++)body+=line(pos(t-1,result.path[t-1]),pos(t,result.path[t]),'solution-edge');
 for(let t=0;t<obs.length;t++)for(let s=0;s<2;s++){const [x,y]=pos(t,s);body+=node(x,y,s?'雨':'晴',t<step?num(result.dp[t][s],2):'待计算',t<step?(step===obs.length&&result.path[t]===s?'active-node':''):'muted-node');}
 body+=obs.map((v,t)=>txt(52+t*105,285,`第${t+1}天 ${v?'有伞':'无伞'}`)).join('');
 o.view.innerHTML=`<div class="observation-buttons" aria-label="点击改变每天是否带伞">${obs.map((v,i)=>`<button type="button" data-obs="${i}" aria-pressed="${!!v}">${i+1}日：${v?'有伞':'无伞'}</button>`).join('')}</div>${svg(body,'Viterbi 时间展开图，数字为最佳路径的对数联合概率',640,315)}`;
 o.metrics.innerHTML=metric('保持概率',pct(stay))+metric('已推进',`${step} / 6 天`)+metric('已比较转移候选',Math.max(0,step-1)*4);
 o.status.textContent=step===6?`回溯最优天气：${result.path.map(x=>x?'雨':'晴').join(' → ')}。联合概率 ${Math.exp(result.logProbability).toExponential(3)}；这是整条路径的分数，不是单日天气的后验概率。`:'先猜：连续带伞一定代表连续下雨吗？每个节点只保留到这里概率最大的前缀，数字以 log 概率显示。';
 $('[data-action="step"]',root).disabled=step===6;
 }
 root.addEventListener('click',e=>{const b=e.target.closest('[data-obs]');if(b){const i=+b.dataset.obs;obs[i]=1-obs[i];step=1;render();}});
 $('[data-stay]',root).oninput=e=>{stay=+e.target.value;step=1;render();};actions(root,{step:()=>{step=Math.min(6,step+1);render();},all:()=>{step=6;render();},reset:()=>{step=1;render();}});render();
};
controllers.bpe=root=>{
 let tokens=[],history=[],original='';const o=ui(root,`<label class="wide-control">训练文本（最多 160 字）<textarea data-corpus maxlength="160" rows="2">low lower lowest low lower low</textarea></label>${button('reset','载入文本')}${button('step','合并最高频词元对',true)}`);
 function reset(){original=$('[data-corpus]',root).value;tokens=[...original];history=[];render();}
 function render(){const pairs=M.bpePairs(tokens);o.view.innerHTML=`<div class="token-stream" aria-label="当前词元序列">${tokens.map(t=>`<span class="token${/\s/u.test(t)?' space-token':''}">${esc(t===' '?'␣':t==='\n'?'↵':t)}</span>`).join('')||'<p>输入一段文本开始。</p>'}</div>${bars(pairs.slice(0,6).map(p=>({label:p.pair.join(' + '),p:p.count/(pairs[0]?.count||1),value:`${p.count} 次`})))}<p class="trace-line">${history.length?history.map((h,i)=>`${i+1}. ${esc(h.pair.join(' + '))} → ${esc(h.pair.join(''))}（实际合并 ${h.merged} 处）`).join('<br>'):'候选对按相邻出现次数排序；平局按字符顺序处理。'}</p>`;
 o.metrics.innerHTML=metric('字符 → 词元',`${[...original].length} → ${tokens.length}`)+metric('合并轮数',history.length)+metric('拼接后是否一致',tokens.join('')===original?'完全一致':'不一致');
 o.status.textContent='先猜：aaaa 中 aa 出现 3 次，一轮会合并几处？相邻计数允许重叠，执行合并时不能重叠。空白保留为独立词元，不跨空白合并。';$('[data-action="step"]',root).disabled=!pairs.length;
 }
 actions(root,{reset,step:()=>{const result=M.bpeStep(tokens);if(result){tokens=result.tokens;history.push(result);render();}}});reset();
};
controllers.qlearning=root=>{
 let model=M.createQLearner();const o=ui(root,`<label>打滑概率 <select data-slip><option value="0.1">10%</option><option value="0">0%</option><option value="0.3">30%</option></select></label>${button('train20','训练 20 回合',true)}${button('train200','训练 200 回合')}${button('reset','重置 Q 表')}`);
 const arrows=['↑','→','↓','←'];
 function grid(q,label){return `<div><h4>${label}</h4><div class="q-grid" role="img" aria-label="${label}">${q.map((row,s)=>`<div class="${M.gridTerminal(s)?'terminal-cell':''}" style="--heat:${Math.max(0,Math.min(.8,Math.max(...row)*.7))}"><b>${s===15?'G':M.GRID.holes.includes(s)?'×':arrows[M.argmax(row)]}</b><small>${M.gridTerminal(s)?(s===15?'+1':'−1'):num(Math.max(...row),2)}</small>${s===0?'<em>S</em>':''}</div>`).join('')}</div></div>`;}
 function render(){const exact=M.gridOptimal(model.slip),evaluation=M.evaluateQ(model),error=Math.max(...model.q.flatMap((row,s)=>M.gridTerminal(s)?[0]:row.map((v,a)=>Math.abs(v-exact.q[s][a]))));
 o.view.innerHTML=`<div class="lab-pair">${grid(model.q,'采样学习的 Q 表')}${grid(exact.q,'已知转移的 DP 参照')}</div>`;o.metrics.innerHTML=metric('训练回合',model.episodes)+metric('Q 表最大绝对误差',num(error))+metric('固定 100 次评估到达率',pct(evaluation.success));
 o.status.textContent=`每步 −0.04，目标 +1，陷阱 −1；γ=0.9，α=0.35，ε=0.25。箭头为贪心动作；未学过时平局选 ↑。评估平均折扣回报 ${num(evaluation.return)}。固定学习率和有限采样下，误差与成功率都可能波动。`;
 }
 function reset(){model=M.createQLearner(7,+$('[data-slip]',root).value);render();}
 $('[data-slip]',root).onchange=reset;actions(root,{reset,train20:()=>{M.trainQ(model,20);render();},train200:()=>{M.trainQ(model,200);render();}});render();
};
const positions={win:[1,1,0,-1,-1,0,0,0,0],block:[1,0,0,0,-1,0,1,0,0],fork:[1,0,0,0,-1,0,0,0,1]};
controllers.mcts=root=>{
 let model=M.createMcts(positions.block),c=1.4;const o=ui(root,`<label>局面 <select data-position><option value="block">O 必须防守</option><option value="win">X 可以立即获胜</option><option value="fork">O 如何避免双威胁</option></select></label><label>探索系数 <input type="range" data-explore min="0" max="3" step="0.2" value="1.4"></label>${button('one','模拟 1 次')}${button('fifty','模拟 50 次',true)}${button('many','模拟 500 次')}${button('reset','重置搜索')}`);
 function render(){const s=M.mctsSummary(model),turn=model.root.player;const exact=M.tttAnalyze(model.root.board,turn);o.view.innerHTML=`<div class="lab-pair"><div>${tttBoard(model.root.board,[],false,s.move)}<p class="small">轮到 ${turn===1?'X':'O'}；描边格为访问最多的选择。</p></div><div>${bars(s.options.map(x=>({label:`格 ${x.move+1}`,p:x.visits/Math.max(1,s.iterations),value:`${x.visits} 次 · ${num(x.value,2)}`})))}<p class="small">条长：访问占比。右侧：访问数 · 平均回报（胜 1 / 平 0.5 / 负 0）。</p></div></div>`;
 o.metrics.innerHTML=metric('累计模拟',s.iterations)+metric('探索系数 c',num(c,1))+metric('精确最优格',exact.scores.filter(x=>x.value===exact.value).map(x=>x.move+1).join('、'));
 o.status.textContent='先用 1 次模拟判断，再增加预算。UCT 在已有高回报和少访问分支之间取舍；树外使用随机对弈。采样回报不是“双方最优应对”的胜率，预算有限时也可能选错。';
 }
 function reset(){model=M.createMcts(positions[$('[data-position]',root).value]);render();}
 $('[data-position]',root).onchange=reset;$('[data-explore]',root).oninput=e=>{c=+e.target.value;render();};actions(root,{reset,one:()=>{M.runMcts(model,1,c);render();},fifty:()=>{M.runMcts(model,50,c);render();},many:()=>{M.runMcts(model,500,c);render();}});render();
};
controllers.autodiff=root=>{
 let params={x:1.2,w:.6,b:-.2,y:1},step=0;const o=ui(root,`<label>权重 w <input data-weight type="range" min="-1" max="2" value="0.6" step="0.05"></label>${button('step','反向传播一步',true)}${button('all','完成反传')}${button('learn','梯度下降 1 步（η=0.1）')}${button('reset','重置参数')}`);
 const pos=[[45,65],[45,180],[210,250],[365,265],[205,100],[365,125],[505,180],[645,180]];
 function render(){const result=M.autodiff(params),frame=result.frames[step];let body='<defs><marker id="autodiff-back-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 Z" fill="#bc5a35"/></marker></defs>';result.nodes.forEach((n,i)=>n.parents.forEach(([p],j)=>{body+=line([pos[p][0]+25,pos[p][1]+(i===7?(j?8:-8):0)],[pos[i][0]-25,pos[i][1]+(i===7?(j?8:-8):0)],i===frame.active?'solution-edge':'').replace('/>',i===frame.active?' marker-start="url(#autodiff-back-arrow)"/>':'/>');}));
 result.nodes.forEach((n,i)=>{body+=node(...pos[i],n.name,`${num(n.value,2)} | ∂=${num(frame.gradients[i],2)}`,i===frame.active?'active-node':'');});
 o.view.innerHTML=svg(body,'计算图：x 乘 w，加 b，减 y，平方得损失；节点下显示数值和累计梯度',700,330)+`<p class="trace-line">${frame.updates.length?frame.updates.map(u=>`向 ${esc(result.nodes[u.parent].name)} 累加：${num(frame.gradients[frame.active],2)} × ${num(u.local,2)} = ${num(u.contribution,3)}`).join('<br>'):'从损失节点的梯度 1 出发，按逆拓扑顺序传播。平方有两条边通向同一个父节点。'}</p>`;
 const eps=1e-5,finite=(M.autodiff({...params,w:params.w+eps}).loss-M.autodiff({...params,w:params.w-eps}).loss)/(2*eps);
 o.metrics.innerHTML=metric('损失 (xw+b−y)²',num(result.loss,5))+metric('w 的解析梯度',num(result.gradients[1],5))+metric('与数值差分误差',Math.abs(finite-result.gradients[1]).toExponential(1));
 o.status.textContent=`x=1.2，y=1，w=${num(params.w,3)}，b=${num(params.b,3)}。节点下为“前向值 | 当前累计梯度”。梯度下降会同时更新 w、b；改变滑块会重走反向传播。`;$('[data-action="step"]',root).disabled=step>=result.frames.length-1;
 }
 $('[data-weight]',root).oninput=e=>{params.w=+e.target.value;step=0;render();};actions(root,{step:()=>{step=Math.min(8,step+1);render();},all:()=>{step=8;render();},learn:()=>{const g=M.autodiff(params).gradients;params.w-=.1*g[1];params.b-=.1*g[2];$('[data-weight]',root).value=params.w;step=0;render();},reset:()=>{params={x:1.2,w:.6,b:-.2,y:1};step=0;$('[data-weight]',root).value=.6;render();}});render();
};
controllers.language=root=>{
 let model=M.createTinyLM(),generated=null,seed=51;const o=ui(root,`<label>观察序列 <input data-sequence value="·(())" maxlength="9" spellcheck="false" aria-label="观察序列，只保留括号和起始符"></label><label><input type="checkbox" data-mask checked> 因果遮罩</label>${button('train','训练输出头 500 步',true)}${button('generate','采样生成')}${button('reset','重置模型')}`);
 function render(){const masked=$('[data-mask]',root).checked,text='·'+$('[data-sequence]',root).value.replace(/[^()]/g,'').slice(0,8),features=M.lmFeatures(text,masked),p=M.lmDistribution(model,features.at(-1).features);
 o.view.innerHTML=`<div class="lab-pair">${matrix(features.map(f=>f.weights),`注意力：行读取列 · ${esc(text)}（· 是起始符）`,'prob')}<div><h4>最后一个位置预测下一个词元</h4>${bars(M.lmTokens.map((t,i)=>({label:t==='□'?'结束 □':t,p:p[i]})))}<div class="generated-text">${esc(generated===null?'点击“采样生成”':generated||'（模型立即生成了结束符）')}<small>${generated!==null?M.bracketCheck(generated).valid?'栈检查：括号合法':'栈检查：括号不合法':'生成后用精确栈算法验收'}</small></div></div></div>`;
 o.metrics.innerHTML=metric('输出头更新',model.steps)+metric('训练集交叉熵',num(M.tinyLMLoss(model)))+metric('可训练参数',40);
 o.status.textContent=masked?'先猜：关掉遮罩后，矩阵右上角会发生什么？训练语料为所有 1—3 对合法括号；输出头通过交叉熵训练。生成始终逐个词元进行，可能不合法。':'遮罩已关闭：前面的位置可以读到后续符号。这是信息泄漏演示；训练和生成仍使用因果特征，当前显示不代表模型接受了无掩码训练。';
 }
 $('[data-sequence]',root).oninput=render;$('[data-mask]',root).onchange=render;actions(root,{train:()=>{M.trainTinyLM(model,500);render();},generate:()=>{generated=M.lmGenerate(model,12,seed++);render();},reset:()=>{model=M.createTinyLM();generated=null;seed=51;render();}});render();
};
controllers.value=root=>{
 let net=M.createValueNetwork(),board=positions.block.slice(),search=null;const data=M.valueExamples(),test=M.valueExamples(93,80).filter(x=>!data.some(y=>y.board.join()===x.board.join()));
 const o=ui(root,`<label>测试局面 <select data-position><option value="block">防守</option><option value="win">立即获胜</option><option value="fork">双威胁</option></select></label>${button('train','训练价值网络 500 步',true)}${button('search','用当前网络搜索 200 次')}${button('reset','重置网络')}`);
 function render(){const turn=M.tttPlayer(board),moves=M.tttMoves(board),estimated=moves.map(move=>{const b=board.slice();b[move]=turn;return {move,value:M.predictValue(net,b)*turn};}),best=estimated.reduce((a,b)=>b.value>a.value?b:a),exact=M.tttSolve(board,turn),summary=search&&M.mctsSummary(search);
 o.view.innerHTML=`<div class="lab-pair"><div>${tttBoard(board,estimated.map(x=>({...x,label:num(x.value,2)})),false,summary?.move??best.move)}<p class="small">格内：走这一格后的网络估值，已换算为行动方视角。</p></div><div>${bars(estimated.map(x=>({label:`格 ${x.move+1}`,p:(x.value+1)/2,value:num(x.value,3)})))}<p>网络直接选：格 ${best.move+1}<br>网络 + 搜索：${summary?`格 ${summary.move+1}（${summary.iterations} 次）`:'尚未运行'}<br>精确搜索一组最优选择：${M.tttAnalyze(board,turn).scores.filter(x=>x.value===exact.value).map(x=>x.move+1).join('、')}</p></div></div>`;
 o.metrics.innerHTML=metric('训练更新',net.steps)+metric('训练 MSE',num(M.valueLoss(net,data)))+metric(`留出 ${test.length} 个局面 MSE`,num(M.valueLoss(net,test)));
 o.status.textContent='标签由精确 Minimax 自动生成，89 参数的 tanh 网络拟合 X 视角的 −1/0/1 价值。搜索在叶节点调用网络；训练后必须重新搜索。留出局面仍来自同一随机生成方式，单个局面变好不能证明普遍提升。';
 }
 $('[data-position]',root).onchange=e=>{board=positions[e.target.value].slice();search=null;render();};actions(root,{train:()=>{M.trainValue(net,data,500);search=null;render();},search:()=>{search=M.createMcts(board,M.tttPlayer(board),21,net);M.runMcts(search,200);render();},reset:()=>{net=M.createValueNetwork();search=null;render();}});render();
};
controllers.tsp=root=>{
 let seed=8,points=[],route=[0],temperature=.2,random=M.rng(7),showExact=false;
 const o=ui(root,`<label>城市数 <select data-count><option>7</option><option>5</option><option>9</option></select></label><label>采样温度 <input data-temp type="range" min="0.05" max="1" step="0.05" value="0.2"></label>${button('step','按概率选下一城',true)}${button('finish','完成路线')}${button('nearest','最近邻')}${button('improve','2-opt 改善')}${button('exact','显示精确路线')}${button('restart','重走这张图')}${button('new','换一张图')}`);
 function reset(newPoints=false){if(newPoints){const r=M.rng(seed++);points=[];const count=+$('[data-count]',root).value;for(let tries=0;points.length<count&&tries<1000;tries++){const candidate=[.08+r()*.84,.08+r()*.84];if(points.every(p=>Math.hypot((p[0]-candidate[0])*600,(p[1]-candidate[1])*315)>=70))points.push(candidate);}if(points.length<count)points=Array.from({length:count},(_,i)=>[.15+(i%3)*.35,.15+Math.floor(i/3)*.35]);}route=[0];random=M.rng(7);showExact=false;render();}
 function append(){const opts=M.pointerOptions(points,route,temperature);if(opts.length)route.push(opts[M.sample(opts.map(x=>x.p),random)].node);}
 function render(){const exact=M.tspOptimal(points),complete=route.length===points.length,opts=M.pointerOptions(points,route,temperature);let body='';const pos=i=>[points[i][0]*600+20,points[i][1]*315+5];
 if(showExact)exact.route.forEach((n,i)=>{body+=line(pos(n),pos(exact.route[(i+1)%points.length]),'exact-tour');});route.forEach((n,i)=>{if(i)body+=line(pos(route[i-1]),pos(n),'solution-edge');});if(complete)body+=line(pos(route.at(-1)),pos(0),'solution-edge');points.forEach((p,i)=>{body+=node(...pos(i),i+1,'',route.includes(i)?'active-node':'');});
 o.view.innerHTML=`<div class="lab-pair"><div>${svg(body,'旅行商路线：实线为构造路线，橙色虚线为精确最优路线',640,350)}</div><div><h4>未访问城市的选择概率</h4>${bars(opts.map(x=>({label:`城市 ${x.node+1}`,p:x.p})))}<p class="trace-line">${route.map(i=>i+1).join(' → ')}${complete?' → 1':''}</p></div></div>`;
 o.metrics.innerHTML=metric('当前闭合路线',complete?num(M.tourLength(points,route)):'尚未完成')+metric('精确最优长度',num(exact.length))+metric('相对最优差距',complete?pct(M.tourLength(points,route)/exact.length-1):'—')+metric('DP 转移次数',exact.transitions);
 o.status.textContent=`温度 ${num(temperature,2)}，概率正比于 exp(−距离 / 温度)，已访问城市被屏蔽。这个“指针”使用手设距离打分，没有学习权重。尝试低温度、随机采样和 2-opt，检查它们是否总能得到全局最优。`;
 ['step','finish','nearest'].forEach(a=>$(`[data-action="${a}"]`,root).disabled=complete);$('[data-action="improve"]',root).disabled=!complete;
 }
 $('[data-count]',root).onchange=()=>reset(true);$('[data-temp]',root).oninput=e=>{temperature=+e.target.value;render();};actions(root,{step:()=>{append();render();},finish:()=>{while(route.length<points.length)append();render();},nearest:()=>{while(route.length<points.length)route.push(M.pointerOptions(points,route).reduce((a,b)=>b.distance<a.distance?b:a).node);render();},improve:()=>{route=M.twoOpt(points,route);render();},exact:()=>{showExact=!showExact;render();},restart:()=>reset(),new:()=>reset(true)});reset(true);
};
controllers.attention=root=>{
 let step=0;const o=ui(root,`<label>键分块大小 <select data-block><option>2</option><option>1</option><option>4</option><option>8</option></select></label><label>Q/K 尺度 <select data-scale><option value="1">1</option><option value="100">100（大分数）</option></select></label>${button('step','处理下一块',true)}${button('all','处理全部')}${button('reset','重新计算')}`);
 function render(){const {q,k,v}=M.attentionFixture(+$('[data-scale]',root).value),block=+$('[data-block]',root).value,full=M.fullAttention(q,k,v),online=M.blockedAttention(q,k,v,block),frame=online.frames[step-1],output=frame?.output||Array.from({length:8},()=>[0,0]);
 const err=Math.max(...full.output.flatMap((row,i)=>row.map((x,j)=>Math.abs(x-output[i][j]))));
 o.view.innerHTML=`<div class="block-strip" aria-label="已处理键的位置">${Array.from({length:8},(_,i)=>`<span class="${i<(frame?.end||0)?'processed':''}">K${i+1}</span>`).join('')}</div><div class="lab-pair">${matrix(full.output,'完整注意力输出 O（8 × 2）')}${matrix(output,'分块累计输出（归一化后）')}</div><p class="trace-line">第一行在线状态：m = ${frame?num(frame.m[0],2):'−∞'}，l = ${frame?num(frame.l[0],4):'0'}。新块最大值改变时，旧累积量先乘 exp(m旧−m新)，再加入新块。</p>`;
 o.metrics.innerHTML=metric('已处理块',`${step} / ${online.frames.length}`)+metric('当前输出最大绝对误差',err.toExponential(2))+metric('分数区元素：完整 / 每块',`64 / ${8*block}`);
 o.status.textContent=step===online.frames.length?'所有块已处理，结果与完整注意力在浮点误差范围内一致。分数矩阵无需一次保存 64 个元素；仍需保存 Q、K、V、输出和每行的累计状态。':'先猜：不保存完整 softmax 矩阵，也能得到同一个输出吗？每次只处理一组键；处理完之前的误差是“只见部分键”的差异，不是算法最终误差。';$('[data-action="step"]',root).disabled=step===online.frames.length;
 }
 const reset=()=>{step=0;render();};$('[data-block]',root).onchange=reset;$('[data-scale]',root).onchange=reset;actions(root,{reset,step:()=>{step++;render();},all:()=>{step=Math.ceil(8/+$('[data-block]',root).value);render();}});render();
};
controllers.ngram=root=>{
 let generated='',seed=7;const o=ui(root,`<label class="wide-control">语料（最多 200 字）<textarea data-corpus rows="2" maxlength="200">小猫喜欢鱼，小狗喜欢骨头。小猫喜欢睡觉，小狗喜欢散步。小猫和小狗一起散步。</textarea></label><label>上下文阶数 <select data-order><option value="1">1 个字符</option><option value="0">0 · 只计字符</option><option value="2">2 个字符</option></select></label><label>查询上下文 <input data-context maxlength="4" value="欢"></label>${button('generate','生成 40 字',true)}${button('reset','重置采样种子')}`);
 function render(){const corpus=$('[data-corpus]',root).value,order=+$('[data-order]',root).value,context=$('[data-context]',root).value,options=M.ngramCounts(corpus,order,context);o.view.innerHTML=`<div class="lab-pair"><div><h4>这个上下文之后，出现过什么？</h4>${options.length?bars(options.map(x=>({label:x.char===' '?'␣':x.char,p:x.p,value:`${x.count} 次 · ${pct(x.p)}`}))):'<p>语料中没有这个上下文。试试“欢”或“喜欢”。</p>'}</div><div class="generated-text">${esc(generated||'试试改变上下文长度，再生成。')}<small>输出是采样拼接，不是原文检索。</small></div></div>`;
 o.metrics.innerHTML=metric('语料字符数',[...corpus].length)+metric('条件频次总和',options.reduce((s,x)=>s+x.count,0))+metric('上下文阶数',order);
 o.status.textContent='同一条件下，下一字符概率 = 出现次数 / 条件频次总和。0 阶忽略上下文；1、2 阶可用哈希表统计。生成遇到未见上下文时回退到 0 阶。更长的上下文并不保证更懂语义。';
 }
 $$('textarea,input,select',root).forEach(el=>el.addEventListener('input',()=>{generated='';render();}));actions(root,{generate:()=>{generated=M.ngramGenerate($('[data-corpus]',root).value,+$('[data-order]',root).value,40,seed++);render();},reset:()=>{seed=7;generated='';render();}});render();
};
controllers.lora=root=>{
 let model=M.createLora();const o=ui(root,`<label>秩 r <select data-rank><option>2</option><option>1</option><option>3</option></select></label>${button('train','拟合 100 步',true)}${button('reset','重新拟合')}`);
 function render(){const update=M.loraUpdate(model),low=M.matrixMSE(update,model.target),full=M.matrixMSE(model.full,model.target);o.view.innerHTML=`<div class="lab-triple">${matrix(model.target,'目标更新 ΔW（秩为 2）')}${matrix(update,`低秩更新 B₆×${model.rank} A${model.rank}×₆`)}${matrix(model.full,'全矩阵更新参照')}</div><div class="rank-diagram"><span>基础权重 W₀<br><b>36 · 冻结并保留</b></span><b>＋</b><span>低秩更新 B × A<br><b>${12*model.rank} · 可训练</b></span></div>`;
 o.metrics.innerHTML=metric('更新步数',model.steps)+metric('低秩 MSE',low.toExponential(2))+metric('全矩阵 MSE',full.toExponential(2))+metric('可训练参数：低秩 / 全量',`${12*model.rank} / 36`);
 o.status.textContent='先猜：目标更新由两个独立方向组成，r=1 能完全拟合吗？两种方法对同一 6×6 目标做梯度下降；r=3 时可训练参数已与全矩阵相同。这里只拟合权重差矩阵，不训练语言模型，也不测显存。';
 }
 const reset=()=>{model=M.createLora(+$('[data-rank]',root).value);render();};$('[data-rank]',root).onchange=reset;actions(root,{reset,train:()=>{M.trainLora(model,100);render();}});render();
};
controllers.graph=root=>{
 let step=0,source=0;const o=ui(root,`<label><input data-bridge type="checkbox"> 加一条跨分量的桥</label><label>判断阈值 <input data-threshold type="range" min="0.01" max="0.3" step="0.01" value="0.1"></label>${button('step','聚合一层',true)}${button('reset','从源点重来')}`);
 function render(){const {points,edges}=M.graphFixture($('[data-bridge]',root).checked),result=M.graphMessages(7,edges,source,step),threshold=+$('[data-threshold]',root).value,pos=i=>[points[i][0]*600+20,points[i][1]*330+5];let body=edges.map(([a,b])=>line(pos(a),pos(b))).join('');points.forEach((p,i)=>{const [x,y]=pos(i);body+=`<g class="graph-click" data-node="${i}" role="button" tabindex="0" aria-label="选择节点 ${i+1} 为源点"><circle cx="${x}" cy="${y}" r="29" style="fill:rgba(44,97,74,${.08+.85*result.values[i]});stroke:${i===source?'#bc5a35':'#2c614a'};stroke-width:${i===source?4:1.5}"/>${txt(x,y+5,i+1)}${txt(x,y+48,num(result.values[i],3),'svg-small')}</g>`;});
 const predicted=result.values.flatMap((v,i)=>v>=threshold?[i]:[]),errors=Array.from({length:7},(_,i)=>i).filter(i=>predicted.includes(i)!==result.reachable.includes(i));
 o.view.innerHTML=`<div class="lab-pair">${svg(body,'图上的均值消息传递，点击节点改变源点；节点下方为特征值',640,330)}<div><h4>与精确可达性比较</h4><p>BFS 可达：${result.reachable.map(i=>i+1).sort().join('、')}<br>阈值预测：${predicted.map(i=>i+1).join('、')||'无'}<br>不一致节点：${errors.map(i=>i+1).join('、')||'无'}</p><p class="trace-line">hᵏ⁺¹ᵢ = mean({hᵏⱼ : j ∈ 邻居(i) ∪ {i}})</p></div></div>`;
 o.metrics.innerHTML=metric('消息传递层数',step)+metric('源点',source+1)+metric('阈值',num(threshold,2))+metric('与 BFS 不一致数',errors.length);
 o.status.textContent='点击节点换源点。每层同时聚合上一层的邻居值（含自己）；k 层只能接收 k 跳以内的信息。特征会被平均稀释，所以“数值低于阈值”不代表不可达。加桥后，观察消息需要几层才能跨过去。';$('[data-action="step"]',root).disabled=step>=12;
 }
 const reset=()=>{step=0;render();};$('[data-bridge]',root).onchange=reset;$('[data-threshold]',root).oninput=render;
 function select(e){const n=e.target.closest('[data-node]');if(n){source=+n.dataset.node;step=0;render();}}
 root.addEventListener('click',select);root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-node]')){e.preventDefault();select(e);}});actions(root,{step:()=>{step++;render();},reset});render();
};
const tabs=$$('[data-lab-tab]'),panes=$$('.experiment-pane'),mounted=new Set();
function selectLab(id,hash=false){if(!panes.some(p=>p.id===`experiment-${id}`))return;
 panes.forEach(p=>p.hidden=p.id!==`experiment-${id}`);tabs.forEach(b=>{const active=b.dataset.labTab===id;b.setAttribute('aria-pressed',String(active));});
 const pane=$(`#experiment-${id}`),host=$('[data-experiment]',pane);if(host&&!mounted.has(id)){controllers[id](host);mounted.add(id);}
 $('#lab-select').value=id;
 document.dispatchEvent(new CustomEvent('labchange',{detail:{id}}));if(hash)history.replaceState(null,'',`#experiment-${id}`);
 $('#lab-current').textContent=`${String(tabs.findIndex(b=>b.dataset.labTab===id)+1).padStart(2,'0')} / 14 · ${$('h3',pane).textContent}`;
}
tabs.forEach(b=>b.addEventListener('click',()=>{selectLab(b.dataset.labTab,true);$('.lab-switcher').scrollIntoView({block:'start',behavior:'instant'});}));
$('#lab-select').addEventListener('change',e=>selectLab(e.target.value,true));
function fromHash(){const match=location.hash.match(/^#experiment-([a-z]+)$/);if(match)selectLab(match[1]);}
window.addEventListener('hashchange',fromHash);document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#experiment-"]');if(a)selectLab(a.hash.slice(12));});
selectLab('search');fromHash();
