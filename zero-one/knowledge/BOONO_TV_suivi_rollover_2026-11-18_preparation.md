# BOONO Systems — surveillance passive du rollover complet de minuit

**Date de préparation :** 17 novembre 2026, 19:38–19:41 UTC.  
**Décision :** OD-20261117-002.  
**Statut :** surveillance planifiée et sonde testée ; **rollover futur, non observé à la rédaction**. Aucun changement au collecteur, à Chrome, aux moteurs PAPER, aux flux marché ni à OVH.

## Mandat et horloges

L'utilisateur demande : « Il faudrait que tu observe le roll over complet 15, 1H, 4H, Daily, 15min cette nuit à minuit ».

- Le planificateur `modules/tab2-collector.js` utilise les périodes UTC : la clôture Daily du 17/11 tombe à **2026-11-18 00:00 UTC**, équivalant à **2026-11-18 01:00 CET** en Suède.
- Le minuit civil suédois tombe à **2026-11-17 23:00 UTC**. Les deux transitions sont dans la fenêtre d'observation pour éviter toute ambiguïté.
- Le collecteur suit les priorités réelles : attente de clôture jusqu'à 120 s, anticipation si clôture à moins de 90 s, rattrapage des barres manquantes, puis retour par défaut au 15m. **Ne pas imposer l'ordre exact** au navigateur ni fabriquer la séquence ; reconstituer l'ordre réellement observé depuis le journal.

## Infrastructure de collecte nocturne

**Script en lecture seule :** `zero-one/scripts/boono-rollover-observer-20261118.js`.

- Sur Amsterdam, une unité transient systemd `boono-rollover-observer-20261118.timer` a été créée avec `systemd-run --on-calendar="2026-11-17 22:50:00 UTC" --timer-property=AccuracySec=1s --property=Nice=15 --collect`.
- Le timer a confirmé `NextElapseUSecRealtime=Tue 2026-11-17 22:50:00 UTC`, `ActiveState=active`. Le service était encore `inactive` lors de la configuration, ce qui est **normal avant l'heure programmée**.
- Horaires : **23:50 CET**, prélèvements **toutes les 10 secondes**, arrêt automatique à **00:40 UTC le 18/11 = 01:40 CET**.
- Fichiers de preuve **non versionnés** : `zero-one/data/system-audits/rollover-2026-11-18/start.json`, `metrics.ndjson`, `tab2-events.log`, `tab2-before.log`, `finished.json` et `observer-errors.ndjson` en cas d'échec.
- Une sonde CDP retrouve l'onglet collecteur sur `/chart/2AqpEMfD/`, **exclut le collecteur 3m**, conserve l'ID de target au travers des navigations. Elle lit uniquement `Runtime.evaluate` pour la résolution/symbole/heap et `Memory.getDOMCounters` pour documents/nœuds/écouteurs ; aucune modification de la page. Elle lit aussi le heartbeat `/run/boono-mcb-tab2.heartbeat` et le dernier horodatage CSV 15m/1h/4h/1D.
- Elle copie incrémentalement les nouvelles lignes de `/root/.pm2/logs/collecteur-tab2-error.log` pendant la fenêtre. Les preuves du journal PM2 indiquent les transitions, le chargement des 400 bougies, les éventuels `caughtUp` et l'écriture finale des clôtures.
- **Actions expressément absentes :** `Page.navigate`, `setResolution`, `HeapProfiler.collectGarbage`, `Page.bringToFront`, redémarrage PM2, fermeture/réinitialisation des onglets, actions V543/V55. Sonde basse priorité Nice=15, sans commande d'écriture vers la plateforme de trading.

## Test réel avant déclenchement

Le script a été vérifié avec `node --check` et `node ... --probe` à **2026-11-17T19:38:49Z** : sortie JSON réussie, sans fichier de suivi ni manipulation d'onglet.

**Lecture d'état à 19:38 UTC :** onglet CDP `09B98ACA827A76339AB293A7EEF5D69C`, résolution réelle 15m, symbole OKX:BTCUSDT.P, heap JavaScript **397 MiB**, **13 documents DOM**, **37 258 nœuds**, **9 896 écouteurs** et 11 canvas. Heartbeat actif, `mcb_15m.csv`, `mcb_1h.csv`, `mcb_4h.csv`, `mcb_1d.csv` disponibles, timestamps lus. Ce sont des valeurs **avant le rollover**, pas son résultat.

Le service PM2 `collecteur-tab2` était online, redémarrages cumulés 10 ; aucun redémarrage provoqué par la sonde. NTP Amsterdam synchronisé, timezone hôte UTC.

## Analyse planifiée après capture

Une automatisation ChatGPT ponctuelle **le 18/11 à 02:00 CET** a été créée et confirmée. Elle devra lire les preuves réellement enregistrées, reconstruire les événements 15m → 1h → 4h → Daily → retour 15m, comparer l'avant/après mémoire, documents DOM et écouteurs, contrôler l'heure et la valeur des bougies clôturées, les retards et les récupérations, puis signaler toute preuve manquante. La publication d'un rapport conclusif devra distinguer **observation / hypothèse / choix de conception**.

**Point de vigilance :** la sonde et le timer transients ne survivent pas nécessairement à un redémarrage du VPS avant la fenêtre. En cas de `start.json` / `finished.json` absent, ne pas déclarer le rollover mesuré. De même, la présence d'un événement de navigation ne prouve pas en soi une fuite mémoire permanente : examiner l'évolution après retour 15m et la récupération éventuelle par GC.

**Protocole / traçabilité :** `zero-one/knowledge/operational-decisions/OD-20261117-002/`. Aucune réécriture des fichiers historiques de trading. Les logs bruts restent sur le VPS et ne sont pas à verser intégralement dans Git.
