import importlib.util
import json
import pathlib
import tempfile
import unittest

CODE = pathlib.Path(__file__).resolve().parents[2] / "scripts" / "boono-audit-14d.py"
spec = importlib.util.spec_from_file_location("audit14d", CODE)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

DAY = 86400000
HOUR = 3600000
BASE = 1793376000000

class Audit14DayTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = pathlib.Path(self.tmp.name)
        self.src = self.base / "live.json"
        self.dest = self.base / "cold"
    def live(self, rows):
        self.src.write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
    def row(self, ts, **more):
        return {"ts": ts, "lastPrice": 78123.5, "pmLive": -12.7,
            "mcb15": {"lbw": -35.4, "mf": 7.4},
            "complex": [None, "économie", {"key": [2, 3]}], **more}
    def test_seed_and_live_preserve_every_field_and_deduplicate_overlap(self):
        r1=self.row(BASE-90000, extra=[1, 2, 3])
        r2=self.row(BASE-30000, material=True)
        r3=self.row(BASE, pm3=99)
        seed=self.base/"seed.json"
        seed.write_text(json.dumps([r1,r2], ensure_ascii=False))
        self.live([r2,r3])
        out=audit.ingest(self.src,self.dest,BASE+10000,seed)
        self.assertEqual(out["rowsWritten"],3)
        v=audit.verify(self.dest)
        self.assertEqual(v["rows"],3)
        self.assertEqual(v["errors"],[])
        self.assertEqual(v["sampleFieldCount"],len(r1))
        self.assertFalse(v["uiIntegrated"])
        self.assertEqual(out["cursorTs"],BASE)
    def test_idempotent_restart_and_new_data_append(self):
        self.live([self.row(BASE-30000),self.row(BASE)])
        x=audit.ingest(self.src,self.dest,BASE+1000)
        self.assertEqual(x["rowsWritten"],2)
        self.assertEqual(audit.ingest(self.src,self.dest,BASE+1500)["lastAdded"],0)
        self.live([self.row(BASE-30000),self.row(BASE),self.row(BASE+30000)])
        y=audit.ingest(self.src,self.dest,BASE+60000)
        self.assertEqual(y["rowsWritten"],3)
        self.assertEqual(audit.verify(self.dest)["rows"],3)
    def test_completed_shards_are_gzip_and_retention_is_bounded(self):
        self.live([self.row(BASE-14*DAY-3*HOUR),self.row(BASE-2*HOUR),
                   self.row(BASE-30*60000),self.row(BASE)])
        audit.ingest(self.src,self.dest,BASE+1000)
        rows=audit.verify(self.dest)
        self.assertEqual(rows["rows"],3)
        self.assertTrue(any(f.suffix==".gz" for f in audit.archived_shards(self.dest)))
        self.assertFalse(any("older" in x.name for x in audit.archived_shards(self.dest)))
        self.live([self.row(BASE+DAY)])
        audit.ingest(self.src,self.dest,BASE+DAY+1000)
        self.assertEqual(audit.verify(self.dest)["errors"],[])
    def test_freshness_gaps_are_reported_instead_of_inventing_missing_rows(self):
        self.live([self.row(BASE-500000),self.row(BASE)])
        x=audit.ingest(self.src,self.dest,BASE+100)
        self.assertEqual(x["rowsWritten"],2)
        self.assertEqual(len(x["gaps"]),1)
        self.assertEqual(audit.verify(self.dest)["rows"],2)
    def test_partial_oldest_hour_is_trimmed_exactly_at_14_days(self):
        self.live([self.row(BASE+10000), self.row(BASE+70000)])
        audit.ingest(self.src, self.dest, BASE+100000)
        self.live([self.row(BASE+14*DAY+30000)])
        audit.ingest(self.src, self.dest, BASE+14*DAY+60000)
        v = audit.verify(self.dest)
        self.assertEqual(v["errors"], [])
        self.assertEqual(v["rows"], 2)
        self.assertEqual(v["firstTs"], BASE+70000)
    def test_unknown_state_version_refuses_reset(self):
        self.dest.mkdir()
        (self.dest/"status.json").write_text('{"version":"wrong"}')
        self.live([self.row(BASE)])
        with self.assertRaisesRegex(ValueError,"VERSION"):
            audit.ingest(self.src,self.dest,BASE+1000)
    def test_source_corruption_does_not_replace_good_archived_data(self):
        self.live([self.row(BASE)])
        audit.ingest(self.src,self.dest,BASE+1000)
        self.src.write_text('{"broken":1}')
        with self.assertRaisesRegex(ValueError,"NOT_ARRAY"):
            audit.ingest(self.src,self.dest,BASE+2000)
        self.assertEqual(audit.verify(self.dest)["rows"],1)

if __name__ == "__main__":
    unittest.main()
