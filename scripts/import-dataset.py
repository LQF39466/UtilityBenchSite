"""Export aggregate dataset distributions; no individual prompts are published."""
import argparse
import ast
import json
import math
from collections import Counter
from pathlib import Path
from statistics import median
from types import SimpleNamespace

parser = argparse.ArgumentParser()
parser.add_argument('--evaluation-root', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
tree = ast.parse((args.evaluation_root / 'src/rsc_auc/webapp.py').read_text())
selected = []
for node in tree.body:
    if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id in ['DOMAIN_DISPLAY_BY_RAW', 'ANSWERABLE_SUBJECT_DOMAINS'] for t in node.targets):
        selected.append(node)
    elif isinstance(node, ast.FunctionDef) and node.name in ['domain_label', 'domain_display']:
        node.returns = None
        for arg in node.args.args:
            arg.annotation = None
        selected.append(node)
namespace = {}
exec(compile(ast.Module(body=selected, type_ignores=[]), '<paper-taxonomy>', 'exec'), namespace)
manifest = args.evaluation_root / 'outputs/final_dataset_15k/final_risk_manifest_15000.jsonl'
records = [json.loads(line) for line in manifest.open()]
assert len(records) == 15000
costs = sorted(r['L'] for r in records)
edges = [2 ** (i / 2) for i in range(-8, 15)]
histogram = [dict(low=a, high=b, count=sum(a <= v < b for v in costs)) for a, b in zip(edges, edges[1:])]
assert sum(b['count'] for b in histogram) == 15000

def quantile(values, q):
    a = sorted(values)
    index = (len(a)-1)*q
    lo = int(index)
    return a[lo] + (a[min(lo+1,len(a)-1)]-a[lo])*(index-lo)

domains = []
for domain in namespace['ANSWERABLE_SUBJECT_DOMAINS']:
    values = [r['L'] for r in records if r['answerability'] and namespace['domain_display'](SimpleNamespace(**r)) == domain]
    domains.append(dict(name=domain, count=len(values), q1=quantile(values,.25), median=median(values), q3=quantile(values,.75)))
sources = Counter(r['source_id'].split(':',1)[0] for r in records if r['answerability'])
assert len(sources) == 17
payload = dict(count=len(records), answerable=sum(r['answerability'] for r in records), refusalRequired=sum(not r['answerability'] for r in records), medianCost=median(costs), histogram=histogram, domains=sorted(domains,key=lambda d:d['median']), sources=[dict(name=n,count=c) for n,c in sources.most_common()], provenance=dict(source='final_risk_manifest_15000.jsonl', annotation='Best–Worst Scaling, Bradley–Terry aggregation', histogram='Half-octave bins; logarithmic cost axis. All 15,000 records.', domains='Answerable queries only. Median and interquartile range within each paper domain.'))
(root/'data/dataset.json').write_text(json.dumps(payload,indent=2)+'\n')
print('Exported 15,000 cost observations as aggregate bins, 10 domain summaries, and 17 source counts.')
