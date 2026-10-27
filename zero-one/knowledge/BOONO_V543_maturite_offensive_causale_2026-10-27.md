# BOONO Systems — V5.4.3 : maturité causale commune aux phases d'admission

**27 octobre 2026 · Amsterdam · changement de politique PAPER, traçable par nouvelle version.** V4.9.4 demeure le comparateur indépendant.

## Décision du propriétaire

Une entrée STRUCTURAL_REVERSAL_FORMING ne doit pas échapper à l'analyse de maturité de l'offensive qui l'a préparée. Un E3 ou cross3 fraîchement observé ne remet pas à zéro l'histoire du prix. STRUCTURAL_CONTINUATION, STRUCTURAL_REVERSAL_FORMING et TACTICAL_RESPIRATION reçoivent un **examen commun**, fondé sur les origines du prix, l'oscillateur E15 et la conversion marginale.

La correction ne doit ni introduire de veto WHERE ou MA distante, ni rétablir les seuils arbitraires de 250/325 dollars consommés. MCB15 garde l'autorité stratégique, MCB3 le rôle tactique ; les protections, sorties, frais et tailles PAPER demeurent inchangés.

## Le cas fondamental : #78

#78 LONG V5.4.2, entrée **27/10 18:24:35 CET** à 80 735,8 $, sortie 18:55:19 à 80 491,1 $, net **−6,044 $**, MFE +55,7 $ BTC, MAE −269,8 $ BTC.

Preuves disponibles **à l'entrée**, sans regarder les futures bougies :
- Origine 4h : creux réel vers 15h00 à 79 858,8 $, soit environ +877 $ de déplacement BTC lorsque le nouveau E3 UP apparaît.
- Prix dans sa fenêtre 2h : rang 1,00 et 8,7 $ de distance au maximum observé, 80 744,5 $.
- MCB15 : crête géométrique confirmée à 16h45, LBW15 +69,1 avec prix 80 660,8 $. À l'entrée, prix plus haut mais LBW15 +64,8, soit une **divergence baissière en formation** ; ces ancres appartiennent au même régime confirmé MA15. Aucun pivot futur n'est présupposé.
- Conversion : PM3 +135,8 $, PM5 +142,2 $, PM Live +16,0 $, mais **depuis Bâton −24,1 $** : bonne traduction cumulée et tentative marginale déjà contestée.

Replay exact as-of 18:24:35 : décision précédente V5.4.2 ENTER_LONG ; V5.4.3 **WAIT_OFFENSIVE_CHAIN_ALREADY_EXTENDED_AWAIT_REQUALIFICATION**. Aucun P&L contrefactuel n'est revendiqué : c'est une comparaison de décisions, pas un ordre réellement évité en octobre.

## Architecture

- modules/v5/offensive-maturity-v543.js : origine prix confirmée 4h/2h depuis les chandeliers 3m accessibles à la date d'observation ; comparaison prix/LBW15 avec une référence E15 confirmée du même régime de polarité MA15 ; progression récente PM3/PM5/PM Live/depuis Bâton.
- modules/v5/decision-v543.js : enveloppe de V5.4.2 ; ne modifie une admission que si PRICE, MCB15 et CONVERSION montrent conjointement une **confirmation tardive**. Ne crée ni sortie ni direction nouvelle.
- modules/v5/runner-v543.js : seul runner PAPER V5, conserve le même flux OKX, le même feed d'événements natifs et l'observateur V4.9.3 non exécutant. La mémoire de la maturité est sauvegardée dans le ledger.
- modules/v5/paper-v543.js : migration additive depuis V5.4.2 vers le ledger V5.4.3 ; toutes positions déjà ouvertes gardent leur version d'origine et exactement leurs sorties, hard-risk −500 BTC, planchers +120→90 et +220→180, frais et anti-churn.

## Trois familles convergentes, et non un seuil arbitraire

1. Prix au bord directionnel observé sur 2h : rang du prix ≥0,9 ET écart à l'extrême au plus égal à une demi-amplitude de bougie 3m confirmée typique.
2. MCB15/PRIX : prix établit un extrême plus directionnel qu'une crête/creux E15 structurel déjà connu, tandis que LBW15 ne l'accompagne pas. Référence dans le même régime confirmé MA15. Il s'agit d'une divergence en formation, non d'un E15 futur confirmé.
3. CONVERSION : PM3 et PM5 sont encore productifs, mais PM Live traduit moins bien et le déplacement depuis Bâton est contraire à l'attaque proposée.

Une seule de ces conditions ne suffit jamais ; données manquantes ne créent pas de preuve artificielle. L'E3 continue de déclencher une opportunité tactique dans une vraie nouvelle offensive.

## Mémoire persistante de l'offensive

Le diagnostic tardif n'est PAS effacé au premier tick PM redevenu favorable ni lors d'un autre croisement E3 sans preuve indépendante. L'état DEFERRED, daté et associé à la campagne E15 et la direction, est sauvegardé immédiatement au premier avertissement.

Une candidature peut se requalifier seulement sur :
- un NOUVEAU retest du prix réellement défendu après cet avertissement, accompagné d'un PM Live et d'un déplacement depuis Bâton positifs dans le sens proposé ;
- OU le LBW15 observé retrouve le niveau de son ancienne référence E15, avec ce même soutien PM.

La direction opposée et une nouvelle véritable campagne 15m ne subissent pas la mémoire de l'ancienne candidature. Ce mécanisme n'est pas un compteur de temps, ni un seuil arbitraire de distance parcourue.

## Replays et limites

Les contextes d'entrée archivés #59 à #79 montrent que cette lecture initiale aurait différé **#78 uniquement** dans cet échantillon. Les réussites #62, #63, #72 sont conservées ; #77 conserve son admission, conformément à l'analyse précédente.

Les replays complets as-of #72, #77 et #78 ont été réalisés avec les Audit/CSV/événements conservés : l'ancien et le nouveau admettent #72 et #77 ; l'ancien admet #78 et le nouveau le diffère. Les événements Audit indispensables au replay complet #62/#63 ne sont plus disponibles ; ces deux cas ont été revérifiés à partir de leur contexte d'entrée sauvegardé et des chandeliers 3m confirmés.

Tests des preuves datées, exclusion des bougies futures, polarité MA15, symétrie LONG/SHORT, préservation des gains #62/#63/#72, mémoire persistante malgré PM fugitif, requalification causale, sorties héritées, anti-réentrée, risque et ledger.

**Les performances réelles ne sont pas prouvées par ces replays.** Observer les nouvelles admissions PAPER et mesurer les occasions différées, reprises et manquées avant de conclure sur la rentabilité.

## Activation contrôlée sur Amsterdam — 27 octobre 2026

La série complète de 306 tests V4/V5/attention réussit avant ET après activation : **294 réussis, 0 échec, 12 anciens tests sautés**. Les 21 tests ciblés V5.4.3 incluent le replay réel du #78, la mémoire temporelle après une tentative tardive, les requalifications et toutes les protections financières. Les deux autres cas de replay intégraux accessibles, #72 et #77, conservent leur décision ancienne. Les replays des #62 et #63 sont limités aux preuves archivées, pas à un Audit disparu.

Avant la bascule, copies et empreintes SHA256 du ledger V5.4.2, de l'historique des trades, des décisions et de la dernière version du serveur d'interface sauvegardées sous /root/boono-v543-pre-cutover-20261027/.

Ancien boono-v542-paper STOPPÉ ; nouveau boono-v543-paper activé comme UNIQUE moteur principal V5 PAPER (PID initial 1081650). Le ledger v52-paper-state.json a été migré additivement de v5.4.2-paper-ledger-v0.9 à v5.4.3-paper-ledger-v1.0. **À la bascule : 79 trades clôturés, equity 877,0752 $, frais cumulés 118,5026 $, aucune position ouverte**. Aucune clôture ni frais de migration. L'historique, les balances et les clés anti-churn ont été conservés.

Ancien processus V5.4.2 supprimé après démarrage validé et PM2 sauvegardé. V4.9.4 demeure intact (PID 962864) comme moteur PAPER comparateur. config-server a été redémarré avec les nouvelles étiquettes V5.4.3, et le graphe Conversion accepte les analyses PM V5.4.3 sans ouvrir de nouvelle connexion OKX.

V5.4.3 publie la qualité DATA_OK, la classification MATURITÉ OFFENSIVE est visible dans État vivant. Le flux OKX trades/tickers est connecté et confirmé. Aucun ordre financé : brokerOrdersEnabled=false et risque −500 $ / planchers +120→90 et +220→180 inchangés.

**Limite de performance :** la suppression contrefactuelle de l'admission #78 a été vérifiée, mais AUCUNE rentabilité future ou amélioration de P&L n'est prouvée. Les admissions non prises devront être archivées avec leurs preuves pour comparaison et suivi.
