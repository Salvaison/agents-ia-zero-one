"""Unit tests for BOONO read-only research compactor."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import types
import unittest

SCRIPT = Path(__file__).resolve().parents[2] / "scripts/boono-research-brief.py"
s = importlib.util.spec_from_file_location("research_brief", SCRIPT)
tool = importlib.util.module_from_spec(s)
s.loader.exec_module(tool)


def trade(direction="short", mae=12, start=0, end=900000):
    return dict(tradeNo=1, engine="TEST", direction=direction,
                entryPrice=100., entryInvalidation=110. if direction == "short" else 90.,
                maePriceUsd=mae, netPnlUsd=0.12, mfePriceUsd=120,
                entryAt=start, exitAt=end)


class ResearchBriefTests(unittest.TestCase):
    def test_wick_is_not_confirmed_price_acceptance(self):
        row = trade()
        candles = [(0, 112, 96, 105), (180000, 110, 97, 108), (360000, 115, 99, 100)]
        x = tool.examine(row, candles)
        self.assertTrue(x["crossed"])
        self.assertEqual(x["breachDepthBtcUsd"], 2)
        self.assertEqual(x["longestConsecutiveClosesBeyond3m"], 0)

    def test_only_known_closes_and_no_gap_induced_streak(self):
        row = trade("long", mae=20, start=60000, end=1000000)
        candles = [(-180000, 101, 70, 80), (0, 102, 80, 88),
                   (180000, 99, 83, 87), (540000, 98, 70, 85),
                   (900000, 99, 70, 82)]
        x = tool.examine(row, candles)
        self.assertEqual(x["closesBeyond3m"], 3)
        self.assertEqual(x["longestConsecutiveClosesBeyond3m"], 2)
        self.assertEqual(x["confirmed3mBars"], 3)

    def test_dedup_and_utc_timestamp(self):
        data = ("timestamp,open,high,low,close\n"
                "2026-10-28T00:00:00.000Z,100,110,98,102\n"
                "2026-10-28T00:00:00.000Z,100,111,98,103\n"
                "2026-10-28T00:03:00.000Z,103,110,95,104\n")
        with tempfile.TemporaryDirectory() as td:
            f = Path(td) / "bars.csv"
            f.write_text(data)
            bars = tool.read_bars(f, 1793145600000, 1793146200000)
            self.assertEqual(len(bars), 2)
            self.assertEqual(bars[0][1], 111)

    def test_duplicate_trades_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            f = Path(td) / "trades.ndjson"
            f.write_text("\n".join(json.dumps(trade()) for i in range(2)))
            with self.assertRaisesRegex(ValueError, "duplicate"):
                tool.load_ledger(f, 1, 10)

    def test_wrong_side_invalidation_rejected(self):
        x = trade("long")
        x["entryInvalidation"] = 120
        self.assertEqual(tool.examine(x, [])["status"], "INVALIDATION_WRONG_SIDE")

    def test_checkpoint_preserves_status_separately(self):
        with tempfile.TemporaryDirectory() as td:
            old = tool.OUT
            tool.OUT = Path(td)
            try:
                x = types.SimpleNamespace(topic="Episode A", reset=True,
                    last_per_section=2, max_chars=1200, confirmed=["Ledger checked"],
                    hypotheses=["Possible"], validated=[], implemented=[],
                    tested=[], deployed=[], open=["Replay"], sources=["ledger"])
                with contextlib.redirect_stdout(io.StringIO()):
                    tool.checkpoint(x)
                state = json.loads((Path(td) / "active-research.json").read_text())
                self.assertEqual(state["confirmed"], ["Ledger checked"])
                self.assertEqual(state["deployed"], [])
                x.reset = False
                x.confirmed = ["A second observation"]
                with contextlib.redirect_stdout(io.StringIO()):
                    tool.checkpoint(x)
                self.assertEqual(len(json.loads((Path(td) / "active-research.json").read_text())["confirmed"]), 2)
            finally:
                tool.OUT = old


if __name__ == "__main__":
    unittest.main()
