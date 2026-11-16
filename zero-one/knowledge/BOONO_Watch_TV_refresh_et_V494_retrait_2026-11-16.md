# BOONO — Correctif Watch 30s, nouveaux observatoires et retrait V494 de BOONO-TV

**16 novembre 2026 — limites d’intervention : Watch/config-server Amsterdam et calque des résultats de trading BOONO-TV OVH uniquement. Aucun changement PAPER, broker, risque, BOONO TV scène graphique/personnages/audio.**

## 1. Incident Watch : retour en haut et fermeture à chaque refresh

**Cause technique identifiée :** `loadTrades()` appelé toutes les **30s** exécutait `stateEl.innerHTML = ...` à chaque cycle. Cela détruisait/remontait les conteneurs `<details>` des observatoires, y compris `v5-structure-live` et ses sous-détails « Lieu ». L'application conservait certains `open`, mais pas leurs descendants ou l'ancre de défilement. `renderShadows()` recréait de même le panneau des occurrences et réinitialisait son défilement.

**Correction déployée dans `modules/config-server.js` :**
- `#tab2-statev2` est monté **une seule fois**, à moins que ses éléments essentiels soient absents ; les loaders actualisent ensuite `#v52-live`, `#v5-structure-live`, `#execution-lab-live` sans détacher l'observatoire complet.
- `renderShadows` conserve `window.scrollY` au remplacement synchrone et le défilement interne des occurrences, sans `scrollIntoView` sur refresh automatique.
- Les trois panneaux V494 historiques ne sont plus rafraîchis sur une source PAPER arrêtée. Section archive V494 repliée à la place.
- Deux nouvelles sections `<details>` stables sur TRADES → SHADOWS : « Lieu E1/E4, BigRange/DailyRange » et « S1 LBW15 ». Le rafraîchissement remplace uniquement **leur contenu**, sans recréer le `details`.
- Deux API **authentifiées, lecture seule** : `/api/shadows/boonolab-e1e4-place` et `/api/shadows/boonolab-lbw15-s1`, avec contrôle de version, `brokerOrdersEnabled:false`, `decisionImpact:false` et `SOURCE_STALE` après 95s.
- PM2 `config-server` redémarré et revenu ONLINE ; réponse HTTP 302 /login pour un client **non authentifié** (protection maintenue). Les tests syntaxiques et de structure passent. L'inspection interactive d'une session authentifiée pendant plusieurs cycles de 30s n'a **pas** été réalisée automatiquement : ne pas déclarer QA navigateur complet déjà prouvé.
- Backup : `/root/boonolab-watch-refresh-before-20261116T124634Z/config-server.js` ; ce fichier avait été vérifié sans modification concurrente.

## 2. BOONO-TV — enlever les résultats V494 réellement affichés

**Sur OVH**, fichier live `/home/ubuntu/boono-tv-studio/runtime/boono-tv/scene/chart-views.js` :
- Le tableau « TRADES ACCOMPLIS » ne charge plus que les clôtures `paper === true && engine === 'V543'`.
- Le récapitulatif d'équity des 48h de la scène devient **V543 uniquement**. Aucun P&L 494 ne s'ajoute.
- Les zones de trade et marqueurs des graphiques prix, MCB3 et MCB15 ne proviennent plus que des événements `V543`, y compris en cas de retour au vieux fichier `trade-markers.json` ; les bandes restent sur le bord V543.
- Dans l'index **runtime OVH** uniquement, l'en-tête « V494 = HAUT · V543 = BAS » est remplacé par « V543 PAPER · COURBES ET TRADES ».
- Aucun changement de cadence des panneaux 25s/15s/5s, de personnages, audio, perspective, conversion, bureau ou scène.
- Sauvegarde runtime OVH : `/home/ubuntu/boono-tv-studio/tests/backup-v494-tv-retire-20261116T124521Z/`, qui contient **chart-views.js** et **index.html** avant le changement.
- Code `chart-views.js` synchronisé exactement dans source Git Amsterdam `zero-one/boono-tv/scene/chart-views.js`, SHA256 **b8477c3b57bab13a989a527289e9d8272e505e41ace6497abe478d8780b1509d** identique sur Amsterdam et OVH. Page live OVH servie HTTP 200 et contenu filtré vérifié par GET.
- **Attention au chantier OVH concurrent** : `zero-one/boono-tv/scene/index.html` sur Amsterdam est un ancien contenu et présente déjà des changements d'un autre atelier ; il n'a pas été écrasé ni indexé par cette opération. Le nouvel en-tête est vérifié dans l'index réellement servi sur OVH ; toute future synchronisation globale des scènes devra intégrer cette différence dans l'OD concurrent.
- Pas de restart studio OVH requis : assets statiques servis directement, aucun processus ou diffusion audio modifié. Contrôle **visuel** authentifié côté navigateur non fait automatiquement.

## 3. Tests et traçabilité

- `node --check modules/config-server.js` et `node --check boono-tv/scene/chart-views.js` : PASS.
- `tests/ui/boonolab-v543-shadow-refresh-20261116.test.js` : 3/3 PASS. Contrôle par assertions source et routes; ne remplace pas le test réel 30s de l'interface.
- `tests/ui/watch-old-panels-retired.test.js` : 4/4 PASS, régressions autres affichages testées.
- Combined S1/Place/Observer/Watch tests : **25/25 PASS** (sur le périmètre listé lors de l'audit).
- Nouvel observateur `boono-e1e4-place-shadow` ONLINE et S1 LBW15 ONLINE ; PM2 PAPER V543 inchangé. Documents de recherche dans `BOONOLAB_E1_E4_LIEU_REGIMES_3_SEMAINES_2026-11-16.md`.

**Statut : correction code et service Amsterdam déployés, JS et HTML TV OVH déployés et HTTP servis ; validation fonctionnelle d'une session de lecture durant >30s recommandée.**
