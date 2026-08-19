#!/usr/bin/env python3
"""
Patch : inversion de l'asymetrie dans la regle de chaine.

CONSTAT (19/08/2026). Benjamin signalait une grande resistance descendante
que le detecteur ne trouvait pas. Une fois les pivots de prix ajoutes, la
verification montre qu'elle existe bel et bien :

  18/08 16h30  65041.7   ecart    0  <-- ALIGNE
  18/08 18h00  64868.7   ecart -126
  18/08 20h30  64798.0   ecart -119
  18/08 23h00  64630.0   ecart -209
  19/08 01h45  64757.9   ecart    4  <-- ALIGNE
  19/08 03h45  64409.1   ecart -282
  19/08 07h00  64380.0   ecart -210
  19/08 09h30  64372.8   ecart -139
  19/08 10h30  64480.9   ecart    0  <-- ALIGNE

Trois sommets alignes a 4 USD pres sur dix-huit heures. Une ligne
excellente.

CAUSE DU BLOCAGE. Ma regle de chaine rejetait tout pivot hors tolerance,
avec une marge doublee pour les DEPASSEMENTS. Les six sommets intermediaires
etant tous EN DESSOUS, ils rompaient la chaine.

L'asymetrie etait a l'envers. Sur une resistance descendante, un sommet plus
bas que la ligne est le comportement NORMAL -- le prix ne va pas chercher le
niveau a chaque oscillation. Ce qui invalide une resistance, c'est un sommet
qui la DEPASSE franchement.

Benjamin l'avait dit autrement le 16/08 : "une ligne est faite pour etre
percee, ce qui compte c'est que le prix y reagisse". J'avais traduit cela en
tolerant les perforations dans le comptage des contacts -- correct -- mais
j'ai applique la meme logique a la rupture de chaine, ou elle produit
l'inverse de ce qu'il faut.

CORRECTIF :
  pivot HAUT EN DESSOUS de la ligne  -> normal, ne rompt jamais
  pivot HAUT AU-DESSUS de la ligne   -> rompt au-dela de la tolerance
  (et l'inverse pour les BAS : un creux au-dessus d'un support est normal,
   un creux qui passe dessous rompt)

A executer sur le VPS, dans /root/agents-ia-zero-one/zero-one :
    python3 patch-asymetrie-chaine-190826.py
"""

from pathlib import Path

TARGET = Path("modules/trendline-detector.js")

OLD = """    const ecart = p.price - at(p.ts);
    /* TOLERANCE ASYMETRIQUE (19/08/2026). Un pivot qui DEPASSE la ligne la
     * perce sans la casser -- c'est meme la marque d'un niveau eprouve.
     * Seul un pivot qui reste EN DECA rompt la structure : il montre que le
     * prix n'est pas alle chercher le niveau, donc que la ligne ne le
     * gouvernait pas a ce moment. */
    const perce = (type === 'HAUT') ? (ecart > 0) : (ecart < 0);
    const marge = perce ? tol * 2 : tol;
    if (Math.abs(ecart) > marge) {
      if (rupture === null || p.ts < rupture) rupture = p.ts;
    }"""

NEW = """    const ecart = p.price - at(p.ts);
    /* ASYMETRIE (corrigee le 19/08/2026, elle etait a l'envers).
     *
     * Sur une resistance, un sommet PLUS BAS que la ligne est le
     * comportement normal : le prix ne va pas chercher le niveau a chaque
     * oscillation. Ce qui invalide une resistance, c'est un sommet qui la
     * DEPASSE franchement.
     *
     * La version precedente rompait sur les pivots en deca, ce qui a bloque
     * une resistance a trois sommets alignes a 4 USD pres sur dix-huit
     * heures : ses six sommets intermediaires etaient tous en dessous, de
     * 119 a 282 USD -- exactement ce qu'on attend d'une resistance qui
     * tient. */
    const enDeca = (type === 'HAUT') ? (ecart < 0) : (ecart > 0);
    if (enDeca) continue;                       /* normal, ne rompt jamais */
    if (Math.abs(ecart) > tol) {                /* depassement franc */
      if (rupture === null || p.ts < rupture) rupture = p.ts;
    }"""


def main():
    if not TARGET.exists():
        raise SystemExit(f"ERREUR: {TARGET} introuvable.")
    src = TARGET.read_text(encoding="utf-8")
    n = src.count(OLD)
    assert n == 1, f"bloc introuvable ou trouve {n} fois. Rien ecrit."
    src = src.replace(OLD, NEW)
    TARGET.write_text(src, encoding="utf-8")
    print("OK: asymetrie inversee -- un pivot en deca ne rompt plus la chaine.")
    print("\nVerifie avec: node --check modules/trendline-detector.js")
    print("Puis: rm -f data/trendlines.json && pm2 restart trendline")
    print("\nATTENDU : la grande resistance descendante doit apparaitre")
    print("(18/08 16h30 -> 19/08 01h45 -> 19/08 10h30, pente -31.2 USD/h),")
    print("et le catalogue s'etoffer nettement.")


if __name__ == "__main__":
    main()
