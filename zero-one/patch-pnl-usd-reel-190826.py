#!/usr/bin/env python3
"""
Patch : le PNL en USD est calcule sur la taille reellement engagee.

CE QUI CLOCHAIT (19/08/2026). L'onglet BOONO affichait -435 USD pour un trade
a -0.67%. C'etait le mouvement du prix rapporte a un bitcoin entier -- pas la
perte sur la position.

Parametres reels, rappeles par Benjamin :
    capital initial   1000 USD
    par trade         1% du capital, soit 10 USD de marge
    levier            10x -> notionnel de 100 USD

Un mouvement de -0.67% sur 100 USD de notionnel fait donc -0.67 USD, soit
-6.7% de la marge engagee et -0.067% du capital. Trois lectures differentes
du meme trade, et l'affichage confondait la premiere avec le mouvement brut
du sous-jacent.

CE QUE FAIT LE PATCH :

  moteur-boono.js   enregistre a l'entree le capital, le pourcentage engage,
                    le levier et le notionnel qui en decoule. Chaque ligne
                    d'historique porte desormais pnlUsd, calcule sur ce
                    notionnel et la fraction sortie.

  config-server.js  utilise pnlUsd quand il est present. Les anciennes lignes
                    sans ce champ retombent sur l'ancien calcul, signale par
                    un asterisque.

Le levier de 10x est le plafond reglementaire europeen pour un particulier,
verifie le 14/08 sur le compte OKX -- l'instrument en autorise 50, mais pas
le compte.

A executer sur le VPS, dans /root/agents-ia-zero-one/zero-one :
    python3 patch-pnl-usd-reel-190826.py
"""

from pathlib import Path

MOTEUR = Path("modules/moteur-boono.js")
SERVER = Path("modules/config-server.js")

# ── 1. Parametres de dimensionnement ──────────────────────────────────────

OLD_TRANCHES = """/* Tranches conservees de l'ancienne structure : 25% au premier objectif,
 * 65% au second, 10% laisses courir. */"""

NEW_TRANCHES = """/* DIMENSIONNEMENT (19/08/2026). Capital de depart 1000 USD, 1% engage par
 * trade soit 10 USD de marge, levier 10x -> notionnel de 100 USD.
 * Le levier de 10 est le plafond reglementaire europeen pour un particulier,
 * verifie le 14/08 sur le compte OKX : l'instrument en autorise 50, pas le
 * compte. */
const CAPITAL_USD = 1000;
const POSITION_PERCENT = 1;
const LEVIER = 10;
const NOTIONNEL_USD = CAPITAL_USD * POSITION_PERCENT / 100 * LEVIER;

/* Tranches conservees de l'ancienne structure : 25% au premier objectif,
 * 65% au second, 10% laisses courir. */"""

# ── 2. Enregistrement du PNL en USD a la sortie ───────────────────────────

OLD_SORTIR = """  const sortir = (raison, fraction) => {
    appendHistory({
      entryTimestamp: pos.entryTimestamp,
      exitTimestamp: new Date(now).toISOString(),
      direction: pos.direction,
      entryPrice: pos.entryPrice,
      exitPrice: prix,
      pnlPercent: +pnl.toFixed(4),
      fraction,
      exitReason: raison,
      contexteEntree: pos.contexte,
      declencheur: pos.declencheur,
    });
    console.log(`[moteur] SORTIE ${fraction}% ${pos.direction} @ ${prix} ` +
                `(${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%) -- ${raison}`);
  };"""

NEW_SORTIR = """  const sortir = (raison, fraction) => {
    /* PNL en USD sur le NOTIONNEL engage, et non sur le prix du sous-jacent.
     * Un mouvement de 0.67% donne 0.67 USD sur 100 de notionnel -- pas 435,
     * qui etait le mouvement rapporte a un bitcoin entier. */
    const notionnelTranche = (pos.notionnel || NOTIONNEL_USD) * fraction / 100;
    const usd = pnl / 100 * notionnelTranche;
    /* Part de la marge engagee : c'est cette lecture qui dit si le trade
     * fait mal. Avec un levier de 10, 0.67% de mouvement fait 6.7% de marge. */
    const pctMarge = pnl * (pos.levier || LEVIER);
    appendHistory({
      entryTimestamp: pos.entryTimestamp,
      exitTimestamp: new Date(now).toISOString(),
      direction: pos.direction,
      entryPrice: pos.entryPrice,
      exitPrice: prix,
      pnlPercent: +pnl.toFixed(4),
      pnlUsd: +usd.toFixed(2),
      pnlMargePercent: +pctMarge.toFixed(2),
      notionnel: +notionnelTranche.toFixed(2),
      fraction,
      exitReason: raison,
      contexteEntree: pos.contexte,
      declencheur: pos.declencheur,
    });
    console.log(`[moteur] SORTIE ${fraction}% ${pos.direction} @ ${prix} ` +
                `(${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}% = ${usd >= 0 ? '+' : ''}${usd.toFixed(2)} USD) -- ${raison}`);
  };"""

# ── 3. Enregistrement a l'entree ──────────────────────────────────────────

OLD_ENTREE = """  state.position = {
    direction,
    entryPrice: prix,
    entryTimestamp: new Date(now).toISOString(),
    restant: 100,
    trancheStage: 0,
    direction_source: dv.raison,"""

NEW_ENTREE = """  state.position = {
    direction,
    entryPrice: prix,
    entryTimestamp: new Date(now).toISOString(),
    restant: 100,
    trancheStage: 0,
    /* Dimensionnement fige a l'entree : si les parametres changent en cours
     * de route, la position garde ceux avec lesquels elle a ete ouverte. */
    capital: CAPITAL_USD,
    positionPercent: POSITION_PERCENT,
    levier: LEVIER,
    notionnel: NOTIONNEL_USD,
    direction_source: dv.raison,"""

# ── 4. Affichage : utiliser pnlUsd quand il existe ────────────────────────

OLD_D1 = """    const usdTotal = listeEntrees.reduce(function (a, e) { return a + e.pnl / 100 * e.prix; }, 0);"""
NEW_D1 = """    /* pnlUsd est enregistre depuis le 19/08. Les lignes anterieures retombent
     * sur l'ancien calcul -- signale par un asterisque. */
    let usdTotal = 0, approx = false;
    h.forEach(function (t) {
      if (typeof t.pnlUsd === 'number') usdTotal += t.pnlUsd;
      else { usdTotal += (t.fraction / 100) * t.pnlPercent / 100 * t.entryPrice; approx = true; }
    });"""

OLD_D2 = """      '<div>PNL cumule : ' + (total >= 0 ? '+' : '') + total.toFixed(2) + '%  (' +
        (usdTotal >= 0 ? '+' : '') + Math.round(usdTotal) + ' USD)</div>' +"""
NEW_D2 = """      '<div>PNL cumule : ' + (total >= 0 ? '+' : '') + total.toFixed(2) + '%  (' +
        (usdTotal >= 0 ? '+' : '') + usdTotal.toFixed(2) + ' USD' + (approx ? '*' : '') + ')</div>' +
      '<div style="opacity:0.7; font-size:11px;">notionnel ' + (h[0] && h[0].notionnel ? h[0].notionnel : 100) +
        ' USD par trade (1% de 1000 a 10x)' + (approx ? '  --  * lignes anterieures au 19/08 estimees' : '') + '</div>' +"""

OLD_D3 = """      parRaison[k].usd += (t.fraction / 100) * t.pnlPercent / 100 * t.entryPrice;"""
NEW_D3 = """      parRaison[k].usd += (typeof t.pnlUsd === 'number')
        ? t.pnlUsd : (t.fraction / 100) * t.pnlPercent / 100 * t.entryPrice;"""

OLD_D4 = """          '<td class="' + c + '">' + (v.usd >= 0 ? '+' : '') + Math.round(v.usd) + '</td></tr>';"""
NEW_D4 = """          '<td class="' + c + '">' + (v.usd >= 0 ? '+' : '') + v.usd.toFixed(2) + '</td></tr>';"""

OLD_D5 = """      const usd = (t.fraction / 100) * t.pnlPercent / 100 * t.entryPrice;"""
NEW_D5 = """      const usd = (typeof t.pnlUsd === 'number')
        ? t.pnlUsd : (t.fraction / 100) * t.pnlPercent / 100 * t.entryPrice;"""

OLD_D6 = """        '<td class="' + c + '">' + (usd >= 0 ? '+' : '') + Math.round(usd) + '</td>' +"""
NEW_D6 = """        '<td class="' + c + '">' + (usd >= 0 ? '+' : '') + usd.toFixed(2) + '</td>' +"""

OLD_D7 = """      const usd = (p.pnlCourant !== undefined && p.entryPrice)
        ? (p.pnlCourant / 100 * p.entryPrice) : null;"""
NEW_D7 = """      const usd = (p.pnlCourant !== undefined && p.notionnel)
        ? (p.pnlCourant / 100 * p.notionnel * p.restant / 100) : null;"""

OLD_D8 = """        (usd !== null ? '  (' + (usd >= 0 ? '+' : '') + Math.round(usd) + ' USD)' : '') +"""
NEW_D8 = """        (usd !== null ? '  (' + (usd >= 0 ? '+' : '') + usd.toFixed(2) + ' USD)' : '') +
        (p.levier && p.pnlCourant !== undefined
          ? '  --  ' + (p.pnlCourant * p.levier >= 0 ? '+' : '') + (p.pnlCourant * p.levier).toFixed(1) + '% de marge' : '') +"""


def main():
    for p in (MOTEUR, SERVER):
        if not p.exists():
            raise SystemExit(f"ERREUR: {p} introuvable.")

    src = MOTEUR.read_text(encoding="utf-8")
    for label, old, new in (
        ("dimensionnement", OLD_TRANCHES, NEW_TRANCHES),
        ("sortie", OLD_SORTIR, NEW_SORTIR),
        ("entree", OLD_ENTREE, NEW_ENTREE),
    ):
        n = src.count(old)
        assert n == 1, f"[moteur/{label}] bloc introuvable ou trouve {n} fois. Rien ecrit."
        src = src.replace(old, new)
    MOTEUR.write_text(src, encoding="utf-8")
    print("OK: moteur-boono.js -- notionnel de 100 USD (1% de 1000 a 10x).")

    src = SERVER.read_text(encoding="utf-8")
    for label, old, new in (
        ("total USD", OLD_D1, NEW_D1),
        ("ligne de bilan", OLD_D2, NEW_D2),
        ("ventilation", OLD_D3, NEW_D3),
        ("cellule ventilation", OLD_D4, NEW_D4),
        ("detail", OLD_D5, NEW_D5),
        ("cellule detail", OLD_D6, NEW_D6),
        ("position en cours", OLD_D7, NEW_D7),
        ("affichage position", OLD_D8, NEW_D8),
    ):
        n = src.count(old)
        assert n == 1, f"[server/{label}] bloc introuvable ou trouve {n} fois."
        src = src.replace(old, new)
    SERVER.write_text(src, encoding="utf-8")
    print("OK: config-server.js -- PNL sur notionnel, marge affichee.")

    print("\nVerifie avec:")
    print("  node --check modules/moteur-boono.js")
    print("  node --check modules/config-server.js")
    print("Puis: pm2 restart moteur-boono && pm2 restart config-server")
    print("\nLe trade du 19/08 12h28 restera estime a l'ancienne (asterisque) --")
    print("il a ete enregistre avant que le notionnel soit connu. Sa vraie")
    print("valeur : -0.67 USD, soit -6.7% de la marge de 10 USD.")


if __name__ == "__main__":
    main()
