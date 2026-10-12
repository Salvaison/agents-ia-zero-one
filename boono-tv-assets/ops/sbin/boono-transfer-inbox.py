#!/usr/bin/env python3
"""
BOONO visual transfer inbox.
Only files atomically moved into /incoming/ready are candidates.
The service claims them into a root-only directory before validation.
"""
from __future__ import annotations
from pathlib import Path
import datetime, fcntl, json, os, shutil, subprocess, sys, time, uuid

ROOT = Path("/srv/boono-upload")
READY = ROOT / "incoming" / "ready"
PROCESSING = ROOT / "processing"
ARCHIVE = ROOT / "archive"
FAILED = ROOT / "failed"
STATUS = ROOT / "status"
RECEIPTS = STATUS / "receipts"
LOG = Path("/srv/boono-tv-assets/logs/transfer.log")
VALIDATOR = "/usr/local/sbin/boono-transfer-validate.py"
SCENE_IMPORT = "/usr/local/sbin/boono-scenes-from-board.py"
LAYER_IMPORT = "/usr/local/sbin/boono-assets-import"
MIN_READY_AGE = 3

for d in [READY, PROCESSING, ARCHIVE, FAILED, STATUS, RECEIPTS, LOG.parent]:
    d.mkdir(parents=True, exist_ok=True)

lock_path = Path("/run/lock/boono-transfer-inbox.lock")
lock_path.parent.mkdir(parents=True, exist_ok=True)
lock = open(lock_path, "w")
try:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    raise SystemExit(0)

def now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def day() -> str:
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")

def log(msg: str) -> None:
    line = f"{now()} {msg}\n"
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line)
    print(msg, flush=True)

def atomic_json(path: Path, obj: dict, mode: int = 0o644) -> None:
    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    tmp.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.chmod(tmp, mode)
    os.replace(tmp, path)

def publish_receipt(receipt: dict) -> None:
    rid = receipt["transaction_id"]
    dst = RECEIPTS / f"{rid}.json"
    atomic_json(dst, receipt)
    atomic_json(STATUS / "last.json", receipt)

def run_capture(argv: list[str]) -> tuple[int, str]:
    p = subprocess.run(argv, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    out = p.stdout or ""
    if len(out) > 12000:
        out = out[-12000:]
    return p.returncode, out

def reject(proc: Path, receipt: dict, reason: str) -> None:
    fdir = FAILED / day()
    fdir.mkdir(parents=True, exist_ok=True)
    dst = fdir / proc.name
    if proc.exists():
        os.replace(proc, dst)
        os.chown(dst, 0, 0)
        os.chmod(dst, 0o400)
    receipt.update({
        "status": "rejected",
        "completed_at": now(),
        "reason": reason,
        "quarantine_path": str(dst),
    })
    publish_receipt(receipt)
    log(f"REJECT {receipt['transaction_id']} {receipt['original_name']}: {reason}")

def process_one(src: Path) -> None:
    # A file appears in ready only after the client performs an atomic rename.
    if src.name.startswith(".") or not src.is_file() or src.is_symlink():
        return
    if time.time() - src.stat().st_mtime < MIN_READY_AGE:
        return

    tx = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
    proc = PROCESSING / f"{tx}__{src.name}"
    receipt = {
        "schema": 1,
        "transaction_id": tx,
        "original_name": src.name,
        "claimed_at": now(),
        "status": "claimed",
    }

    # Atomic ownership boundary: uploader can no longer mutate the claimed file.
    os.replace(src, proc)
    os.chown(proc, 0, 0)
    os.chmod(proc, 0o400)

    code, out = run_capture([VALIDATOR, str(proc)])
    if code != 0:
        reject(proc, receipt, f"preflight failed: {out.strip()}")
        return
    try:
        preflight = json.loads(out)
    except json.JSONDecodeError as e:
        reject(proc, receipt, f"validator returned invalid JSON: {e}")
        return

    receipt["preflight"] = preflight
    receipt["kind"] = preflight.get("kind")

    # Freeze the raw source before any transformation or publication.
    adir = ARCHIVE / day()
    adir.mkdir(parents=True, exist_ok=True)
    archive_path = adir / proc.name
    os.replace(proc, archive_path)
    os.chown(archive_path, 0, 0)
    os.chmod(archive_path, 0o400)
    receipt["archive_path"] = str(archive_path)
    receipt["status"] = "validated"
    publish_receipt(receipt)
    log(f"VALID {tx} {src.name} kind={receipt['kind']} sha256={preflight.get('sha256')}")

    kind = receipt["kind"]
    if kind == "scene-board-v1":
        code, out = run_capture([SCENE_IMPORT, str(archive_path)])
    elif kind == "layered-runtime-v1":
        code, out = run_capture([LAYER_IMPORT, str(archive_path)])
    else:
        # Generic visual sources/bundles are safely stored, not auto-deployed.
        receipt.update({
            "status": "stored",
            "completed_at": now(),
            "deployment": "none",
            "note": "Validated and archived only; no runtime activation requested by file contract.",
        })
        publish_receipt(receipt)
        log(f"STORE {tx} {src.name} kind={kind}")
        return

    receipt["import_output"] = out
    if code != 0:
        receipt.update({
            "status": "import-failed",
            "completed_at": now(),
            "reason": f"specialized importer exited {code}",
        })
        publish_receipt(receipt)
        log(f"IMPORT_FAIL {tx} {src.name} code={code}")
        return

    receipt.update({
        "status": "activated",
        "completed_at": now(),
        "deployment": kind,
    })
    publish_receipt(receipt)
    log(f"ACTIVATE {tx} {src.name} kind={kind}")

def main() -> None:
    # Stable lexical order makes behavior deterministic for batches.
    for src in sorted(READY.iterdir(), key=lambda p: p.name):
        try:
            process_one(src)
        except Exception as e:
            log(f"UNHANDLED {src.name}: {type(e).__name__}: {e}")

if __name__ == "__main__":
    main()
