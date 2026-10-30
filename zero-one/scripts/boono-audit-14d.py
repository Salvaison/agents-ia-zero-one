#!/usr/bin/env python3
"""BOONO Audit rolling 14-day archive.

Independent from baton-relay and BOONO Watch: no APIs, browser payloads or
trading imports. Every stored NDJSON row preserves the entire Audit dictionary.
Completed UTC hourly shards use gzip. One lightweight poll every 120 s by PM2.
"""
from __future__ import annotations
import argparse
import datetime as dt
import gzip
import json
import os
import pathlib
import re
import sys
import time
from collections import defaultdict

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "audit-history.json"
DEST = ROOT / "data" / "audit-14d"
VERSION = "boono-audit-14d-v1"
RETENTION_MS = 14 * 86400000
HOUR_MS = 3600000
NAME = re.compile(r"^audit-(\d{8}T\d{2})\.ndjson(\.gz)?$")
def stamp(ms):
    return dt.datetime.fromtimestamp(ms / 1000, dt.timezone.utc)
def hour_name(ms):
    return stamp(ms).strftime("audit-%Y%m%dT%H.ndjson")
def int_ms(v):
    return v if type(v) is int and v > 0 else None
def atomic_json(p, payload):
    temp = p.with_suffix(p.suffix + ".tmp-" + str(os.getpid()))
    with temp.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.flush()
        os.fsync(f.fileno())
    os.replace(temp, p)
def records(path):
    if not path.exists():
        return []
    with (gzip.open(path, "rt", encoding="utf-8") if path.suffix == ".gz"
          else path.open("r", encoding="utf-8")) as f:
        value = json.load(f)
    if not isinstance(value, list):
        raise ValueError("AUDIT_SOURCE_NOT_ARRAY: " + str(path))
    return value
def archived_shards(dest):
    return sorted((p for p in dest.iterdir() if p.is_file() and NAME.match(p.name)),
                  key=lambda p: p.name)
def tail_ts(path):
    last = None
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                r = json.loads(line)
                last = int_ms(r.get("ts"))
    return last
def state_initial():
    return {"version": VERSION, "retentionHours": 336, "cursorTs": 0,
        "rowsWritten": 0, "runs": 0, "gaps": [], "duplicatesSkipped": 0,
        "sourceAgeMs": None, "lastPollAt": None, "lastSourceStartAt": None,
        "lastSourceEndAt": None, "lastError": None,
        "coldArchiveOnly": True, "uiServed": False, "schema": "ALL_AUDIT_FIELDS"}
def recover_cursor(dest, saved):
    # If power was lost after appending but before the manifest update, don't
    # append an identical block on restart.
    parts = archived_shards(dest)
    most = tail_ts(parts[-1]) if parts else None
    return max(saved, most or 0)
def pack_finished(dest, current_hour):
    compressed = 0
    for p in archived_shards(dest):
        if p.suffix == ".gz":
            continue
        m = NAME.match(p.name)
        hour = dt.datetime.strptime(m.group(1), "%Y%m%dT%H").replace(
            tzinfo=dt.timezone.utc)
        if hour.timestamp() * 1000 >= current_hour:
            continue
        output = pathlib.Path(str(p) + ".gz")
        tmp = pathlib.Path(str(output) + ".tmp")
        with p.open("rb") as src, gzip.open(tmp, "wb", compresslevel=5) as dst:
            while True:
                chunk = src.read(65536)
                if not chunk: break
                dst.write(chunk)
        os.replace(tmp, output)
        p.unlink()
        compressed += 1
    return compressed
def prune(dest, cutoff):
    # Hourly shard after its *whole* contents lie outside 14d window.
    old = 0
    cutoff_hour = (cutoff // HOUR_MS) * HOUR_MS
    for p in archived_shards(dest):
        m = NAME.match(p.name)
        hour = dt.datetime.strptime(m.group(1), "%Y%m%dT%H").replace(
            tzinfo=dt.timezone.utc).timestamp() * 1000
        if hour + HOUR_MS <= cutoff_hour:
            p.unlink()
            old += 1
        elif hour <= cutoff < hour + HOUR_MS:
            # Exact rolling 14×24h boundary, not merely calendar-day retention.
            # The one partial compressed hour is tiny (about 120 Audit rows).
            opener = gzip.open if p.suffix == ".gz" else open
            with opener(p, "rt", encoding="utf-8") as f:
                lines = [line for line in f if line.strip() and
                         json.loads(line).get("ts", 0) >= cutoff]
            if not lines:
                p.unlink()
                old += 1
                continue
            temp = pathlib.Path(str(p) + ".trim-tmp")
            with opener(temp, "wt", encoding="utf-8") as f:
                f.writelines(lines)
            os.replace(temp, p)
    return old
def ingest(source=SOURCE, dest=DEST, now_ms=None, seed_file=None):
    now = int_ms(now_ms) or int(time.time() * 1000)
    dest.mkdir(parents=True, exist_ok=True)
    status_path = dest / "status.json"
    if status_path.exists():
        s = json.loads(status_path.read_text(encoding="utf-8"))
        if s.get("version") != VERSION:
            raise ValueError("AUDIT_ARCHIVE_STATE_VERSION_UNRECOGNIZED")
    else:
        s = state_initial()
    cursor = recover_cursor(dest, int(s["cursorTs"]))
    src_rows = records(source)
    if seed_file is not None:
        src_rows = records(pathlib.Path(seed_file)) + src_rows
    valid = []
    for row in src_rows:
        if not isinstance(row, dict) or int_ms(row.get("ts")) is None:
            raise ValueError("AUDIT_INVALID_TIMESTAMP_OR_ROW")
        if row["ts"] <= now + 60000:
            valid.append(row)
    valid.sort(key=lambda z: z["ts"])
    s["lastSourceStartAt"] = valid[0]["ts"] if valid else None
    s["lastSourceEndAt"] = valid[-1]["ts"] if valid else None
    s["sourceAgeMs"] = now - valid[-1]["ts"] if valid else None
    cutoff = now - RETENTION_MS
    # Duplicate timestamps in the live audit are not separate sample times;
    # keep the latest full object for each timestamp in this poll.
    uniques = {}
    for row in valid:
        uniques[row["ts"]] = row
    selected = [uniques[t] for t in sorted(uniques)
                if t > cursor and t >= cutoff]
    if valid:
        s["duplicatesSkipped"] += len(valid) - len(uniques)
    buckets = defaultdict(list)
    prev = cursor if cursor else None
    for row in selected:
        if prev and row["ts"] - prev > 90000:
            s["gaps"].append({"fromTs": prev, "toTs": row["ts"],
                "gapSeconds": round((row["ts"] - prev) / 1000, 1)})
        buckets[hour_name(row["ts"])].append(row)
        prev = row["ts"]
    s["gaps"] = s["gaps"][-80:]
    for name, rows in sorted(buckets.items()):
        target = dest / name
        if pathlib.Path(str(target) + ".gz").exists():
            raise ValueError("AUDIT_LATE_WRITE_TO_COMPRESSED_SHARD: " + name)
        with target.open("a", encoding="utf-8") as f:
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False,
                                   separators=(",", ":")) + "\n")
            f.flush()
            os.fsync(f.fileno())
    s["cursorTs"] = max(cursor, selected[-1]["ts"] if selected else cursor)
    s["rowsWritten"] += len(selected)
    s["lastPollAt"] = now
    s["runs"] += 1
    s["lastError"] = None
    s["lastAdded"] = len(selected)
    current_hour = (now // HOUR_MS) * HOUR_MS
    s["shardsCompressed"] = pack_finished(dest, current_hour)
    s["shardsPurged"] = prune(dest, cutoff)
    parts = archived_shards(dest)
    s["filesPresent"] = len(parts)
    s["oldestShard"] = parts[0].name if parts else None
    s["newestShard"] = parts[-1].name if parts else None
    atomic_json(status_path, s)
    return s
def verify(dest=DEST):
    """Check every remaining shard, full row dictionaries and time monotonicity."""
    count = 0
    first = last = None
    errors, sample_keys = [], None
    for p in archived_shards(dest):
        opener = gzip.open if p.suffix == ".gz" else open
        with opener(p, "rt", encoding="utf-8") as f:
            for line in f:
                if not line.strip(): continue
                r = json.loads(line)
                t = int_ms(r.get("ts"))
                if t is None or not isinstance(r, dict):
                    errors.append("invalid_row:" + str(p))
                    continue
                if last is not None and t <= last:
                    errors.append("non_monotonic:" + p.name)
                if hour_name(t) not in p.name:
                    errors.append("wrong_hour:" + p.name)
                if first is None:
                    first = t
                    sample_keys = list(r)
                last = t
                count += 1
    return {"rows": count, "files": len(archived_shards(dest)),
        "firstTs": first, "lastTs": last, "sampleFieldCount": len(sample_keys or []),
        "sampleFields": sample_keys or [], "errors": errors[:30],
        "fullFieldsNotTrimmed": True, "uiIntegrated": False}
def main():
    p = argparse.ArgumentParser()
    p.add_argument("--once", action="store_true")
    p.add_argument("--service", action="store_true")
    p.add_argument("--verify", action="store_true")
    p.add_argument("--source", type=pathlib.Path, default=SOURCE)
    p.add_argument("--dest", type=pathlib.Path, default=DEST)
    p.add_argument("--seed-file", type=pathlib.Path)
    p.add_argument("--period", type=int, default=120)
    args = p.parse_args()
    if args.verify:
        print(json.dumps(verify(args.dest), ensure_ascii=False))
        return
    if args.period < 60:
        raise ValueError("AUDIT_PERIOD_MUST_BE_60S_OR_MORE")
    i = 0
    while True:
        s = ingest(args.source, args.dest,
                   seed_file=args.seed_file if i == 0 else None)
        if i == 0 or s["lastAdded"] > 0 and i % 30 == 0:
            print(json.dumps({"version": VERSION, "now": s["lastPollAt"],
                "added": s["lastAdded"], "cursor": s["cursorTs"],
                "files": s["filesPresent"], "gaps": len(s["gaps"])},
                ensure_ascii=False), flush=True)
        if not args.service:
            break
        i += 1
        time.sleep(args.period)
if __name__ == "__main__":
    main()
