#!/usr/bin/env python3
"""
BOONO visual transfer inbox v2.
A ready file is processed only when a matching <name>.sha256 commit marker exists.
The server claims both into root-only processing before validating the checksum.
"""
from __future__ import annotations
from pathlib import Path
import datetime, fcntl, json, os, re, subprocess, time, uuid

ROOT=Path("/srv/boono-upload")
READY=ROOT/"incoming"/"ready"
PROCESSING=ROOT/"processing"
ARCHIVE=ROOT/"archive"
FAILED=ROOT/"failed"
STATUS=ROOT/"status"
RECEIPTS=STATUS/"receipts"
LOG=Path("/srv/boono-tv-assets/logs/transfer.log")
VALIDATOR="/usr/local/sbin/boono-transfer-validate.py"
SCENE_IMPORT="/usr/local/sbin/boono-scenes-from-board.py"
LAYER_IMPORT="/usr/local/sbin/boono-assets-import"
HEX64=re.compile(r"^[0-9a-fA-F]{64}$")

for d in [READY,PROCESSING,ARCHIVE,FAILED,STATUS,RECEIPTS,LOG.parent]:
    d.mkdir(parents=True,exist_ok=True)

lock_path=Path("/run/lock/boono-transfer-inbox.lock")
lock_path.parent.mkdir(parents=True,exist_ok=True)
lock=open(lock_path,"w")
try:
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
except BlockingIOError:
    raise SystemExit(0)

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def day():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")

def log(msg):
    line=f"{now()} {msg}\n"
    with LOG.open("a",encoding="utf-8") as f: f.write(line)
    print(msg,flush=True)

def atomic_json(path,obj,mode=0o644):
    tmp=path.with_name(f".{path.name}.{os.getpid()}.tmp")
    tmp.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    os.chmod(tmp,mode)
    os.replace(tmp,path)

def publish_receipt(receipt):
    rid=receipt["transaction_id"]
    atomic_json(RECEIPTS/f"{rid}.json",receipt)
    atomic_json(STATUS/"last.json",receipt)

def run_capture(argv, limit=12000):
    p=subprocess.run(argv,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    out=p.stdout or ""
    if limit is not None and len(out)>limit:
        out=out[-limit:]
    return p.returncode,out

def freeze(path):
    os.chown(path,0,0)
    os.chmod(path,0o400)

def reject(proc,marker,receipt,reason):
    fdir=FAILED/day(); fdir.mkdir(parents=True,exist_ok=True)
    dst=fdir/proc.name
    if proc.exists():
        os.replace(proc,dst); freeze(dst)
    if marker and marker.exists():
        mdst=fdir/marker.name
        os.replace(marker,mdst); freeze(mdst)
    receipt.update({"status":"rejected","completed_at":now(),"reason":reason,
                    "quarantine_path":str(dst)})
    publish_receipt(receipt)
    log(f"REJECT {receipt['transaction_id']} {receipt['original_name']}: {reason}")

def parse_marker(marker):
    if marker.stat().st_size<64 or marker.stat().st_size>512:
        raise ValueError("invalid checksum marker size")
    text=marker.read_text(encoding="utf-8",errors="strict").strip()
    token=text.split()[0] if text else ""
    if not HEX64.fullmatch(token):
        raise ValueError("checksum marker must start with a 64-character SHA-256")
    return token.lower()

def process_pair(src,marker):
    if not src.is_file() or src.is_symlink() or not marker.is_file() or marker.is_symlink():
        return
    tx=datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")+"-"+uuid.uuid4().hex[:8]
    proc=PROCESSING/f"{tx}__{src.name}"
    pm=PROCESSING/f"{tx}__{marker.name}"
    receipt={"schema":2,"transaction_id":tx,"original_name":src.name,
             "claimed_at":now(),"status":"claimed"}

    # Claim data first: after this rename the uploader no longer knows its processing path.
    os.replace(src,proc); freeze(proc)
    os.replace(marker,pm); freeze(pm)

    try:
        expected_sha=parse_marker(pm)
        receipt["client_sha256"]=expected_sha
    except Exception as e:
        reject(proc,pm,receipt,f"invalid commit marker: {e}")
        return

    code,out=run_capture([VALIDATOR,str(proc)], limit=None)
    if code!=0:
        reject(proc,pm,receipt,f"preflight failed: {out.strip()}")
        return
    try:
        preflight=json.loads(out)
    except json.JSONDecodeError as e:
        reject(proc,pm,receipt,f"validator returned invalid JSON: {e}")
        return

    actual_sha=(preflight.get("sha256") or "").lower()
    if actual_sha!=expected_sha:
        reject(proc,pm,receipt,f"client/server SHA-256 mismatch: {expected_sha} != {actual_sha}")
        return

    receipt["preflight"]=preflight
    receipt["kind"]=preflight.get("kind")

    adir=ARCHIVE/day(); adir.mkdir(parents=True,exist_ok=True)
    archive_path=adir/proc.name
    os.replace(proc,archive_path); freeze(archive_path)
    pm.unlink(missing_ok=True)
    receipt["archive_path"]=str(archive_path)
    receipt["status"]="validated"
    publish_receipt(receipt)
    log(f"VALID {tx} {src.name} kind={receipt['kind']} sha256={actual_sha}")

    kind=receipt["kind"]
    if kind=="scene-board-v1":
        code,out=run_capture([SCENE_IMPORT,str(archive_path)])
    elif kind=="layered-runtime-v1":
        code,out=run_capture([LAYER_IMPORT,str(archive_path)])
    else:
        receipt.update({"status":"stored","completed_at":now(),"deployment":"none",
                        "note":"Validated and archived only; no runtime activation requested by file contract."})
        publish_receipt(receipt)
        log(f"STORE {tx} {src.name} kind={kind}")
        return

    receipt["import_output"]=out
    if code!=0:
        receipt.update({"status":"import-failed","completed_at":now(),
                        "reason":f"specialized importer exited {code}"})
        publish_receipt(receipt)
        log(f"IMPORT_FAIL {tx} {src.name} code={code}")
        return
    receipt.update({"status":"activated","completed_at":now(),"deployment":kind})
    publish_receipt(receipt)
    log(f"ACTIVATE {tx} {src.name} kind={kind}")

def main():
    # Only checksum markers commit uploads. Uncommitted files in ready are inert.
    markers=sorted(READY.glob("*.sha256"),key=lambda p:p.name)
    for marker in markers:
        data_name=marker.name[:-7]
        if not data_name:
            continue
        src=READY/data_name
        if not src.exists():
            continue
        try:
            process_pair(src,marker)
        except Exception as e:
            log(f"UNHANDLED {data_name}: {type(e).__name__}: {e}")

if __name__=="__main__":
    main()
