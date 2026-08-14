#!/usr/bin/env python3
"""
Patch: deux corrections issues de l'analyse de 147 positions (07-13/08) :

1. FLUX INVERSE desactive par defaut (cfg.reversalEnabled).
   Diagnostic (13/08) : sur 10 occurrences, reversalCount valait
   systematiquement 2 (le minimum) -- la confirmation sur 2 cycles ne
   filtre jamais rien en pratique (la metrique 5min est autocorrelee,
   un cycle au-dessus du seuil est quasi toujours suivi d'un autre 30s
   plus tard). Resultat : 0% de trades gagnants sur les 10 cas, -58.91%
   cumule, perte moyenne -5.89% par occurrence -- le seuil, une fois
   amplifie par le levier 25x, transforme un mouvement de prix de
   0.10-0.40% en perte de compte de 2.5% a 12%. Desactive en attendant
   le recalibrage prevu apres la migration au levier 10x (OKX).

2. PIVOT MCB : filtre de magnitude minimum ajoute (wavePivotFilter.minPivotValue).
   Diagnostic (13/08) : sur 39 occurrences decoupees par tercile de
   magnitude, les pivots faibles (1.1-27.9) et moyens (28.3-49.3) sont
   nettement perdants (win% 23.1 et 15.4, pnl moyen -1.42% et -2.14%),
   alors que les pivots forts (49.5-78.3) sont a l'equilibre (win% 30.8,
   pnl moyen +0.03%). Aucun filtre de magnitude n'existait avant ce patch
   -- n'importe quelle valeur de pivot declenchait la meme sortie
   immediate. Seuil place a 35 par defaut (ajustable via config.json,
   sous config.tradeSimulator.wavePivotFilter.minPivotValue).

Les deux changements sont pilotes par config.json, pas hardcodes en dur --
reversibles sans redeploiement de code si besoin de reevaluer plus tard.

A executer sur le VPS, dans /root/agents-ia-zero-one/zero-one :
    python3 patch-invalidation-recalib.py
"""

from pathlib import Path

TARGET = Path("modules/trade-simulator.js")

# ── Patch 1 : flux inverse derriere un flag, desactive par defaut ──────────

OLD_BLOCK_1 = """  // 1. FLUX INVERSE : le deplacement va contre la position au-dela du seuil,
  // CONFIRME sur plusieurs cycles consecutifs (02/08/2026 : sans confirmation,
  // 6 invalidations sur 7 etaient prematurees -- le zigzag du marche suffisait
  // a franchir le seuil un cycle isole).
  const adverse = trade.direction === 'long' ? -disp : disp;
  if (adverse >= reversalPct) {
    trade.reversalCount = (trade.reversalCount || 0) + 1;
    if (trade.reversalCount >= reversalConfirmCycles
        && (exitInProfit || favorPct === null || favorPct <= 0)) {
      trade.stallCount = 0;
      return `invalidation -- flux inverse (deplacement 5min ${disp}% contre la position sur ${trade.reversalCount} cycles, seuil ${reversalPct}%)`;
    }
  } else {
    trade.reversalCount = 0;
  }"""

NEW_BLOCK_1 = """  // 1. FLUX INVERSE : le deplacement va contre la position au-dela du seuil,
  // CONFIRME sur plusieurs cycles consecutifs (02/08/2026 : sans confirmation,
  // 6 invalidations sur 7 etaient prematurees -- le zigzag du marche suffisait
  // a franchir le seuil un cycle isole).
  //
  // DESACTIVE PAR DEFAUT (13/08/2026) -- diagnostic sur 10 occurrences :
  // reversalCount valait systematiquement 2 (le minimum), la confirmation
  // ne filtrait donc jamais rien en pratique. 0% de trades gagnants,
  // -58.91% cumule. A 25x, un simple 0.10-0.40% de mouvement de prix
  // devient 2.5% a 12% de perte de compte. Recalibrage prevu apres la
  // migration au levier 10x (OKX) -- reactivable via config.json
  // (config.tradeSimulator.invalidation.reversalEnabled = true).
  const reversalEnabled = cfg.reversalEnabled === true;
  const adverse = trade.direction === 'long' ? -disp : disp;
  if (reversalEnabled && adverse >= reversalPct) {
    trade.reversalCount = (trade.reversalCount || 0) + 1;
    if (trade.reversalCount >= reversalConfirmCycles
        && (exitInProfit || favorPct === null || favorPct <= 0)) {
      trade.stallCount = 0;
      return `invalidation -- flux inverse (deplacement 5min ${disp}% contre la position sur ${trade.reversalCount} cycles, seuil ${reversalPct}%)`;
    }
  } else {
    trade.reversalCount = 0;
  }"""

# ── Patch 2 : seuil de magnitude minimum sur le pivot MCB ──────────────────

OLD_BLOCK_2 = """    if (_pivAge <= maxAge && !_slopeOpposes) {
      const opposedByPeak = trade.direction === 'long' && batonState.wavePivotType === 'pic';
      const opposedByTrough = trade.direction === 'short' && batonState.wavePivotType === 'creux';
      if (opposedByPeak || opposedByTrough) {
        if (exitInProfit || favorPct === null || favorPct <= 0) {
          return `invalidation -- pivot de vague MCB oppose (${batonState.wavePivotType}, valeur ${batonState.wavePivotValue})`;
        }
      }
    }"""

NEW_BLOCK_2 = """    // FILTRE DE MAGNITUDE (13/08/2026) -- diagnostic sur 39 occurrences,
    // decoupage par tercile : pivots faibles (1.1-27.9) et moyens
    // (28.3-49.3) nettement perdants (win% 23.1 et 15.4), pivots forts
    // (49.5-78.3) a l'equilibre (win% 30.8). Aucun filtre n'existait avant
    // ce patch. Seuil a 35 par defaut, ajustable via config.json
    // (config.tradeSimulator.wavePivotFilter.minPivotValue).
    const minPivotValue = pivotCfg.minPivotValue !== undefined ? pivotCfg.minPivotValue : 35;
    const pivotMagnitudeOk = Math.abs(batonState.wavePivotValue) >= minPivotValue;
    if (_pivAge <= maxAge && !_slopeOpposes && pivotMagnitudeOk) {
      const opposedByPeak = trade.direction === 'long' && batonState.wavePivotType === 'pic';
      const opposedByTrough = trade.direction === 'short' && batonState.wavePivotType === 'creux';
      if (opposedByPeak || opposedByTrough) {
        if (exitInProfit || favorPct === null || favorPct <= 0) {
          return `invalidation -- pivot de vague MCB oppose (${batonState.wavePivotType}, valeur ${batonState.wavePivotValue})`;
        }
      }
    }"""


def apply_patch(src, old, new, label):
    n = src.count(old)
    assert n == 1, (
        f"[{label}] bloc introuvable ou trouve {n} fois. Rien ecrit pour ce bloc. "
        f"Le texte du fichier ne correspond pas exactement a ce qui a ete lu depuis "
        f"le terminal (espaces/retours a la ligne). Verifie avec grep -n -A 20 "
        f"autour de la zone concernee et renvoie le bloc exact."
    )
    return src.replace(old, new)


def main():
    if not TARGET.exists():
        raise SystemExit(f"ERREUR: {TARGET} introuvable. Lance ce script depuis /root/agents-ia-zero-one/zero-one.")

    src = TARGET.read_text(encoding="utf-8")

    src = apply_patch(src, OLD_BLOCK_1, NEW_BLOCK_1, "flux inverse")
    src = apply_patch(src, OLD_BLOCK_2, NEW_BLOCK_2, "pivot MCB magnitude")

    TARGET.write_text(src, encoding="utf-8")
    print(f"OK: {TARGET} patche avec succes (2 blocs).")
    print("Verifie ensuite avec: node --check modules/trade-simulator.js")
    print("Puis: pm2 restart <nom-du-process-trade-simulator>")

if __name__ == "__main__":
    main()
