import {escapeHTML as esc} from './common.js';
import {modelLogo,modeBadge} from './models.js';
import {domainScale} from './results.js';
import {createStory} from './carousel.js';
import {findingCopy,promptInstructions,thinkingMetrics,metricFraction} from './findings-data.js';
import {queryExamples,accuracyModels,thinkingGroups,mappedPercent,curveAt} from './story-data.js';
const $=s=>document.querySelector(s);
const mathLi='<math><msub><mi>L</mi><mi>i</mi></msub></math>';
const mathCR='<math><msub><mi>C</mi><mi mathvariant="normal">R</mi></msub></math>';
const rich=text=>esc(text).replaceAll('Lᵢ',mathLi).replaceAll('Cᵣ',mathCR);
const cleanName=name=>name.replace(' (Preview)','');
const signed=(v,digits=2)=>(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(digits);
const trendColor=v=>v>=0?'var(--gain)':'var(--loss)';
function entrance(node,direction=1,delay=0){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.pageTransitioning||node.closest('.page-screen')?.dataset.pageActive==='false')return;
 node.getAnimations().filter(a=>a.id==='story-entrance').forEach(a=>a.cancel());
 const animation=node.animate([{opacity:0,transform:`translate(${direction*10}px,6px)`},{opacity:1,transform:'translate(0,0)'}],{duration:460,delay,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});animation.id='story-entrance';
}
function observeChart(node,draw){draw();const observer=new ResizeObserver(draw);observer.observe(node);return ()=>observer.disconnect();}

const methods={
  cost:{title:'Assign costs to query',description:'We define Lᵢ as the plausible harm when a person relies on a materially incorrect answer, and we let judges compare queries under a shared reference context to estimate these costs.',dialog:'dataset-dialog',link:'Annotation details'},
  response:{title:'Define response utility',description:'We assign a utility to each response to account for correct answers, costly mistakes, and the extra assistance needed after unnecessary refusals. Correct answers and appropriate refusals receive +1; errors incur −Lᵢ and unnecessary refusals incur −Cᵣ.',dialog:'utility-dialog',link:'Utility definition'},
  auc:{title:'UtilityAUC',description:'When resources are limited, a model should prioritize responses with higher utility. We retain its highest-scoring responses, replace the rest with abstentions, and vary coverage. UtilityAUC measures the area under this curve, normalized by the dataset’s theoretical best and worst references.',dialog:'metric-dialog',link:'Metric definition'}
};
const queryIcons={
 biology:'<path d="M7 3c10 4 0 14 10 18M17 3C7 7 17 17 7 21M8 5h8M9 10h6M9 14h6M8 19h8"/>',
 social:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3"/>',
 medicine:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>'
};
function costGraphic(){
 return `<div class="visual-heading"><h4 class="visual-title">Cost of example queries</h4></div>
 <div class="cost-comparison-key"><span><i class="uniform-swatch"></i>Accuracy</span><span><i class="utility-swatch"></i>UtilityBench</span></div>
 <div class="query-costs">${queryExamples.map((q,i)=>`<button class="query-comparison" data-query="${q.id}" data-dialog="query-dialog" style="--stagger:${i*70}ms" aria-label="Open ${q.name} query">
 <span class="query-name"><svg viewBox="0 0 24 24" aria-hidden="true">${queryIcons[q.id]}</svg><span>${q.name}</span></span>
 <span class="query-cost-pair">${[[1,'uniform'],[q.cost,'utility']].map(([cost,type])=>`<span class="query-bar-row" style="--bar-width:${cost/14.56*100}%"><span class="query-bar-track"><i class="${type}-bar"></i></span><span class="query-bar-value">${type==='uniform'?'1':cost.toFixed(2)}</span></span>`).join('')}</span></button>`).join('')}</div>`;
}
function responseGraphic(){return `<div class="visual-heading"><h4 class="visual-title">Utility by response</h4></div><div class="utility-rows">${[
  ['+1','Correct answer or appropriate refusal','Provides a correct answer or avoids an unsupported answer by refusing.','positive'],
  ['−'+mathLi,'Incorrect answer','Incurs the consequence cost assigned to this query.','negative'],
  ['−'+mathCR,'Unnecessary refusal','Leaves an answerable query unresolved and requires further assistance.','refusal']
].map(([value,title,description,cls],i)=>`<div class="utility-row ${cls}" style="--stagger:${i*80}ms"><div class="utility-value">${value}</div><div><strong>${title}</strong><p>${description}</p></div></div>`).join('')}</div>`;}
function curveGraphic(){return '<h4 class="visual-title">Utility across coverage</h4><div class="paper-curve"><svg id="paper-curve-plot" role="img" aria-label="The paper’s original utility curve with an adjustable coverage marker"></svg><label class="coverage-control">Coverage<input id="coverage-slider" type="range" min="0" max="100" value="50" aria-label="Response coverage"><output id="coverage-value">50%</output></label></div>';}
function wireCurve(curve){
 const svg=$('#paper-curve-plot');
 function draw(){
  const w=Math.max(270,svg.clientWidth),h=svg.clientHeight,left=42,right=w-22,top=32,bottom=h-42;
  const X=v=>left+v*(right-left),Y=v=>bottom-v*(bottom-top);
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  const t=Number($('#coverage-slider').value)/100,point=curveAt(curve.points,t);
  $('#coverage-value').textContent=Math.round(t*100)+'%';
  const points=curve.points.map(([x,y])=>[X(x),Y(y)].join(',')).join(' ');
  svg.innerHTML=`<title>Utility across response coverage</title>
  <defs><linearGradient id="curve-area" x2="0" y2="1"><stop stop-color="#b89be8" stop-opacity=".24"/><stop offset="1" stop-color="#99b9f0" stop-opacity=".025"/></linearGradient><linearGradient id="curve-stroke"><stop stop-color="#c4a1f2"/><stop offset="1" stop-color="#9ac5fa"/></linearGradient></defs>
  ${[.25,.5,.75].map(v=>`<line x1="${left}" x2="${right}" y1="${Y(v)}" y2="${Y(v)}" stroke="#bba4da12"/>`).join('')}
  <path d="M${left} ${top}V${bottom}H${right}" fill="none" stroke="#a68fbe66"/>
  <polygon points="${left},${bottom} ${points} ${right},${bottom}" fill="url(#curve-area)"/>
  <polyline points="${points}" fill="none" stroke="url(#curve-stroke)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M${X(t)} ${top}V${bottom}" stroke="#a8c8ed" stroke-width="1.2" stroke-dasharray="4 5"/>
  <circle cx="${X(t)}" cy="${Y(point)}" r="12" fill="#b5c5ed18"/><circle cx="${X(t)}" cy="${Y(point)}" r="5.5" fill="#11121a" stroke="#b8d2ed" stroke-width="2.5"/>
  <text x="${left}" y="18">Utility</text>
  ${[0,.25,.5,.75,1].map(v=>`<text x="${X(v)}" y="${h-12}" text-anchor="${v===0?'start':v===1?'end':'middle'}">${v*100}%</text>`).join('')}
  <text x="${X(.48)}" y="${Y(.14)}" text-anchor="middle" class="area-label">UtilityAUC</text>`;
 }
 $('#coverage-slider').addEventListener('input',draw);return observeChart(svg,draw);
}
function accuracyGraphic(data){
 const models=accuracyModels.map(name=>data.models.find(m=>m.name===name));
 return `<div class="accuracy-key"><span><i style="background:#9abff2"></i>Answerable accuracy</span><span><i class="utility-swatch"></i>UtilityAUC <small>0.70–0.84</small></span></div>
 <div class="accuracy-pairs">${models.map((m,i)=>`<div class="accuracy-pair" style="--stagger:${i*70}ms"><span class="comparison-model">${modelLogo(m.family)}<span>${esc(m.name)}</span></span>
 <div class="accuracy-pair-bars">${[['answerable',[0,100]],['auc',[.70,.84]]].map(([key,range])=>`<div class="accuracy-pair-measure ${key}"><span class="comparison-track ${key==='auc'?'truncated-track':''}"><i style="--width:${mappedPercent(m[key],range)}%;--color:${key==='auc'?'#c4a4ed':'#9abff2'}"></i></span><strong>${m[key].toFixed(key==='auc'?4:2)}${key==='auc'?'':'%'}</strong></div>`).join('')}</div></div>`).join('')}</div>`;
}
function thinkingFrame(groups){
 const value=(row,key)=>row[key].toFixed(key==='auc'?4:2)+(key==='auc'?'':'%');
 return `<div class="thinking-legend"><div class="thinking-metric-key">${thinkingMetrics.map(m=>`<span><i style="background:${m.color}"></i>${m.label}</span>`).join('')}</div><div class="thinking-header-actions"><span class="nt-marker-key" title="The thin marker shows the non-thinking baseline"><i></i>${modeBadge('NT')}</span></div></div>
 <div class="thinking-run-list" role="region" tabindex="0" aria-label="All thinking runs, four metrics per run">${groups.map(g=>`<section class="thinking-model-group"><h4>${modelLogo(g.family)}<span>${esc(cleanName(g.name))}</span>${modeBadge('T')}</h4>${g.rows.slice(1).map(r=>`<div class="thinking-run" data-run="${esc(g.name+' / '+r.mode)}">${g.rows.length>2?`<h5>${r.mode}</h5>`:''}<div class="thinking-run-bars">${thinkingMetrics.map(({key,label,color})=>{
  const baseline=g.rows[0],from=metricFraction(baseline,key),to=metricFraction(r,key),delta=r.reportedChange?.[key]??r[key]-baseline[key];
  return `<div class="thinking-run-metric" role="img" style="--metric-color:${color};--delta-color:${trendColor(delta)}" aria-label="${esc(label+': NT '+value(baseline,key)+', thinking '+value(r,key)+', change '+signed(delta,key==='auc'?4:2)+(key==='auc'?'':' percentage points'))}" title="${esc(label+': NT '+value(baseline,key)+' → T '+value(r,key))}"><span class="run-metric-track"><i class="run-metric-fill" style="width:${to*100}%"></i><i class="run-metric-change" style="left:${Math.min(from,to)*100}%;width:${Math.abs(to-from)*100}%"></i><b class="run-baseline" style="left:${from*100}%"></b><em class="run-current" style="left:${to*100}%"></em></span><span class="run-metric-value">${value(r,key)}</span><span class="run-metric-delta">${signed(delta,key==='auc'?4:2)}${key==='auc'?'':' pp'}</span></div>`;
 }).join('')}</div></div>`).join('')}</section>`).join('')}</div>`;
}
function promptingGraphic(data){
 const names=['GPT-5.6 Luna','DeepSeek V4 Flash (Preview)','Qwen3.7 Plus','MiMo V2.5'];
 const colors=['#9292a5','#8dcbb8','#bc9de8'];
 return `<div class="prompt-matrix"><div class="prompt-matrix-head"><span>UtilityAUC</span>${['Question only','Refusal hint','Consequence-guided'].map((p,i)=>`<h4 style="--prompt-color:${colors[i]}"><i></i>${p}</h4>`).join('')}</div>
 ${names.map((name,j)=>{const model=data.models.find(m=>m.name===name),rows=data.prompting.filter(r=>r.name===name);return `<div class="prompt-matrix-row" style="--stagger:${j*60}ms"><span class="comparison-model">${modelLogo(model.family)}<span>${esc(cleanName(name))}</span></span>${rows.map((r,i)=>`<div class="prompt-matrix-value"><strong>${r.auc.toFixed(4)}</strong><span class="prompt-measure-track"><i style="--width:${mappedPercent(r.auc,[.5,.9])}%;--color:${colors[i]}"></i></span></div>`).join('')}</div>`;}).join('')}</div>`;
}
const shortDomains={'Humanities & Arts':'Humanities & arts','Social Sciences & Ethics':'Social sciences','Natural Sciences':'Natural sciences','Computing & Engineering':'Computing & eng.','Business & Economics':'Business & econ.','Law & Governance':'Law & governance','Medicine & Health':'Medicine & health','AbstentionBench':'Refusal required'};
function domainGraphic(data,enabled=new Set(['correct','wrong','refuse'])){
 const colors={'GPT-5.6 Sol':['#b39ace','#8667a7','#dbcbea'],'Gemini 3.6 Flash':['#d7909b','#b75e70','#f0c6d0']};
 return `<div class="policy-model-legend">${Object.entries(colors).map(([name,palette])=>`<span style="--model-color:${palette[0]}"><i class="policy-model-swatch" aria-hidden="true"></i>${modelLogo(name.startsWith('GPT')?'GPT':'Gemini')}${name}</span>`).join('')}</div><div class="policy-component-key" role="group" aria-label="Show utility components">${[['correct','Correct'],['wrong','Errors'],['refuse','Refusals']].map(([key,label],i)=>`<button data-component="${key}" aria-pressed="${enabled.has(key)}" class="${enabled.has(key)?'active':''}"><span class="policy-component-colors" aria-hidden="true">${Object.values(colors).map(palette=>`<i style="background:${palette[i]}"></i>`).join('')}</span>${label}</button>`).join('')}</div><div class="policy-domains" role="group" aria-label="Utility contributions, normalized separately within each domain">${data.domainOrder.map(domain=>{const pair=Object.keys(colors).map(model=>data.domains.find(d=>d.domain===domain&&d.model===model)),scale=domainScale(pair,true);return `<div class="policy-domain"><span>${shortDomains[domain]||domain}</span><div>${pair.map(d=>{let negative=0;const parts=['correct','wrong','refuse'].map(k=>{const original=d[k]/scale,v=enabled.has(k)?original:0,left=v>=0?50:50+(negative+v)*50;if(v<0)negative+=v;return `<i data-part="${k}" data-value="${original}" style="left:${left}%;width:${Math.abs(v)*50}%;background:${colors[d.model][['correct','wrong','refuse'].indexOf(k)]}"></i>`;}).join('');return `<div class="policy-stack" role="img" title="${esc(d.model+', '+domain+': correct '+d.correct.toFixed(3)+', errors '+d.wrong.toFixed(3)+', refusals '+d.refuse.toFixed(3))}" aria-label="${esc(d.model+', '+domain)}" >${parts}</div>`;}).join('')}</div></div>`;}).join('')}</div>`;
}
function initPromptInstructions(){
 $('#prompt-instructions').innerHTML=promptInstructions.map(p=>`<section class="eval-prompt"><div class="eval-prompt-heading"><span class="prompt-indicator" aria-hidden="true"></span><h3>${esc(p.name)}</h3></div><blockquote>${esc(p.text)}</blockquote></section>`).join('');
}
export function initStory(data,curve){
 initPromptInstructions();
 function renderMethod(button){const key=button.dataset.method,m=methods[key];$('#method-heading').textContent=m.title;$('#method-description').innerHTML=rich(m.description);$('#method-details').dataset.dialog=m.dialog;$('#method-details').textContent=m.link;$('#method-diagram').dataset.visual=key;$('#method-diagram').innerHTML=key==='cost'?costGraphic():key==='response'?responseGraphic():curveGraphic();entrance($('.method-explanation'),-1);entrance($('#method-diagram'),1,90);
   document.querySelectorAll('[data-query]').forEach(b=>b.addEventListener('click',()=>{const q=queryExamples.find(q=>q.id===b.dataset.query);$('#query-dialog-title').textContent=q.name;$('#query-content').textContent=q.question;$('#query-cost').textContent=q.cost.toFixed(2);}));
   return key==='auc'?wireCurve(curve):undefined;
 }
 createStory({section:$('#method'),selector:'[data-method]',panel:$('#method-panel'),durations:[11000,11000,15000],render:renderMethod});
 const groups=thinkingGroups(data);
 function renderFinding(button){const key=button.dataset.finding,c=findingCopy[key];$('#finding-heading').textContent=c.title;$('#finding-description').textContent=c.text;$('#finding-description').scrollTop=0;$('#finding-actions').innerHTML=key==='prompting'?'<button class="text-link" data-dialog="prompting-dialog">View prompts</button>':'';$('#finding-chart').dataset.visual=key;
  if(key==='accuracy')$('#finding-chart').innerHTML=accuracyGraphic(data);
  if(key==='thinking')$('#finding-chart').innerHTML=thinkingFrame(groups);
  if(key==='prompting')$('#finding-chart').innerHTML=promptingGraphic(data);
  if(key==='policies'){
   const enabled=new Set(['correct','wrong','refuse']),root=$('#finding-chart');root.innerHTML=domainGraphic(data,enabled);
   root.querySelectorAll('[data-component]').forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.component;if(enabled.has(key))enabled.delete(key);else enabled.add(key);
    button.classList.toggle('active',enabled.has(key));button.setAttribute('aria-pressed',String(enabled.has(key)));
    root.querySelectorAll('.policy-stack').forEach(stack=>{let negative=0;stack.querySelectorAll('[data-part]').forEach(part=>{
     const v=enabled.has(part.dataset.part)?Number(part.dataset.value):0;
     part.style.left=(v>=0?50:50+(negative+v)*50)+'%';part.style.width=Math.abs(v)*50+'%';if(v<0)negative+=v;
    });});
   }));
  }
  entrance($('.finding-explanation'),-1);entrance($('#finding-chart'),1,90);
 }
 createStory({section:$('#findings'),selector:'[data-finding]',panel:$('#finding-panel'),durations:[15000,24000,32000,26000],render:renderFinding});
}
