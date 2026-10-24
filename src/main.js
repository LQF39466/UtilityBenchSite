import { initCommon, highlight } from './common.js';
import {bindCopy} from './clipboard.js';
import { config } from './config.js';
import {initBenchmark} from './benchmark.js';
import {renderDataset} from './dataset.js';
import {initStory} from './story.js';
import {initPager} from './pager.js';
initPager();
initCommon();

const load = config.datasetId ? `from datasets import load_dataset\n\ndataset = load_dataset(\n    "${config.datasetId}",\n    split="test",\n)\n\nprint(dataset[0]["input"])\nprint(dataset[0]["L"])` : `from datasets import load_dataset\n\n# Before the Hub release: load the local Parquet\ndataset = load_dataset(\n    "parquet",\n    data_files="data/test-00000-of-00001.parquet",\n    split="test",\n)\n\n# After release, use the published Hub ID:\n# load_dataset("<HF_DATASET_ID>", split="test")`;
document.querySelector('#usage-code').innerHTML=highlight(load);
document.querySelector('#code-caption').textContent='python -m pip install datasets';
bindCopy(document.querySelector('#copy-usage'),()=>load);
bindCopy(document.querySelector('#copy-citation'),()=>document.querySelector('#citation-code').textContent.trim());

async function loadHomeData() {
  const datasetTask = fetch(new URL('../data/dataset.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Dataset unavailable');return r.json();}).then(renderDataset).catch(error=>{document.querySelector('#histogram-note').textContent='The distribution could not be loaded. Please refresh.';console.error(error);});
  const resultsTask = Promise.all(['results.json','refusal-costs.json','utility-curve.json'].map(async file=>{const r=await fetch(new URL('../data/'+file,import.meta.url));if(!r.ok)throw new Error('Results unavailable');return r.json();})).then(([data,sensitivity,curve])=>{
    document.querySelector('#home-benchmark').hidden=false;
    document.querySelector('.benchmark-tabs').hidden=false;
    initBenchmark(data,sensitivity);
    initStory(data,curve);
    document.querySelector('#home-results-status').hidden=true;
  }).catch(error=>{document.querySelector('#home-results-status').textContent='Results could not be loaded. Please refresh.';console.error(error);});
  await Promise.allSettled([datasetTask,resultsTask]);
}
loadHomeData();
