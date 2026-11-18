# BOONO Systems — audit vérifié du rollover nocturne 15m → 1h → 4h → Daily → 15m

**Période :** 17 novembre 2026 22:50:00 UTC – 18 novembre 2026 00:40:00 UTC, soit 23:50–01:40 en Suède (CET).  
**Date du contrôle :** 18 novembre 2026, à partir de 00:57 UTC.  
**Décision et traçabilité :** `OD-20261117-002`. Préparation : `BOONO_TV_suivi_rollover_2026-11-18_preparation.md`.  
**État :** **COMPLET — observé et corroboré**, avec anomalie de consommation mémoire et problème distinct de champs secondaires absents sur certaines bougies 1h. Les moteurs PAPER, PM2, Chrome et le collecteur n'ont pas été modifiés, recyclés ou redémarrés pour cet audit.

## 1. Synthèse des constats

1. **Le rollover fonctionnel a réussi.** À **2026-11-18 00:00 UTC (01:00 CET)**, l'ordre réellement enregistré est **15m → 1h → 4h → 1D → 15m**. La bougie Daily du 17/11 est écrite **68,267 s** après sa clôture UTC. Le retour en 15m est effectif dans le journal à 00:01:12.972 ; son chargement initial est confirmé à **00:01:17.836**, soit **77,836 s** après minuit.
2. **Le minuit civil suédois a aussi été contrôlé.** À **2026-11-17 23:00 UTC (00:00 CET)**, une rotation 15m → 1h → 15m a lieu, sans 4h ni 1D (ce qui est conforme à l'alignement UTC).
3. **Les bougies MCB attendues sont présentes**, sans trou ni doublon dans les séries vérifiées autour du passage. Après retour 15m, les nouvelles clôtures 00:00 et 00:15 sont écrites normalement à 00:15:35.597 et 00:30:35.699 UTC ; celle de 00:30 est en outre présente dans le journal PM2 après la fenêtre, écrite à 00:45:35.725 UTC.
4. **Anomalie à surveiller : accumulation des ressources du navigateur.** À résolution 15m stabilisée, les documents passent de **20 à 22** après le minuit suédois puis à **26** après le rollover Daily ; les écouteurs de **13 662 à 14 595 puis à 16 622**. Le tas JavaScript passe de **586 à 766 MiB** entre le début et la fin des 110 minutes. Association temporelle observée avec les navigations ; **une fuite mémoire permanente n'est pas encore démontrée**.
5. Les valeurs **DBSI et MA200** manquent sur la bougie horaire ouverte à 23:00 UTC, alors que OHLC, BW/LBW et Money Flow sont présents. C'est un **problème de complétude intermittent déjà existant** : 26 des 48 dernières bougies 1h depuis le 16/11 ont DBSI/MA200 absents ; ne pas attribuer cet incident spécifiquement au rollover.

## 2. Intégrité de l'observation

Le programme passif `zero-one/scripts/boono-rollover-observer-20261118.js` a bien démarré à **22:50:00.389 UTC** et a produit `finished.json` à **00:40:00.005 UTC**, avec **`completedThroughEnd=true`, 659 mesures réussies / 659, 0 échec CDP**. Le fichier `metrics.ndjson` contient effectivement **659 lignes**, sans intervalle observé supérieur à 17 s entre deux lignes ; environ une mesure toutes les 10 secondes. La cible CDP `09B98ACA827A76339AB293A7EEF5D69C` a été inchangée sur les 659 lectures. La résolution réelle a été vue sur 15m, 1h, 4h et 1D : respectivement 654, 2, 1 et 1 lectures ; une lecture intermédiaire a retourné `resolution=null` pendant le chargement à 00:00:39.279, sans erreur de sonde. Les événements courts sont documentés plus précisément par les logs PM2. Aucun événement d'erreur, timeout ou watchdog n'apparaît dans le journal capturé. **Le fichier de fin confirme l'arrêt effectif de la sonde.**

La métrique heartbeat a au maximum **6,02 s** de retard entre lecture et dernier événement, sans interruption démontrée. Le processus PM2 `collecteur-tab2` était `online` lors de la vérification finale ; même PID **579383** dans les relevés. Le timer systemd transitoire n'était plus listé après la fin, comportement cohérent avec son option `--collect`, et non signe d'échec.

**Emplacement des preuves non modifiées :** `/root/agents-ia-zero-one/zero-one/data/system-audits/rollover-2026-11-18/` sur BOONOTRADE-VPS. Sources `start.json`, `finished.json`, `metrics.ndjson`, `tab2-events.log`, `tab2-before.log`. Les logs bruts ne sont pas committés.

Empreintes SHA256 au contrôle du 18/11 :
- `metrics.ndjson` : `fafa40dac0156eb75c26e1716511f195327deaec0ded76fdb90ce0355999fe6c`
- `tab2-events.log` : `5f24b17ce279f09db871ebbaa5a326735e9b2c981b082ae8093fed724d10e80c`
- `start.json` : `40c1233c703697cac44b833f72ef2d76abbd87fc95fd751d4f7abba029446f6d`
- `finished.json` : `554173bef101a576ba688fe1f090a87f0aaf745ca4d161df716c371c843db66a`

## 3. Chronologie prouvée : minuit suédois (23:00 UTC)

| Heure UTC du 17/11 | Événement |
|---|---|
| 23:00:00.603 | Clôture détectée de la bougie 15m ouverte à 22:45, temporisation de stabilisation de 35 s |
| 23:00:35.606 | `CLOSE 15m` persisté |
| 23:00:37.457 | `15m → 1h` |
| 23:00:40.478 | `Caught up 1h` |
| 23:00:47.415 | `CLOSE 1h` (bougie ouverte 22:00), récupération rétroactive 1 bougie |
| 23:00:47.457 | `1h → 15m` |
| 23:00:52.589 | MCB 15m réinitialisé à 400 bougies ; `15m already up to date` |

La période horaire tourne correctement. Le passage 4h et Daily n'a **pas** lieu à minuit suédois, ce qui est conforme à la référence UTC du collecteur.

## 4. Chronologie prouvée : clôture Daily (00:00 UTC / 01:00 CET)

| Heure UTC du 18/11 | Événement | Décalage depuis minuit |
|---|---|---:|
| 00:00:00.329 | Clôture 15m détectée, début du `settle` 35 s | +0,329 s |
| 00:00:35.334 | `CLOSE 15m` : bougie ouverte à 23:45 UTC | +35,334 s |
| 00:00:37.963 | `15m → 1h` | +37,963 s |
| 00:00:42.392 | `Caught up 1h` | +42,392 s |
| 00:00:52.002 | `CLOSE 1h` : bougie ouverte à 23:00 UTC ; rattrapage 1 bougie | +52,002 s |
| 00:00:52.970 | `1h → 4h` | +52,970 s |
| 00:00:56.507 | `Caught up 4h` | +56,507 s |
| 00:00:58.523 | `CLOSE 4h` : bougie ouverte à 20:00 UTC ; rattrapage 1 bougie | +58,523 s |
| 00:01:02.972 | `4h → 1D` | +62,972 s |
| 00:01:06.118 | `Caught up 1D` | +66,118 s |
| 00:01:08.267 | `CLOSE 1D` : bougie ouverte à 2026-11-17 00:00 UTC ; rattrapage 1 bougie | +68,267 s |
| 00:01:12.972 | `1D → 15m` | +72,972 s |
| 00:01:16.201 | `Caught up 15m` | +76,201 s |
| 00:01:17.836 | MCB 15m initialisé (400 bougies), `already up to date` | +77,836 s |
| 00:15:35.597 | `CLOSE 15m` : bougie ouverte à 00:00 UTC | — |
| 00:30:35.699 | `CLOSE 15m` : bougie ouverte à 00:15 UTC | — |

**Interprétation des délais :** les horodatages CSV sont les **ouvertures** des bougies, non les heures d'écriture. Un rattrapage rétroactif d'une bougie est ici le mécanisme normal après une navigation : son écriture a bien été vérifiée, ce n'est pas une bougie perdue. L'écart d'environ 78 s pendant lequel le 15m n'est pas complètement revenu est une **fenêtre réelle de latence de disponibilité du layout de collecte**, même si les bougies confirmées sont ensuite intactes. Ne pas conclure sans mesures des consommateurs que les moteurs PAPER ont raté des signaux.

## 5. Continuité des données MCB et qualité de colonnes

Contrôle par lecture de `data/mcb-live/mcb_{15m,1h,4h,1d}.csv`, comparaison des timestamps de bougies et recherche de doublons.

| TF | Dernière bougie concernée par la clôture de minuit UTC (timestamp d'ouverture) | Écriture UTC | Vérification |
|---|---|---|---|
| 15m | 2026-11-17 23:45 | 00:00:35.334 | Présente, puis 00:00, 00:15, 00:30 du 18/11 |
| 1h | 2026-11-17 23:00 | 00:00:52.002 | Présente, OHLC/MCB/MF complets |
| 4h | 2026-11-17 20:00 | 00:00:58.523 | Présente, OHLC/MCB/MF/DBSI/MA complets |
| 1D | 2026-11-17 00:00 | 00:01:08.267 | Présente, OHLC/MCB/MF/DBSI/MA complets |

Les quatre clôtures de minuit ont un `close` commun **64 915,4 USDT**. Dans le tronçon récent vérifié, les timestamps 15m ont un pas de 15 min, les timestamps 1h ont un pas de 60 min, les deux dernières bougies 4h sont consécutives (16:00, 20:00) et les Daily 16/11 et 17/11 se succèdent. Aucun doublon détecté sur ces fenêtres. Les trois composantes MCB (LBW, BW, MF) sont présentes sur chaque bougie contrôlée.

**Réserve à traiter séparément :** sur la bougie 1h du 17/11 ouverte à 23:00, `dbsi_top`, `dbsi_bottom` et `ma200` sont vides. Le même motif se constate sur **26/48** bougies horaires depuis le 16/11, et 8/12 bougies 4h, indépendamment de minuit. Ce n'est donc pas une panne nouvelle prouvée au rollover mais un défaut intermittent de collecte ou de disponibilité de données secondaires, à auditer avant d'en faire une autorité de décision.

## 6. Mémoire, DOM et écouteurs : comparaison avant/pendant/après

Lectures directement issues de la **même cible CDP**, via `performance.memory` (tas JS) et `Memory.getDOMCounters` (documents, nœuds, écouteurs). Les valeurs transitoires après navigation ne doivent pas être confondues avec le plateau stabilisé.

| UTC | Situation | Tas JS utilisé | Documents | Nœuds | Écouteurs |
|---|---|---:|---:|---:|---:|
| 17/11 22:50:00 | Début, TF 15m | 586 MiB | 20 | 52 074 | 13 662 |
| 17/11 23:00:31 | Juste avant 1h | 594 MiB | 20 | 53 506 | 13 662 |
| 17/11 23:01:11 | Pic transitoire après 1h → 15m | 692 MiB | 36 | 56 712 | 19 010 |
| 17/11 23:05:02 | Retour 15m stabilisé | 639 MiB | 22 | 56 020 | 14 595 |
| 18/11 00:00:29 | Juste avant rollover complet | 650 MiB | 22 | 58 355 | 14 595 |
| 18/11 00:01:09 | TF Daily pendant la rotation | 803 MiB | 48 | 65 991 | 26 985 |
| 18/11 00:01:29 | Pic transitoire après retour 15m | 872 MiB | 58 | 69 793 | 32 837 |
| 18/11 00:01:49 | Retour 15m stabilisé | 744 MiB | 26 | 66 279 | 16 618 |
| 18/11 00:39:54 | Fin de surveillance, TF 15m | 766 MiB | 26 | 71 348 | 16 622 |

**Évolution mesurée entre les deux extrémités :** tas JS **+180 MiB (+30,7 %)** ; documents **+6 (+30 %)** ; nœuds **+19 274 (+37,0 %)** ; écouteurs **+2 960 (+21,7 %)**. Tas JS réservé (`totalJSHeapSize`) **626 → 788 MiB**. Le même onglet final est bien en 15m.

**Libération partielle prouvée :** à 00:01:29, la sonde voit 872 MiB, 58 documents et 32 837 écouteurs ; dès 00:01:39, 745 MiB, 26 documents et 16 614 écouteurs. Les compteurs ont donc **effectivement diminué sans commande de nettoyage émise par la sonde** : une partie des ressources transitoires est libérée. Cela n'exclut pas qu'une autre partie reste retenue longtemps. La cause exacte (garbage collection JavaScript, retrait des anciennes pages ou autre mécanisme Chrome/TradingView) n'est **pas démontrée**.

**Plateaux pertinents :** après une unique rotation horaire, **20 → 22 documents** et **13 662 → 14 595 écouteurs** ; après la rotation 1h/4h/Daily, **22 → 26 documents** et **14 595 → ~16 622 écouteurs**, restant à ce niveau pendant les ~38 minutes suivantes. Les chiffres appuient l'hypothèse d'une rétention persistante après certaines navigations, sans isoler son responsable.

**Avant la fenêtre :** un test CDP unique à 19:38:49 UTC montrait 397 MiB et 13 documents sur la même cible, contre 586 MiB et 20 documents à 22:50. Cette comparaison supplémentaire n'est pas une série continue, et n'établit pas à elle seule un mécanisme de fuite.

**Contexte machine :** `MemAvailable` Linux **520 → 509 MiB** et swap utilisé **1 642 → 1 799 MiB** entre la première et la dernière lecture. Ces compteurs sont **globaux à l'hôte** : il serait incorrect d'attribuer la totalité du swap ou de la mémoire libre à ce seul onglet. Il faudrait des RSS/PSS par processus Chrome et une observation plus longue.

## 7. Interprétation causale et priorités recommandées

### Prouvé

- Chronologie effective complète et cohérente de la rotation, avec initialisation MCB (400 barres) et rattrapage d'une bougie sur chaque TF supérieur, suivie du retour en 15m.
- Aucune défaillance du processus collecteur ou interruption du heartbeat pendant les 659 mesures ; les données MCB confirmées sont présentes.
- Pics de mémoire et de compteurs DOM pendant les navigations ; baisse partielle rapide ; niveau stabilisé plus haut après chaque séquence.
- Données DBSI/MA200 parfois absentes sur les bougies horaires, problème préexistant.

### Hypothèses à tester, non démontrées

- Les rechargements/rotations TradingView créent des structures ou écouteurs détachés partiellement retenus par le navigateur, susceptibles d'entraîner à long terme une croissance de mémoire.
- L'indisponibilité du collecteur 15m pendant ~78 s au rollover Daily pourrait induire des effets aval sur certains affichages ou moteurs ; aucun impact aval n'a été mesuré ici.
- La forte utilisation du swap peut amplifier des dégradations de latence Chrome ; la relation causale n'a pas été isolée.

### Recommandations sans changement de production

**P1 — mémoire :** construire d'abord une observation passive sur 24 à 48 h, avec capture du plateau stabilisé après chaque rotation, suivi du RSS/PSS Chrome par PID (et pas seulement JS heap), de la mémoire disponible/swap et de la fréquence des pauses. Comparer à nombre d'heures et de cycles équivalents pour distinguer rétention durable, cache récupérable et croissance liée à la durée de session. Ne pas programmer de GC forcé ni de redémarrage préventif sans preuve.

**P2 — fraîcheur :** conserver la télémétrie de l'écart `clôture théorique UTC → écriture CSV` par TF et du délai `Daily → 15m prêt`. Le passage actuel à **+77,836 s** est mesuré ; le qualifier comme coût de disponibilité, et vérifier les consommateurs en lecture seule avant toute optimisation.

**P3 — complétude des colonnes :** investiguer pourquoi DBSI et MA200 sont souvent absents sur 1h/4h ; privilégier un état `unavailable` explicite plutôt qu'un zéro ou une confirmation fictive. Conserver les colonnes MCB existantes qui, elles, sont complètes sur ce rollover.

**P4 — modifications éventuelles :** tester en shadow, puis comparer toute optimisation de navigation/réutilisation d'onglet sur les mêmes critères de précision CSV et de mémoire. Aucune proposition de changement en production n'est validée par ce seul audit.

## 8. Méthode, limitations et traçabilité

Analyse des 659 objets JSON par une procédure Python en lecture seule : extraction de `tab.metrics`, `tab.dom`, `heartbeat`, `host`, regroupement des résolutions et rapprochement par UTC ; parsing de `tab2-events.log` pour les événements sub-10 secondes ; vérification des pas et doublons avec `csv.DictReader` sur les CSV du VPS. Pour les mesures de l'onglet, les timestamps de capture peuvent différer de quelques secondes de l'événement PM2 ; le journal est la référence pour les commutations précises.

Limites : compteur DOM CDP et `performance.memory` ≠ RSS Chrome ; aucune preuve d'une fuite mémoire au sens strict, aucune attribution causale directe à TradingView vs Chromium, aucun test instrumenté des consommateurs aval, suivi arrêté comme prévu à 00:40 UTC, et pas de mesure 24h continue. L'absence du timer systemd après sa tâche est attendue pour une unité transient collectée. La présence et le contenu de `finished.json` ont été vérifiés, et les journaux PM2 ultérieurs confirment que les clôtures 15m continuent.

**Statut documentaire :** rapport de résultat complet ; aucune intervention correctrice effectuée. Toute correction future doit faire l'objet d'une décision et de tests distincts dans BOONOLAB.
