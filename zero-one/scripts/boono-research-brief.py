#!/usr/bin/env python3
"""BOONO read-only research: keep full evidence on Amsterdam, show small briefs.

No engine imports, no writes to trading data, no runner restarts.
Research artefacts stay under data/research-briefs (Git-ignored).
"""
import argparse
import csv
import datetime as dt
import json
import os
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "research-briefs"
TZ = ZoneInfo("Europe/Stockholm")
FIELDS = ("confirmed", "hypotheses", "validated", "implemented",
          "tested", "deployed", "open", "sources")


def atomic_text(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp." + str(os.getpid()))
    try:
        tmp.write_text(text, encoding="utf-8")
        tmp.replace(path)
    finally:
        tmp.unlink(missing_ok=True)


def load_ledger(path, first, last):
    items, seen = [], set()
    with path.open(encoding="utf-8") as handle:
        for lineno, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"ledger invalid line {lineno}: {exc}") from exc
            n = row.get("tradeNo")
            if not isinstance(n, int) or n < first or (last is not None and n > last):
                continue
            if n in seen:
                raise ValueError(f"duplicate tradeNo={n} in ledger; audit not trustworthy")
            seen.add(n)
            if row.get("exitAt") is not None:
                items.append(row)
    return sorted(items, key=lambda r: r["tradeNo"])


def read_bars(path, start_ms, end_ms):
    if not path.is_file():
        return None
    bars = {}
    with path.open(encoding="utf-8", newline="") as fh:
        for b in csv.DictReader(fh):
            try:
                start = dt.datetime.fromisoformat(b["timestamp"].replace("Z", "+00:00"))
                ms = int(start.timestamp() * 1000)
                if start_ms - 180000 <= ms <= end_ms:
                    bars[ms] = (ms, float(b["high"]), float(b["low"]), float(b["close"]))
            except (KeyError, ValueError):
                continue
    return [bars[k] for k in sorted(bars)]


def examine(row, bars):
    direction = row["direction"]
    side = 1 if direction == "long" else -1
    price = float(row["entryPrice"])
    inv = row.get("entryInvalidation")
    mae = float(row["maePriceUsd"])
    net = float(row["netPnlUsd"])
    if not isinstance(inv, (float, int)):
        return {"tradeNo": row["tradeNo"], "status": "NO_INVALIDATION"}
    inv = float(inv)
    dist = side * (price - inv)
    if dist < 0:
        return {"tradeNo": row["tradeNo"], "status": "INVALIDATION_WRONG_SIDE"}
    crossed = mae > dist + 0.00001
    x = {
        "tradeNo": row["tradeNo"], "version": row["engine"],
        "direction": direction, "entryAt": row["entryAt"],
        "exitAt": row["exitAt"], "entryPrice": price,
        "entryInvalidation": inv, "distanceToInvalidationBtcUsd": round(dist, 2),
        "maeBtcUsd": mae,
        "breachDepthBtcUsd": round(max(0.0, mae - dist), 2),
        "crossed": crossed, "netPnlUsd": round(net, 4),
        "exitReason": row.get("exitReason"),
        "mfeBtcUsd": row.get("mfePriceUsd"), "status": "OK",
        "confirmed3mBars": None, "closesBeyond3m": None,
        "longestConsecutiveClosesBeyond3m": None,
        "max3mCloseBreachDepthBtcUsd": None,
    }
    if bars is not None:
        # Only include candles whose 3m closing time is after entry and at/before exit.
        # Intrabar OHLC of the entry/exit partial bars is deliberately NOT used.
        selected = [b for b in bars if row["entryAt"] <= b[0] + 180000 <= row["exitAt"]]
        streak = longest = closes = 0
        maxdepth = 0
        previous_start = None
        for start, high, low, close in selected:
            if previous_start is not None and start - previous_start != 180000:
                streak = 0  # A missing 3m bar cannot form a consecutive series.
            previous_start = start
            adverse_close = side * (close - inv) < 0
            if adverse_close:
                streak += 1
                closes += 1
                maxdepth = max(maxdepth, -side * (close - inv))
            else:
                streak = 0
            longest = max(longest, streak)
        x.update(confirmed3mBars=len(selected), closesBeyond3m=closes,
                 longestConsecutiveClosesBeyond3m=longest,
                 max3mCloseBreachDepthBtcUsd=round(maxdepth, 2))
    return x


def local(ts):
    return dt.datetime.fromtimestamp(ts / 1000, TZ).strftime("%d/%m %H:%M")


def invalidation(args):
    rows = load_ledger(args.ledger, args.first, args.last)
    if not rows:
        raise ValueError("no closed trades in the requested range")
    bars = read_bars(args.candles, min(r["entryAt"] for r in rows),
                     max(r["exitAt"] for r in rows))
    examined = [examine(r, bars) for r in rows]
    valid = [r for r in examined if r["status"] == "OK"]
    broken = [r for r in valid if r["crossed"]]
    winners = [r for r in broken if r["netPnlUsd"] > 0]
    losers = [r for r in broken if r["netPnlUsd"] <= 0]
    meaningful = [r for r in winners if r["netPnlUsd"] >= 1]
    barstreak = [r for r in broken if (r["longestConsecutiveClosesBeyond3m"] or 0) >= 2]
    payload = {
        "status": "READ_ONLY_RESEARCH_NOT_BACKTEST",
        "generatedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "source": str(args.ledger), "candles": str(args.candles),
        "range": [rows[0]["tradeNo"], rows[-1]["tradeNo"]],
        "stats": {"closed": len(rows), "withValidInvalidation": len(valid),
                  "breached": len(broken), "breachedAndNetPositive": len(winners),
                  "breachedAndNetAtLeast1Usd": len(meaningful),
                  "breachedAndNetNonPositive": len(losers),
                  "breachedWithTwoConsecutiveAdverse3mCloses": len(barstreak)},
        "trades": examined,
        "warnings": [
            "MAE proves a post-entry excursion but not its duration or exact timestamp.",
            "A 3m close is included only if its confirmed close time lies inside the trade.",
            "No lookahead for decisions: these are strictly ex-post observations.",
            "Net positive does not mean economically attractive risk/reward.",
            "No orders, policies, market feeds or ledgers were modified.",
        ],
    }
    s = payload["stats"]
    md = [
        "# BOONO — extrait compact d'audit des invalidations",
        f"**Périmètre figé :** trades #{rows[0]['tradeNo']}–#{rows[-1]['tradeNo']} | "
        f"{len(rows)} clôtures | lecture seule | {payload['generatedAtUtc']}.",
        f"**Chiffres :** {s['breached']}/{s['withValidInvalidation']} franchissent "
        f"l'invalidation ; {s['breachedAndNetPositive']} terminent net > 0 $ "
        f"(dont {s['breachedAndNetAtLeast1Usd']} net ≥ 1 $) ; "
        f"{s['breachedAndNetNonPositive']} ne sont pas bénéficiaires.",
        f"**Bougies :** {s['breachedWithTwoConsecutiveAdverse3mCloses']} trades franchis "
        "avec ≥2 clôtures 3m adverses consécutives (données OHLC confirmées)."
        if bars is not None else "**Bougies :** données 3m indisponibles.",
        "",
        "## Exceptions : invalidation franchie, clôture nette positive",
        "| Trade | Moteur | Excès au-delà invalidation (BTC $) | Closes 3m adverses | Plus longue série | Net $ |",
        "|---|---|---:|---:|---:|---:|",
    ]
    for r in sorted(winners, key=lambda z: z["tradeNo"])[:args.max_cases]:
        closes = "N/D" if r["closesBeyond3m"] is None else str(r["closesBeyond3m"])
        series = "N/D" if r["longestConsecutiveClosesBeyond3m"] is None else str(r["longestConsecutiveClosesBeyond3m"])
        md.append(f"| #{r['tradeNo']} | {r['version']} | {r['breachDepthBtcUsd']:.1f} "
                  f"| {closes} | {series} | {r['netPnlUsd']:+.2f} |")
    if len(winners) > args.max_cases:
        md.append(f"**{len(winners)-args.max_cases} autres exceptions** conservées "
                  "uniquement dans le JSON local (plafond de conversation).")
    md += ["", "## Limites et suite",
           "- Le franchissement MAE ne prouve pas la persistance du marché au-delà du niveau.",
           "- Comparer les franchissements furtifs aux confirmations de transfert prix/MCB/MF avant toute politique de stop.",
           "- Aucune modification PAPER, aucun stop testé en production.",
           f"- Évidence intégrale : data/research-briefs/{args.prefix}-invalidation-details.json (sur Amsterdam, non versionnée)."]
    output = "\n".join(md) + "\n"
    if args.save:
        atomic_text(OUT / f"{args.prefix}-invalidation-details.json",
                    json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
        atomic_text(OUT / f"{args.prefix}-invalidation-brief.md", output)
    print(output[:args.max_chars] + ("\n[BRIEF TRONQUÉ, détail conservé sur Amsterdam]\n"
                                    if len(output) > args.max_chars else ""))


def checkpoint(args):
    path = OUT / "active-research.json"
    if path.exists() and not args.reset:
        x = json.loads(path.read_text(encoding="utf-8"))
        if args.topic and args.topic != x["topic"]:
            raise ValueError("topic changed: use --reset to start another research subject")
    else:
        if not args.topic:
            raise ValueError("--topic is required for the first checkpoint or --reset")
        x = {"topic": args.topic, **{k: [] for k in FIELDS}}
    if args.topic:
        x["topic"] = args.topic
    x["updatedAtUtc"] = dt.datetime.now(dt.timezone.utc).isoformat()
    for k in FIELDS:
        for v in (getattr(args, k) or []):
            if v and v not in x[k]:
                x[k].append(v)
    md = [f"# BOONO — recherche active : {x['topic']}",
          f"Mis à jour : {x['updatedAtUtc']} | Source intégrale : data/research-briefs/active-research.json",
          "Statuts distincts : observation, hypothèse, validation, implémentation, test, mise en service.",
          ""]
    titles = {"confirmed":"Constats vérifiés","hypotheses":"Hypothèses non validées",
              "validated":"Décisions validées","implemented":"Implémentations",
              "tested":"Tests","deployed":"Mises en service",
              "open":"Questions ouvertes","sources":"Sources"}
    for k in FIELDS:
        md.append(f"## {titles[k]}")
        if not x[k]:
            md.append("- Aucune.")
        else:
            for v in x[k][-args.last_per_section:]:
                md.append("- " + v)
            if len(x[k]) > args.last_per_section:
                md.append(f"- ({len(x[k])-args.last_per_section} plus anciens dans le JSON local.)")
        md.append("")
    full = "\n".join(md)
    atomic_text(path, json.dumps(x, ensure_ascii=False, indent=2) + "\n")
    atomic_text(OUT / "active-research.md", full)
    print(full[:args.max_chars] + ("\n[BRIEF TRONQUÉ, dossier intégral sur Amsterdam]\n"
                                   if len(full) > args.max_chars else ""))


def main():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="command", required=True)
    a = sub.add_parser("invalidation", help="Compact retrospective ledger/3m validation audit")
    a.add_argument("--ledger", type=Path, default=ROOT / "data/v52-paper-trades.ndjson")
    a.add_argument("--candles", type=Path, default=ROOT.parent / "data/mcb-live/mcb_3m.csv")
    a.add_argument("--first", type=int, default=1)
    a.add_argument("--last", type=int)
    a.add_argument("--max-cases", type=int, default=10)
    a.add_argument("--max-chars", type=int, default=3200)
    a.add_argument("--prefix", default="latest")
    a.add_argument("--save", action="store_true", help="Keep full JSON and short MD under data/")
    a.set_defaults(run=invalidation)
    b = sub.add_parser("checkpoint", help="Append structured compact research passation")
    b.add_argument("--topic")
    b.add_argument("--reset", action="store_true")
    for field in FIELDS:
        b.add_argument("--" + field, action="append")
    b.add_argument("--last-per-section", type=int, default=4)
    b.add_argument("--max-chars", type=int, default=4000)
    b.set_defaults(run=checkpoint)
    c = sub.add_parser("show", help="Show last compact passation; never bulk-read logs")
    c.add_argument("--max-chars", type=int, default=4000)
    c.set_defaults(run=lambda z: print((OUT / "active-research.md").read_text(encoding="utf-8")[:z.max_chars]))
    args = p.parse_args()
    if hasattr(args, "max_cases") and args.max_cases < 1:
        p.error("--max-cases must be >=1")
    if hasattr(args, "last_per_section") and args.last_per_section < 1:
        p.error("--last-per-section must be >=1")
    args.run(args)


if __name__ == "__main__":
    main()
