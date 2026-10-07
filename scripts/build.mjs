import {mkdir, readFile, writeFile, rm, cp, readdir} from 'node:fs/promises';
import path from 'node:path';
import {marked} from 'marked';
import * as pagefind from 'pagefind';
import {esc,json,text,validate,checkLinks,origin} from './lib.mjs';
const out='dist';await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});await cp('web',out,{recursive:true});
const all=[],warnings=[];const fetched=new Date().toISOString();
for(const f of (await readdir('sites')).filter(f=>f.endsWith('.json')).sort()){
 const site=await json('sites/'+f);let records;
 try{let catalog;if(process.env.LOCAL_CATALOG_ROOT){catalog=await json(path.join(process.env.LOCAL_CATALOG_ROOT,site.id+'.json'));}else{const res=await fetch(site.catalog,{signal:AbortSignal.timeout(30000)});if(!res.ok)throw Error(`HTTP ${res.status}`);catalog=await res.json();}records=catalog.records;validate(records);if(!records.length)throw Error('Empty remote catalog');}
 catch(e){if(process.env.ALLOW_STALE==='1'){try{const res=await fetch(origin+'/catalog.json',{signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error('No previous catalog');const previous=await res.json();records=previous.records.filter(r=>r.source===site.id);if(!records.length)throw Error('No cached records');validate(records);warnings.push(`${site.id}: ${e.message}; retained previous index`);}catch{throw Error(`${site.id}: no usable catalog (${e.message})`);}}else throw Error(`${site.id}: ${e.message}`);}
 all.push(...records.map(r=>({...r,source:site.id})));
}
const shell=(title,body)=>`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · 内容与作品</title><link rel="stylesheet" href="/style.css"><link rel="icon" href="/favicon.svg"></head><body><header class="topbar"><a class="brand" href="/">Z / 内容与作品</a><a href="/#library">全部内容 ↗</a></header><main class="reading">${body}</main><footer>内容与作品 · zcxxcz</footer></body></html>`;
for(const slug of (await readdir('content',{withFileTypes:true})).filter(e=>e.isDirectory()).map(e=>e.name).sort()){
 const dir=path.join('content',slug);const m=await json(path.join(dir,'meta.json'));if(m.status!=='published')continue;if(m.id!==slug||!/^[a-z0-9][a-z0-9-]*$/.test(slug))throw Error(`Invalid content directory: ${slug}`);
 const dest=path.join(out,'content',slug);await mkdir(dest,{recursive:true});await cp(dir,dest,{recursive:true,filter:s=>!['meta.json','body.md','search.txt'].includes(path.basename(s))});
 let body='';if(m.format==='markdown'){body=marked.parse(await readFile(path.join(dir,'body.md'),'utf8'));await writeFile(path.join(dest,'index.html'),shell(m.title,`<p class="eyebrow">${esc(m.type)} / ${esc(m.updated)}</p><h1>${esc(m.title)}</h1><article>${body}</article>`));}
 else if(m.format==='html'){body=await readFile(path.join(dir,'index.html'),'utf8');}
 else if(m.format==='pdf'){if(!m.file||path.basename(m.file)!==m.file)throw Error(`Invalid attachment: ${slug}`);body=`<p>${esc(m.summary)}</p><p><a href="${esc(m.file)}">打开 / 下载 PDF ↗</a></p>`;await writeFile(path.join(dest,'index.html'),shell(m.title,`<h1>${esc(m.title)}</h1><article>${body}</article>`));}
 else throw Error(`Unsupported format: ${slug}`);
 let extra='';try{extra=await readFile(path.join(dir,'search.txt'),'utf8');}catch{if(m.format==='pdf')warnings.push(`${slug}: PDF 无文字稿，仅索引简介`);}
 all.push({...m,url:origin+`/content/${slug}/`,text:text(body)+'\n'+extra,source:'hub'});
}
validate(all);all.sort((a,b)=>b.updated.localeCompare(a.updated)||a.id.localeCompare(b.id));
await writeFile(path.join(out,'catalog.json'),JSON.stringify({version:1,generated:fetched,warnings,records:all},null,2));
const featuredOrder=['xinao-courses','word-builder','magic-pets','spinner','spy','xiaohongshu'];const cards=all.filter(r=>r.featured).sort((a,b)=>(featuredOrder.indexOf(a.id)<0?999:featuredOrder.indexOf(a.id))-(featuredOrder.indexOf(b.id)<0?999:featuredOrder.indexOf(b.id)));const card=(r,i)=>`<a class="card" href="${esc(r.url)}" data-type="${esc(r.type)}" data-tags="${esc(r.tags.join(' '))}"><div class="card-top"><span class="card-number">${String(i+1).padStart(2,'0')}</span><span class="pill">${esc(r.type)}</span></div><h3>${esc(r.title)} <span aria-hidden="true">↗</span></h3><p>${esc(r.summary)}</p><div class="tags">${r.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></a>`;
let html=await readFile('web/index.html','utf8');html=html.replace('{{CARDS}}',cards.map(card).join('')).replace('{{COUNT}}',String(all.length)).replace('{{FEATURED}}',String(cards.length)).replace('{{DATE}}',fetched.slice(0,10)).replace('{{ROWS}}',all.map(r=>`<a class="library-row" href="${esc(r.url)}" data-type="${esc(r.type)}" data-tags="${esc(r.tags.join(' '))}"><span class="row-type">${esc(r.type)}</span><span><strong>${esc(r.title)}</strong><small>${esc(r.summary)}</small></span><span class="row-date">${esc(r.updated)} ↗</span></a>`).join(''));
await writeFile(path.join(out,'index.html'),html);await writeFile(path.join(out,'404.html'),shell('页面未找到','<h1>这个页面没有找到</h1><p><a href="/">回到内容索引，试试搜索。</a></p>'));await writeFile(path.join(out,'.nojekyll'),'');
try{const {index,errors}=await pagefind.createIndex({forceLanguage:'zh'});if(errors?.length)throw Error(errors.join('\n'));for(const r of all){const result=await index.addCustomRecord({url:r.url,language:'zh',content:[r.title,r.summary,...r.tags,r.text||''].join('\n'),meta:{title:r.title,description:r.summary},filters:{类型:[r.type],主题:r.tags}});if(result.errors.length)throw Error(result.errors.join('\n'));}const result=await index.writeFiles({outputPath:path.join(out,'pagefind')});if(result.errors.length)throw Error(result.errors.join('\n'));}finally{await pagefind.close();}
await checkLinks(path.resolve(out));await writeFile(path.join(out,'build-report.json'),JSON.stringify({records:all.length,featured:cards.length,warnings,generated:fetched},null,2));
console.log(`Built ${all.length} records, ${cards.length} featured entries.`);for(const w of warnings)console.warn('WARNING:',w);
if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,`## 内容索引\n${all.length} 条记录，${cards.length} 个入口。\n${warnings.map(w=>'- '+w).join('\n')}`);
