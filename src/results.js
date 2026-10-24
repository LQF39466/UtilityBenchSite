export const colors = { GPT:'#8aadd7', Gemini:'#b99adb', Claude:'#d69b85', DeepSeek:'#61a7aa', Qwen:'#d5b05b', GLM:'#adb3bb', MiMo:'#ca8eac', Kimi:'#b6ca7b' };
export function sortModels(models, key='auc', direction='desc', query='', family='all') {
  return models.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) && (family === 'all' || m.family === family)).sort((a,b) => (typeof a[key] === 'string' ? a[key].localeCompare(b[key]) : a[key]-b[key]) * (direction === 'asc' ? 1 : -1) || a.name.localeCompare(b.name));
}
export function domainScale(rows, normalized) {
  const magnitude = r => Math.max(r.correct, Math.abs(r.wrong + r.refuse));
  return normalized ? Math.max(...rows.map(magnitude), Number.EPSILON) : 1;
}
export function delta(value, baseline, digits=2) {
  const d = value-baseline;
  return { value:d, text:(d>0?'+':'')+d.toFixed(digits), down:d<-.000001 };
}
