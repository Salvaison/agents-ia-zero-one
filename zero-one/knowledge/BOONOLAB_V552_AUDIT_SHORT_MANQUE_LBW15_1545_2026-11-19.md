# BOONOLAB — Audit V552 du SHORT manqué 19/11/2026 vers 15h45–16h00

**19 novembre 2026, Europe/Stockholm (CET).**  
**Statut : ANALYSÉ, CODE PAPER INCHANGÉ.** L'utilisateur interroge la capture BOONO SYSTEMS 16h47m48s, lorsque BTC (~62 907,5 $) plonge après une inflexion LBW15 Live vers 15h45. Demande : « Je me demande ce que 552 a vu vers 15h45 avec le passage lbwpente15 et pourquoi il n'a pas pris ce trade ? »

## État réel et horodatages

Sources **en lecture seule** : `data/v552-paper-state.json`, `data/v552-paper-decisions.ndjson`, `data/audit-history.json`, `../data/mcb-live/mcb_15m.csv`, `modules/v552/{decision,vigilance,source,market-quality}.js` (versions `v5.5.2-lbw15-live-vigilance-campaign-paper-v1.1`), et screenshot utilisateur.

- **15h00m36s** : V552 clôture #15 SHORT à 63 965 $ (net −6,2071 $). Après cette clôture : **FLAT**. Le moteur n'était donc pas déjà SHORT sur la baisse de 16h.
- **15h39–15h45** : plusieurs pentes LBW15 négatives temporaires, MCB3 qui croise puis revient. À 15h45m14s : pente LBW15 sur 3m encore **+3,37**, écart LBW15−BW15 **+4,72**, MCB3 LONG, MF15 Live **+20,20** mais pente MF15 sur 10m **−1,22**. **Pas encore de croisement 15m Live confirmé ni de signal vendeur continu à cette minute** ; ne pas réécrire 15h45 comme point d'entrée indiscutable.
- **15h48m44s** : MCB3 Live SHORT alors que l'écart 15m demeure positif ; le 3m revient LONG à 15h49m44s : premier faux départ.
- **15h53m14s** : nouveau MCB3 Live SHORT (relevé Bâton ~63 820 $), pente LBW15/3m **−2,67**, écart 15m encore **+2,54**, MF15 **+19,81** avec pente/10m **−2,11**. PM Live proche du neutre (Bâton `priceMove` ~−0,7 $).
- **15h54m14s** : MCB3 SHORT toujours actif, LBW15 pente/3m **−7,97**, écart15 **+0,80**, MF15 **+19,55** mais pente/10m **−2,26**, MF3 pente vendeuse, PM Live / Bâton **−80,1 $**, déplacement prix/3m **−244,5 $**, BTC ~63 720 $. C'est le **premier point réellement cohérent** du faisceau tactique et de la conversion dans cette séquence.
- **15h55m14s** : **première observation Cross15 DN Live** dans les relevés Bâton, écart15 **−3,22**, LBW15 pente/3m **−13,33**, MCB3 SHORT, MF3 pente **−5,31**, PM Live Bâton **−57,9 $**, déplacement prix/3m **−243 $**, MF15 Live encore **+19,10** et sa pente/10m **−1,10**. Le collecteur Bâton observe BTC ~63 624,6 $ ; le **moteur V552 a bien mémorisé** l'événement `CROSS15_LIVE_OBSERVED` dans `state.memory.vigilance.events` au même horodatage (~15h55m14,653s), avec **prix tick OKX 63 600,1 $** (source différente du dernier prix Bâton).
- **16h00m00s** : Cross15 DN **confirmé sur la clôture** de la bougie 15h45–16h00, E15 DN natif issu de la même bougie. À 16h00m14s : prix ~63 512,7 $ ; MF15 encore **+17,87**, pente/10m **−2,25**. Aucune entrée V552.
- **16h45m00s** : clôture BTC ~62 855 $ ; capture BOONO-TV 16h47m48s : **62 907,5 $**. Les montants indiquent une large translation *du prix BTC*, pas un P&L PAPER acquis ou garanti.

**Le moteur a donc VU la pente Live et le Cross15 Live, mais ne leur a pas accordé une autorité d'entrée suffisante.** Le log `v552-paper-decisions.ndjson` n'émet pas une ligne à chaque événement vigilance : `runner.js#currentKey` se fonde sur `action,reason,candidate,campaign,position,episode`, sans la phase vigilance; l'événement Live se trouve dans la mémoire persistée, même si aucune ligne de décision n'est créée exactement à 15h55.

## Pourquoi l'entrée est refusée : le double veto MF15 / polarité

Toutes les **15 décisions V552 journalisées de 15h30 à 16h24** portent `WAIT V552_MARKET_POLARITY_CONTESTED_WAIT_PRICE_MF_ACCEPTANCE`. Dans `modules/v552/market-quality.js` :

- `flowLevel=sign(candidate)*MF15 Live`, `flow15=sign(candidate)*deltaMF15_10m`; `mfAligned=(flowLevel>0 && flow15>0)`.
- À 15h55 SHORT : le **niveau MF15 +19,10** signifie `flowLevel≈−19,10` (adverse), **bien que sa pente descendante −1,10** signifie `flow15≈+1,10` (favorable). Donc `mfAligned=false`.
- `priorPolarityRetained=false` : le LONG du dernier croisement 15m n'a pas conservé son déplacement ; `entryPrudence=true`. Cela entraîne `deferNewEntry=true` tant que `mfAligned=false`, **même quand MCB3/PM/prix confirment une nouvelle offensive vendeuse**. L'échec du LONG précédent est traité comme une raison générale de suspendre la nouvelle entrée SHORT, ce qui mérite d'être requalifié.
- V552 traite ainsi **un niveau MF15 encore positif mais en baisse** comme une opposition au SHORT, tandis que l'utilisateur a explicitement identifié la **pente MF15 lente et ses changements**, y compris depuis un niveau positif, comme information de transfert de force. Le veto absolu de signe peut masquer un retournement exploitable.
- Au moment du Cross15 DN confirmé vers 16h00, le système ajoute `OLD_CROSS3_TRAVEL_NOT_REQUALIFIED` : la forte partie initiale de la baisse est déjà parcourue, et le filtre évite maintenant de recycler ce Cross3. Ce second constat n'explique pas l'attente de 15h54–15h55 ; elle était due au **verrou MF15 / polarité**.

## Diagnostic différentiel contrefactuel sans aucune écriture PAPER

En évaluant `decision.qualify` et `market-quality.inspect` avec des **snapshots Bâton as-of** et un épisode Cross3 SHORT reconstruit depuis 15h53m14s, on obtient :

| Horodatage | MCB3 / PM / LBW15 | État réel du moteur | `qualify` en retirant UNIQUEMENT `deferNewEntry` pour le diagnostic |
|---|---|---|---|
| 15h48 | MCB3 repassé LONG, contexte non mûr | WAIT | WAIT |
| 15h53 | MCB3 SHORT mais pente/croisement et translation encore insuffisants | WAIT | WAIT |
| **15h54** | MCB3 SHORT, pente LBW15 DN accélère, PM Live −80, prix/3m −244 | **WAIT** | **ENTER_SHORT** (proposition) |
| **15h55** | Cross15 DN Live, flux tactique et PM vendeurs, MF15 en décélération | **WAIT** | **ENTER_SHORT** (proposition) |
| 16h00 | Cross15 confirmé DN mais ancien épisode avancé et PM3 devenu opposé | WAIT | WAIT |

**Attention :** cette expérience désactive un veto dans une fonction pure et avec épisode diagnostic synthétique ; ce n'est **ni un backtest de la séquence complète ni une preuve d'exécution PAPER**. Cela démontre causalement que le filtre de nouvelle admission est l'obstacle prépondérant à 15h54–15h55, mais ne mesure ni glissement, frais de future sortie, risque ou conséquences sur les autres trades.

## Contrat à examiner, non implémenté

1. En terrain tactiquement contradictoire, conserver l'utilité de l'**abstention des nouvelles entrées**, mais distinguer le **MF15 dont le niveau reste positif alors que la pente décélère** de MF15 qui continue de monter. La combinaison MCB3, LBW15 pente, Cross15 Live et conversion prix/PM peut caractériser un retournement naissant sans attendre le passage du MF15 par zéro.
2. Le **premier changement de pente LBW15** ouvre vigilance et accumulation de preuve, pas admission immédiate. Les faux Cross3 SHORT (15h40, 15h48) justifient cette discipline. La cohérence durable apparue vers 15h53–15h55 mérite un test comparatif explicite.
3. Journaliser les transitions de vigilance de manière exploitable sans écrire un journal de décisions à chaque tick (ex. changement de phase, `CROSS15_LIVE_OBSERVED`, preuve de prix requalifiée) afin de répondre à « qu'a vu V552 à l'instant ? » sans reconstruire les relevés.
4. Évaluer avec les **contre-exemples** (SHORT #2 gagnant, LONG #6 gagnant, faux Cross15 Live, churn #7–#15) avant de modifier l'autorité PAPER. Éviter qu'un assouplissement MF15 rouvre systématiquement les entrées dans les ranges improductifs.

**État de service vérifié à 17h59 CET :** `boono-v552-paper` ONLINE en v1.1, V551 STOPPED, equity réalisée cumulée **970,2430 $**, 15 clôtures, **FLAT** depuis 15h00, aucune entrée depuis. Le comparateur V543 a pris un SHORT plus tard à 16h34 (informations du ledger distinct).

**AUCUN changement de décision, de ledger, de politique, ni de processus PAPER effectué pendant cet audit.** Données historiques et ponctuelles, non démonstration de rentabilité.
