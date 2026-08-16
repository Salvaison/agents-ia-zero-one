#!/usr/bin/env python3
"""
Correctif : convCell echouait avec "v.toFixed is not a function".

Cause (16/08/2026) : convictionScore et coherence peuvent arriver sous forme
de CHAINE et non de nombre -- analyzeTrigger() utilise .toFixed() en interne
sur plusieurs champs, produisant des chaines que baton-relay transmet telles
quelles. convCell appelait v.toFixed(2) directement, ce qui casse le rendu
de toute la page (erreur remontee comme "Erreur reseau").

Correctif : convertir avec parseFloat avant tout traitement, comme le fait
deja fmt() ailleurs dans le fichier.

A executer sur le VPS, dans /root/agents-ia-zero-one/zero-one :
    python3 patch-convcell-fix.py
"""

from pathlib import Path

TARGET = Path("modules/config-server.js")

OLD = """    function convCell(v) {
      if (v === null || v === undefined || isNaN(v)) return '';
      var col = v >= 0.75 ? '#2ecc71' : (v >= 0.5 ? '#f1c40f' : '#8fa3bf');
      var w = v >= 0.75 ? 'font-weight:700;' : '';
      return '<span style="color:' + col + ';' + w + '">' + v.toFixed(2) + '</span>';
    }"""

NEW = """    function convCell(v) {
      /* parseFloat obligatoire : analyzeTrigger() renvoie certains champs
       * en CHAINE (il utilise .toFixed() en interne), et v.toFixed() sur une
       * chaine casse le rendu de toute la page. */
      var n = parseFloat(v);
      if (v === null || v === undefined || isNaN(n)) return '';
      var col = n >= 0.75 ? '#2ecc71' : (n >= 0.5 ? '#f1c40f' : '#8fa3bf');
      var w = n >= 0.75 ? 'font-weight:700;' : '';
      return '<span style="color:' + col + ';' + w + '">' + n.toFixed(2) + '</span>';
    }"""


def main():
    if not TARGET.exists():
        raise SystemExit(f"ERREUR: {TARGET} introuvable.")

    src = TARGET.read_text(encoding="utf-8")
    n = src.count(OLD)
    assert n == 1, f"bloc introuvable ou trouve {n} fois. Rien ecrit."
    src = src.replace(OLD, NEW)
    TARGET.write_text(src, encoding="utf-8")
    print("OK: convCell corrige (parseFloat avant toFixed).")
    print("\nVerifie avec: node --check modules/config-server.js")
    print("Puis: pm2 restart config-server")


if __name__ == "__main__":
    main()
