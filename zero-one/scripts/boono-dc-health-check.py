#!/usr/bin/env python3
"""BOONO OD-20261118-005 — bounded Remote MCP connection watchdog.

Only detects sustained offline/error in the *current* Desktop Commander
systemd process. Does not access/print secrets or affect any trading service.
"""
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

SERVICE = "desktop-commander-remote.service"
LAST_ATTEMPT = Path("/run/boono-dc-watchdog-last-restart")
GRACE_SECONDS = 180
RESTART_COOLDOWN_SECONDS = 3600


def run(*args, timeout=15):
    return subprocess.run(args, check=True, capture_output=True, text=True, timeout=timeout).stdout.strip()


def event_kind(msg):
    # Ignore embedded terminal commands and tool-result JSON which may quote
    # the words below without representing a genuine connection transition.
    if len(msg) > 260 or "Received tool call" in msg or ' "content"' in msg:
        return None
    if msg.endswith("Device marked as online") or msg.endswith("Desktop Commander Remote is connected"):
        return "online"
    if (msg.endswith("Device marked as offline")
        or "Remote session expired and could not be renewed." in msg
        or "Auth error: access token not usable" in msg
        or "Channel closed" in msg
        or "Channel error: socket closed" in msg):
        return "offline"
    return None


def classify(events, now):
    if not events:
        return "UNKNOWN", None
    latest = max(events, key=lambda p: p[0])
    age = max(0, now - latest[0])
    if latest[1] == "online":
        return "ONLINE", age
    return ("PERSISTENT_OFFLINE" if age >= GRACE_SECONDS else "RECOVERING"), age


def check(dry_run):
    active = run("systemctl", "show", SERVICE, "-p", "ActiveState", "--value")
    pid = run("systemctl", "show", SERVICE, "-p", "MainPID", "--value")
    if active != "active" or not pid.isdigit() or int(pid) <= 1:
        print(f"DC_WATCHDOG service_not_active active={active} pid={pid}; no action")
        return 0
    args = ["journalctl", "-q", "--no-pager", "-n", "100", "-o", "json",
            "--grep=Device marked as online|Device marked as offline|Remote session expired|Auth error|Channel closed|Channel error|Desktop Commander Remote is connected",
            "_PID=" + pid]
    raw = run(*args, timeout=20)
    events = []
    for line in raw.splitlines():
        try:
            record = json.loads(line)
            msg = str(record.get("MESSAGE", ""))
            kind = event_kind(msg)
            if kind:
                timestamp = int(record.get("__REALTIME_TIMESTAMP", "0")) / 1e6
                events.append((timestamp, kind))
        except (ValueError, TypeError, json.JSONDecodeError):
            continue
    now = time.time()
    state, age = classify(events, now)
    print(f"DC_WATCHDOG status={state} pid={pid} recent_events={len(events)} age_s={int(age) if age is not None else 'na'}")
    if state != "PERSISTENT_OFFLINE":
        return 0
    try:
        last = float(LAST_ATTEMPT.read_text().strip())
    except (OSError, ValueError):
        last = 0
    if now - last < RESTART_COOLDOWN_SECONDS:
        print("DC_WATCHDOG offline_but_restart_cooldown; manual review may be needed")
        return 0
    if dry_run:
        print("DC_WATCHDOG dry_run_would_restart")
        return 0
    LAST_ATTEMPT.write_text(str(now) + "\n")
    print("DC_WATCHDOG restarting ONLY expired Remote MCP service", flush=True)
    subprocess.run(["systemctl", "restart", SERVICE], timeout=45, check=True)
    return 0


def self_test():
    n = 1700000000.0
    cases = [
        ([], "UNKNOWN"),
        ([(n-300, "online")], "ONLINE"),
        ([(n-600, "online"), (n-40, "offline")], "RECOVERING"),
        ([(n-600, "online"), (n-400, "offline")], "PERSISTENT_OFFLINE"),
        ([(n-600, "offline"), (n-10, "online")], "ONLINE"),
    ]
    for events, expected in cases:
        actual, _ = classify(events, n)
        assert actual == expected, (actual, expected)
    assert event_kind("Received tool call with Device marked as offline") is None
    assert event_kind("[20:01:16] 🔌 Device marked as online") == "online"
    assert event_kind("[20:01:34] ⚠️ Channel closed — socket=open") == "offline"
    print("DC_WATCHDOG self_test PASS")


def main():
    cli = argparse.ArgumentParser()
    cli.add_argument("--dry-run", action="store_true")
    cli.add_argument("--self-test", action="store_true")
    args = cli.parse_args()
    if args.self_test:
        self_test()
        return 0
    return check(args.dry_run)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (subprocess.SubprocessError, OSError) as error:
        print(f"DC_WATCHDOG unable_to_check: {type(error).__name__}; no action", file=sys.stderr)
        sys.exit(2)
