# BOONO-TV — Prix OKX LIVE, conversion mini et repères E3/E15/trades

**Date :** 4 novembre 2026
**Statut :** DÉPLOYÉ DANS LA PRÉVISUALISATION OVH · TESTÉ 43 s · VALIDATION ESTHÉTIQUE EN NAVIGATEUR UTILISATEUR ENCORE OUVERTE.
**Décision :** [OD-20261104-002](operational-decisions/OD-20261104-002/03-origine-et-justification.md).
**Périmètre :** BOONO-TV uniquement, lecture seule Amsterdam → OVH. **Aucun changement V494/V543 PAPER, d'ordre, de risque ou de ledger.**

## Constats reproduits

1. Le bridge Amsterdam servait prix et État vivant depuis la dernière analyse V543 PAPER ; il supprimait le tout au-delà de 25 s. Pendant l'intervalle entre évaluations, cette politique produisait parfois SOURCE_UNAVAILABLE et un prix blanc, même quand OKX et les moteurs étaient opérationnels.
2. Les graphes et l'écran intérieur gauche utilisaient des séries MCB existantes mais n'affichaient ni Conversion mini Watch, ni les marqueurs natifs E3/E15.
3. Le studio lisait un ancien fichier assets/trade-markers.json (dernière opération datée du 26 octobre) au lieu des PAPER V494 et V543 actuels.
4. Le rideau étendait verticalement les ondes MCB ; le JSON de perspective est un calibrage utilisateur et doit rester intact.

## Changements effectués

| Emplacement | Portée |
|---|---|
| Amsterdam zero-one/boono-tv/bridge.js | WebSocket public OKX BTC-USDT-SWAP **en lecture seule**. Prix horodaté diffusé **chaque seconde** sous marketTick, fraîcheur de l'observation limitée à 15 s. V543 PAPER daté indépendamment : état conservé 90 s maximum, étiquette observation retardée après 45 s. Les vraies pertes de source restent visibles. |
| Bridge Amsterdam | Agrégation des transactions agressives OKX en fenêtre glissante 3 min, sans modifier le runner. PM3/PM5/PM Live issus de V543. Qualité CONTESTED si PM3 et PM5 opposés ; sinon UNCLASSIFIED tant que la classification P75/P95 de Watch n'est pas recalibrée. |
| OVH scene/tv-mini-conversion.js | Réutilisation exacte du renderer SVG de Watch modules/elastic-mini-conversion-v542.js ; bougies MCB réelles, volumes agressifs OKX, qualité en pied d'écran. |
| OVH scene/index.html et scene/boono-v2.css | Écran interne gauche : graphe au-dessus, qualité dessous. Écran droit MarketCipher/TradingView réel inchangé et perspective conservée. |
| OVH scene/chart-views.js | Marqueurs natifs E15/E3 rouges/verts sur vues Vagues et rideau. Périodes de trades **bleu ciel 5 px en haut et 5 px en bas** plus bornes entrée/sortie sur les **trois** graphes analytiques uniquement. |
| Bridge Amsterdam → OVH | Bandes de trades provenant des ledgers PAPER réels V494 et V543, 48 dernières heures, y compris positions ouvertes, plutôt que de l'ancien fichier local figé. |
| OVH scene/app.js | Rideau MCB avec compression visuelle de l'amplitude par facteur **1,55** ; E3/E15 mais **aucune fourchette sur ce rideau**, ni sur le plan flottant du prix. Les fourchettes restent sur le trio analytique de gauche. |

## Vérifications exécutées

- PM2 Amsterdam : boono-tv online après redémarrage du **seul bridge** ; boono-v494-paper et boono-v543-paper online sans redémarrage.
- Studio OVH HTTP 200 ; bridge Amsterdam HTTP 200 ; JS statiques HTTP 200 ; syntaxe Node valide ; zéro erreur JavaScript Chromium.
- Snapshot : market.source=OKX_PUBLIC_TICKER_READ_ONLY, market.fresh=true, analyse distincte V543, 31 périodes PAPER récentes au moment du test, les deux moteurs inclus.
- WebSocket brut Amsterdam : **10 messages en 9 s**, avec **6 changements de prix**.
- Test navigateur OVH : **43 relevés toutes les secondes**, **0 prix vide**, **0 état SOURCE_UNAVAILABLE**, **13 prix distincts**, zéro erreur JS. Validation ponctuelle, non une surveillance 24 h.
- Capture Chromium : E15↑/↓ et E3↑/↓ rouges et verts ; bandes de **5 px** sur les graphes analytiques, absentes des plans flottants ; écran intérieur avec graphe conversion et qualité UNCLASSIFIED/CONTESTED selon les observations.
- Calibration OVH inchangée, SHA-256 : e11d7ba720166bbfeabdf8cb0c03a1926044e3679601f074baaa0ad9dddecedc.

## Sauvegardes, preuves, limites

**OVH** : /home/ubuntu/boono-tv-studio/backups/2026-11-04-conversion-waves/ ; tests /home/ubuntu/boono-tv-studio/tests/verify-conversion-live-waves-20261104.js et verify-live-continuity-43s-20261104.js ; rapports JSON verify-20261104-final.json et verify-live-continuity-43s-result.json ; captures boono-20261104-state-conversion.jpg et boono-20261104-charts-events.jpg. **Amsterdam** : fichier de sauvegarde boono-tv/bridge.js.pre-20261104-tv-live. Pas de copie des ledgers PAPER ni des secrets dans Git.

**À contrôler ensuite :** appréciation visuelle du propriétaire, lisibilité de l'écran miniature, densité des E3 et compression d'amplitude 1,55 ; fiabilité sur plusieurs jours et reconnexion OKX en cas d'incident. Les E3/E15 sont des événements natifs du MCB, **pas des opérations du bot ni des pivots causaux reconstruits**. La qualité UNCLASSIFIED est une lecture descriptive, pas une panne.

**Git :** le dépôt avait de nombreuses modifications antérieures, dont le bridge déjà modifié par rapport à HEAD ; ne pas inclure ces changements préexistants dans un commit large. La scène OVH est hors du dépôt Amsterdam. Une synchronisation Git ciblée exige un audit distinct.

**Traçabilité :** le dossier OD-20261104-002 a été créé rétrospectivement après la première intervention, contrairement à la convention normalement exigée avant exécution. Le prompt 02 y est déclaré comme formulation d'assistant après coup.
