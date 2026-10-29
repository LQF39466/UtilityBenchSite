"""Refresh the public chart snapshot from paper tables and finalized predictions.

Usage: python3 scripts/import-paper.py --paper-root /path/to/preprint \
    --evaluation-root /path/to/RSC-AUC
Only aggregate measurements are exported; no prompts or model responses.
"""
import argparse
import ast
from collections import defaultdict
import json
from pathlib import Path
import re
from types import SimpleNamespace

parser = argparse.ArgumentParser()
parser.add_argument('--paper-root', type=Path, required=True)
parser.add_argument('--evaluation-root', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
tex = (args.paper_root / 'iclr2027_conference.tex').read_text()

def table(label):
    section = tex.split('\\label{' + label + '}')[1].split('\\end{table*}')[0]
    return [line for line in section.splitlines() if re.search(r'&.*\d\.\d', line)]

def values(line):
    cells = line.split('&')
    return [float(re.search(r'-?\d+\.\d+', cell).group()) for cell in cells[-4:]]

names = [
    ('GPT-5','GPT'),('GPT-5.1','GPT'),('GPT-5.4 Mini','GPT'),('GPT-5.6 Luna','GPT'),('GPT-5.6 Sol','GPT'),
    ('Gemini 3 Flash','Gemini'),('Gemini 3.5 Flash','Gemini'),('Gemini 3.6 Flash','Gemini'),
    ('Claude Haiku 4.5','Claude'),('Claude Sonnet 5','Claude'),
    ('DeepSeek V3.2','DeepSeek'),('DeepSeek V4 Flash (Preview)','DeepSeek'),('DeepSeek V4 Pro (Preview)','DeepSeek'),
    ('Qwen3.5 Plus','Qwen'),('Qwen3.7 Plus','Qwen'),('GLM-5','GLM'),('GLM-5.2','GLM'),
    ('MiMo V2.5','MiMo'),('MiMo V2.5 Pro','MiMo'),('Kimi K2.6','Kimi'),
]
metrics = ['auc','answerable','refusal','rate']
lines = table('tab:model-evaluation')
assert len(lines) == len(names) == 20
models = [dict(name=n, family=f, **dict(zip(metrics, values(line)))) for (n,f),line in zip(names,lines)]

thinking_names = [('GPT-5.6 Luna','Off'),('GPT-5.6 Luna','Low'),('GPT-5.6 Luna','Medium'),('GPT-5.6 Luna','High'),('DeepSeek V4 Flash (Preview)','Off'),('DeepSeek V4 Flash (Preview)','On'),('Qwen3.7 Plus','Off'),('Qwen3.7 Plus','On'),('MiMo V2.5','Off'),('MiMo V2.5','On')]
thinking = [dict(name=n, mode=m, **dict(zip(metrics, values(line)))) for (n,m),line in zip(thinking_names,table('tab:thinking-evaluation'))]
for row,line in zip(thinking,table('tab:thinking-evaluation')):
    changes = re.findall(r'\\thinking(?:gain|loss)\{\(([+-][\d.]+)\)\}',line)
    if changes: row['reportedChange'] = dict(zip(metrics,map(float,changes)))
prompt_names = ['DeepSeek V4 Flash (Preview)','Qwen3.7 Plus','MiMo V2.5','GPT-5.6 Luna']
prompting = [dict(name=prompt_names[i//3], prompt=['None','Refusal Hint','Consequence-Guided'][i%3], **dict(zip(metrics,values(line)))) for i,line in enumerate(table('tab:prompt-strategy'))]

# Reuse the exact paper domain taxonomy without importing the dashboard server.
tree = ast.parse((args.evaluation_root / 'src/rsc_auc/webapp.py').read_text())
selected = []
for node in tree.body:
    if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id in ['DOMAIN_DISPLAY_BY_RAW','ANSWERABLE_SUBJECT_DOMAINS'] for t in node.targets):
        selected.append(node)
    elif isinstance(node, ast.FunctionDef) and node.name in ['domain_label','domain_display']:
        node.returns = None
        for arg in node.args.args: arg.annotation = None
        selected.append(node)
namespace = {}
exec(compile(ast.Module(body=selected,type_ignores=[]), '<paper-taxonomy>', 'exec'),namespace)
manifest = args.evaluation_root / 'outputs/final_dataset_15k/final_risk_manifest_15000.jsonl'
records = {r['record_id']:r for r in (json.loads(line) for line in manifest.open())}
assert len(records) == 15000
domain_of = {k:namespace['domain_display'](SimpleNamespace(**r)) if r['answerability'] else 'AbstentionBench' for k,r in records.items()}
domain_order = [*namespace['ANSWERABLE_SUBJECT_DOMAINS'],'AbstentionBench']
domains = []
sources = []
for key,name in [('gemini-3.6-flash_minimal','Gemini 3.6 Flash'),('gpt-5.6-sol_nonthinking','GPT-5.6 Sol')]:
    path = args.evaluation_root / f'outputs/model_evaluations_cost_aware/refusal_only_nonthinking/{key}/enhanced_predictions.jsonl'
    sources.append(str(path.relative_to(args.evaluation_root)))
    grouped = defaultdict(lambda:dict(count=0,correct=0.,wrong=0.,refuse=0.,cost=0.))
    predictions = [json.loads(line) for line in path.open()]
    assert len(predictions) == 15000
    attempted = correct_answerable = refused_required = 0
    for item in predictions:
        p = item.get('prediction',item)
        r = records[p['record_id']]
        b = grouped[domain_of[p['record_id']]]
        b['count'] += 1; b['cost'] += r['L']
        answer = bool(p['attempted_answer']); correct = bool(p['correct'])
        attempted += answer
        correct_answerable += bool(r['answerability'] and answer and correct)
        refused_required += bool(not r['answerability'] and not answer)
        if not answer and not r['answerability']: b['correct'] += 1
        elif not answer: b['refuse'] -= 2
        elif correct: b['correct'] += 1
        else: b['wrong'] -= r['L']
    expected = next(m for m in models if m['name']==name)
    assert abs(100*correct_answerable/7500-expected['answerable']) < .011
    assert abs(100*refused_required/7500-expected['refusal']) < .011
    assert abs(100*attempted/15000-expected['rate']) < .011
    for domain in domain_order:
        b = grouped[domain]
        domains.append(dict(domain=domain, model=name, count=b['count'], meanCost=b['cost']/b['count'], correct=b['correct']/b['count'], wrong=b['wrong']/b['count'], refuse=b['refuse']/b['count']))

data = dict(models=models, thinking=thinking, prompting=prompting, domains=domains, domainOrder=domain_order,
    provenance=dict(paper='iclr2027_conference.tex', tables=['tab:model-evaluation','tab:thinking-evaluation','tab:prompt-strategy'], figures=['fig:main-model-3d','fig:sol-gemini-domain'], records=15000, refusalCost=2, prompt='Refusal Hint', scores='binary action', mode='non-thinking', domainSources=sources, domainUnits='Mean utility per record within each domain. Figure 4 view divides each outcome component by the largest positive or negative stack among the two models in that domain.'))
existing=root/'data/results.json'
if existing.exists():
    additional=json.loads(existing.read_text()).get('additionalRuns',[])
    if additional:data['additionalRuns']=additional
existing.write_text(json.dumps(data,indent=2)+'\n')
print('Exported 20 models, 10 thinking rows, 12 prompt rows, and 22 domain-model rows; source accuracies verified.')
