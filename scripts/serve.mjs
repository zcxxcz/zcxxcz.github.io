import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.wasm':'application/wasm','.png':'image/png','.pdf':'application/pdf'};
http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let p=path.resolve(root,'.'+pathname);if(p!==root&&!p.startsWith(root+path.sep))throw Error();if((await stat(p)).isDirectory())p=path.join(p,'index.html');res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.statusCode=404;res.end('Not found');}}).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('http://127.0.0.1:'+(process.env.PORT||4173)));
