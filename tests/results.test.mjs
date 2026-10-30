import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sortModels,domainScale} from '../src/results.js';
const data=JSON.parse(await readFile(new URL('../data/results.json',import.meta.url),'utf8'));

test('research snapshot has complete, unique coverage',()=>{
  assert.equal(data.models.length,20);assert.equal(new Set(data.models.map(m=>m.name)).size,20);
  assert.equal(data.thinking.length,10);assert.equal(data.prompting.length,12);assert.equal(data.domains.length,22);
  for(const m of [...data.models,...data.thinking,...data.prompting]){assert.ok(m.auc>=0&&m.auc<=1);for(const k of ['answerable','refusal','rate'])assert.ok(m[k]>=0&&m[k]<=100);}
});
test('thinking Off and Refusal Hint baselines match Table 1',()=>{
  const baselines=[...data.thinking.filter(r=>r.mode==='Off'),...data.prompting.filter(r=>r.prompt==='Refusal Hint')];
  for(const row of baselines){const model=data.models.find(m=>m.name===row.name);for(const k of ['auc','answerable','refusal','rate'])assert.equal(row[k],model[k],`${row.name} / ${k}`);}
});
test('Figure 4 aggregates recover the paper accuracies',()=>{
  for(const name of ['Gemini 3.6 Flash','GPT-5.6 Sol']){
    const rows=data.domains.filter(d=>d.model===name),model=data.models.find(m=>m.name===name);
    assert.equal(rows.reduce((n,d)=>n+d.count,0),15000);
    const answerable=rows.filter(d=>d.domain!=='AbstentionBench');
    assert.equal(answerable.reduce((n,d)=>n+d.count,0),7500);
    const accuracy=answerable.reduce((n,d)=>n+d.correct*d.count,0)/7500*100;
    assert.ok(Math.abs(accuracy-model.answerable)<.0051);
    assert.ok(Math.abs(rows.find(d=>d.domain==='AbstentionBench').correct*100-model.refusal)<.0051);
  }
});
test('leaderboard search and sort preserve rankable values',()=>{
  assert.equal(sortModels(data.models)[0].name,'Gemini 3.6 Flash');
  assert.equal(sortModels(data.models,'answerable')[0].name,'GPT-5.6 Sol');
  assert.equal(sortModels(data.models,'auc','desc','flash','Gemini').length,3);
  assert.equal(sortModels(data.models,'auc','desc','no-such-model').length,0);
  assert.equal(data.models[0].name,'GPT-5');
});
test('domain normalization uses both models and keeps every stack within the axis',()=>{
  for(const domain of data.domainOrder){const rows=data.domains.filter(r=>r.domain===domain),scale=domainScale(rows,true);for(const r of rows){assert.ok(r.correct/scale<=1);assert.ok(Math.abs(r.wrong+r.refuse)/scale<=1.000001);}assert.equal(domainScale(rows,false),1);}
});

test('dataset distributions preserve complete counts and valid quartiles',async()=>{
  const dataset=JSON.parse(await readFile(new URL('../data/dataset.json',import.meta.url),'utf8'));
  assert.equal(dataset.count,15000);
  assert.equal(dataset.answerable,7500);assert.equal(dataset.refusalRequired,7500);
  assert.equal(dataset.histogram.reduce((n,b)=>n+b.count,0),15000);
  assert.equal(dataset.sources.length,17);
  assert.equal(dataset.sources.reduce((n,s)=>n+s.count,0),7500);
  assert.equal(dataset.domains.reduce((n,d)=>n+d.count,0),7500);
  for(const domain of dataset.domains){assert.ok(domain.q1<=domain.median&&domain.median<=domain.q3);const reference=data.domains.find(d=>d.domain===domain.name);assert.equal(domain.count,reference.count);}
});

test('logarithmic plot maps endpoints and uses geometric midpoints',async()=>{
  const {logPosition,plotAxes,modelPosition}=await import('../src/plot.js');
  for(const limits of Object.values(plotAxes)){
    assert.equal(logPosition(limits[0],limits),0);
    assert.equal(logPosition(limits[1],limits),1);
    assert.ok(Math.abs(logPosition(Math.sqrt(limits[0]*limits[1]),limits)-.5)<1e-12);
  }
  for(const m of data.models)for(const value of modelPosition(m))assert.ok(value>=0&&value<=1);
});
test('paper camera preserves vertical floor projections',async()=>{
  const {projectPoint,paperCamera}=await import('../src/plot.js');
  const top=projectPoint([.2,.7,.8],900,430,paperCamera),floor=projectPoint([.2,.7,0],900,430,paperCamera);
  assert.equal(top[0],floor[0]);assert.ok(top[1]<floor[1]);
});
test('thinking runs retain distinct identities without duplicating baselines',async()=>{
  const {benchmarkRuns}=await import('../src/models.js');const runs=benchmarkRuns(data);
  assert.equal(runs.length,34);assert.equal(new Set(runs.map(m=>m.id)).size,34);
  assert.equal(runs.filter(m=>m.mode==='NT').length,24);assert.equal(runs.filter(m=>m.mode==='T').length,10);
  assert.deepEqual(runs.filter(m=>m.name==='GPT-5.6 Luna'&&m.mode==='T').map(m=>m.effort),['Low','Medium','High']);
});

test('refusal-cost grid preserves the published default and exports complete runs',async()=>{
  const sweep=JSON.parse(await readFile(new URL('../data/refusal-costs.json',import.meta.url),'utf8'));
  const {benchmarkRuns}=await import('../src/models.js');const runs=benchmarkRuns(data);
  assert.deepEqual(sweep.costs,[0,.25,.5,1,2,3,4,8,16,32,64]);
  assert.equal(sweep.runs.length,runs.length);
  for(const run of runs){const row=sweep.runs.find(r=>r.id===run.id);assert.equal(row.auc.length,sweep.costs.length);assert.equal(row.auc[4],run.auc);row.auc.forEach(v=>assert.ok(Number.isFinite(v)&&v>=0&&v<=1));}
  assert.notEqual(sweep.runs[0].auc[0],sweep.runs[0].auc.at(-1));
});

test('story comparisons cover the three paper examples and all thinking settings',async()=>{
  const {accuracyModels,thinkingGroups,queryExamples,curveAt}=await import('../src/story-data.js');
  assert.deepEqual(accuracyModels,['Qwen3.5 Plus','Gemini 3.5 Flash','MiMo V2.5']);
  assert.equal(thinkingGroups(data)[0].name,'GPT-5.6 Luna');
  assert.equal(thinkingGroups(data).reduce((n,g)=>n+g.rows.length,0),10);
  assert.deepEqual(thinkingGroups(data).map(g=>g.rows.at(-1).reportedChange.auc),[.0325,.002,-.0012,-.0569]);
  assert.deepEqual(queryExamples.map(q=>q.cost),[.91,4.41,14.56]);
  const curve=JSON.parse(await readFile(new URL('../data/utility-curve.json',import.meta.url),'utf8'));
  assert.equal(curve.points[0][0],0);assert.equal(curve.points.at(-1)[0],1);
  assert.ok(curve.points.length>50);
  for(let i=1;i<curve.points.length;i++)assert.ok(curve.points[i][0]>=curve.points[i-1][0]);
  assert.equal(curveAt(curve.points,0),curve.points[0][1]);assert.equal(curveAt(curve.points,1),curve.points.at(-1)[1]);
});


test('new output runs preserve names, thinking modes and published precision',()=>{
  const expected=[
    {name:'Gemini 4 Argon',family:'Gemini',mode:'T',effort:'Low',auc:.8419,answerable:73.44,refusal:85.55,rate:48.76},
    {name:'MiMo V2.6 Flash',family:'MiMo',mode:'NT',auc:.6541,answerable:67.55,refusal:59.59,rate:66.51},
    {name:'MiMo V2.6 Pro',family:'MiMo',mode:'NT',auc:.7257,answerable:68.25,refusal:71.07,rate:58.23}
  ];
  for(const row of expected)assert.deepEqual(data.additionalRuns.find(r=>r.name===row.name),row);
});

test('aggregate imports include all refusal costs and correct thinking modes',()=>{
 for(const [name,mode,auc] of [['Claude Opus 5.5','T',.8021],['GLM-5.3 Flash','T',.7205],['GPT-6 Astra','T',.8072],['GPT-6.1 Terra','NT',.7853],['Qwen3.8 Flash','NT',.7465]]){
  const row=data.additionalRuns.find(r=>r.name===name);assert.equal(row.mode,mode);assert.equal(row.auc,auc);
 }
});

test('additional thinking runs expose Low effort while NT runs do not',async()=>{
 const {benchmarkRuns,modelLabel}=await import('../src/models.js');
 const runs=benchmarkRuns(data);
 for(const row of data.additionalRuns){
  const run=runs.find(r=>r.name===row.name);
  assert.equal(run.effort,row.mode==='T'?'Low':undefined);
  if(row.mode==='T')assert.ok(modelLabel(run).includes('>Low</span>'));
 }
});
