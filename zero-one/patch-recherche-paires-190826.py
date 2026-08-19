#!/usr/bin/env python3
"""
Patch : plus d'ancres candidates, et recherche par paires de pivots passes.

DIAGNOSTIC (19/08/2026). La grande resistance descendante existe -- trois
sommets alignes a 4 USD pres sur dix-huit heures -- mais le detecteur ne la
trouve toujours pas malgre les corrections precedentes. L'instrumentation
montre deux causes :

1. LE SOMMET DE DEPART N'EST JAMAIS TESTE. Celui du 18/08 a 16h30 (65041.7)
   est le huitieme pivot HAUT en remontant ; ANCHOR_CANDIDATES vaut 4, la
   recherche s'arrete au cinquieme.

2. PLUS PROFOND : LA LIGNE PROVISOIRE EST CONTRAINTE DE PASSER PAR LE PRIX
   COURANT. Depuis l'ancre du 18/08 23h45 (64757.9) vers le prix a 64338,
   la pente vaut -39 USD/h -- alors que la vraie ligne fait -31.2. Le sommet
   de 65041 tombe donc hors tolerance, et un seul pivot s'aligne : lui-meme.

   La methode ne peut trouver que les lignes dont la projection actuelle
   passe par le prix. Or une resistance descendante que le prix n'a pas
   encore rejointe ne remplit pas cette condition -- et c'est justement le
   cas interessant.

CORRECTIFS :

  ANCHOR_CANDIDATES : 4 -> 10, pour que les ancres anciennes soient testees.

  RECHERCHE PAR PAIRES : on ajoute une seconde methode, complementaire de
  celle de Benjamin. Pour chaque paire de pivots passes du meme type
  suffisamment espacee, on trace la droite qui les relie et on compte les
  alignements. Le prix courant n'intervient pas -- il sert seulement, ensuite,
  a savoir si la ligne est allumee.

  La recherche par ancre mobile est CONSERVEE : elle capte les lignes qui se
  forment en direction du prix. Les deux se completent.

RISQUE ASSUME : la recherche par paires produit beaucoup plus de candidates
(toutes les paires, soit ~120 pour 16 pivots HAUT). Les regles de chaine, de
dispersion et de dedoublonnage filtrent ensuite. Si le catalogue devient
inexploitable, resserrer MIN_SPAN_HOURS ou exiger 4 contacts pour les lignes
issues de cette methode.

A executer sur le VPS, dans /root/agents-ia-zero-one/zero-one :
    python3 patch-recherche-paires-190826.py
"""

from pathlib import Path

TARGET = Path("modules/trendline-detector.js")

OLD_CAND = """const ANCHOR_CANDIDATES = 4;"""
NEW_CAND = """const ANCHOR_CANDIDATES = 10;"""

OLD_SEARCH = """    const alignes = same.filter(p => Math.abs(p.price - at(p.ts)) <= SEARCH_TOLERANCE_USD);
    if (alignes.length < 3) continue;
    collectLines(out, pivots, type, alignes, nowTs, nowPrice);
  }
  return out;
}"""

NEW_SEARCH = """    const alignes = same.filter(p => Math.abs(p.price - at(p.ts)) <= SEARCH_TOLERANCE_USD);
    if (alignes.length < 3) continue;
    collectLines(out, pivots, type, alignes, nowTs, nowPrice);
  }

  /* SECONDE METHODE (19/08/2026) : les paires de pivots passes.
   *
   * La recherche par ancre mobile ne trouve que les lignes dont la
   * projection actuelle passe par le prix courant. Une resistance
   * descendante que le prix n'a pas encore rejointe echappe donc a la
   * detection -- alors que c'est le cas le plus interessant : on veut la
   * connaitre AVANT que le prix y arrive.
   *
   * Ici on relie deux pivots passes et on compte les alignements. Le prix
   * n'intervient que plus tard, pour savoir si la ligne est allumee. */
  for (let i = 0; i < same.length - 1; i++) {
    for (let j = i + 1; j < same.length; j++) {
      const A = same[i], B = same[j];
      if ((B.ts - A.ts) < MIN_SPAN_HOURS * 3600) continue;
      const sl = (B.price - A.price) / (B.ts - A.ts);
      const f = (t) => A.price + sl * (t - A.ts);
      const alignes = same.filter(p => Math.abs(p.price - f(p.ts)) <= SEARCH_TOLERANCE_USD);
      /* Trois contacts minimum, comme partout ailleurs. */
      if (alignes.length < 3) continue;
      collectLines(out, pivots, type, alignes, nowTs, nowPrice);
    }
  }
  return out;
}"""


def main():
    if not TARGET.exists():
        raise SystemExit(f"ERREUR: {TARGET} introuvable.")
    src = TARGET.read_text(encoding="utf-8")
    for label, old, new in (
        ("ancres candidates", OLD_CAND, NEW_CAND),
        ("recherche par paires", OLD_SEARCH, NEW_SEARCH),
    ):
        n = src.count(old)
        assert n == 1, f"[{label}] bloc introuvable ou trouve {n} fois. Rien ecrit."
        src = src.replace(old, new)
    TARGET.write_text(src, encoding="utf-8")
    print("OK: 10 ancres candidates + recherche par paires de pivots passes.")
    print("\nVerifie avec: node --check modules/trendline-detector.js")
    print("Puis: rm -f data/trendlines.json && pm2 restart trendline")
    print("\nATTENDU : la grande resistance (18/08 16h30 -> 19/08 01h45 ->")
    print("19/08 10h30, pente -31.2 USD/h) doit apparaitre, et le catalogue")
    print("s'etoffer nettement. Surveiller la charge CPU du processus trendline.")


if __name__ == "__main__":
    main()
