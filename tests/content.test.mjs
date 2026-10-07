import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,cp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import os from 'node:os';import path from 'node:path';
test('published Markdown, HTML and PDF are built; drafts excluded; broken attachments block deployment',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'hub-content-'));
 try{
  await cp('scripts',path.join(dir,'scripts'),{recursive:true});await cp('web',path.join(dir,'web'),{recursive:true});await symlink(path.resolve('node_modules'),path.join(dir,'node_modules'),process.platform==='win32'?'junction':'dir');await mkdir(path.join(dir,'sites'));await mkdir(path.join(dir,'content'));
  for(const format of ['markdown','html','pdf','draft']){const base=path.join(dir,'content',format);await mkdir(base);const meta={id:format,title:format,type:'资料',summary:'跨平台发布验收',tags:['文章与资料'],updated:'2026-10-07',format:format==='draft'?'markdown':format,status:format==='draft'?'draft':'published',file:'sample.pdf'};await writeFile(path.join(base,'meta.json'),JSON.stringify(meta));if(format==='markdown'||format==='draft')await writeFile(path.join(base,'body.md'),'正文中的独特关键词：河流与星辰。');if(format==='html')await writeFile(path.join(base,'index.html'),'<html><body>独立 HTML 演示</body></html>');if(format==='pdf'){await writeFile(path.join(base,'sample.pdf'),'%PDF-1.4\nfixture');await writeFile(path.join(base,'search.txt'),'PDF 配套文字稿。');}}
  const build=()=>spawnSync(process.execPath,['scripts/build.mjs'],{cwd:dir,encoding:'utf8',env:{...process.env,LOCAL_CATALOG_ROOT:'',GITHUB_STEP_SUMMARY:''}});
  let r=build();assert.equal(r.status,0,r.stderr);const catalog=JSON.parse(await readFile(path.join(dir,'dist/catalog.json'),'utf8'));assert.equal(catalog.records.length,3);assert.ok(catalog.records.some(r=>r.text.includes('配套文字稿')));assert.ok(!catalog.records.some(r=>r.id==='draft'));
  await writeFile(path.join(dir,'content/markdown/body.md'),'![missing](missing.png)');r=build();assert.notEqual(r.status,0);assert.match(r.stderr,/Broken link/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
