import {downloadCSV,escapeHTML as esc} from './common.js';
import {colors,sortModels} from './results.js';
import {modelLabel,benchmarkRuns} from './models.js';
import {modelPosition,logPosition,projectPoint,paperCamera,plotAxes} from './plot.js';
const $=s=>document.querySelector(s);
export function initBenchmark(data,sensitivity){
  const runs=benchmarkRuns(data),main=runs.filter(m=>m.mode==='NT');
  const families=new Set(Object.keys(colors)),modes=new Set(['NT']),costs=sensitivity.costs,sweep=new Map(sensitivity.runs.map(r=>[r.id,r.auc]));
  let costIndex=costs.indexOf(2);
  let selected=sortModels(main)[0].id,camera={...paperCamera},sortKey='auc',direction='desc';
  let pointer=null,dragMoved=false,scatterFrame=0;
  function scheduleScatter(){if(!scatterFrame)scatterFrame=requestAnimationFrame(()=>{scatterFrame=0;drawScatter();});}
  const svg=$('#scatter'),tabs=[...document.querySelectorAll('[data-benchmark-view]')];
  $('#model-select').innerHTML=runs.map(m=>`<option value="${esc(m.id)}">${esc(m.name)} · ${m.mode}${m.effort?' / '+m.effort:''}</option>`).join('');
  function switchView(id){tabs.forEach(b=>{const active=b.dataset.benchmarkView===id;b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1;document.getElementById(b.dataset.benchmarkView).hidden=!active;});if(id==='overview')drawScatter();}
  tabs.forEach((b,i)=>{b.addEventListener('click',()=>switchView(b.dataset.benchmarkView));b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=tabs[e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+1)%tabs.length];switchView(next.dataset.benchmarkView);next.focus();}});});
  function inspect(id){
    selected=id;const m=runs.find(m=>m.id===id);
    $('#selected-name').textContent=m.name;$('#selected-auc').textContent=m.auc.toFixed(4);
    ['answerable','refusal','rate'].forEach(k=>$(`#selected-${k}`).textContent=m[k].toFixed(2)+'%');$('#model-select').value=id;
    document.querySelectorAll('[data-inspect]').forEach(b=>{const active=b.dataset.inspect===id;b.closest('tr').classList.toggle('selected-row',active);b.setAttribute('aria-pressed',active);});drawScatter();
  }
  function drawScatter(){
    if($('#overview').hidden)return;
    const width=svg.clientWidth,height=svg.clientHeight;if(!width||!height)return;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const P=coords=>{const p=projectPoint(coords,width,Math.max(140,height-26),camera);p[1]+=3;if(width<600)p[0]+=20;return p;},pts=coords=>P(coords).join(',');
    const line=(a,b,stroke='#b49bd329',extra='')=>`<line x1="${P(a)[0]}" y1="${P(a)[1]}" x2="${P(b)[0]}" y2="${P(b)[1]}" stroke="${stroke}" ${extra}/>`;
    let content='<title>Accuracy and UtilityAUC</title><desc>Logarithmic coordinates. Vertical lines project each model to the base plane. Drag to rotate, use rotation buttons, or select a model.</desc>';
    content+=`<polygon points="${[[0,0,0],[1,0,0],[1,1,0],[0,1,0]].map(pts).join(' ')}" fill="#b395db08"/>`;
    for(let axis=0;axis<3;axis++)for(let i=0;i<2;i++)for(let j=0;j<2;j++){const a=[0,0,0],b=[0,0,0];a[(axis+1)%3]=b[(axis+1)%3]=i;a[(axis+2)%3]=b[(axis+2)%3]=j;b[axis]=1;content+=line(a,b);}
    const axes={...plotAxes};
    const expandAUC=costs[costIndex]!==2||scope().some(m=>m.auc<axes.auc[0]||m.auc>axes.auc[1]);
    if(expandAUC){axes.auc=[Math.min(.625,...scope().map(m=>m.auc*.97)),Math.max(.835,...scope().map(m=>m.auc*1.03))];}
    const ticks={answerable:width<600?[55,63,74]:[55,60,63,68,74],refusal:height<400?[60,76,91]:[60,76,82,91],auc:height<400?[.64,.74,.78,.82]:[.64,.74,.76,.78,.82]};
    if(expandAUC)ticks.auc=Array.from({length:4},(_,i)=>Number((axes.auc[0]+(axes.auc[1]-axes.auc[0])*i/3).toFixed(2)));
    const text=(at,label,dx=0,dy=0,anchor='middle',cls='')=>{const [x,y]=P(at);return `<text x="${x+dx}" y="${y+dy}" text-anchor="${anchor}" class="${cls}">${label}</text>`;};
    for(const v of ticks.answerable){const t=logPosition(v,plotAxes.answerable);content+=line([t,0,0],[t,1,0],'#b49bd314')+text([t,0,0],v,0,25);}
    for(const v of ticks.refusal){const t=logPosition(v,plotAxes.refusal);content+=line([0,t,0],[1,t,0],'#b49bd314')+text([0,t,0],v,-13,5,'end');}
    for(const v of ticks.auc){const t=logPosition(v,axes.auc);content+=line([0,1,t],[1,1,t],'#b49bd314')+text([0,1,t],v.toFixed(2),-12,5,'end');}
    if(width<600){content+=`<text x="12" y="${height-12}" class="axis-label">Ref. acc. (%)</text><text x="${width-12}" y="${height-12}" text-anchor="end" class="axis-label">Ans. acc. (%)</text>`;}else{content+=`<text x="${P([.62,0,0])[0]}" y="${height-12}" text-anchor="middle" class="axis-label">Ans. accuracy (%)</text><text x="${P([0,.52,0])[0]-28}" y="${height-12}" text-anchor="end" class="axis-label">Ref. accuracy (%)</text>`;}
    const [zx,zy]=P([0,1,.55]);content+=`<text x="${Math.max(22,zx-73)}" y="${zy}" text-anchor="middle" transform="rotate(-90 ${Math.max(22,zx-73)} ${zy})" class="axis-label">UtilityAUC</text>`;
    const chosen=runs.find(m=>m.id===selected);
    const visible=scope();
    const positioned=visible.map(m=>({m,world:modelPosition(m,axes),coords:P(modelPosition(m,axes))})).sort((a,b)=>a.coords[1]-b.coords[1]);
    for(const {m,world,coords:[x,y]} of positioned){const floor=[world[0],world[1],0],dim=!families.has(m.family),color=colors[m.family];content+=`<g class="projection ${dim?'dimmed':''}" opacity="${dim?.05:.42}">${line(world,floor,color,'stroke-width="1.2"')}<circle cx="${P(floor)[0]}" cy="${P(floor)[1]}" r="2.5" fill="${color}"/></g>`;}
    for(const {m,coords:[x,y]} of positioned){const active=m.id===selected,dim=!families.has(m.family),color=colors[m.family];content+=`<g role="button" tabindex="${dim?-1:0}" aria-pressed="${active}" aria-label="${esc(m.name)} ${m.mode}, UtilityAUC ${m.auc.toFixed(4)}" data-model="${esc(m.id)}" class="point ${dim?'dimmed':''}">${active?`<circle class="point-halo" cx="${x}" cy="${y}" r="17" fill="${color}" opacity=".1"/><circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${color}" opacity=".5"/>`:''}<circle cx="${x}" cy="${y}" r="14" fill="transparent"/><circle cx="${x}" cy="${y}" r="${active?7:5}" fill="${color}" stroke="#090a1080"/><title>${esc(m.name)} · ${m.mode} · ${m.auc.toFixed(4)}</title></g>`;
      if(active&&!dim)content+=`<text x="${x-14}" y="${Math.max(22,y-17)}" text-anchor="end" class="point-label" style="fill:${color}">${esc(m.name.replace(' (Preview)',''))}${m.mode==='T'?' · T':''}</text>`;
    }
    svg.innerHTML=content;
    svg.querySelectorAll('.point-label,.axis-label:not([transform])').forEach(label=>{
      const b=label.getBBox(),dx=b.x<10?10-b.x:b.x+b.width>width-10?width-10-b.x-b.width:0,dy=b.y<8?8-b.y:b.y+b.height>height-8?height-8-b.y-b.height:0;
      if(dx)label.setAttribute('x',Number(label.getAttribute('x'))+dx);
      if(dy)label.setAttribute('y',Number(label.getAttribute('y'))+dy);
    });
    svg.querySelectorAll('[data-model]').forEach(n=>{n.addEventListener('click',()=>{if(!dragMoved)inspect(n.dataset.model);});n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();const id=n.dataset.model;inspect(id);svg.querySelector(`[data-model="${CSS.escape(id)}"]`)?.focus();}});});
  }
  $('#model-select').addEventListener('change',e=>{const m=runs.find(m=>m.id===e.target.value);modes.add(m.mode);families.add(m.family);renderFilters();drawLeaderboard();inspect(e.target.value);});
  $('#reset-camera').addEventListener('click',()=>{camera={...paperCamera};drawScatter();});
  $('#rotate-left').addEventListener('click',()=>{camera.yaw-=.16;drawScatter();});$('#rotate-right').addEventListener('click',()=>{camera.yaw+=.16;drawScatter();});
  svg.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;pointer={x:e.clientX,y:e.clientY,...camera};dragMoved=false;});
  svg.addEventListener('pointermove',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.abs(dx)+Math.abs(dy)>4&&!dragMoved){dragMoved=true;svg.setPointerCapture(e.pointerId);svg.classList.add('dragging');}if(dragMoved){camera.yaw=pointer.yaw+dx*.005;camera.tilt=Math.max(.26,Math.min(.55,pointer.tilt-dy*.002));scheduleScatter();}});
  function release(){pointer=null;svg.classList.remove('dragging');setTimeout(()=>dragMoved=false,0);}['pointerup','pointercancel','lostpointercapture'].forEach(e=>svg.addEventListener(e,release));
  function scope(){return runs.filter(m=>modes.has(m.mode));}
  function current(){return sortModels(scope().filter(m=>families.has(m.family)),sortKey,direction,$('#model-search').value);}
  function renderFilters(){
    for(const id of ['family-filters','family-legend']){
      const root=$('#'+id);
      if(!root.children.length){
        root.innerHTML=['all',...Object.keys(colors)].map(f=>`<button type="button" class="${id==='family-legend'?'family-chip':'filter-badge'} ${f==='all'?'filter-select-all':''}" data-family="${f}" ${f==='all'?'aria-label="Select all model families"':'aria-pressed="false"'} style="--family-color:${colors[f]||'#c1a2ed'}">${f==='all'?'':`<i></i>`}${f==='all'?'All':f}</button>`).join('');
        root.addEventListener('click',event=>{
          const button=event.target.closest('[data-family]');if(!button)return;
          const family=button.dataset.family;
          if(family==='all')Object.keys(colors).forEach(f=>families.add(f));
          else if(families.has(family))families.delete(family);else families.add(family);
          renderFilters();drawLeaderboard();drawScatter();
        });
      }
      root.querySelectorAll('[data-family]').forEach(button=>{
        const active=button.dataset.family!=='all'&&families.has(button.dataset.family);
        button.classList.toggle('active',active);
        if(button.dataset.family!=='all')button.setAttribute('aria-pressed',String(active));
      });
    }
    const modeRoot=$('#mode-filters');
    if(!modeRoot.children.length){
      modeRoot.innerHTML=['all','NT','T'].map(mode=>`<button type="button" class="filter-badge ${mode==='T'?'thinking':''} ${mode==='all'?'filter-select-all':''}" data-mode="${mode}" ${mode==='all'?'aria-label="Select all thinking modes"':'aria-pressed="false"'}>${mode==='all'?'All':mode}</button>`).join('');
      modeRoot.addEventListener('click',event=>{
        const button=event.target.closest('[data-mode]');if(!button)return;
        const mode=button.dataset.mode;
        if(mode==='all'){modes.add('NT');modes.add('T');}
        else if(modes.has(mode))modes.delete(mode);else modes.add(mode);
        renderFilters();drawLeaderboard();
        const available=scope();
        if(available.length&&!available.some(m=>m.id===selected))inspect(sortModels(available)[0].id);else drawScatter();
      });
    }
    modeRoot.querySelectorAll('[data-mode]').forEach(button=>{
      const active=button.dataset.mode!=='all'&&modes.has(button.dataset.mode);
      button.classList.toggle('active',active);
      if(button.dataset.mode!=='all')button.setAttribute('aria-pressed',String(active));
    });
  }
  $('#refusal-cost').max=costs.length-1;$('#refusal-cost').value=costIndex;
  $('#refusal-cost-ticks').innerHTML=costs.map((cost,index)=>`<button data-cost-index="${index}" style="--tick:${index/(costs.length-1)*100}%" class="${cost===2?'active':''}" aria-pressed="${cost===2}" aria-label="Set refusal cost to ${cost}">${cost}</button>`).join('');
  function updateCost(index){
    if(index===costIndex)return;
    costIndex=index;const cost=costs[index];$('#refusal-cost').style.setProperty('--range-progress',`${index/(costs.length-1)*100}%`);$('#refusal-cost').value=index;$('#refusal-cost').setAttribute('aria-valuetext',String(cost));$('#refusal-cost-value').textContent=cost;$('#detail-refusal-cost').textContent=cost;
    document.querySelectorAll('[data-cost-index]').forEach(b=>{const active=Number(b.dataset.costIndex)===index;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
    runs.forEach(m=>m.auc=sweep.get(m.id)[index]);drawLeaderboard();inspect(selected);
  }
  $('#refusal-cost').addEventListener('input',e=>updateCost(Number(e.target.value)));
  $('#refusal-cost-ticks').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>updateCost(Number(b.dataset.costIndex))));
  function drawLeaderboard(){const rows=current(),ranks=new Map(sortModels(scope()).map((m,i)=>[m.id,i+1]));$('#no-models').hidden=rows.length>0;
    $('#leaderboard-table tbody').innerHTML=rows.map(m=>`<tr class="${m.id===selected?'selected-row':''}"><td class="rank-cell">${String(ranks.get(m.id)).padStart(2,'0')}</td><td class="model-cell"><button data-inspect="${esc(m.id)}" aria-pressed="${m.id===selected}" aria-label="Inspect ${esc(m.name)} ${m.mode} in 3D">${modelLabel(m)}</button></td><td class="auc-cell" style="--bar:${(m.auc-.6)/.25}">${m.auc.toFixed(4)}</td><td>${m.answerable.toFixed(2)}%</td><td>${m.refusal.toFixed(2)}%</td><td>${m.rate.toFixed(2)}%</td></tr>`).join('');
    $('#leaderboard-table').querySelectorAll('[data-inspect]').forEach(b=>b.addEventListener('click',()=>{inspect(b.dataset.inspect);switchView('overview');}));
    document.querySelectorAll('[data-sort]').forEach(b=>{const active=b.dataset.sort===sortKey;b.parentElement.setAttribute('aria-sort',active?(direction==='desc'?'descending':'ascending'):'none');b.querySelector('span').textContent=active?(direction==='desc'?'↓':'↑'):'↕';});
  }
  document.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{if(sortKey===b.dataset.sort)direction=direction==='desc'?'asc':'desc';else{sortKey=b.dataset.sort;direction=sortKey==='name'?'asc':'desc';}drawLeaderboard();}));
  $('#model-search').addEventListener('input',drawLeaderboard);
  $('#export-leaderboard').addEventListener('click',()=>downloadCSV([['Model','Mode','Thinking effort','Family','Refusal cost','UtilityAUC','Answerable accuracy (%)','Refusal accuracy (%)','Answer rate (%)'],...current().map(m=>[m.name,m.mode,m.effort||'',m.family,costs[costIndex],m.auc,m.answerable,m.refusal,m.rate])],'utilitybench-leaderboard.csv'));
  renderFilters();drawLeaderboard();inspect(selected);new ResizeObserver(scheduleScatter).observe(svg);
}
