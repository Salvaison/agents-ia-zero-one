#!/usr/bin/env python3
"""BOONOLAB historical OBSERVATION ONLY; PM3, PM5, PM Live dissonance Nov 1–7.
No trading rules, orders, refitting on future returns or new PAPER writes.
"""
import json,gzip,glob,datetime,statistics,math,bisect,collections
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'
Z=ZoneInfo('Europe/Stockholm')
START=int(datetime.datetime(2026,11,1,tzinfo=Z).timestamp()*1000)
# Frozen cut-off: make the same historical study reproducible next month.
END=int(datetime.datetime(2026,11,7,19,56,tzinfo=Z).timestamp()*1000)
MIN=60000
def local(t):return datetime.datetime.fromtimestamp(t/1000,Z).strftime('%Y-%m-%d %H:%M:%S')
def rounded(v,n=2):return round(v,n) if isinstance(v,(int,float)) and math.isfinite(v) else None
def percentile(x,q):
 a=sorted(y for y in x if isinstance(y,(int,float)) and math.isfinite(y))
 if not a:return None
 z=(len(a)-1)*q;low=int(z);high=min(low+1,len(a)-1)
 return a[low]+(a[high]-a[low])*(z-low)
def med(x):return percentile(x,.5)
def sign(x):return 1 if x>0 else -1 if x<0 else 0
def pattern(pm3,pm5,live):
 a,b,c=map(sign,[pm3,pm5,live])
 if a==b==c:return 'ALIGNED_ALL'
 if a==b and a!=c:return 'LIVE_OPPOSES_BOTH'
 if a==c and a!=b:return 'PM3_LIVE_VS_PM5'
 if b==c and a!=b:return 'PM5_LIVE_VS_PM3'
 return 'OTHER'
# Require exact unchanged as-of samples from V494 (the cross-validation against V543 is separate).
observations={}
for path in sorted(DATA.glob('v494-elastic-state-observations*.ndjson')):
 with path.open() as f:
  for line in f:
   try:v=json.loads(line)
   except:continue
   ts=v.get('asOf')
   if not isinstance(ts,int) or not START<=ts<=END or not isinstance(v.get('price'),(int,float)):continue
   m=v.get('measurements') or {}
   vals=[m.get('pm3Usd'),m.get('pm5Usd'),m.get('pmLiveUsd')]
   if any(not isinstance(x,(int,float)) or not math.isfinite(x) for x in vals):continue
   observations[ts]={'ts':ts,'price':v['price'],'pm3':vals[0],
    'pm5':vals[1],'pmLive':vals[2],
    'quality':v.get('states',{}).get('CONVERSION_QUALITY'),
    'marketState':v.get('states',{}).get('MARKET_REGIME'),
    'mcb15':m.get('mcb15Direction'),
    'flowBtcSec':m.get('aggressiveFlowBtcPerSec'),
    'pattern':pattern(*vals)}
obs=sorted(observations.values(),key=lambda x:x['ts'])
times=[r['ts'] for r in obs]
audit={}
for path in sorted((DATA/'audit-14d').glob('audit-2026110*.ndjson*')):
 with gzip.open(path,'rt') if path.suffix=='.gz' else path.open() as f:
  for line in f:
   try:x=json.loads(line)
   except:continue
   ts=x.get('ts')
   if isinstance(ts,int) and START<=ts<=END and isinstance(x.get('winSec'),(int,float)) and x['winSec']>0 and isinstance(x.get('volumeFenetreBtc'),(int,float)):
    audit[ts]={'ts':ts,'flow':x['volumeFenetreBtc']/x['winSec'],
     'cadence':x.get('cadence'),'price':x.get('lastPrice'),'move':x.get('priceMove')}
aud=sorted(audit.values(),key=lambda x:x['ts'])
hourly=collections.defaultdict(list)
for x in aud:
 d=datetime.datetime.fromtimestamp(x['ts']/1000,Z)
 hourly[d.replace(minute=0,second=0,microsecond=0).isoformat()].append(x)
hours=[]
for h,r in sorted(hourly.items()):
 if len(r)<90:continue
 prices=[x['price'] for x in r if isinstance(x.get('price'),(int,float))]
 steps=[abs(y-x) for x,y in zip(prices[:-1],prices[1:])]
 path=sum(steps);delta=prices[-1]-prices[0]
 maxDepart=max(abs(p-prices[0]) for p in prices)
 hours.append({'hour':h,'flow':med(x['flow'] for x in r),
  'cadence':med(x['cadence'] for x in r),'samples':len(r),
  'net':delta,'path':path,'eff':abs(delta)/path if path else 0,
  'retention':abs(delta)/maxDepart if maxDepart else 0,
  'range':max(prices)-min(prices),
  'medAbsBatonMove':med(abs(x['move']) for x in r if isinstance(x.get('move'),(int,float)))})
flows=[x['flow'] for x in hours]
# One-dimensional K-means on log BTC/sec as descriptive clusters, no training on future trade P&L.
logflow=sorted(math.log(f) for f in flows if f>0)
centers=[percentile(logflow,p) for p in [.16,.5,.90]]
for _ in range(100):
 grouping=[[] for _ in centers]
 for v in logflow:grouping[min(range(3),key=lambda i:abs(v-centers[i]))].append(v)
 nxt=[statistics.mean(g) if g else centers[i] for i,g in enumerate(grouping)]
 if max(abs(a-b) for a,b in zip(nxt,centers))<1e-9:break
 centers=sorted(nxt)
lowBorder=math.exp((centers[0]+centers[1])/2)
highBorder=math.exp((centers[1]+centers[2])/2)
def intensity(flow):
 if flow is None:return 'UNKNOWN'
 return 'LOW' if flow<lowBorder else 'MEDIUM' if flow<highBorder else 'HIGH'
for h in hours:h['intensity']=intensity(h['flow'])
groups={g:[x for x in hours if x['intensity']==g] for g in ['LOW','MEDIUM','HIGH']}
# Hourly productiveness is an illustrative per-intensity diagnostic, *not* a proven rule.
for g,arr in groups.items():
 ef=med(x['eff'] for x in arr);re=med(x['retention'] for x in arr)
 for h in arr:
  # Net vs price path and final territory retained; require 1-hour net price larger than taker roundtrip equivalent at observed BTC price ~75 USD.
  h['quality']='PRODUCTIF_EXPLORATOIRE' if h['eff']>=ef and h['retention']>=re and abs(h['net'])>=75 else 'IMPRODUCTIF_EXPLORATOIRE'
hourLookup={h['hour']:h for h in hours}
audTimes=[x['ts'] for x in aud]
def state_at(ts):
 # The event's intensity can only use observations that ALREADY EXISTED
 # before the PM dissonance, not the remainder of its current wall-clock hour.
 i=bisect.bisect_right(audTimes,ts)
 pre=[x for x in aud[max(0,i-125):i] if x['ts']>=ts-60*MIN]
 if len(pre)<70:return {'intensity':'UNKNOWN','coverage':len(pre)}
 flow=med(x['flow'] for x in pre)
 return {'intensity':intensity(flow),'flowPriorOneHour':rounded(flow,4),
  'coverage':len(pre),'asOf':ts,'baselineNote':
  'CLUSTER_THRESHOLDS_FITTED_FULL_SAMPLE_DESCRIPTIVE_NOT_PROSPECTIVE'}
# A snapshot score in PM Live direction, only as-of price and future observed prices; no interpolation.
def outcome(event,minutes):
 target=event['ts']+minutes*MIN
 i=bisect.bisect_left(times,target)
 if i>=len(obs) or obs[i]['ts']>target+75000 or obs[i]['ts']<target-1000:return None
 p=obs[i]['price']
 diff=sign(event['pmLive'])*(p-event['price'])
 fee_equiv=.001*event['price'] # approximate BTC price move for 0.05% taker each side
 return {'at':obs[i]['ts'],'deltaPrice':rounded(p-event['price'],2),
  'pmLiveSignedUsd':rounded(diff,2),'favorable':diff>0,
  'coveredFeesEquivalent':diff>fee_equiv,'price':p,
  'feeEquivalentPriceUsd':rounded(fee_equiv,2)}
def episodes(values,cool=45*MIN):
 chosen=[];lastAt=-10**18
 for x in values:
  if x['ts']-lastAt>=cool:
   chosen.append(x);lastAt=x['ts']
 return chosen
primary={}
for threshold in [75,100,125,150]:
 cand=[x for x in obs if all(abs(x[k])>=threshold for k in ['pm3','pm5','pmLive'])]
 pat=collections.Counter(x['pattern'] for x in cand)
 primary[threshold]={'snapshots':len(cand),'patterns':dict(pat),
   'independent45m':len(episodes([x for x in cand if x['pattern']!='ALIGNED_ALL']))}
cand=[x for x in obs if min(abs(x[k]) for k in ('pm3','pm5','pmLive'))>=100]
episodesBy={}
for k in ['LIVE_OPPOSES_BOTH','PM3_LIVE_VS_PM5','PM5_LIVE_VS_PM3','ALIGNED_ALL']:
 selected=[x for x in cand if x['pattern']==k]
 episodesBy[k]=episodes(selected)
 def sumout(minutes):
  outs=[outcome(e,minutes) for e in episodesBy[k]]
  valid=[o for o in outs if o is not None]
  return {'n':len(valid),'censored':len(outs)-len(valid),
   'favorable':sum(o['favorable'] for o in valid),
   'favorablePct':rounded(100*sum(o['favorable'] for o in valid)/len(valid),1) if valid else None,
   'afterFeesCount':sum(o['coveredFeesEquivalent'] for o in valid),
   'afterFeesPct':rounded(100*sum(o['coveredFeesEquivalent'] for o in valid)/len(valid),1) if valid else None,
   'medianSignedUsd':rounded(med(o['pmLiveSignedUsd'] for o in valid),2),
   'meanSignedUsd':rounded(statistics.mean(o['pmLiveSignedUsd'] for o in valid),2) if valid else None,
   'q25':rounded(percentile((o['pmLiveSignedUsd'] for o in valid),.25),1),
   'q75':rounded(percentile((o['pmLiveSignedUsd'] for o in valid),.75),1)}
 primary[100]['note']='Independent per pattern; repeated runs/overlap across different patterns possible'
 primary[100][k]={'snapshotN':len(selected),'episodesN':len(episodesBy[k]),
  'perDay':dict(collections.Counter(local(x['ts'])[:10] for x in selected)),
  'intensityAtEvent':dict(collections.Counter((state_at(x['ts']) or {}).get('intensity','UNKNOWN') for x in episodesBy[k])),
  'outcomes':{str(m):sumout(m) for m in [3,15,45]}}
# Sensitivity: pre-declared signal amplitude changes, never choose by outcome.
sensitivity={}
for threshold in [75,100,125,150]:
 select=episodes([x for x in obs if min(abs(x[k]) for k in
   ('pm3','pm5','pmLive'))>=threshold and x['pattern']=='LIVE_OPPOSES_BOTH'])
 sensitivity[str(threshold)]={'episodes45m':len(select),
  'outcomes':{str(m):{'n':len(z:=[outcome(e,m) for e in select if outcome(e,m) is not None]),
   'favorable':sum(y['favorable'] for y in z),
   'favorablePct':rounded(100*sum(y['favorable'] for y in z)/len(z),1) if z else None,
   'medianSignedUsd':rounded(med(y['pmLiveSignedUsd'] for y in z),2)}
    for m in [3,15,45]}}
events=[]
for k in ['LIVE_OPPOSES_BOTH','PM3_LIVE_VS_PM5','PM5_LIVE_VS_PM3','ALIGNED_ALL']:
 for x in episodesBy[k]:
  entry={**x,'local':local(x['ts']),'regime':state_at(x['ts']) or {},'horizons':{str(m):outcome(x,m) for m in [3,15,45]}}
  events.append(entry)
events.sort(key=lambda x:x['ts'])
# Global 45m non-overlap for all contradicton episodes, not baseline.
globalContradictory=episodes(sorted([x for x in cand if x['pattern']!='ALIGNED_ALL'],key=lambda x:x['ts']))
def globstats(minutes):
 v=[outcome(e,minutes) for e in globalContradictory]
 valid=[x for x in v if x is not None]
 return {'eligible':len(v),'valid':len(valid),'favorable':sum(x['favorable'] for x in valid),
  'pctFavorable':rounded(100*sum(x['favorable'] for x in valid)/len(valid),1) if valid else None,
  'medianSignedUsd':rounded(med(x['pmLiveSignedUsd'] for x in valid),2),
  'afterFeeEquivalent':sum(x['coveredFeesEquivalent'] for x in valid),
  'afterFeePct':rounded(100*sum(x['coveredFeesEquivalent'] for x in valid)/len(valid),1) if valid else None}
globalResults={str(m):globstats(m) for m in [3,15,45]}
out={
 'study':'PM3_PM5_PMLIVE_DISSONANCE_FROM_2026_11_01',
 'startLocal':local(START),'endLocal':local(obs[-1]['ts']),
 'dataSource':'V494 elastic-state 30s archived snapshots with independent but related PM measures',
 'nSnapshots':len(obs),'nAuditRows':len(aud),
 'hourly':{'n':len(hours),'q20':rounded(percentile(flows,.20),4),
  'q25':rounded(percentile(flows,.25),4),'q33':rounded(percentile(flows,1/3),4),
  'medianFlow':rounded(med(flows),4),'q67':rounded(percentile(flows,2/3),4),
  'q75':rounded(percentile(flows,.75),4),'q90':rounded(percentile(flows,.90),4),
  'logKMeansCentersBtcSec':[rounded(math.exp(c),4) for c in centers],
  'tentativeLowerBoundary':rounded(lowBorder,4),
  'tentativeUpperBoundary':rounded(highBorder,4),
  'perIntensity':{k:{'nHours':len(group),
    'medFlow':rounded(med(x['flow'] for x in group),4),
    'medCadence':rounded(med(x['cadence'] for x in group),2),
    'medRange':rounded(med(x['range'] for x in group),1),
    'medAbsNet':rounded(med(abs(x['net']) for x in group),1),
    'medPath':rounded(med(x['path'] for x in group),1),
    'medianEfficiency':rounded(med(x['eff'] for x in group),4),
    'medianRetention':rounded(med(x['retention'] for x in group),4),
    'productiveHours':sum(x['quality']=='PRODUCTIF_EXPLORATOIRE' for x in group),
    'improductiveHours':sum(x['quality']=='IMPRODUCTIF_EXPLORATOIRE' for x in group)}
    for k,group in groups.items()}},
 'thresholds':primary,
 'sensitivityStrongReversal':sensitivity,
 'allRawContradictions':[{'local':local(x['ts']),'ts':x['ts'],
     'price':x['price'],'pm3':x['pm3'],'pm5':x['pm5'],
     'pmLive':x['pmLive'],'pattern':x['pattern'],
     'quality':x['quality'],'intensityPrior1h':state_at(x['ts']).get('intensity'),
     'horizons':{str(m):outcome(x,m) for m in [3,15,45]}}
     for x in cand if x['pattern']!='ALIGNED_ALL'],
 'globallyIndependentContradictionsN':len(globalContradictory),
 'globallyIndependentOutcomes':globalResults,
 'globalEvents':[{'local':local(x['ts']),'price':x['price'],
    'pm3':x['pm3'],'pm5':x['pm5'],'pmLive':x['pmLive'],
    'pattern':x['pattern'],'stateAtEvent':(state_at(x['ts']) or {}).get('intensity'),
    'horizons':{str(m):outcome(x,m) for m in [3,15,45]}}
    for x in globalContradictory],
 'events':events,'hourlyTable':hours,
 'warnings':['PM Live is the V494 Elastic 30s snapshot, not necessarily exactly the V543 5s PM Live',
 'Event intensity uses only trailing one hour of observed Audit, though its relative cluster thresholds are fitted ex-post and require walk-forward validation',
 'Horizon outcomes measured in BTC price displacement, not actual PAPER trade PNL',
 'Hourly intensity cutoffs fitted on whole observed sample, descriptive lookahead: NOT actionable as-of',
 'Independent episodes use 45 min refractory; still not causal or independent market paths',
 'Productivity labels use provisional per-intensity medians and one hour net move >~ roundtrip fees; no future leakage into event detection once calibrated separately',
 'Missing or late future sources censored, no interpolation']}
path=ROOT/'knowledge'/'BOONOLAB_PM_dissonance_study_results_2026-11-07.json'
path.write_text(json.dumps(out,ensure_ascii=False,indent=2))
summary={k:v for k,v in out.items() if k not in ['events','hourlyTable']}
print(json.dumps(summary,ensure_ascii=False,indent=2))
print('EXAMPLES')
for e in events:
 if e['pattern']=='ALIGNED_ALL':continue
 print(json.dumps({'local':e['local'],'pattern':e['pattern'],
   'PM3':e['pm3'],'PM5':e['pm5'],'PMLive':e['pmLive'],'intensity':e['regime'].get('intensity'),
   'signedAt3':e['horizons']['3']['pmLiveSignedUsd'] if e['horizons']['3'] else None,
   'signedAt15':e['horizons']['15']['pmLiveSignedUsd'] if e['horizons']['15'] else None,
   'signedAt45':e['horizons']['45']['pmLiveSignedUsd'] if e['horizons']['45'] else None},ensure_ascii=False))
print('RESULT_PATH',path,'size',path.stat().st_size)
