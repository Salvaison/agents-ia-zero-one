#!/usr/bin/env python3
"""BOONO operational decisions: verbatim prompts, origin and append-only trace.

Never imports nor controls trading engines. Never modifies an existing original
prompt: a changed instruction requires another decision ID and a supersedes link.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ARCHIVE = ROOT / "knowledge" / "operational-decisions"
DECISION_RE = re.compile(r"^OD-[0-9]{8}-[0-9]{3}$")
DOCS = {
    "user": "01-demande-utilisateur-integrale.txt",
    "execution": "02-prompt-operationnel-integral.txt",
    "origin": "03-origine-et-justification.md",
}
EVENT_STATUSES = {
    "AUTORISE", "DOCUMENTE", "IMPLEMENTE", "TESTE",
    "MIS_EN_SERVICE", "SUSPENDU", "ANNULE", "REMPLACE",
}


def digest(content):
    return hashlib.sha256(content).hexdigest()


def utc_now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def required_text(value, name):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"required non-empty {name}")
    return value


def read_verbatim(path, label):
    content = Path(path).read_bytes()
    if not content.strip():
        raise ValueError(f"{label} is empty; the verbatim prompt is mandatory")
    content.decode("utf-8", errors="strict")
    return content


def ensure_id(decision_id):
    if not DECISION_RE.fullmatch(decision_id):
        raise ValueError("decision ID must be OD-YYYYMMDD-NNN")


def json_bytes(data):
    return (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def make_record(archive, decision_id, title, user_prompt, execution_prompt,
                origin, authorization, reference):
    ensure_id(decision_id)
    title = required_text(title, "title")
    authorization = required_text(authorization, "authorization")
    reference = required_text(reference, "source reference")
    contents = {
        DOCS["user"]: read_verbatim(user_prompt, "user prompt"),
        DOCS["execution"]: read_verbatim(execution_prompt, "operational prompt"),
        DOCS["origin"]: read_verbatim(origin, "origin explanation"),
    }
    root = Path(archive)
    root.mkdir(parents=True, exist_ok=True)
    record = root / decision_id
    # Deliberately no overwrite: an existing decision cannot have its original
    # user request, agent prompt or origin silently replaced.
    record.mkdir(mode=0o755, exist_ok=False)
    meta = {
        "schemaVersion": 1,
        "decisionId": decision_id,
        "title": title,
        "createdAtUtc": utc_now(),
        "authorization": authorization,
        "reference": reference,
        "recordPolicy": "IMMUTABLE_ORIGINALS_ADD_EVENTS_AND_NEW_DECISION_FOR_CHANGES",
        "files": {
            name: {"sha256": digest(data), "bytes": len(data)}
            for name, data in contents.items()
        },
    }
    for filename, content in contents.items():
        with (record / filename).open("xb") as out:
            out.write(content)
    with (record / "manifest.json").open("xb") as out:
        out.write(json_bytes(meta))
    (record / "events").mkdir(exist_ok=False)
    return record


def event_chain(record):
    """Return verified chain's last sequence and previous hash."""
    previous = None
    count = 0
    folder = record / "events"
    for path in sorted(folder.glob("*.json")):
        count += 1
        if path.name != f"{count:04d}.json":
            raise ValueError(f"{record.name}: event numbering gap or invalid name")
        raw = path.read_bytes()
        data = json.loads(raw)
        if data.get("sequence") != count or data.get("previousEventSha256") != previous:
            raise ValueError(f"{record.name}: broken event chain at {path.name}")
        for f in ("status", "description", "evidence", "recordedAtUtc"):
            required_text(data.get(f), f"{path.name}.{f}")
        if data["status"] not in EVENT_STATUSES:
            raise ValueError(f"{record.name}: unrecognized event status")
        previous = digest(raw)
    return count, previous


def add_event(archive, decision_id, status, description, evidence):
    ensure_id(decision_id)
    if status not in EVENT_STATUSES:
        raise ValueError("invalid status: " + status)
    description = required_text(description, "event description")
    evidence = required_text(evidence, "event evidence")
    record = Path(archive) / decision_id
    verify_record(record)
    count, previous = event_chain(record)
    data = {
        "sequence": count + 1,
        "recordedAtUtc": utc_now(),
        "status": status,
        "description": description,
        "evidence": evidence,
        "previousEventSha256": previous,
    }
    # Exclusive create, append-only. Historical statuses remain inspectable.
    file = record / "events" / f"{count + 1:04d}.json"
    with file.open("xb") as out:
        out.write(json_bytes(data))
    return file


def verify_record(record):
    record = Path(record)
    meta = json.loads((record / "manifest.json").read_text(encoding="utf-8"))
    if meta.get("decisionId") != record.name:
        raise ValueError(f"{record.name}: mismatched ID in manifest")
    for key in ("title", "authorization", "reference"):
        required_text(meta.get(key), f"manifest.{key}")
    if set(meta.get("files", {})) != set(DOCS.values()):
        raise ValueError(f"{record.name}: missing required original documents")
    for name, expected in meta["files"].items():
        data = (record / name).read_bytes()
        if digest(data) != expected["sha256"] or len(data) != expected["bytes"]:
            raise ValueError(f"{record.name}: {name} changed after archival")
        if not data.strip():
            raise ValueError(f"{record.name}: {name} empty")
    events, _ = event_chain(record)
    return {"id": record.name, "title": meta["title"], "events": events,
            "latestStatus": (json.loads(
                (record / "events" / f"{events:04d}.json").read_text()
            )["status"] if events else "SANS_EVENEMENT")}


def verify_all(archive, decision_id=None):
    root = Path(archive)
    if decision_id:
        ensure_id(decision_id)
        folders = [root / decision_id]
    else:
        folders = sorted(p for p in root.iterdir()
                         if p.is_dir() and DECISION_RE.fullmatch(p.name)) if root.is_dir() else []
    if not folders:
        raise ValueError("no operational decision records to verify")
    return [verify_record(path) for path in folders]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--archive", type=Path, default=DEFAULT_ARCHIVE)
    commands = p.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create", help="Create one immutable decision record")
    create.add_argument("--id", required=True)
    create.add_argument("--title", required=True)
    create.add_argument("--user-prompt", type=Path, required=True)
    create.add_argument("--execution-prompt", type=Path, required=True)
    create.add_argument("--origin", type=Path, required=True)
    create.add_argument("--authorization", required=True)
    create.add_argument("--reference", required=True)
    event = commands.add_parser("event", help="Append one evidence-backed status event")
    event.add_argument("--id", required=True)
    event.add_argument("--status", choices=sorted(EVENT_STATUSES), required=True)
    event.add_argument("--description", required=True)
    event.add_argument("--evidence", required=True)
    check = commands.add_parser("verify", help="Verify originals and event chain")
    check.add_argument("--id")
    args = p.parse_args()
    if args.command == "create":
        record = make_record(args.archive, args.id, args.title, args.user_prompt,
                             args.execution_prompt, args.origin,
                             args.authorization, args.reference)
        print("CREATED", record)
    elif args.command == "event":
        path = add_event(args.archive, args.id, args.status,
                         args.description, args.evidence)
        print("APPENDED", path)
    elif args.command == "verify":
        for item in verify_all(args.archive, args.id):
            print("VERIFIED", json.dumps(item, ensure_ascii=False))


if __name__ == "__main__":
    main()
