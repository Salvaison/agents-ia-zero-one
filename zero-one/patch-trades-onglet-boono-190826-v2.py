#!/usr/bin/env python3
"""
Patch : onglet BOONO dans la page TRADES.

Depuis le 19/08, deux logiques tournent en parallele sur les memes donnees :

  trade-simulator.js   l'ancienne. 142 entrees, 68.7% de reussite,
                       205% de PNL cumule. Jugee mal concue -- shorts pris
                       en pleine hausse, declencheurs sans valeur
                       directionnelle -- mais elle gagne.

  moteur-boono.js      Lieu / Passage / Evenement. Direction issue des
                       ecarts VWAP, MoneyFlow en controle, MCB >= 45 en
                       seuil d'engagement puis en motif de maintien.

Benjamin : "nous avons assez de donnees a croiser, garde-les separes, dans
chacun son onglet". Les deux bilans restent donc distincts -- on bascule
d'un onglet a l'autre plutot que de melanger deux lectures.

CE QUE L'ONGLET AFFICHE :
  - la position en cours, avec sa chaine de decision (quelles voix VWAP ont
    donne la direction, ce qu'a dit le MoneyFlow, quel motif d'engagement)
  - le bilan : entrees distinctes, taux de reussite, PNL cumule
  - la ventilation par motif de sortie
  - le detail des sorties, PNL en USD comme en pourcentage

Benjamin a demande les montants en dollars : "c'est beaucoup plus explicite".

A executer sur le VPS, dans /root/agents-ia-zero-one/zero-one :
    python3 patch-trades-onglet-boono-190826.py
"""

from pathlib import Path

TARGET = Path("modules/config-server.js")

# ── 1. Point d'acces aux donnees du moteur ────────────────────────────────

OLD_API = """  res.json({ ongoing, executed });
});"""
NEW_API = """  res.json({ ongoing, executed });
});
/* Moteur Boono (19/08/2026) -- seconde logique, fichiers separes.
 * Meme protection que les autres routes : requireAuth. */
app.get('/api/boono', requireAuth, (req, res) => {
  let position = null;
  let history = [];
  let abstention = null;
  try {
    if (fs.existsSync(BOONO_STATE_PATH)) {
      const s = JSON.parse(fs.readFileSync(BOONO_STATE_PATH, 'utf8'));
      position = s.position || null;
      abstention = s.derniereAbstention || null;
    }
  } catch (e) { /* garde les valeurs par defaut */ }
  try {
    if (fs.existsSync(BOONO_HISTORY_PATH)) {
      const h = JSON.parse(fs.readFileSync(BOONO_HISTORY_PATH, 'utf8'));
      history = Array.isArray(h) ? h : [];
    }
  } catch (e) { /* le moteur n'a peut-etre encore rien produit */ }
  res.json({ position, history, abstention });
});"""

# ── 2. Onglet et panneau ──────────────────────────────────────────────────

OLD_TABS = """            <span class="tab" data-tab2="pnl">PNL</span>
          </div>"""
NEW_TABS = """            <span class="tab" data-tab2="pnl">PNL</span>
            <span class="tab" data-tab2="boono">BOONO</span>
          </div>"""

OLD_PANEL = """          <div class="tab-panel" id="tab2-pnl">
            <div class="placeholder-note">P/L -- aucune donnee disponible.<br>S'alimentera automatiquement une fois des trades executes.</div>
          </div>"""
NEW_PANEL = """          <div class="tab-panel" id="tab2-pnl">
            <div class="placeholder-note">P/L -- aucune donnee disponible.<br>S'alimentera automatiquement une fois des trades executes.</div>
          </div>
          <div class="tab-panel" id="tab2-boono">
            <div class="placeholder-note">Moteur Boono -- chargement.</div>
          </div>"""

OLD_SW = """    document.querySelectorAll('#tab2-ongoing, #tab2-executed, #tab2-pnl').forEach(p => p.classList.remove('active'));"""
NEW_SW = """    document.querySelectorAll('#tab2-ongoing, #tab2-executed, #tab2-pnl, #tab2-boono').forEach(p => p.classList.remove('active'));"""

# ── 3. Rendu ──────────────────────────────────────────────────────────────

OLD_LOAD = """async function loadTrades() {
  const ongoingEl = document.getElementById('tab2-ongoing');"""

NEW_LOAD = """async function loadBoono() {
  const el = document.getElementById('tab2-boono');
  if (!el) return;
  try {
    const res = await fetch('/api/boono');
    if (!res.ok) throw new Error('reponse HTTP ' + res.status);
    const d = await res.json();
    let html = '';

    /* Position en cours, avec la chaine de decision qui l'a produite. */
    if (d.position) {
      const p = d.position;
      const col = p.direction === 'long' ? 'var(--support)' : 'var(--resistance)';
      const usd = (p.pnlCourant !== undefined && p.entryPrice)
        ? (p.pnlCourant / 100 * p.entryPrice) : null;
      html += '<div style="border:1px solid #5a6b85; border-radius:4px; padding:10px; margin-bottom:14px;">' +
        '<div style="font-weight:600; color:' + col + '; margin-bottom:6px;">' +
        p.direction.toUpperCase() + ' @ ' + p.entryPrice +
        '  <span style="opacity:0.7; font-weight:400;">depuis ' + (p.dureeMin || 0) + ' min</span></div>' +
        '<div>PNL ' + (p.pnlCourant !== undefined ? p.pnlCourant.toFixed(2) + '%' : 'n/a') +
        (usd !== null ? '  (' + (usd >= 0 ? '+' : '') + Math.round(usd) + ' USD)' : '') +
        '  --  restant ' + p.restant + '%</div>' +
        (p.direction_source ? '<div style="opacity:0.75; font-size:11px; margin-top:4px;">direction : ' + p.direction_source +
          (p.voix ? ' (' + p.voix.map(v => v.source).join(', ') + ')' : '') + '</div>' : '') +
        (p.moneyFlowControle ? '<div style="opacity:0.75; font-size:11px;">MoneyFlow : ' + p.moneyFlowControle + '</div>' : '') +
        (p.engagement ? '<div style="opacity:0.75; font-size:11px;">engagement : ' + p.engagement + '</div>' : '') +
        (p.lieu ? '<div style="opacity:0.75; font-size:11px;">lieu : ' + p.lieu.contacts + ' contacts, ' +
          p.lieu.lignes + ' ligne(s)</div>' : '') +
        '</div>';
    } else {
      html += '<div class="placeholder-note" style="margin-bottom:14px;">Aucune position en cours.' +
        (d.abstention ? '<br>Derniere abstention : <b>' + d.abstention + '</b>' : '') + '</div>';
    }

    const h = d.history || [];
    if (!h.length) {
      html += '<div class="placeholder-note">Aucune sortie enregistree.</div>';
      el.innerHTML = html;
      return;
    }

    /* Bilan. Une position produit une ligne par tranche : on regroupe pour
     * compter les ENTREES distinctes, comme dans l'onglet PNL. */
    const entrees = {};
    h.forEach(function (t) {
      if (!entrees[t.entryTimestamp]) entrees[t.entryTimestamp] = { pnl: 0, prix: t.entryPrice };
      entrees[t.entryTimestamp].pnl += (t.fraction / 100) * t.pnlPercent;
    });
    const listeEntrees = Object.values(entrees);
    const total = listeEntrees.reduce(function (a, e) { return a + e.pnl; }, 0);
    const gagnantes = listeEntrees.filter(function (e) { return e.pnl > 0; }).length;
    const usdTotal = listeEntrees.reduce(function (a, e) { return a + e.pnl / 100 * e.prix; }, 0);

    html += '<div class="stats" style="margin-bottom:12px;">' +
      '<div>' + listeEntrees.length + ' entree(s), ' + h.length + ' ligne(s) de sortie</div>' +
      '<div>Taux de reussite : ' + (100 * gagnantes / listeEntrees.length).toFixed(1) + '%</div>' +
      '<div>PNL cumule : ' + (total >= 0 ? '+' : '') + total.toFixed(2) + '%  (' +
        (usdTotal >= 0 ? '+' : '') + Math.round(usdTotal) + ' USD)</div>' +
      '</div>';

    /* Ventilation par motif de sortie -- c'est elle qui dit quel mecanisme
     * porte le resultat et lequel le plombe. */
    const parRaison = {};
    h.forEach(function (t) {
      const k = String(t.exitReason || 'inconnu');
      if (!parRaison[k]) parRaison[k] = { n: 0, pnl: 0, usd: 0 };
      parRaison[k].n++;
      parRaison[k].pnl += (t.fraction / 100) * t.pnlPercent;
      parRaison[k].usd += (t.fraction / 100) * t.pnlPercent / 100 * t.entryPrice;
    });
    html += '<table style="width:100%; margin-bottom:14px;"><thead><tr>' +
      '<th style="text-align:left;">Motif de sortie</th><th>n</th><th>PNL</th><th>USD</th>' +
      '</tr></thead><tbody>';
    Object.keys(parRaison).sort(function (a, b) { return parRaison[a].pnl - parRaison[b].pnl; })
      .forEach(function (k) {
        const v = parRaison[k];
        const c = v.pnl >= 0 ? 'up' : 'down';
        html += '<tr><td style="text-align:left;">' + k + '</td><td>' + v.n + '</td>' +
          '<td class="' + c + '">' + (v.pnl >= 0 ? '+' : '') + v.pnl.toFixed(2) + '%</td>' +
          '<td class="' + c + '">' + (v.usd >= 0 ? '+' : '') + Math.round(v.usd) + '</td></tr>';
      });
    html += '</tbody></table>';

    /* Detail, du plus recent au plus ancien. */
    html += '<table style="width:100%;"><thead><tr>' +
      '<th>Entree</th><th>Sortie</th><th>Sens</th><th>Prix in</th><th>Prix out</th>' +
      '<th>Part</th><th>PNL</th><th>USD</th><th style="text-align:left;">Motif</th>' +
      '</tr></thead><tbody>';
    h.slice().reverse().forEach(function (t) {
      const c = t.pnlPercent >= 0 ? 'up' : 'down';
      const usd = (t.fraction / 100) * t.pnlPercent / 100 * t.entryPrice;
      const hm = function (s) { return new Date(s).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' }); };
      html += '<tr><td>' + hm(t.entryTimestamp) + '</td><td>' + hm(t.exitTimestamp) + '</td>' +
        '<td class="' + (t.direction === 'long' ? 'up' : 'down') + '">' + t.direction + '</td>' +
        '<td>' + Math.round(t.entryPrice) + '</td><td>' + Math.round(t.exitPrice) + '</td>' +
        '<td>' + t.fraction + '%</td>' +
        '<td class="' + c + '">' + (t.pnlPercent >= 0 ? '+' : '') + t.pnlPercent.toFixed(2) + '%</td>' +
        '<td class="' + c + '">' + (usd >= 0 ? '+' : '') + Math.round(usd) + '</td>' +
        '<td style="text-align:left; font-size:11px; opacity:0.8;">' + String(t.exitReason || '') + '</td></tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = '<div class="placeholder-note">Moteur Boono indisponible : ' + e.message + '</div>';
  }
}

async function loadTrades() {
  loadBoono();
  const ongoingEl = document.getElementById('tab2-ongoing');"""


def main():
    if not TARGET.exists():
        raise SystemExit(f"ERREUR: {TARGET} introuvable.")
    src = TARGET.read_text(encoding="utf-8")
    for label, old, new in (
        ("point d'acces", OLD_API, NEW_API),
        ("onglet", OLD_TABS, NEW_TABS),
        ("panneau", OLD_PANEL, NEW_PANEL),
        ("bascule", OLD_SW, NEW_SW),
        ("rendu", OLD_LOAD, NEW_LOAD),
    ):
        n = src.count(old)
        assert n == 1, f"[{label}] bloc introuvable ou trouve {n} fois. Rien ecrit."
        src = src.replace(old, new)
    TARGET.write_text(src, encoding="utf-8")
    print("OK: config-server.js -- onglet BOONO dans TRADES.")
    print("  position en cours avec sa chaine de decision")
    print("  bilan, ventilation par motif, detail des sorties")
    print("  montants en USD en plus des pourcentages")
    print("\nVerifie avec: node --check modules/config-server.js")
    print("Puis: pm2 restart config-server")


if __name__ == "__main__":
    main()
