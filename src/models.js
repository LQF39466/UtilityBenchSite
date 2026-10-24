import {escapeHTML as esc} from './common.js';
const logos={GPT:'chatgpt',Gemini:'gemini',Claude:'claude',DeepSeek:'deepseek',Qwen:'qwen',GLM:'zhipu',MiMo:'xiaomi',Kimi:'kimi'};
export function modelLogo(family){return `<img class="model-logo" src="./assets/models/${logos[family]}.png" alt="" width="26" height="26">`;}
export function modeBadge(mode){return `<span class="mode-badge ${mode==='T'?'thinking':''}" title="${mode==='T'?'Thinking enabled':'Non-thinking'}">${mode}</span>`;}
export function modelLabel(model){return `${modelLogo(model.family)}<span>${esc(model.name)}</span>${modeBadge(model.mode)}${model.effort?`<span class="effort-label">${esc(model.effort)}</span>`:''}`;}
export function benchmarkRuns(data){
  return [...data.models.map(m=>({...m,mode:'NT',id:`${m.name}|NT`})),...data.thinking.filter(m=>m.mode!=='Off').map(m=>({...m,family:data.models.find(b=>b.name===m.name).family,mode:'T',effort:m.mode==='On'?'':m.mode,id:`${m.name}|${m.mode}`}))];
}
