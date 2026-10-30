"""Import additional evaluated runs without changing the paper's research snapshot.

Usage: python scripts/import-output.py --dataset /path/to/test.parquet
Requires pyarrow. Only aggregate scores are exported to public data files.
"""
import argparse
import json
from pathlib import Path

import pyarrow.parquet as pq

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--dataset', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
records = pq.read_table(args.dataset, columns=['id', 'answerability', 'L']).to_pylist()
by_id = {r['id']: r for r in records}
n = len(records)
assert n == len(by_id) == 15000
assert sum(r['answerability'] for r in records) == 7500

def integral(gains):
    return sum(g * (n-i-.5) for i,g in enumerate(gains)) / (n*n)

result_path = root / 'data/results.json'
sweep_path = root / 'data/refusal-costs.json'
data = json.loads(result_path.read_text())
sweep = json.loads(sweep_path.read_text())
references = []
for cost in sweep['costs']:
    upper = integral(sorted((r['answerability']*(1+cost) for r in records), reverse=True))
    lower = integral(sorted(min(0, cost-r['L']) if r['answerability'] else -r['L']-1 for r in records))
    references.append((lower, upper))

new_runs, new_sweeps = [], []
for folder, name, family, mode in [
    ('gemini-4-argon-1029', 'Gemini 4 Argon', 'Gemini', 'T'),
    ('mimo-v2.6-flash-1029', 'MiMo V2.6 Flash', 'MiMo', 'NT'),
    ('mimo-v2.6-pro-1029', 'MiMo V2.6 Pro', 'MiMo', 'NT'),
]:
    source = root / 'output' / folder / 'result.json'
    state = json.loads(source.read_text())
    assert state['status'] == 'completed'
    assert not state['missing_model_ids'] and not state['pending_judge_ids']
    assert ('NT' if state['settings']['model']['thinking'] == 'off' else 'T') == mode
    judgments = {int(k): v for k,v in state['results'].items()}
    assert judgments.keys() == by_id.keys()
    answered = correct = answerable_answered = unanswerable_answered = 0
    wrong_cost = 0.
    for record_id, j in judgments.items():
        r = by_id[record_id]
        assert j['id'] == record_id and not j.get('pending_judge', False)
        assert j['score'] == int(j['attempted_answer']), 'The sweep requires binary action scores'
        if not j['attempted_answer']:
            continue
        answered += 1
        answerable_answered += r['answerability']
        unanswerable_answered += 1-r['answerability']
        correct += bool(r['answerability'] and j['correct'])
        if not j['correct']:
            wrong_cost += r['L']
    metrics = state['metrics']
    computed = {'answer_rate': answered/n, 'answerable_accuracy': correct/7500,
                'refusal_required_accuracy': 1-unanswerable_answered/7500}
    assert metrics['record_count'] == n
    for key, value in computed.items():
        assert abs(value-metrics[key]) < 1e-12, (name, key)
    aucs = []
    for cost, (lower, upper) in zip(sweep['costs'], references):
        gain = correct + cost*answerable_answered - wrong_cost - unanswerable_answered
        aucs.append((gain/n*(1-answered/n/2)-lower)/(upper-lower))
    default_index = sweep['costs'].index(2)
    assert abs(aucs[default_index]-metrics['utility_auc']) < 1e-10, name
    row = {'name': name, 'family': family, 'mode': mode,
           'auc': round(metrics['utility_auc'],4),
           'answerable': round(metrics['answerable_accuracy']*100,2),
           'refusal': round(metrics['refusal_required_accuracy']*100,2),
           'rate': round(metrics['answer_rate']*100,2)}
    if mode == 'T': row['effort'] = 'Low'
    new_runs.append(row)
    new_sweeps.append({'id': name+'|'+mode, 'auc': [round(a,4) for a in aucs]})
    print(row)

names = {r['name'] for r in new_runs}
data['additionalRuns'] = [r for r in data.get('additionalRuns',[]) if r['name'] not in names] + new_runs
ids = {r['id'] for r in new_sweeps}
sweep['runs'] = [r for r in sweep['runs'] if r['id'] not in ids] + new_sweeps
result_path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
sweep_path.write_text(json.dumps(sweep,ensure_ascii=False,indent=2)+'\n')
