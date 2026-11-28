from pathlib import Path
import argparse,hashlib,shutil
a=argparse.ArgumentParser();a.add_argument('root',type=Path);a.add_argument('--backup',type=Path,required=True);args=a.parse_args()
files=['scene/app.js','scene/index.html','scene/chart-views.js']
assert args.root.is_dir() and not args.backup.exists()
updates={}
for name in files:
 p=args.root/name;raw=p.read_text()
 if 'V553' not in raw and 'v553' not in raw and '5.5.3' not in raw:raise RuntimeError('V553 source missing '+name)
 q=raw.replace('engine553','engine554').replace('V553','V554').replace('v553','v554').replace('5.5.3','5.5.4')
 if name=='scene/app.js':
  start=q.index('function renderV554TV(s)');end=q.index('function render(s)',start)
  block=q[start:end].replace('const v=s?.engine552||{}','const v=s?.engine554||{}')
  assert 'const v=s?.engine554||{}' in block
  q=q[:start]+block+q[end:]
 if name=='scene/index.html':
  import re
  q=re.sub(r'(/(?:app|chart-views)\.js)\?v=[^"]+',r'\1?v=OD20261128-002',q)
 updates[name]=q
args.backup.mkdir(parents=True)
for name,q in updates.items():
 p=args.root/name;dest=args.backup/name;dest.parent.mkdir(parents=True,exist_ok=True)
 shutil.copy2(p,dest);tmp=p.with_name(p.name+'.v554-tmp')
 tmp.write_text(q);shutil.copymode(p,tmp);tmp.replace(p)
 print(name,'before',hashlib.sha256(dest.read_bytes()).hexdigest(),'after',hashlib.sha256(p.read_bytes()).hexdigest())

