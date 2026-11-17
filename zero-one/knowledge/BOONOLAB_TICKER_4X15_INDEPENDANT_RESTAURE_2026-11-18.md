# BOONOLAB — Ticker Elastic 4×15 rétabli sans V494

**18 novembre 2026 (Stockholm) — BOONOTRADE-VPS Amsterdam.**  
**Décision utilisateur :** « ticker **Elastic 4×15** de Watch dépend encore de V494 — il doit être remis en service ».

## Cause et séparation des autorités

Le processus `boono-v494-elastic-shadow` était arrêté depuis le 16 novembre avec `boono-v494-paper`. L'ancien panneau Watch `renderMiniTicker4x15` interrogeait `/api/shadows/v494-elastic`, route qui lisait `data/v494-elastic-shadow-summary.json` figé au **16 novembre 13h02 CET**. La récupération du volume 1m OKX était indépendante mais utilisait les quatre fenêtres anciennes. Le ticker a donc cessé d'être actualisé, malgré les collecteurs Bâton et l'observateur BOONOLAB restés actifs.

**Ne pas relancer V494, son Elastic shadow, ni réactiver sa politique PAPER.** Les fichiers historiques V494 restent archivés et sa route historique n'est pas supprimée.

## Nouveau collecteur autonome, livré et actif

- `modules/attention/boonolab-ticker4x15-independent.js` : calcul pur, as-of, à partir du `data/audit-history.json` Bâton (relevés ~30 secondes) et des snapshots horodatés `data/boonolab-market-snapshots*.ndjson` (source du régime BOONOLAB).
- `modules/attention/boonolab-ticker4x15-runner.js` : service PM2 **`boono-ticker4x15-shadow`**, lecture seule, 30 s, état persistant `data/boonolab-ticker4x15-state.json`, résumé compact `data/boonolab-ticker4x15-summary.json`, journal rotatif des échantillons et changements de qualité/direction/régime (préfixe `boonolab-ticker4x15-*`). La reconstruction initiale des 60 dernières minutes se fonde sur les observations historiques AS-OF, jamais sur des PM futures.
- `modules/attention/boonolab-ticker4x15-volume-1m.js` : provider public OKX **BTC-USDT-SWAP**, bougies **1m clôturées**, champ `volCcy` exprimé en BTC (pas `vol` contrats, pas `volCcyQuote`). Une fenêtre de 15 minutes n'a un volume moyen fiable que si toutes ses minutes closes requises sont présentes. L'intensité `70 %` représente les seuils des **10 pastilles de volume 3m** moyennés sur les minutes, et **non** une comparaison percentile 24h.
- Réutilisation de **fonctions pures** des modules historiques `modules/attention/v494-elastic-ticker.js` (aggrégation pondérée 4×15) et `modules/v4/experiments/elastic-observer-shadow.js#conversion` (catégories Elastic v0.5). **Aucune lecture du ledger V494, aucun import paper/broker, aucune écriture dans V543 ou V5.5.**
- API Watch sécurisée `/api/shadows/boonolab-ticker4x15` ajoutée à `modules/config-server.js` : contrôle du contrat `mode=SHADOW_ONLY`, `decisionImpact=false`, `brokerOrdersEnabled=false`, version, quatre fenêtres et âge. Retour `SOURCE_STALE` au-delà de 90 s. Route historisée `/api/shadows/v494-elastic` inchangée et hors du chargement mini.
- Frontend Watch `loadMiniTicker4x15()` interroge **uniquement la nouvelle route**. Le bloc de 4 pastilles à droite de la Conversion continue d'afficher date, volume moyen/intensité, top 2 qualités, LONG/SHORT/CONTESTED, top 2 régimes. Le `<title>` du ticker mentionne désormais BOONOLAB indépendant.

## Interprétation et limites documentées

**QUALITÉ** : catégories `EASY`, `PRODUCTIVE`, `POWERFUL`, `EXCEPTIONAL`, `INEFFICIENT`, `SILENT`, `CONTESTED`, `UNCLASSIFIED` et transitions temporelles `ABSORBED/EXHAUSTED` conservées dans leur sens. Les labels sont recalculés par comparaison **historique as-of** : `PM3`/ `PM5` reconstruits depuis le prix Bâton à −3/−5 minutes (ce ne sont pas les mesures PM3/PM5 tick-par-tick exactes de l'ancien Elastic), débit du relevé `volumeFenetreBtc/winSec`, rendement de prix par BTC de débit et P75/P95 des observations **précédentes** jusqu'à quatre heures, en excluant les trois minutes les plus récentes de la référence. Au moins 55 observations historiques valides sont nécessaires, sinon `UNCLASSIFIED` plutôt qu'une preuve inventée. La calibration chiffrée ne doit **pas** être décrite comme identique à la précédente classification V494. Les fenêtres indiquent les secondes réellement couvertes, y compris un quart d'heure incomplet.

**RÉGIME** : historique des étiquettes de l'observateur `STERILE_HESITANT`, `DENSE_CONTRADICTOIRE`, `SILENCIEUX_PRODUCTIF`, `DIRECTIONNEL_PRODUCTIF`, avec jointure au dernier snapshot disponible **avant** chaque relevé. Aucun backfill avec le régime actuellement connu.

**LIQUIDITÉ** : le débit Bâton est un **proxy de volume négocié**, pas la profondeur du carnet, ni les liquidations forcées, ni un achat net de positions. Le volume OKX 1m est mesuré indépendamment et ne s'additionne pas aux fenêtres de PM. Le ticker ne prend **aucune décision PAPER**.

## Vérifications faites

- PM2 `boono-ticker4x15-shadow` : **ONLINE** ; `boono-v494-paper` et `boono-v494-elastic-shadow` : **STOPPED** ; `boono-v543-paper` et `boono-v55-paper` : **ONLINE**.
- Quatre fenêtres présentes, datées de 23h30/23h45/00h00/00h15 CET pour un contrôle du 18 novembre. Les trois premières ont 30 observations Bâton (~98 % de couverture), la dernière partielle 11 observations, couverture du temps écoulé contrôlée.
- Accès direct du provider OKX 1m : **OK**, fenêtres `COVERED`, BTC/min et pourcentages d'intensité produits ; échantillon à l'installation : 52,952 / 38,244 / 132,949 / 55,489 BTC/min, dernier quart d'heure incomplet.
- **34 tests automatisés ciblés PASS, 0 échec**, incluant tests de causalité (données futures exclues), panne de couverture, qualité/mercato distinctes, route protégée, rendu navigateur simulé de quatre cartes, non-régression des tests anciens V494.
- `config-server` redémarré **ONLINE**, PM2 sauvegardé. Une requête non authentifiée à la nouvelle route renvoie **302 /login** conformément à la protection attendue. Le test d'une route complète avec session mock confirme les quatre fenêtres et leurs volumes. **Le rendu visuel dans une vraie session utilisateur n'a pas été vérifié directement** : à contrôler lors de la prochaine ouverture de Watch.
- Sauvegarde config avant intervention : `/root/boonolab-ticker4x15-watch-before-20261117T232117Z/config-server.js`. Les contenus TV/OVH et les fichiers de trading ne sont pas modifiés.

## À suivre

Contrôler visuellement les quatre pastilles dans Watch après rechargement, puis comparer prospectivement les fractions `SILENT`/`INEFFICIENT`/produit aux épisodes BTC de liquidation et d'absorption sans figer de nouveaux seuils. En priorité, confronter les résultats des SHORTs V5.5 #14–16 et du SHORT V543 #273 aux quatre tranches 15m contemporaines, sans reconstruire le passé avec une information indisponible.

**Statuts :** ticker autonome **IMPLÉMENTÉ + TESTÉ + EN SERVICE**, ancienne route V494 **archive seulement**, influence moteur V543/V5.5 **AUCUNE**, comparaison économique des classifications futures **OUVERTE**.
