import {escapeHTML as esc} from './common.js';
const palette={Gemini:'#8b5fb3',GPT:'#426fa7',Claude:'#ad604e',DeepSeek:'#2b7d84',Qwen:'#a5823d',GLM:'#6e7785',MiMo:'#9d6089',Kimi:'#758e45'};
const icons={GPT:'chatgpt',Gemini:'gemini',Claude:'claude',DeepSeek:'deepseek',Qwen:'qwen',GLM:'zhipu',MiMo:'xiaomi',Kimi:'kimi'};
// Match the overview: use NT where available, and mark thinking-only models with T.
export function barRuns(runs){const unique=new Map();for(const m of runs){if(!unique.has(m.name)||m.mode==='NT')unique.set(m.name,m);}return [...unique.values()].sort((a,b)=>b.auc-a.auc||a.name.localeCompare(b.name));}
export function chartName(name){
 if(name.startsWith('Gemini '))return ['Gemini',name.slice(7)];
 if(name.startsWith('Claude '))return ['Claude',name.slice(7)];
 if(name.startsWith('DeepSeek '))return ['DeepSeek',name.slice(9).replace(' (Preview)',' Prv.').replace(' (1017)','')];
 if(name.startsWith('MiMo '))return ['MiMo',name.slice(5)];
 if(name.startsWith('Kimi '))return ['Kimi',name.slice(5)];
 const parts=name.split(' ');return parts.length>1?[parts[0],parts.slice(1).join(' ')]:[name];
}
export function initBarLeaderboard(getRuns,getCost){
 const host=document.querySelector('#ranking-bars'),scroll=host.querySelector('.ranking-scroll'),svg=host.querySelector('svg');
 function marks(rows,width,height,assets={},theme='dark'){
  // Reference artwork: 29 columns in a 3600 × 1045 image, 7:1 tallest bar.
  const unit=height/917,left=24*unit,right=24*unit,top=12*unit,bottom=242*unit,base=height-bottom,plot=base-top,step=(width-left-right)/rows.length,bar=step*.76;
  const light=theme==='light',ink=light?'#202124':'#e1dce9',background=light?'#fff':'#101119',badge=light?'#7b489e':'#b58cde';
  const lightPalette={Gemini:'#7b489e',GPT:'#39679f',Claude:'#b65f49',DeepSeek:'#2b858c',Qwen:'#d8ad5b',GLM:'#9da3ac',MiMo:'#ad668d',Kimi:'#8da54b'};
  const low=Math.min(60,Math.floor(Math.min(...rows.map(m=>m.auc*100))/5)*5),high=Math.max(85,Math.ceil(Math.max(...rows.map(m=>m.auc*100))/5)*5);
  const y=value=>base-(value-low)/(high-low)*plot;
  let result=`<rect width="${width}" height="${height}" fill="${background}"/>`;
  for(let v=low;v<=high;v+=5)result+=`<line x1="${left}" y1="${y(v)}" x2="${width-right}" y2="${y(v)}" stroke="${light?'#0003':'#c6b4ee35'}" stroke-dasharray="2 6"/>`;
  rows.forEach((m,i)=>{const x=left+(i+.5)*step,value=m.auc*100,h=Math.max(2,base-y(value)),name=chartName(m.name),icon=assets[m.family]||`./assets/models/${icons[m.family]}.png`,color=(light?lightPalette:palette)[m.family],radius=Math.min(8*unit,h/2);
   result+=`<g data-run="${esc(m.id)}"><title>${esc(m.name)}${m.mode==='T'?' · T':''}: ${m.auc.toFixed(4)}</title><rect class="ranking-bar" x="${x-bar/2}" y="${base-h}" width="${bar}" height="${h}" rx="${radius}" fill="${color}"/><rect x="${x-bar/2}" y="${base-Math.min(radius,h)}" width="${bar}" height="${Math.min(radius,h)}" fill="${color}"/><text class="ranking-value" x="${x}" y="${base-h/2+9*unit}" text-anchor="middle" fill="#fff" font-size="${30*unit}" font-weight="600">${Math.round(value)}</text><image href="${icon}" ${light&&m.family==='GPT'?'style="filter:invert(1)"':''} x="${x-18*unit}" y="${base+20*unit}" width="${36*unit}" height="${36*unit}"/><g transform="translate(${x},${base+77*unit}) rotate(-60) scale(${unit})"><text text-anchor="end" font-size="26" fill="${ink}">${name.map((line,j)=>`<tspan x="0" dy="${j?29:0}">${esc(line)}</tspan>`).join('')}</text>${m.mode==='T'?`<rect x="10" y="${name.length>1?6:-23}" width="30" height="33" rx="4" fill="${badge}"/><text x="25" y="${name.length>1?30:1}" text-anchor="middle" font-size="24" font-weight="700" fill="${light?'#fff':'#111119'}">T</text>`:''}</g></g>`;
  });return result;
 }
 function render(animate=false){
  if(host.hidden||!scroll.clientHeight)return;
  const previous=new Map([...svg.querySelectorAll('[data-run]')].map(g=>[g.dataset.run,g.querySelector('.ranking-bar').getBoundingClientRect()]));
  const rows=barRuns(getRuns()),height=Math.max(280,scroll.clientHeight-12),unit=height/917,plot=height-254*unit,bar=plot*.9676/7,width=rows.length*bar/.76+48*unit;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.width=width+'px';svg.style.height=height+'px';svg.innerHTML=marks(rows,width,height);
  if(animate&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
   const timing={duration:720,easing:'cubic-bezier(.22,1,.36,1)'};
   svg.querySelectorAll('[data-run]').forEach(g=>{const old=previous.get(g.dataset.run);if(!old)return;const bar=g.querySelector('.ranking-bar'),now=bar.getBoundingClientRect(),top=Number(bar.getAttribute('y')),height=Number(bar.getAttribute('height'));
    g.animate([{transform:`translateX(${old.x-now.x}px)`},{transform:'translateX(0)'}],timing);
    bar.animate([{y:(top+old.y-now.y)+'px',height:old.height+'px'},{y:top+'px',height:height+'px'}],timing);
    const number=g.querySelector('.ranking-value');number.animate([{transform:`translateY(${(old.y+old.height/2)-(now.y+now.height/2)}px)`},{transform:'translateY(0)'}],timing);
   });
  }
 }
 const cache=new Map();async function embedded(path){if(!cache.has(path))cache.set(path,fetch(path).then(r=>{if(!r.ok)throw Error('Image unavailable');return r.blob();}).then(blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);})));return cache.get(path);}
 async function exportChart(type,theme){
  const button=host.querySelector(`[data-export-bars="${type}"][data-export-theme="${theme}"]`);button.disabled=true;const label=button.textContent;button.textContent='Exporting…';
  try{const rows=barRuns(getRuns()).map(m=>({...m})),cost=getCost(),assets=Object.fromEntries(await Promise.all(Object.entries(icons).map(async([key,file])=>[key,await embedded(`./assets/models/${file}.png`)]))),logo=await embedded('./assets/logo-brand.webp'),width=3600,height=1045,light=theme==='light',bg=light?'#fff':'#101119',ink=light?'#202124':'#e1dce9',muted=light?'#666':'#c5bdcf',badge=light?'#7b489e':'#b58cde';
   const source=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Arial,Helvetica,sans-serif"><rect width="100%" height="100%" fill="${bg}"/><text x="48" y="65" fill="${muted}" font-size="25">UtilityAUC × 100</text><rect x="315" y="40" width="26" height="30" rx="4" fill="${badge}"/><text x="328" y="63" text-anchor="middle" font-size="24" font-weight="700" fill="${light?'#fff':'#101119'}">T</text><text x="354" y="65" fill="${ink}" font-size="25">Thinking-only Models</text><text x="720" y="65" fill="#a99eb8" font-size="25">C<tspan baseline-shift="sub" font-size="18">R</tspan> = ${cost}</text><image href="${logo}" x="3150" y="24" width="68" height="55"/><text x="3235" y="65" font-size="40" font-weight="600" fill="${ink}">Utility<tspan fill="${light?'#7b489e':'#bf9ae5'}">Bench</tspan></text><g transform="translate(24 128)">${marks(rows,width-48,height-128,assets,theme)}</g></svg>`;
   let blob=new Blob([source],{type:'image/svg+xml'});
   if(type==='png'){const url=URL.createObjectURL(blob);try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(img,0,0);blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Export failed')),'image/png'));}finally{URL.revokeObjectURL(url);}}
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`UtilityBench-leaderboard-CR-${cost}-${theme}.${type}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }catch(error){button.textContent='Retry export';console.error(error);return;}finally{button.disabled=false;if(button.textContent!=='Retry export')button.textContent=label;}
 }
 const menu=host.querySelector('.ranking-export-menu');
 function closeMenu(){menu.hidden=true;}
 function openMenu(x,y){menu.hidden=false;const box=menu.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(x,innerWidth-box.width-8))+'px';menu.style.top=Math.max(8,Math.min(y,innerHeight-box.height-8))+'px';menu.querySelector('button').focus({preventScroll:true});}
 host.addEventListener('contextmenu',e=>{e.preventDefault();openMenu(e.clientX,e.clientY);});
 scroll.addEventListener('keydown',e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();const box=scroll.getBoundingClientRect();openMenu(box.x+40,box.y+40);}});
 document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))closeMenu();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
 menu.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();e.stopPropagation();const buttons=[...menu.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();}});
 addEventListener('resize',closeMenu);scroll.addEventListener('scroll',closeMenu);
 host.querySelectorAll('[data-export-bars]').forEach(button=>button.addEventListener('click',()=>{closeMenu();exportChart(button.dataset.exportBars,button.dataset.exportTheme);}));
 new ResizeObserver(()=>render()).observe(scroll);
 // Mouse dragging complements the scrollbar and native touch swipe.
 let drag=null;scroll.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;drag={x:e.clientX,left:scroll.scrollLeft};scroll.setPointerCapture(e.pointerId);scroll.classList.add('is-dragging');});scroll.addEventListener('pointermove',e=>{if(drag)scroll.scrollLeft=drag.left+drag.x-e.clientX;});for(const event of ['pointerup','pointercancel','lostpointercapture'])scroll.addEventListener(event,()=>{drag=null;scroll.classList.remove('is-dragging');});
 return {render};
}
