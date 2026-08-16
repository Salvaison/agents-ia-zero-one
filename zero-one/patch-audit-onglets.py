#!/usr/bin/env python3
"""
Patch : deux tableaux sous onglets dans /audit-view.

Demande de Benjamin (15/08/2026) : le tableau unique atteint la limite de
largeur. Plutot que d'entasser, separer en plusieurs vues selon ce que les
donnees expriment.

DECOUPE RETENUE -- "intention" contre "effet" :

  Onglet INTENTION : ce que font les participants, la pression exercee.
    DBSI (pression par bougie), MoneyFlow (flux de capitaux), BW et LBW
    intra-bougie (etat de la vague en formation), Sens3, Dir.

  Onglet EFFET : ce que cette pression produit, mesurable.
    Cadence et nMx (frequence des transactions), NetMove et NMx
    (deplacement obtenu), Amplitude, WinSec.

Colonnes COMMUNES aux deux (les reperes de lecture) :
    UTC+2, PRIX, Rg, Pivot, Signal, VWAP3, VW3L, Vslope3, Pente3, x0,
    VWAP15, VW15L, Vslope15, Pente15, x0, Evenement

  VW3L / VW15L = valeurs LIVE du VWAP (intra-bougie), placees juste apres
  la valeur confirmee correspondante. Permet de lire d'un coup d'oeil
  l'ecart entre ce qui est fige et ce qui se forme. Mesure du 15/08 : le BW
  d'une bougie 3m a ete revise 20 fois en 3 minutes, chaque releve porte
  donc bien une information distincte.

RESERVE ASSUMEE SUR LA CLASSIFICATION : la coupe n'est pas parfaite.
NetMove est un deplacement de prix, donc un effet, mais il se lit avec la
cadence. La cadence elle-meme est ambigue -- beaucoup de transactions peut
signifier un engagement fort ou du bruit de faible conviction (Benjamin a
lui-meme observe des series de cadence elevee sans mouvement de netMove,
interpretees comme un engagement naissant en petites mises). Amplitude et
WinSec decrivent la forme du baton plus qu'ils n'expriment l'un ou l'autre.
La coupe vaut comme aide a la lecture, pas comme verite conceptuelle.

L'onglet actif est conserve entre deux rafraichissements (variable
_activeTab), pour ne pas revenir a INTENTION toutes les 30 secondes.

A executer sur le VPS, dans /root/agents-ia-zero-one/zero-one :
    python3 patch-audit-onglets.py
"""

from pathlib import Path

TARGET = Path("modules/config-server.js")

# ── 1. Barre d'onglets dans le HTML ───────────────────────────────────────

OLD_HTML = """  <div class="stats" id="stats"></div>
  <div id="wrap"><div class="empty">Chargement des donnees</div></div>"""

NEW_HTML = """  <div class="stats" id="stats"></div>
  <div id="tabs" style="margin:8px 0 10px 0;">
    <button id="tab-intention" onclick="switchTab('intention')"
      style="padding:5px 14px; margin-right:6px; border:1px solid #5a6b85; background:#2c3e50; color:#e8eef5; cursor:pointer; border-radius:3px; font-size:12px;">INTENTION</button>
    <button id="tab-effet" onclick="switchTab('effet')"
      style="padding:5px 14px; border:1px solid #5a6b85; background:#1a2332; color:#8fa3bf; cursor:pointer; border-radius:3px; font-size:12px;">EFFET</button>
    <span style="margin-left:12px; font-size:11px; opacity:0.6;">INTENTION : pression exercee (DBSI, MoneyFlow, vague) &nbsp;|&nbsp; EFFET : ce qu'elle produit (cadence, netMove, amplitude)</span>
  </div>
  <div id="wrap"><div class="empty">Chargement des donnees</div></div>"""

# ── 2. Variable d'onglet + fonction de bascule ────────────────────────────

OLD_FN = """function timeParis(ts) {
  return new Date(ts).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}"""

NEW_FN = """function timeParis(ts) {
  return new Date(ts).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
/* Onglet actif -- conserve entre deux rafraichissements automatiques, sinon
 * la vue reviendrait a INTENTION toutes les 30 secondes. */
var _activeTab = 'intention';
function switchTab(t) {
  _activeTab = t;
  var on = 'padding:5px 14px; border:1px solid #5a6b85; background:#2c3e50; color:#e8eef5; cursor:pointer; border-radius:3px; font-size:12px;';
  var off = 'padding:5px 14px; border:1px solid #5a6b85; background:#1a2332; color:#8fa3bf; cursor:pointer; border-radius:3px; font-size:12px;';
  document.getElementById('tab-intention').style.cssText = (t === 'intention' ? on : off) + 'margin-right:6px;';
  document.getElementById('tab-effet').style.cssText = (t === 'effet' ? on : off);
  loadAudit();
}"""

# ── 3. Corps de ligne : colonnes conditionnelles ──────────────────────────

OLD_ROW = """        '<td>' + fmt(r.cadence,2) + '</td>' +
        '<td>' + fmt(r.cadenceMult,2) + 'x</td>' +
        '<td class="' + cls(r.netMove) + '" style="border-left:3px solid #5a6b85;">' + fmt(r.netMove,4) + '</td>' +
        '<td>' + fmt(r.netMoveMult,2) + '</td>' +
        '<td>' + (r.priceSens3 > 0 ? '<span class="up">&#9650;</span>' : (r.priceSens3 < 0 ? '<span class="down">&#9660;</span>' : '0')) + '</td>' +
        '<td style="border-left:2px solid #5a6b85;">' + fmt(r.amplitude,4) + '</td>' +
        '<td>' + fmt(r.winSec,1) + '</td>' +
        '<td style="text-align:center; white-space:nowrap;">' + dbsiCell(r) + '</td>' +
        '<td>' + arrow(r.direction) + '</td>' +"""

NEW_ROW = """        (_activeTab === 'intention'
          ? '<td style="text-align:center; white-space:nowrap; border-left:3px solid #5a6b85;">' + dbsiCell(r) + '</td>' +
            '<td class="' + cls(r.liveMoneyFlow) + '">' + fmt(r.liveMoneyFlow,2) + '</td>' +
            '<td class="' + cls(r.liveBw) + '">' + fmt(r.liveBw,2) + '</td>' +
            '<td class="' + cls(r.liveLbw) + '">' + fmt(r.liveLbw,2) + '</td>' +
            '<td>' + (r.priceSens3 > 0 ? '<span class="up">&#9650;</span>' : (r.priceSens3 < 0 ? '<span class="down">&#9660;</span>' : '0')) + '</td>' +
            '<td>' + arrow(r.direction) + '</td>'
          : '<td style="border-left:3px solid #5a6b85;">' + fmt(r.cadence,2) + '</td>' +
            '<td>' + fmt(r.cadenceMult,2) + 'x</td>' +
            '<td class="' + cls(r.netMove) + '">' + fmt(r.netMove,4) + '</td>' +
            '<td>' + fmt(r.netMoveMult,2) + '</td>' +
            '<td>' + fmt(r.amplitude,4) + '</td>' +
            '<td>' + fmt(r.winSec,1) + '</td>'
        ) +"""

# ── 4. Colonnes VWAP live, communes aux deux onglets ──────────────────────

OLD_VWAP = """        '<td class="' + cls(r.vwap3) + '" style="border-left:2px solid #5a6b85;">' + fmt(r.vwap3,2) + '</td>' +
        '<td class="' + cls(r.vwap3Slope) + '">' + fmt(r.vwap3Slope,2) + '</td>' +
        '<td style="text-align:center;">' + slopeArrow(r.vwap3SlopeDir) + '</td>' +
        '<td>' + (r.vwap3Cross ? '&#10003;' : '') + '</td>' +
        '<td class="' + cls(r.vwap15) + '" style="border-left:2px solid #5a6b85;">' + fmt(r.vwap15,2) + '</td>' +
        '<td class="' + cls(r.vwapSlope) + '">' + fmt(r.vwapSlope,2) + '</td>' +
        '<td style="text-align:center;">' + slopeArrow(r.vwapSlopeDir) + '</td>' +
        '<td style="border-right:2px solid #5a6b85;">' + (r.vwap15Cross ? '&#10003;' : '') + '</td>' +"""

NEW_VWAP = """        '<td class="' + cls(r.vwap3) + '" style="border-left:2px solid #5a6b85;">' + fmt(r.vwap3,2) + '</td>' +
        '<td class="' + cls(r.vwapLive) + '" style="opacity:0.75; font-size:10px;">' + fmt(r.vwapLive,2) + '</td>' +
        '<td class="' + cls(r.vwap3Slope) + '">' + fmt(r.vwap3Slope,2) + '</td>' +
        '<td style="text-align:center;">' + slopeArrow(r.vwap3SlopeDir) + '</td>' +
        '<td>' + (r.vwap3Cross ? '&#10003;' : '') + '</td>' +
        '<td class="' + cls(r.vwap15) + '" style="border-left:2px solid #5a6b85;">' + fmt(r.vwap15,2) + '</td>' +
        '<td class="' + cls(r.live15Vwap) + '" style="opacity:0.75; font-size:10px;">' + fmt(r.live15Vwap,2) + '</td>' +
        '<td class="' + cls(r.vwapSlope) + '">' + fmt(r.vwapSlope,2) + '</td>' +
        '<td style="text-align:center;">' + slopeArrow(r.vwapSlopeDir) + '</td>' +
        '<td style="border-right:2px solid #5a6b85;">' + (r.vwap15Cross ? '&#10003;' : '') + '</td>' +"""

# ── 5. En-tete conditionnel ───────────────────────────────────────────────

OLD_HEADER = """      '<th style="border-left:2px solid #5a6b85;">VWAP3</th><th>Vslope3</th><th>Pente3</th><th>x0</th>' +
      '<th style="border-left:2px solid #5a6b85;">VWAP15</th><th>Vslope15</th><th>Pente15</th><th>x0</th>' +
      '<th>Cadence</th><th>nMx</th><th style="border-left:3px solid #5a6b85;">NetMove</th><th>NMx</th><th>Sens3</th>' +
      '<th style="border-left:2px solid #5a6b85;">Amplitude</th><th>WinSec</th>' +
      '<th title="DBSI intra-bougie : top (rouge) / bottom (vert)">DBSI</th><th>Dir.</th>' +
      '<th style="border-left:2px solid #5a6b85;">Evenement</th>' +"""

NEW_HEADER = """      '<th style="border-left:2px solid #5a6b85;">VWAP3</th><th title="VWAP 3m intra-bougie (en cours)">VW3L</th><th>Vslope3</th><th>Pente3</th><th>x0</th>' +
      '<th style="border-left:2px solid #5a6b85;">VWAP15</th><th title="VWAP 15m intra-bougie (en cours)">VW15L</th><th>Vslope15</th><th>Pente15</th><th>x0</th>' +
      (_activeTab === 'intention'
        ? '<th style="border-left:3px solid #5a6b85;" title="DBSI intra-bougie : top (rouge) / bottom (vert)">DBSI</th>' +
          '<th title="MoneyFlow intra-bougie">MFlow</th><th title="Blue Wave intra-bougie">BW</th>' +
          '<th title="Lt Blue Wave intra-bougie">LBW</th><th>Sens3</th><th>Dir.</th>'
        : '<th style="border-left:3px solid #5a6b85;">Cadence</th><th>nMx</th><th>NetMove</th><th>NMx</th>' +
          '<th>Amplitude</th><th>WinSec</th>'
      ) +
      '<th style="border-left:2px solid #5a6b85;">Evenement</th>' +"""


def main():
    if not TARGET.exists():
        raise SystemExit(f"ERREUR: {TARGET} introuvable. Lance ce script depuis /root/agents-ia-zero-one/zero-one.")

    src = TARGET.read_text(encoding="utf-8")

    for label, old, new in (
        ("barre d'onglets HTML", OLD_HTML, NEW_HTML),
        ("fonction switchTab", OLD_FN, NEW_FN),
        ("colonnes VWAP live", OLD_VWAP, NEW_VWAP),
        ("corps de ligne conditionnel", OLD_ROW, NEW_ROW),
        ("en-tete conditionnel", OLD_HEADER, NEW_HEADER),
    ):
        n = src.count(old)
        assert n == 1, f"[{label}] bloc introuvable ou trouve {n} fois. Rien ecrit."
        src = src.replace(old, new)

    TARGET.write_text(src, encoding="utf-8")
    print("OK: modules/config-server.js patche avec succes (5 blocs).")
    print("  Deux onglets : INTENTION (DBSI, MoneyFlow, BW, LBW, Sens3, Dir)")
    print("                 EFFET (Cadence, nMx, NetMove, NMx, Amplitude, WinSec)")
    print("  Colonnes VW3L et VW15L ajoutees (VWAP intra-bougie) aux deux vues.")
    print("\nVerifie avec: node --check modules/config-server.js")
    print("Puis: pm2 restart config-server")


if __name__ == "__main__":
    main()
