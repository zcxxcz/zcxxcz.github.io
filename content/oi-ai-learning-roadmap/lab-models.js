/* Small, deterministic teaching models. UI readouts are computed from these functions. */
export function rng(seed = 1) {
  let t = seed >>> 0;
  return () => { t += 0x6D2B79F5; let x = t; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; };
}
export const argmax = a => a.reduce((best, x, i) => x > a[best] ? i : best, 0);
export function softmax(xs) { const m = Math.max(...xs); const ex = xs.map(x => Math.exp(x - m)); const z = ex.reduce((a, b) => a + b, 0); return ex.map(x => x / z); }
export function sample(probs, random) { let r = random(); for (let i = 0; i < probs.length; i++) { r -= probs[i]; if (r <= 0) return i; } return probs.length - 1; }
export const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);

// --- Exact tic-tac-toe and adversarial search ---
const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export function tttWinner(board) { for (const [a,b,c] of lines) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]; return 0; }
export function tttMoves(board) { return tttWinner(board) ? [] : board.flatMap((v, i) => v === 0 ? [i] : []); }
export function tttPlayer(board) { return board.filter(x => x === 1).length === board.filter(x => x === -1).length ? 1 : -1; }
const tttMemo = new Map();
export function tttSolve(board, player = tttPlayer(board)) {
  const win = tttWinner(board), moves = tttMoves(board);
  if (win || !moves.length) return { value: win * player, move: -1 };
  const key = board.join(',') + ':' + player;
  if (tttMemo.has(key)) return tttMemo.get(key);
  let best = -2, choice = -1;
  for (const move of moves) { const next = board.slice(); next[move] = player; const value = -tttSolve(next, -player).value; if (value > best) { best = value; choice = move; } }
  const result = { value: best, move: choice }; tttMemo.set(key, result); return result;
}
export function tttAnalyze(board, player = tttPlayer(board), pruning = true) {
  let calls = 0, cutoffs = 0;
  function visit(b, turn, alpha, beta) {
    calls++;
    const win = tttWinner(b), moves = tttMoves(b);
    if (win || !moves.length) return win * turn;
    let best = -2;
    for (const move of moves) {
      const next = b.slice(); next[move] = turn;
      const value = -visit(next, -turn, -beta, -alpha);
      best = Math.max(best, value); alpha = Math.max(alpha, value);
      if (pruning && alpha >= beta) { cutoffs++; break; }
    }
    return best;
  }
  const scores = tttMoves(board).map(move => { const next = board.slice(); next[move] = player; return { move, value: -visit(next, -player, -Infinity, Infinity) }; });
  const best = scores.length ? scores.reduce((a, b) => b.value > a.value ? b : a) : { move: -1, value: tttWinner(board) * player };
  return { scores, calls, cutoffs, ...best };
}

// --- Viterbi in log space; initial state and emissions are explicit ---
export function hmmViterbi(observations, stay = .75) {
  const prior = [.5, .5], trans = [[stay, 1-stay],[1-stay, stay]], emission = [[.8,.2],[.15,.85]];
  const dp = [], prev = []; let comparisons = 0;
  for (let t = 0; t < observations.length; t++) {
    dp[t] = []; prev[t] = [];
    for (let state = 0; state < 2; state++) {
      const emit = Math.log(emission[state][observations[t]]);
      if (!t) { dp[t][state] = Math.log(prior[state]) + emit; prev[t][state] = -1; }
      else {
        const candidates = dp[t-1].map((v, i) => v + Math.log(trans[i][state])); comparisons += 2;
        const best = argmax(candidates); dp[t][state] = candidates[best] + emit; prev[t][state] = best;
      }
    }
  }
  const path = Array(observations.length);
  if (path.length) { path[path.length-1] = argmax(dp.at(-1)); for (let t = path.length-1; t > 0; t--) path[t-1] = prev[t][path[t]]; }
  return { dp, prev, path, comparisons, logProbability: path.length ? Math.max(...dp.at(-1)) : 0, trans, emission, prior };
}
export function hmmPathProbability(path, obs, stay=.75) {
  if (!path.length) return 1;
  const emission = [[.8,.2],[.15,.85]]; let p = .5 * emission[path[0]][obs[0]];
  for(let i=1;i<path.length;i++) p *= (path[i]===path[i-1] ? stay : 1-stay) * emission[path[i]][obs[i]];
  return p;
}

// --- BPE over characters; whitespace is retained and never merged ---
export function bpePairs(tokens) {
  const counts = new Map();
  for(let i=0;i<tokens.length-1;i++) {
    const a=tokens[i],b=tokens[i+1]; if (/\s/u.test(a+b)) continue;
    const key=JSON.stringify([a,b]); counts.set(key,(counts.get(key)||0)+1);
  }
  return [...counts].map(([key,count])=>({pair:JSON.parse(key),count,key})).sort((a,b)=>b.count-a.count || (a.key<b.key?-1:a.key>b.key?1:0));
}
export function bpeStep(tokens) {
  const pairs=bpePairs(tokens); if(!pairs.length)return null;
  const {pair,count}=pairs[0],next=[];
  for(let i=0;i<tokens.length;i++) {
    if(tokens[i]===pair[0] && tokens[i+1]===pair[1]) {next.push(pair.join(''));i++;} else next.push(tokens[i]);
  }
  return {tokens:next,pair,count,merged:tokens.length-next.length};
}

// --- A small stochastic grid MDP, exact DP reference, and sampled Q updates ---
export const GRID = {width:4,height:4,start:0,goal:15,holes:[5,11]};
export const gridTerminal = s => s===GRID.goal || GRID.holes.includes(s);
export function gridTransitions(state, action, slip=.1) {
  if(gridTerminal(state))return [{state,p:1,reward:0,done:true}];
  const dirs=[[-1,0],[0,1],[1,0],[0,-1]], totals=new Map();
  for(const [a,p] of [[action,1-slip],[(action+1)%4,slip/2],[(action+3)%4,slip/2]]) {
    const r=Math.floor(state/4),c=state%4,[dr,dc]=dirs[a];
    const nr=Math.max(0,Math.min(3,r+dr)),nc=Math.max(0,Math.min(3,c+dc)),s=nr*4+nc;
    totals.set(s,(totals.get(s)||0)+p);
  }
  return [...totals].map(([s,p])=>({state:s,p,reward:s===15?1:GRID.holes.includes(s)?-1:-.04,done:gridTerminal(s)}));
}
export function gridOptimal(slip=.1,gamma=.9) {
  let values=Array(16).fill(0),iterations=0;
  while(iterations++<1000) {
    const next=values.map((v,s)=>gridTerminal(s)?0:Math.max(...[0,1,2,3].map(a=>gridTransitions(s,a,slip).reduce((sum,t)=>sum+t.p*(t.reward+(t.done?0:gamma*values[t.state])),0))));
    const delta=Math.max(...next.map((v,s)=>Math.abs(v-values[s]))); values=next;if(delta<1e-12)break;
  }
  const q=values.map((v,s)=>[0,1,2,3].map(a=>gridTransitions(s,a,slip).reduce((sum,t)=>sum+t.p*(t.reward+(t.done?0:gamma*values[t.state])),0)));
  return {values,q,policy:q.map(argmax),iterations};
}
export function createQLearner(seed=7,slip=.1) {return {q:Array.from({length:16},()=>[0,0,0,0]),random:rng(seed),episodes:0,slip,gamma:.9,alpha:.35,epsilon:.25,visits:Array(16).fill(0)};}
export function trainQ(model,episodes=20) {
  for(let n=0;n<episodes;n++) {
    let state=0;
    for(let step=0;step<100;step++) {
      const a=model.random()<model.epsilon?Math.floor(model.random()*4):argmax(model.q[state]);
      const transitions=gridTransitions(state,a,model.slip),t=transitions[sample(transitions.map(x=>x.p),model.random)];
      const target=t.reward+(t.done?0:model.gamma*Math.max(...model.q[t.state]));
      model.q[state][a]+=model.alpha*(target-model.q[state][a]);model.visits[state]++;state=t.state;if(t.done)break;
    }
    model.episodes++;
  }
  return model;
}
export function evaluateQ(model,trials=100,seed=931) {
  const random=rng(seed); let wins=0,total=0;
  for(let n=0;n<trials;n++) {let state=0,value=0,discount=1;for(let step=0;step<100;step++) {const a=argmax(model.q[state]),ts=gridTransitions(state,a,model.slip),t=ts[sample(ts.map(x=>x.p),random)];value+=discount*t.reward;discount*=model.gamma;state=t.state;if(t.done){if(state===15)wins++;break;}}total+=value;}
  return {success:wins/trials,return:total/trials};
}

// --- MCTS. Each child stores reward from the player who chose that child. ---
function mctsNode(board,player,move=-1,parent=null) {return {board:board.slice(),player,move,parent,children:[],untried:tttMoves(board),visits:0,reward:0};}
export function createMcts(board,player=tttPlayer(board),seed=21,network=null) {return {root:mctsNode(board,player),random:rng(seed),network,iterations:0};}
export function runMcts(model,count=20,exploration=1.4) {
  for(let iteration=0;iteration<count;iteration++) {
    let node=model.root;
    while(!node.untried.length && node.children.length) {
      node=node.children.reduce((best,c)=>{
        const ucb=x=>x.visits?x.reward/x.visits+exploration*Math.sqrt(Math.log(Math.max(1,x.parent.visits))/x.visits):Infinity;
        return ucb(c)>ucb(best)?c:best;
      });
    }
    if(node.untried.length) {
      const j=Math.floor(model.random()*node.untried.length),move=node.untried.splice(j,1)[0],b=node.board.slice();b[move]=node.player;
      const child=mctsNode(b,-node.player,move,node);node.children.push(child);node=child;
    }
    let outcome;
    if(tttWinner(node.board)||!tttMoves(node.board).length)outcome=tttWinner(node.board);
    else if(model.network)outcome=predictValue(model.network,node.board);
    else {
      const b=node.board.slice();let player=node.player;
      while(!tttWinner(b) && tttMoves(b).length) {const moves=tttMoves(b),move=moves[Math.floor(model.random()*moves.length)];b[move]=player;player=-player;}
      outcome=tttWinner(b);
    }
    for(let p=node;p;p=p.parent) {p.visits++;p.reward+=(1+outcome*(-p.player))/2;}
    model.iterations++;
  }
  return mctsSummary(model);
}
export function mctsSummary(model) {
  const options=model.root.children.map(c=>({move:c.move,visits:c.visits,value:c.visits?c.reward/c.visits:.5})).sort((a,b)=>a.move-b.move);
  return {iterations:model.iterations,options,move:options.length?options.reduce((a,b)=>b.visits>a.visits?b:a).move:-1};
}

// --- An actual small value network; training labels come from exact minimax. ---
export function createValueNetwork(seed=11) {
  const random=rng(seed),hidden=8;
  return {w:Array.from({length:hidden},()=>Array.from({length:9},()=> (random()-.5)*.6)),b:Array(hidden).fill(0),v:Array.from({length:hidden},()=> (random()-.5)*.5),c:0,steps:0};
}
function valueForward(net,board) {const h=net.w.map((row,i)=>Math.tanh(dot(row,board)+net.b[i]));return {h,value:Math.tanh(dot(h,net.v)+net.c)};}
export const predictValue=(net,board)=>valueForward(net,board).value;
export function valueExamples(seed=17,count=120) {
  const random=rng(seed),data=[],seen=new Set();
  for(let attempts=0;data.length<count && attempts<count*30;attempts++) {
    const b=Array(9).fill(0);let player=1;const depth=1+Math.floor(random()*7);
    for(let t=0;t<depth;t++) {const moves=tttMoves(b);if(!moves.length)break;b[moves[Math.floor(random()*moves.length)]]=player;player=-player;}
    const key=b.join(',');if(seen.has(key))continue;seen.add(key);
    data.push({board:b,target:tttSolve(b,player).value*player});
  }
  return data;
}
export function trainValue(net,data,steps=200,lr=.025) {
  for(let step=0;step<steps;step++) {
    const sample=data[net.steps%data.length],{h,value}=valueForward(net,sample.board),delta=2*(value-sample.target)*(1-value*value);
    const old=net.v.slice();
    for(let j=0;j<h.length;j++) {const d=delta*old[j]*(1-h[j]*h[j]);for(let k=0;k<9;k++)net.w[j][k]-=lr*d*sample.board[k];net.b[j]-=lr*d;net.v[j]-=lr*delta*h[j];}
    net.c-=lr*delta;net.steps++;
  }
  return valueLoss(net,data);
}
export const valueLoss=(net,data)=>data.reduce((sum,x)=>sum+(predictValue(net,x.board)-x.target)**2,0)/data.length;

// --- Reverse-mode autodiff on a small DAG, including a reused parent. ---
export function autodiff({x=1.2,w=.6,b=-.2,y=1}={}) {
  const nodes=[{name:'x',value:x,parents:[]},{name:'w',value:w,parents:[]},{name:'b',value:b,parents:[]},{name:'y',value:y,parents:[]}];
  nodes.push({name:'×',value:x*w,parents:[[0,w],[1,x]]});
  nodes.push({name:'+',value:x*w+b,parents:[[4,1],[2,1]]});
  const diff=x*w+b-y;nodes.push({name:'−',value:diff,parents:[[5,1],[3,-1]]});
  nodes.push({name:'平方',value:diff*diff,parents:[[6,diff],[6,diff]]});
  const gradients=Array(nodes.length).fill(0);gradients[7]=1;
  const frames=[{active:-1,gradients:gradients.slice(),updates:[]}];
  for(let i=nodes.length-1;i>=0;i--) {
    const updates=[];for(const [parent,local] of nodes[i].parents) {const contribution=gradients[i]*local;gradients[parent]+=contribution;updates.push({parent,local,contribution});}
    frames.push({active:i,gradients:gradients.slice(),updates});
  }
  return {nodes,frames,gradients,loss:nodes[7].value};
}

// --- A fixed-QKV causal attention feature extractor with a trained readout head. ---
const LM_TOKENS=['·','(',')','□'];
const LM_EMBED=[[.15,.25,-.1,.2],[1,.1,-.3,.4],[-.4,1,.3,-.1],[0,0,0,0]];
export const lmTokens=LM_TOKENS;
export function lmFeatures(text,masked=true) {
  const chars=[...text].filter(c=>LM_TOKENS.includes(c)),xs=chars.map((c,i)=>LM_EMBED[LM_TOKENS.indexOf(c)].map((v,k)=>v+Math.sin((i+1)*(k+1)*.7)*.15));
  return xs.map((x,t)=>{
    const scores=xs.map((z,j)=>masked&&j>t?-Infinity:dot(x,z)/2),weights=softmax(scores);
    const context=x.map((v,k)=>xs.reduce((sum,z,j)=>sum+weights[j]*z[k],0));
    return {weights,features:[...x,...context,t/12,1]};
  });
}
export function balancedWords(pairs) {
  const result=[];
  function walk(s,open,close){if(s.length===pairs*2){result.push(s);return;}if(open<pairs)walk(s+'(',open+1,close);if(close<open)walk(s+')',open,close+1);}
  walk('',0,0);return result;
}
export function createTinyLM(seed=31) {
  const random=rng(seed),samples=[];
  for(let n=1;n<=3;n++) for(const word of balancedWords(n)) {
    const text='·'+word,features=lmFeatures(text,true);
    for(let t=0;t<text.length;t++) samples.push({features:features[t].features,target:LM_TOKENS.indexOf(t+1<text.length?text[t+1]:'□')});
  }
  return {w:Array.from({length:4},()=>Array.from({length:10},()=> (random()-.5)*.1)),samples,steps:0};
}
export function lmDistribution(model,features) {return softmax(model.w.map(row=>dot(row,features)));}
export function trainTinyLM(model,steps=100,lr=.12) {
  for(let i=0;i<steps;i++) {const example=model.samples[model.steps%model.samples.length],p=lmDistribution(model,example.features);
    for(let k=0;k<4;k++) {const d=p[k]-(k===example.target?1:0);for(let j=0;j<10;j++)model.w[k][j]-=lr*d*example.features[j];}model.steps++;
  }
  return tinyLMLoss(model);
}
export function tinyLMLoss(model) {return model.samples.reduce((s,x)=>s-Math.log(Math.max(1e-12,lmDistribution(model,x.features)[x.target])),0)/model.samples.length;}
export function bracketCheck(text) {let depth=0;for(const c of text){if(c==='(')depth++;else if(c===')'&&--depth<0)return {valid:false,depth};}return {valid:depth===0,depth};}
export function lmGenerate(model,max=12,seed=51) {
  const random=rng(seed);let text='·';
  for(let t=0;t<max;t++) {const feature=lmFeatures(text,true).at(-1).features,p=lmDistribution(model,feature),next=LM_TOKENS[sample(p,random)];if(next==='□')break;if(next==='·')continue;text+=next;}
  return text.slice(1);
}

// --- Exact Held–Karp DP and explicit hand-set probabilistic pointer selection. ---
export const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function tourLength(points,route) {return route.length<2?0:route.reduce((sum,node,i)=>sum+distance(points[node],points[route[(i+1)%route.length]]),0);}
export function tspOptimal(points) {
  const n=points.length,size=1<<n,dp=Array.from({length:size},()=>Array(n).fill(Infinity)),parent=Array.from({length:size},()=>Array(n).fill(-1));dp[1][0]=0;
  let transitions=0;
  for(let mask=1;mask<size;mask++)if(mask&1)for(let last=0;last<n;last++)if(Number.isFinite(dp[mask][last]))for(let next=1;next<n;next++)if(!(mask>>next&1)){
    transitions++;const nm=mask|1<<next,v=dp[mask][last]+distance(points[last],points[next]);if(v<dp[nm][next]){dp[nm][next]=v;parent[nm][next]=last;}
  }
  const last=argmax(dp[size-1].map((v,i)=>-(v+distance(points[i],points[0]))));
  const length=dp[size-1][last]+distance(points[last],points[0]),route=[];let mask=size-1,node=last;
  while(node>=0){route.unshift(node);const p=parent[mask][node];mask^=1<<node;node=p;}
  return {length,route,transitions};
}
export function pointerOptions(points,route,temperature=.2) {
  const last=route.at(-1)??0,visited=new Set(route),options=points.flatMap((p,i)=>visited.has(i)?[]:[{node:i,distance:distance(points[last],p)}]);
  const probs=options.length?softmax(options.map(x=>-x.distance/temperature)):[];return options.map((x,i)=>({...x,p:probs[i]}));
}
export function twoOpt(points,route) {
  let best=route.slice(),improved=true;
  while(improved){improved=false;outer:for(let i=1;i<best.length-1;i++)for(let j=i+1;j<best.length;j++){const next=[...best.slice(0,i),...best.slice(i,j+1).reverse(),...best.slice(j+1)];if(tourLength(points,next)<tourLength(points,best)-1e-10){best=next;improved=true;break outer;}}}
  return best;
}

// --- Stable full attention and blockwise online softmax, with real intermediate state. ---
export function fullAttention(q,k,v) {
  const d=q[0].length,weights=q.map(row=>softmax(k.map(key=>dot(row,key)/Math.sqrt(d))));
  return {weights,output:weights.map(probs=>v[0].map((_,j)=>v.reduce((sum,value,i)=>sum+probs[i]*value[j],0)))};
}
export function blockedAttention(q,k,v,blockSize=2) {
  const n=q.length,d=q[0].length,dv=v[0].length,m=Array(n).fill(-Infinity),l=Array(n).fill(0),acc=Array.from({length:n},()=>Array(dv).fill(0)),frames=[];
  for(let start=0;start<k.length;start+=blockSize) {
    const end=Math.min(k.length,start+blockSize),scores=q.map(row=>k.slice(start,end).map(key=>dot(row,key)/Math.sqrt(d)));
    for(let i=0;i<n;i++) {
      const nextMax=Math.max(m[i],...scores[i]),rescale=m[i]===-Infinity?0:Math.exp(m[i]-nextMax),ex=scores[i].map(s=>Math.exp(s-nextMax));
      l[i]=l[i]*rescale+ex.reduce((a,b)=>a+b,0);
      for(let j=0;j<dv;j++)acc[i][j]=acc[i][j]*rescale+ex.reduce((sum,p,t)=>sum+p*v[start+t][j],0);
      m[i]=nextMax;
    }
    frames.push({start,end,m:m.slice(),l:l.slice(),output:acc.map((row,i)=>row.map(x=>x/l[i])),scoreCells:n*(end-start)});
  }
  return {frames,output:frames.at(-1)?.output||[]};
}
export function attentionFixture(scale=1) {return {q:Array.from({length:8},(_,i)=>[Math.sin(i+1)*scale,Math.cos(i*.7)*scale]),k:Array.from({length:8},(_,i)=>[Math.cos(i*.8)*scale,Math.sin(i+2)*scale]),v:Array.from({length:8},(_,i)=>[Math.sin(i*.5),Math.cos(i*.4)])};}

// --- N-gram text frequency, with exact counts and seeded sampling. ---
export function ngramCounts(corpus,order=1,context='') {
  const chars=[...corpus],suffix=[...context].slice(-order).join(''),counts=new Map();
  for(let i=0;i<chars.length;i++)if(order===0 || (i>=order && chars.slice(i-order,i).join('')===suffix))counts.set(chars[i],(counts.get(chars[i])||0)+1);
  const total=[...counts.values()].reduce((a,b)=>a+b,0);
  return [...counts].map(([char,count])=>({char,count,p:count/total})).sort((a,b)=>b.count-a.count || (a.char<b.char?-1:1));
}
export function ngramGenerate(corpus,order=1,length=40,seed=7) {
  const random=rng(seed);let output=[...corpus].slice(0,order).join('');
  while([...output].length<length) {let options=ngramCounts(corpus,order,output);if(!options.length)options=ngramCounts(corpus,0,'');if(!options.length)break;output+=options[sample(options.map(x=>x.p),random)].char;}
  return output;
}

// --- Low-rank factor fitting. The frozen base stays in memory. ---
export function createLora(rank=2,seed=19) {
  const d=6,random=rng(seed),u=Array.from({length:d},(_,i)=>[Math.sin(i+.5),Math.cos(i*1.3)]),v=Array.from({length:2},(_,i)=>Array.from({length:d},(_,j)=>Math.cos((i+1)*(j+.4))));
  const target=u.map(row=>Array.from({length:d},(_,j)=>row[0]*v[0][j]+row[1]*v[1][j]));
  return {d,rank,target,a:Array.from({length:rank},()=>Array.from({length:d},()=> (random()-.5)*.8)),b:Array.from({length:d},()=>Array(rank).fill(0)),full:Array.from({length:d},()=>Array(d).fill(0)),steps:0};
}
export function loraUpdate(model) {return model.b.map(row=>Array.from({length:model.d},(_,j)=>row.reduce((sum,x,k)=>sum+x*model.a[k][j],0)));}
export function matrixMSE(a,b) {return a.reduce((sum,row,i)=>sum+row.reduce((s,x,j)=>s+(x-b[i][j])**2,0),0)/(a.length*a[0].length);}
export function trainLora(model,steps=100,lr=.2) {
  const {d,rank}=model;
  for(let step=0;step<steps;step++) {
    const update=loraUpdate(model),da=Array.from({length:rank},()=>Array(d).fill(0)),db=Array.from({length:d},()=>Array(rank).fill(0));
    for(let i=0;i<d;i++)for(let j=0;j<d;j++) {
      const grad=2*(update[i][j]-model.target[i][j])/d;
      for(let k=0;k<rank;k++){db[i][k]+=grad*model.a[k][j];da[k][j]+=grad*model.b[i][k];}
      model.full[i][j]-=lr*2*(model.full[i][j]-model.target[i][j])/d;
    }
    for(let k=0;k<rank;k++)for(let j=0;j<d;j++)model.a[k][j]-=lr*da[k][j];
    for(let i=0;i<d;i++)for(let k=0;k<rank;k++)model.b[i][k]-=lr*db[i][k];model.steps++;
  }
  return {low:matrixMSE(loraUpdate(model),model.target),full:matrixMSE(model.full,model.target)};
}

// --- Fixed mean message passing, compared with an exact BFS reachability reference. ---
export function graphFixture(bridge=false) {return {points:[[.12,.27],[.32,.15],[.48,.36],[.28,.65],[.67,.2],[.85,.4],[.72,.72]],edges:[[0,1],[1,2],[0,3],[2,3],[4,5],[5,6],...(bridge?[[2,4]]:[])]};}
export function graphMessages(n,edges,source=0,steps=0) {
  let values=Array.from({length:n},(_,i)=>i===source?1:0);const frames=[values.slice()];
  const neighbors=Array.from({length:n},(_,i)=>[i]);for(const [a,b] of edges){neighbors[a].push(b);neighbors[b].push(a);}
  for(let k=0;k<steps;k++){values=neighbors.map(ns=>ns.reduce((sum,j)=>sum+values[j],0)/ns.length);frames.push(values.slice());}
  const reachable=new Set([source]),queue=[source];for(let i=0;i<queue.length;i++)for(const next of neighbors[queue[i]])if(!reachable.has(next)){reachable.add(next);queue.push(next);}
  return {values,frames,reachable:[...reachable]};
}
