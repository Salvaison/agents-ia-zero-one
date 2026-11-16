#!/usr/bin/env python3
"""BOONOLAB historical 21-day E1/E4 study. READ ONLY, with bar-close as-of proxy.
No paper, order, broker, or financial ledgers written.
"""
from __future__ import annotations
import bisect,csv,datetime as dt,gzip,json,math,os,pathlib,statistics,collections,random
from zoneinfo import ZoneInfo
ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=ROOT/'data'
MCB=ROOT.parent/'data/mcb-live'
TZ=ZoneInfo('Europe/Stockholm')
UTC=dt.timezone.utc
PERIODS={'E1':3600_000,'E4':4*3600_000}
def read_ndjson(file):
    try:
        with open(file) as f:
            for l in f:
                try:yield json.loads(l)
                except (ValueError,TypeError):continue
    except FileNotFoundError:return
def millis(v):
    try:return int(v)
    except (TypeError,ValueError):return None
def date(ms):return dt.datetime.fromtimestamp(ms/1000,TZ).strftime('%d/%m %H:%M') if ms else '—'
def parse_ts(v):return int(dt.datetime.fromisoformat(v.replace('Z','+00:00')).timestamp()*1000)
def num(v):
    try:
        if v is None or v=='':return None
        x=float(v)
        return x if math.isfinite(x) else None
    except (TypeError,ValueError):return None
def load_bars(tf):
    path=MCB/f'mcb_{tf}.csv'
    with open(path,newline='') as f:
        rows=[]
        for r in csv.DictReader(f):
            try:
                t=parse_ts(r['timestamp'])
                l=num(r.get('lt_blue_wave')); b=num(r.get('blue_wave'));mf=num(r.get('money_flow'))
                if l is None or b is None:continue
                up=num(r.get('wt1_cross_up'));dn=num(r.get('wt1_cross_dn'))
                if up is not None and dn is not None:up=dn=None
                rows.append({'ts':t,'closeAt':t+({'1h':3600000,'4h':14400000}[tf]),
                   'lbw':l,'bw':b,'mf':mf,
                   'direction':'long' if up is not None else 'short' if dn is not None else None,
                   'price':num(r.get('close'))})
            except (ValueError,TypeError):continue
    return sorted(rows,key=lambda x:x['ts'])
def load_trades():
    files={'V494':sorted(DATA.glob('v494-paper-trades*.ndjson')),
           'V5':sorted(DATA.glob('v52-paper-trades*.ndjson'))}
    out={}
    for engine,paths in files.items():
        ledger={}
        for p in paths:
            for t in read_ndjson(p):
                n=millis(t.get('tradeNo'))
                if n is None:continue
                if t.get('entryAt') is None or t.get('exitAt') is None:continue
                ledger[n]=t
        out[engine]=sorted(ledger.values(),key=lambda x:x['entryAt'])
    return out
def load_observed_market():
    # Observational regime exists only since 7/11, no backfilled 21-day fiction.
    files=sorted(DATA.glob('boonolab-market-snapshots.segment-*.ndjson'))
    files+=[DATA/'boonolab-market-snapshots.ndjson']
    snapshots={}
    for file in files:
        for a in read_ndjson(file):
            ts=millis(a.get('asOf'))
            if ts is not None and a.get('regimeLabel'):snapshots[ts]=a
    return [snapshots[t] for t in sorted(snapshots)]

def event_asof(bars,at):
    closed=[b for b in bars if b['closeAt']<=at]
    events=[b for b in closed if b['direction']]
    curr=events[-1] if events else None
    end=closed[-1] if closed else None
    prev=closed[-2] if len(closed)>1 else None
    return {
        'side':curr['direction'] if curr else None,
        'signalAvailableAtProxy':curr['closeAt'] if curr else None,
        'signalSourceAt':curr['ts'] if curr else None,
        'ageHours':round((at-curr['closeAt'])/3600000,2) if curr else None,
        'lbw':end['lbw'] if end else None,
        'lbwChange':round(end['lbw']-prev['lbw'],2) if end and prev else None,
        'bw':end['bw'] if end else None,
        'lastClosedAt':end['closeAt'] if end else None,
        'closedBars':len(closed)
    }
def group_flags(t):
    a=t['e1']['side'];b=t['e4']['side'];direction=t['direction']
    if a is None or b is None:return 'INCOMPLETE'
    if a==direction and b==direction:return 'BOTH_ALIGN'
    if a==direction and b!=direction:return 'E1_ONLY'
    if a!=direction and b==direction:return 'E4_ONLY'
    return 'BOTH_OPPOSE'
def metrics(a):
    return {'n':len(a),'wins':sum(t['net']>0 for t in a),
      'winRate':round(sum(t['net']>0 for t in a)/len(a),4) if a else None,
      'netUsd':round(sum(t['net'] for t in a),4),
      'feesUsd':round(sum(t['fees'] for t in a),4),
      'meanNetUsd':round(sum(t['net'] for t in a)/len(a),4) if a else None,
      'medianNetUsd':round(statistics.median(t['net'] for t in a),4) if a else None}
def calculate(asof_ms):
    start=asof_ms-21*86400000
    bars={'E1':load_bars('1h'),'E4':load_bars('4h')}
    engines=load_trades()
    rows=[]
    for engine,trs in engines.items():
        for t in trs:
            at=millis(t['entryAt'])
            if at is None or not(start<=at<=asof_ms) or millis(t.get('exitAt'))>asof_ms:continue
            dir=t.get('direction')
            if dir not in ('long','short'):continue
            f={k:event_asof(v,at) for k,v in bars.items()}
            context=t.get('entryContext') or {}
            phase=context.get('phase')
            rows.append({'tradeNo':t['tradeNo'],'engine':engine,
              'version':t.get('engine'), 'entryAt':at,'exitAt':millis(t['exitAt']),
              'direction':dir,'net':num(t.get('netPnlUsd')) or 0,
              'fees':num(t.get('feesUsd')) or 0,'mfePriceUsd':num(t.get('mfePriceUsd')),
              'phase':phase,'campaignId':(context.get('causalChain') or {}).get('campaignId'),
              'e1':f['E1'],'e4':f['E4'],'group':None})
    for t in rows:t['group']=group_flags(t)
    rows.sort(key=lambda x:x['entryAt'])
    observed=load_observed_market()
    ots=[x['asOf'] for x in observed]
    for t in rows:
        i=bisect.bisect_right(ots,t['entryAt'])-1
        snap=observed[i] if i>=0 and t['entryAt']-ots[i]<=105000 else None
        t['marketRegimeAtEntry']=snap['regimeLabel'] if snap else None
        t['marketSnapshotAt']=snap['asOf'] if snap else None
    parts={}
    for engine in ['V494','V5']:
        subset=[t for t in rows if t['engine']==engine]
        if engine=='V5':
            latest=[t for t in subset if t['tradeNo']>=80 and '5.4.3' in str(t['version'])]
        else:latest=subset
        def distributions(xs):
            results={}
            for k in ['BOTH_ALIGN','E1_ONLY','E4_ONLY','BOTH_OPPOSE','INCOMPLETE']:
                results[k]=metrics([t for t in xs if t['group']==k])
            return results
        parts[engine]={'overall':metrics(subset),'byAlignment':distributions(subset),
           'byDirection':{s:{k:metrics([t for t in subset if t['group']==k and t['direction']==s])
                               for k in ['BOTH_ALIGN','E1_ONLY','E4_ONLY','BOTH_OPPOSE']}
                 for s in ['long','short']},
           'byWeek':{},
           'availableEvidence':{'e1':sum(t['e1']['side'] is not None for t in subset),
                                'e4':sum(t['e4']['side'] is not None for t in subset)}}
        for x in subset:
            week=dt.datetime.fromtimestamp(x['entryAt']/1000,TZ).date().isocalendar().week
            parts[engine]['byWeek'].setdefault('W'+str(week),[]).append(x)
        parts[engine]['byWeek']={k:metrics(v) for k,v in parts[engine]['byWeek'].items()}
        if engine=='V5':parts[engine]['v543Only']={'overall':metrics(latest),'byAlignment':distributions(latest)}
        parts[engine]['marketObserverCoverage']={
         'n':sum(t['marketRegimeAtEntry'] is not None for t in subset),
         'firstSourceAt':ots[0] if ots else None,'lastSourceAt':ots[-1] if ots else None,
         'byRegime':{k:metrics([t for t in subset if t['marketRegimeAtEntry']==k])
           for k in ['STERILE_HESITANT','SILENCIEUX_PRODUCTIF','DENSE_CONTRADICTOIRE','DIRECTIONNEL_PRODUCTIF']}}
    # This bootstrap is block/day descriptive, not CI of causal effect.
    rng=random.Random(20261116);blocks=collections.defaultdict(list)
    for t in rows:
        if t['engine']=='V5' and t['tradeNo']>=80:
            key=dt.datetime.fromtimestamp(t['entryAt']/1000,TZ).strftime('%Y-%m-%d')
            blocks[key].append(t)
    samples=list(blocks.values()); diffs=[]
    if len(samples)>6:
        for _ in range(2000):
            pick=[t for _ in samples for t in rng.choice(samples)]
            aa=[t['net'] for t in pick if t['group']=='BOTH_ALIGN']
            bb=[t['net'] for t in pick if t['group']=='BOTH_OPPOSE']
            if len(aa)>=5 and len(bb)>=5:diffs.append(statistics.mean(aa)-statistics.mean(bb))
    diffs.sort()
    boost={'nDays':len(samples),'method':'day-block bootstrap, descriptive, no randomization',
           'diffBothAlignVsBothOppose':{'nBoot':len(diffs),
                'p5':round(diffs[int(.05*(len(diffs)-1))],2) if diffs else None,
                'p95':round(diffs[int(.95*(len(diffs)-1))],2) if diffs else None}}
    return {'asOf':asof_ms,'startAt':start,'engines':parts,'rows':rows,
            'barSeries':{k:{'bars':len(v),'firstAt':v[0]['ts'],'lastAt':v[-1]['ts']} for k,v in bars.items()},
            'bootstrap':boost,'caveats':['Only trades CLOSED by as-of and ENTRY in rolling 21 days; held/open excluded',
           'E1/E4 are native WT1 cross columns in confirmed 1h/4h TradingView CSV (not geometric pivot trajectories).',
           'Availability is estimated barCloseAt = barStart+tf, NOT actual first-observed event timestamp.',
           'Current levels.json has no historical versions for the last 21 days. BigRange/DailyRange retrospective data excluded.',
           'Regime categories have observations only since 7/11 and are relative/unvalidated, not a complete 21-day history.',
           'No slippage/funding simulation; engine versions not homogeneous; no selection policy validated.']}
def main():
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--asof',default=dt.datetime.now(UTC).isoformat());p.add_argument('--output',default=str(DATA/'boonolab-e1e4-historical-20261116.json'))
    a=p.parse_args();asof=int(dt.datetime.fromisoformat(a.asof.replace('Z','+00:00')).timestamp()*1000)
    result=calculate(asof)
    pathlib.Path(a.output).write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'asOf':date(result['asOf']),'from':date(result['startAt']),
      'engineResults':result['engines'],'bootstrap':result['bootstrap'],'rows':len(result['rows'])},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
