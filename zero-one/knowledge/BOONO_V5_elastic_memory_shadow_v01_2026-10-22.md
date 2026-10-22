# BOONO Systems — V5 Elastic Memory Shadow v0.1

**22 octobre 2026 — premier moteur effectivement implémenté, expérimental, strictement observateur.**

## Intention
L'utilisateur demande de **construire** un moteur et de le confronter à la réalité pour découvrir empiriquement quelles observations appartiennent à la même campagne, plutôt que d'édicter d'abord des appartenances fixes.

Nous ne déclarons **pas** qu'un E15 constitue à lui seul une campagne. Le prototype v0.1 construit une **carte de segments E15 et de relations candidates**, dont l'appartenance stratégique demeure explicitement `UNRESOLVED_CANDIDATE`. Il accumule ensuite les séries que nous pourrons étudier.

## Implémentation
- `modules/v5/elastic-memory-engine.js` : machine causale pure et déterministe. Les horodatages `sourceTs` et `observedAt` sont conservés ; l'ancien E15 confirmé reste l'ancre tant que le nouveau E15 est seulement LIVE, lequel demeure `provisional` et peut disparaître.
- E3 Live et E3 confirmé d'un même timestamp source = une **tentative** enregistrée une seule fois ; BW/LBWcross3 et E3 sont liés `linkedTo` et ne forment pas deux votes indépendants. De même en 15m. Les E3 opposés sont marqués `COUNTER_TEST`, leur résultat restant `UNRESOLVED`.
- Lors d'un nouvel E15 confirmé, conserver une relation intersegment `REPEATED_E15_DIRECTION` ou `OPPOSING_E15_TEST` avec une appartenance `UNRESOLVED_CANDIDATE` ; pas de nouvelle thèse stratégique ni de permission de trading automatiquement.
- La conversion instantanée et sa classe qualité proviennent des événements Elastic v0.5 existants. **QUALITÉ n'est pas un moteur indépendant de conversion**.
- Un ticker qualitatif **4×15m** conserve pour chaque quart d'heure une distribution des qualités observées, la proportion des camps, rendement/P75 et effort/P75 moyens, et le trajet prix réellement observé. La quatrième bougie en formation est indiquée comme incomplète par sa couverture. Les fenêtres PM3/PM5 **ne sont pas additionnées comme des volumes de transactions uniques**.
- `modules/v5/elastic-memory-watch.js` : processus autonome en lecture seule des nouveaux événements v0.5 et du dernier relevé Audit ; lit uniquement la **fin** des fichiers pendant le flux live. Il ne parcourt pas l'énorme état V4 à chaque tick. Bootstrap causal initial possible sur l'archive disponible, avec reprise de son propre état compact.
- Sorties : `data/v5-shadow-memory-state.json` (état compact et fenêtre de qualité courante), `data/v5-shadow-samples.ndjson` (échantillons 30 s), `data/v5-shadow-events.ndjson` (changements de phénomènes liés) ; journaux rotatifs 8 MiB et 12 segments maximum. Archives V4 non supprimées. Ces fichiers contiennent exclusivement de l'observation **SHADOW**, aucune stratégie d'ordre, aucun changement de V4.
- `modules/v5/inspect-shadow.js` : consultation lisible de l'état, de l'occupation des qualités sur 4 bougies 15m, du contexte E15 et des liens candidats. Commande : `node modules/v5/inspect-shadow.js`.
- `node modules/v5/elastic-memory-watch.js --replay` : replay indépendant, sans effet sur les fichiers du moteur ; `BOONO_V5_REPLAY_FROM` et `BOONO_V5_REPLAY_TO` définissent une fenêtre, avec préchauffage causal antérieur pour éviter l'invention d'une ancre.

## Épreuve initiale du réel
- Replay réalisé sur l'historique E15/E3/QUALITÉ depuis l'activation Elastic v0.5 le 21 octobre ; les événements sont rattachés par heure d'observation, pas par connaissance future.
- Replay ciblé du **22 octobre 03h30–03h35** : ancienne ancre E15 UP confirmée et E15 DN Live en cours, E3 DN opposé au dernier pivot confirmé ; la campagne **n'est pas déclarée SHORT confirmée avant les preuves correspondantes**. 10 échantillons de 30 s, dont près de 170 $ de variation BTC du premier au dernier échantillon sur cette fenêtre ; 4×15m couvre environ 83 % de l'heure observée grâce au préchauffage.
- Tests synthétiques : E3 sans E15 ne fabrique pas de campagne, liens cross/native non indépendants, E15 Live ne remplace pas Confirmed, E15 successifs restent des **liens à étudier** plutôt que de fausses frontières de campagne, qualité statistique 4×15m sans scores nominaux, rejets des timestamps / observations non fiables.
- Ces mesures ne sont PAS une preuve d'edge ni une simulation de trading V5. Le prochain travail est d'analyser les **réponses du prix APRÈS** les candidats (uniquement en évaluation ex-post), avec contre-échantillons de continuations, sans fuite de futur dans le moteur.

## Points toujours non résolus
1. Quelles relations E15/E3 permettent effectivement de regrouper plusieurs segments dans une même campagne durable ? Il faut des séries prospectives et leurs résultats ; le premier moteur ne suppose pas encore la réponse.
2. Quels contre-tests E3 échouent, et dans quelle condition la deuxième tentative devient-elle plus productive que la première ?
3. L'interprétation 4×15m de la qualité peut-elle distinguer respiration, continuation et épuisement avec une stabilité utile après frais ?
4. Comment décider du moment économique de l'entrée, éviter le churn et gérer la relation 1h/4h/Daily/Weekly ? Ce sont des travaux ultérieurs ; aucun veto ajouté aujourd'hui.

## Invariants de sécurité
- `decisionImpact:false` partout. **V5 ne passe pas de trade** et n'est importé par aucun des modules `v4/layers/action`, `setup-lifecycle`, `risk` ou `trade-simulator-v4`.
- `cerveau-central`, le simulateur V4.10.10, ses ordres 0$, les protections 120/90→220/180, le risque 500 $, les collecteurs TradingView et BOONO-TV **restent inchangés**.
- Aucun affichage UI encore relié à V5 : les données sont disponibles dans les fichiers et l'outil d'inspection. Ceci n'est PAS une nouvelle version de la page État V4 ni un moteur V5 actif d'exécution.

## Premier criblage prospectif reconstitué (évaluation ex-post, SANS trade)

Outil reproductible : `python3 modules/v5/research-series.py`. Source : relevés Audit 30s et journal Elastic v0.5 réellement horodatés. Fenêtre de recherche exploratoire : jusqu'à 8 minutes entre E15 Live, E3 Live et une conversion classée POWERFUL/EASY/PRODUCTIVE/EXCEPTIONAL. Pour éviter toute fuite du futur, **l'heure de déclenchement = maximum des trois heures d'observation** ; les variations à +15/+30 minutes ne servent qu'à **évaluer après coup**, jamais à sélectionner une entrée avant cette heure.

- 28 E15 Live distincts observés dans cette archive ; 27 possèdent une mesure complète à +15 minutes, dont 12 déplacements dans le sens du signal (44,4 %) ; déplacement signé médian environ −15,7 $ BTC.
- **13 combinaisons E15 Live+E3+qualité productive** disposaient de +15 minutes observables ; seulement **6/13** évoluent ensuite dans la direction annoncée à +15 minutes (46,2 %, médiane −4,1 $ de prix BTC). À +30 min, 5/13 gardent un signe favorable (38,5 %, médiane −110,6 $).
- La séquence du 22/10 **03h34:38 SHORT POWERFUL**, correctement reconnue à l'heure réelle de son apparition, réalise ensuite +429,8 $ BTC à +15min et +753,1 $ à +30min, sur les points Audit disponibles.
- Contre-exemples : 22/10 **03h15:38 LONG EASY** aboutit à −15,7 $ après 15min et −552,4 $ à 30min ; 22/10 **10h45:24 LONG EXCEPTIONAL** à −158,6 $ à 15min ; 22/10 **15h19:25 LONG POWERFUL** donne +292,2 $ à +15min puis −203,6 $ à +30min.
- **ATTENTION** : 13 événements souvent interdépendants, segmentation des campagnes inconnue, seuil de 8 minutes encore arbitraire et résultats de PRIX sans frais, slippage, stop, fill ni vraie politique d'entrée/sortie. Ce n'est donc ni un profit factor ni un win rate de BOONO V5, mais un premier corpus de falsification.

**Interprétation scientifique** : une bonne synchronisation microstructurelle reconnaît parfois une très belle impulsion, mais plusieurs signaux semblables conduisent à des mouvements défavorables ou très courts. Distinguer ces cas par la structure antérieure (campagne 1h/15m), les tentatives E3 précédentes, l'essoufflement, la qualité temporelle et l'espace prix disponible est précisément la mission de la prochaine itération, sans optimiser sur ces 13 cas isolés.

## Première activation LIVE
- Nouveau processus PM2 **`boono-v5-shadow`** séparé de `cerveau-central`. Bootstrap initial : 2 685 observations Audit reconstruites depuis le début d'Elastic v0.5, 18 segments E15, 17 liens E15 intersegment **non résolus**, 582 croisements/signaux natifs liés par proximité temporelle. Attention : le nombre de liens mesure la recherche de corrélation, non une indépendance de preuves ou une campagne validée.
- Premiers rafraîchissements automatiques réels : `2026-10-22T13:48:53Z` et `13:49:23Z`, puis relevés toutes les 30 s, avec état compact sur disque et journal `v5-shadow-samples.ndjson`. Aucune donnée de décision V4 n'a été réécrite.
- Vérification programme et compatibilité : **5 tests V5 + 63 tests V4 réussis**.
