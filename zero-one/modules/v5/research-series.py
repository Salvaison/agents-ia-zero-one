#!/usr/bin/env python3
"""Read-only causal screening of historical V5 chains. NOT a trading backtest."""
import json,bisect,collections,statistics,datetime
from pathlib import Path
BASE=Path(__file__).resolve().parents[2]/'data'
a=json.loads((BASE/'audit-history.json').read_text())
events=[json.loads(x) for x in (BASE/'elastic-observer-events.ndjson').read_text().splitlines() if x.strip()]
audit=sorted([x for x in a if isinstance(x.get('ts'),(int,float)) and isinstance(x.get('lastPrice'),(float,int))],key=lambda x:x['ts'])
ats=[x['ts'] for x in audit]
ev=sorted(events,key=lambda x:(x.get('observedAt',0),x.get('id',0)))
e15=[];seen=set()
for x in ev:
 if x.get('family')!='MCB15' or x.get('key')!='E15' or x.get('type')!='OBSERVED':continue
 d=x.get('direction')
 if d not in ('long','short'):continue
 k=(d,x.get('current',{}).get('sourceTs'))
 if k in seen:continue
 seen.add(k);e15.append(x)
e3=[x for x in ev if x.get('family')=='MCB3' and x.get('key')=='E3' and x.get('type')=='OBSERVED']
qualities=[x for x in ev if x.get('family')=='CONVERSION' and
  x.get('type') in ('TRANSITION','RESTORED','CONFIRMED') and
  x.get('direction') in ('long','short') and
  ((isinstance(x.get('current'),dict) and x['current'].get('quality') in ('POWERFUL','EASY','PRODUCTIVE','EXCEPTIONAL')) or
   (isinstance(x.get('current'),str) and x['current'] in ('POWERFUL','EASY','PRODUCTIVE','EXCEPTIONAL')))]
# No future leak: recognition time is MAX of all component observation times.
# +/- eight minutes is a screening hypothesis, not a decision threshold.
W=8*60000
def future(t,d,mins):
 j=bisect.bisect_left(ats,t)
 if j>=len(audit):return None
 start=audit[j]['lastPrice']
 k=bisect.bisect_left(ats,t+mins*60000)
 if k>=len(audit) or ats[k]-t-mins*60000>45000:return None
 path=[x['lastPrice'] for x in audit[j:k+1]]
 s=1 if d=='long' else -1
 gains=[s*(x-start) for x in path]
 return {'net':round(gains[-1],1),'mfe':round(max(gains),1),'mae':round(-min(gains),1),'startPrice':start,'endPrice':audit[k]['lastPrice']}
candidates=[];baseline=[]
for x in e15:
 t=x['observedAt'];d=x['direction']
 result=future(t,d,15)
 if result:baseline.append({'ts':t,'direction':d,**result})
 # Select nearest E3 + conversion at observation time; valid combinations can come in changing order.
 near3=[y for y in e3 if y.get('direction')==d and abs(y['observedAt']-t)<=W]
 nearq=[y for y in qualities if y.get('direction')==d and abs(y['observedAt']-t)<=W]
 if not near3 or not nearq:continue
 y=min(near3,key=lambda z:abs(z['observedAt']-t))
 z=min(nearq,key=lambda z:abs(z['observedAt']-max(t,y['observedAt'])))
 trigger=max(t,y['observedAt'],z['observedAt'])
 # There is no entry at the earlier E15 timestamp if E3 or PM only arrives later.
 out15=future(trigger,d,15)
 if not out15:continue
 out30=future(trigger,d,30)
 candidates.append({'e15ObservedAt':t,'triggerAt':trigger,'direction':d,
  'e3ObservedAt':y['observedAt'],'qualityObservedAt':z['observedAt'],
  'quality':z.get('current',{}).get('quality') if isinstance(z.get('current'),dict) else z.get('current'),
  'out15':out15,'out30':out30,
  'futureUsedForSelection':False})
def summ(rows,key):
 nets=[x[key]['net'] for x in rows if x.get(key)]
 return {'count':len(nets),'positive15m':sum(x>0 for x in nets),
  'sharePositive':round(sum(x>0 for x in nets)/len(nets),3) if nets else None,
  'medianSignedPriceUsd':round(statistics.median(nets),1) if nets else None}
print(json.dumps({'source':'AUDIT 30s + Elastic events observedAt','mode':'EXPLORATORY_POSTFACTUAL',
 'e15LiveCount':len(e15),'baseline':{'count':len(baseline),
   'sharePositive15m':round(sum(x['net']>0 for x in baseline)/len(baseline),3) if baseline else None,
   'medianSigned15m':round(statistics.median(x['net'] for x in baseline),1) if baseline else None},
 'compound':summ(candidates,'out15'),'compound30m':summ(candidates,'out30'),
 'examples':candidates[-12:],'warnings':[
   'Past observation does not prove future profitability',
   'E15/E3/PM causal timestamps bounded by trigger max',
   '8-minute screening window hypothetical, test alternatives',
   'No fills, fees, slippage, positions, or strategy decisions simulated',
   'Multiple candidates may belong to one market campaign; observations not independent'
 ]},ensure_ascii=False,indent=2))
