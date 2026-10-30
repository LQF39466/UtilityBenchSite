"""Import aggregate metrics only; no per-sample results or dataset required."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'data/results.json').read_text())
sweep=json.loads((root/'data/refusal-costs.json').read_text())
models=[('glm-5.3-flash-1029','GLM-5.3 Flash','GLM','T'),('gpt-6-astra-1030','GPT-6 Astra','GPT','T'),('gpt-6.1-terra-1029','GPT-6.1 Terra','GPT','NT'),('qwen3.8-flash-1029','Qwen3.8 Flash','Qwen','NT')]
for folder,name,family,mode in models:
    source=json.loads((root/'output'/folder/'metrics.json').read_text())
    assert source['status']=='completed'
    m=source['metrics'];assert m['record_count']==15000
    values=[round(m['utility_auc_by_C_R'][str(c)],4) for c in sweep['costs']]
    assert all(0<=v<=1 for v in values)
    row=dict(name=name,family=family,mode=mode,auc=values[sweep['costs'].index(2)],answerable=round(m['answerable_accuracy']*100,2),refusal=round(m['refusal_required_accuracy']*100,2),rate=round(m['answer_rate']*100,2))
    data['additionalRuns']=[r for r in data.get('additionalRuns',[]) if r['name']!=name]+[row]
    run_id=name+'|'+mode
    sweep['runs']=[r for r in sweep['runs'] if r['id']!=run_id]+[dict(id=run_id,auc=values)]
    print(row)
(root/'data/results.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(root/'data/refusal-costs.json').write_text(json.dumps(sweep,ensure_ascii=False,indent=2)+'\n')
