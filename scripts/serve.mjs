import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const root=resolve(projectRoot,process.argv[2]||'.');
const port=Number(process.env.PORT||4000);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let path=resolve(root,'.'+pathname);
    if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end('Forbidden');return;}
    if((await stat(path)).isDirectory())path=resolve(path,'index.html');
    const file=await readFile(path);
    res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(file);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
});
server.listen(port,'0.0.0.0',()=>console.log(`Listening: http://0.0.0.0:${port}\nLocal: http://127.0.0.1:${port}`));
