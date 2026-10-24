import {escapeHTML as esc,toast} from './common.js';
const sourceNames={'openai/gsm8k':'GSM8K','MathArena/hmmt_feb_2026':'HMMT Feb 2026','m-a-p/SuperGPQA':'SuperGPQA','nguha/legalbench':'LegalBench','bigbio/med_qa':'MedQA','PatronusAI/financebench':'FinanceBench','bigcode/bigcodebench':'BigCodeBench','openai/openai_humaneval':'HumanEval','allenai/ai2_arc':'ARC Challenge'};
export function renderDataset(data){
  const container=document.querySelector('#cost-histogram');
  function draw(){
    const width=Math.max(300,container.clientWidth),height=Math.max(240,container.clientHeight),left=57,right=16,top=45,bottom=60;
    const plotWidth=width-left-right,plotHeight=height-top-bottom;
    const x=v=>left+(Math.log2(v)+4)/11*plotWidth;
    const maximum=Math.ceil(Math.max(...data.histogram.map(b=>b.count))/500)*500;
    const y=v=>height-bottom-v/maximum*plotHeight;
    const grid=[0,.5,1].map(t=>`<line x1="${left}" x2="${width-right}" y1="${y(t*maximum)}" y2="${y(t*maximum)}" stroke="#ffffff14"/><text x="${left-10}" y="${y(t*maximum)+5}" text-anchor="end">${(t*maximum).toLocaleString()}</text>`).join('');
    const bars=data.histogram.map((b,i)=>{
      const label=`Cost ${b.low.toFixed(2)}–${b.high.toFixed(2)}: ${b.count.toLocaleString()} queries (${(b.count/data.count*100).toFixed(1)}%).`;
      return `<g role="button" tabindex="0" aria-label="${label}" data-note="${label}"><rect class="histogram-bar" style="--bar-delay:${i*14}ms" x="${x(b.low)+1}" y="${y(b.count)}" width="${Math.max(1,x(b.high)-x(b.low)-3)}" height="${height-bottom-y(b.count)}" rx="1" fill="${b.low>=8?'#88a8e5':'#a88ccf'}"/><rect x="${x(b.low)}" y="${top}" width="${x(b.high)-x(b.low)}" height="${plotHeight}" fill="transparent"/></g>`;
    }).join('');
    const ticks=(width<440?[.125,1,8,128]:[.125,.5,2,8,32,128]).map(v=>`<text x="${x(v)}" y="${height-bottom+27}" text-anchor="${v===128?'end':'middle'}">${v}</text>`).join('');
    container.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="group" aria-label="Error cost distribution. Median 2.0. Horizontal cost axis uses a logarithmic scale."><text x="${left}" y="18"># queries</text>${grid}${bars}<line x1="${x(2)}" x2="${x(2)}" y1="${top-8}" y2="${height-bottom}" stroke="#e3d4fa" stroke-dasharray="3 5" opacity=".8"/><text x="${x(2)+10}" y="28" class="median-label">Median 2.0</text>${ticks}<text x="${width-right}" y="${height-5}" text-anchor="end">Error cost <tspan class="math-variable">L</tspan></text></svg>`;
    container.querySelectorAll('[data-note]').forEach(node=>{
      const show=()=>document.querySelector('#histogram-note').textContent=node.dataset.note;
      node.addEventListener('pointerenter',show);node.addEventListener('focus',show);node.addEventListener('click',show);node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}});
    });
  }
  draw();new ResizeObserver(draw).observe(container);
  document.querySelector('#histogram-note').textContent='Select a bar to view its range and sample count.';
  const position=v=>Math.max(0,Math.min(100,(Math.log2(v)+4)/11*100));
  const domains=document.querySelector('#dataset-domains');
  domains.style.setProperty('--domain-count',data.domains.length);
  domains.innerHTML=data.domains.map(d=>`<button class="distribution-row" aria-label="${esc(d.name)}: median cost ${d.median.toFixed(2)}, middle 50 percent ${d.q1.toFixed(2)} to ${d.q3.toFixed(2)}, ${d.count} queries." data-domain="${esc(d.name)}"><span>${esc(d.name)}</span><span class="range-track" style="--range-left:${position(d.q1)}%;--range-width:${position(d.q3)-position(d.q1)}%;--range-median:${position(d.median)}%"><i></i><b></b></span><span class="range-value">${d.median.toFixed(1)}</span></button>`).join('');
  document.querySelectorAll('.distribution-row').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.distribution-row').forEach(b=>b.classList.toggle('active',b===button));toast(button.getAttribute('aria-label'));}));
  const list=document.querySelector('#dataset-source-list');
  list.innerHTML='<li><span>AbstentionBench</span><span>7,500</span></li>'+data.sources.map(source=>`<li><span>${esc(sourceNames[source.name]||source.name.split('/').at(-1))}</span><span>${source.count.toLocaleString()}</span></li>`).join('');
}
