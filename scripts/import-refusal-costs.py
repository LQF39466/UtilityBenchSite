"""Export the paper's refusal-cost grid using fixed binary-scored judgments.

Only aggregate UtilityAUC values leave the local evaluation directory.
Usage: python3 scripts/import-refusal-costs.py --evaluation-root /path/to/RSC-AUC
"""
import argparse
import ast
import json
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--evaluation-root',type=Path,required=True)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'data/results.json').read_text())
costs=[0,.25,.5,1,2,3,4,8,16,32,64]
manifest=args.evaluation_root/'outputs/final_dataset_15k/final_risk_manifest_15000.jsonl'
records={r['record_id']:r for r in map(json.loads,manifest.open())}
n=len(records)
assert n==15000
# Use the paper exporter names to locate exactly the same finalized runs.
tree=ast.parse((args.evaluation_root/'scripts/build_paper_tables.py').read_text())
labels=next(ast.literal_eval(node.value) for node in tree.body if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='MAIN_LABELS' for t in node.targets))
paths={name:folder for folder,name in labels.items()}

def integral(gains):
 return sum(g*(n-i-.5) for i,g in enumerate(gains))/(n*n)

references=[]
for cost in costs:
 fallback=sum((1-r['answerability'])-r['answerability']*cost for r in records.values())/n
 upper=integral(sorted((r['answerability']*(1+cost) for r in records.values()),reverse=True))
 lower=integral(sorted((min(0,cost-r['L']) if r['answerability'] else -r['L']-1) for r in records.values()))
 references.append((fallback,lower,upper))

runs=[(m['name']+'|NT',m,False,paths[m['name']]) for m in data['models']]
for m in data['thinking']:
 if m['mode']=='Off':continue
 folder=paths[m['name']]
 if m['name']=='GPT-5.6 Luna':folder=folder.replace('_none','_'+m['mode'].lower())
 else:folder=folder.replace('_nonthinking','_thinking')
 runs.append((m['name']+'|'+m['mode'],m,True,folder))
export=[]
for run_id,expected,thinking,folder in runs:
 path=args.evaluation_root/'outputs/model_evaluations_cost_aware'/('refusal_only_thinking' if thinking else 'refusal_only_nonthinking')/folder/'enhanced_predictions.jsonl'
 seen=set();answered=answerable_answered=correct=unanswerable_answered=0;wrong_cost=0.
 for row in map(json.loads,path.open()):
  p=row.get('prediction',row);record_id=p['record_id'];assert record_id not in seen;seen.add(record_id)
  r=records[record_id]
  assert p.get('score_binary',int(p['attempted_answer']))==int(p['attempted_answer'])
  if not p['attempted_answer']:continue
  answered+=1;answerable_answered+=bool(r['answerability']);correct+=bool(r['answerability'] and p['correct']);unanswerable_answered+=not r['answerability']
  if not p['correct']:wrong_cost+=r['L']
 assert seen==records.keys()
 values=[]
 for cost,(fallback,lower,upper) in zip(costs,references):
  # All answers form one tied score group; refusals have zero marginal gain.
  gain=correct+cost*answerable_answered-wrong_cost-unanswerable_answered
  area_gain=gain/n*(1-answered/n/2)
  values.append(round((area_gain-lower)/(upper-lower),4))
 assert abs(values[4]-expected['auc'])<.00011,(run_id,values[4],expected['auc'])
 values[4]=expected['auc'] # Preserve the published rounding at the default.
 export.append({'id':run_id,'auc':values})
 print('Exported',run_id,flush=True)
(root/'data/refusal-costs.json').write_text(json.dumps({'costs':costs,'runs':export,'protocol':{'scores':'binary action','fixedResponses':True,'normalization':'dataset-level references recomputed at each refusal cost','records':n}},indent=2)+'\n')
print('Saved 26 runs × 11 refusal costs; default agrees with the published results.')
