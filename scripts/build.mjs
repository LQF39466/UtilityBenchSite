import { cp, mkdir, readFile, writeFile, stat, readdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root,'dist');
const publicEntries=['index.html','src','data','assets'];
const retiredFigures=new Set(['figure1-original.jpg','figure4-original.jpg']);
await mkdir(output,{recursive:true});
for(const stale of ['explore.html','._explore.html','src/explore.js','src/explore.css','src/._explore.js','src/._explore.css',...[...retiredFigures].map(name=>'assets/'+name)])await rm(join(output,stale),{force:true});
for (const name of publicEntries) await cp(join(root,name),join(output,name),{recursive:true,filter:source=>!source.split('/').at(-1).startsWith('._')&&!source.endsWith('.DS_Store')&&!retiredFigures.has(source.split('/').at(-1))});
for(const page of ['index.html']){
  const html=await readFile(join(output,page),'utf8');
  for(const match of html.matchAll(/(?:href|src)="(\.\/[^"#]+)"/g)){
    const path=resolve(output,match[1].split('#')[0]);
    if(!path.startsWith(output+'/'))throw new Error(`Invalid path: ${match[1]}`);
    await stat(path);
  }
}
for(const script of (await readdir(join(output,'src'))).filter(name=>name.endsWith('.js')&&!name.startsWith('._')))execFileSync(process.execPath,['--check',join(output,'src',script)],{stdio:'inherit'});
await writeFile(join(output,'.nojekyll'),'');
console.log('Built dist/ — 1 page, local assets, verified links and JavaScript.');
