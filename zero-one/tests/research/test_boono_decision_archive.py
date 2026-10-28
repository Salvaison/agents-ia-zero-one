"""Verbatim and provenance archive: non-overwrite, integrity and event-chain tests."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "boono-decision-archive.py"
spec = importlib.util.spec_from_file_location("boono_decision_archive", SCRIPT)
archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive)

ID = "OD-20261028-001"


class DecisionArchiveTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)
        self.dest = self.path / "decisions"
        self.original = self.path / "source.txt"
        self.operational = self.path / "execution.txt"
        self.origin = self.path / "raison.md"
        self.bytes = ("Je valide : garder le prompt original !\n"
                      "« Une règle vérifiable »\n").encode("utf-8")
        self.original.write_bytes(self.bytes)
        self.operational.write_bytes(b"AGENT EXECUTION PROMPT\nDo not trade.\n")
        self.origin.write_text("Cause: long discussion; authorization and reason.\n")

    def record(self):
        return archive.make_record(self.dest, ID, "Archive obligatoire",
                                   self.original, self.operational, self.origin,
                                   "Authorized by user current conversation",
                                   "28 October 2026 BOONO chat")

    def test_verbatim_original_and_hash_are_exact(self):
        rec = self.record()
        actual = (rec / archive.DOCS["user"]).read_bytes()
        self.assertEqual(self.bytes, actual)
        meta = json.loads((rec / "manifest.json").read_text())
        self.assertEqual(meta["files"][archive.DOCS["user"]]["sha256"],
                         archive.digest(self.bytes))
        self.assertEqual(meta["files"][archive.DOCS["user"]]["bytes"],
                         len(self.bytes))
        self.assertEqual(archive.verify_record(rec)["events"], 0)

    def test_reject_overwrite_even_after_new_source(self):
        self.record()
        self.original.write_text("A changed prompt")
        with self.assertRaises(FileExistsError):
            self.record()
        rec = self.dest / ID
        self.assertEqual((rec / archive.DOCS["user"]).read_bytes(), self.bytes)

    def test_missing_original_or_explanation_cannot_create(self):
        self.origin.write_text(" ")
        with self.assertRaisesRegex(ValueError, "origin explanation is empty"):
            self.record()
        self.assertFalse((self.dest / ID).exists())
        self.origin.write_text("Source and rationale")
        self.original.write_text("")
        with self.assertRaisesRegex(ValueError, "user prompt is empty"):
            self.record()
        self.assertFalse((self.dest / ID).exists())

    def test_modified_original_detected(self):
        rec = self.record()
        (rec / archive.DOCS["execution"]).write_text("Changed!")
        with self.assertRaisesRegex(ValueError, "changed after archival"):
            archive.verify_record(rec)

    def test_append_only_events_form_a_verified_chain(self):
        rec = self.record()
        first = archive.add_event(self.dest, ID, "AUTORISE",
                                  "Explicit user authorization", "original request")
        second = archive.add_event(self.dest, ID, "TESTE",
                                   "Tests pass", "6 tests, command and results")
        self.assertEqual(first.name, "0001.json")
        self.assertEqual(second.name, "0002.json")
        self.assertEqual(archive.verify_record(rec)["latestStatus"], "TESTE")
        event2 = json.loads(second.read_text())
        self.assertEqual(event2["previousEventSha256"],
                         archive.digest(first.read_bytes()))
        with self.assertRaises(FileExistsError):
            with first.open("xb"):
                pass

    def test_tampered_event_chain_detected(self):
        rec = self.record()
        first = archive.add_event(self.dest, ID, "AUTORISE",
                                  "Authorized", "User message")
        archive.add_event(self.dest, ID, "IMPLEMENTE",
                          "Code implemented", "Commit pending")
        first.write_text('{"sequence":1,"previousEventSha256":null,'
                         '"status":"AUTORISE","description":"Changed",'
                         '"evidence":"none","recordedAtUtc":"now"}')
        with self.assertRaisesRegex(ValueError, "broken event chain"):
            archive.verify_record(rec)

    def test_invalid_id_or_missing_evidence_rejected(self):
        with self.assertRaisesRegex(ValueError, "OD-YYYYMMDD"):
            archive.make_record(self.dest, "../bad", "Title",
                                self.original, self.operational, self.origin,
                                "User", "chat")
        self.record()
        with self.assertRaisesRegex(ValueError, "non-empty"):
            archive.add_event(self.dest, ID, "TESTE", "Pass", "")

    def test_verify_all_returns_only_known_ids(self):
        self.record()
        (self.dest / "other-folder").mkdir()
        items = archive.verify_all(self.dest)
        self.assertEqual([r["id"] for r in items], [ID])


if __name__ == "__main__":
    unittest.main()
