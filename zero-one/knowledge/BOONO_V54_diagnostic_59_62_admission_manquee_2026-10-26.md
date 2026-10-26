# BOONO Systems — Audit V5.4 : #59–62 et campagne LONG non exploitée

**26 octobre 2026, Amsterdam (CET). Audit en lecture seule.** Aucune modification du moteur V5.4, des positions, stops, frais, collecteurs ou comparateur V4.9.3.

## 1. Constat chiffré sur les journaux PAPER

- V5.4 #59 SHORT : 13h40–14h04, 80 327,9 → 80 238,9, **+0,1628 USD net**, MFE +196,7 BTC USD.
- V5.4 #60 LONG : 15h12–15h19, 79 948,8 → 80 123,6, **+1,7780 USD net**, MFE +231,1.
- V5.4 #61 SHORT : 15h27–15h34, 79 798,2 → 79 712,9, **+0,1042 USD net**, MFE +128,5.
- Total #59–61 : **+2,045 USD net** après frais. Les trois sorties sont par `GAIN_FLOOR_120_90_OR_220_180`.
- V5.4 #62 SHORT : entrée **17h06min40s à 80 256,3** ; position encore ouverte lors de l'audit à 17h24. **Ne pas comptabiliser de gain ni de perte définitive.**
- V4.9.3 #17 LONG : 15h17–15h27, **−5,233 USD net** ; #18 SHORT : 15h28–15h54, **−11,650 USD net** (`EXIT_RISK`). Ensemble **−16,883 USD**. Horaires partiellement différents de V5 : comparaison descriptive, pas expérience A/B contrôlée.

Du prix de sortie #61 à **79 712,9 USD** (15h34min50s) au sommet Audit **80 819,5 USD** (16h21min39s), le déplacement favorable à un LONG est de **+1 106,6 USD BTC**. Ce chiffre est la variation du marché et non un profit contrefactuel réalisable sans modèle de maintien/sortie. Plus tard, #62 SHORT intervient environ **563 USD BTC sous le sommet** après que le marché a déjà repris une grande partie du mouvement.

## 2. La campagne n'était pas inconnue

- 15h15 source : E15 UP natif enregistré dans `mcb_15m.csv`, valeur environ −63,95, connu à la fin de sa bougie.
- Un **creux LBW15 −67,1** à source 14h45 est confirmé par le module `structural-trajectory-v1` après deux bougies supplémentaires ; sa disponibilité est évaluée à **15h30**.
- **Dès 15h30, V5.4 remplace la campagne SHORT par une campagne LONG**, identité `long|E15:1793022300000`. Le prix est proche de 79 835 et le dernier pivot MCB3 est encore SHORT. Le changement est visible dans le journal à 15h30min35s pendant le SHORT #61 encore ouvert.
- **15h38min09s** : cross3 UP observé, puis 15h39min35s prix reconquis localement mais MF encore CONTESTED.
- **15h36 source** : E3 UP natif confirmé dans le CSV 3m (disponible seulement après fermeture de la bougie, vers 15h39).
- **15h48min10s** : prix ~80 053,9, MCB15 LONG, Cross3 UP, MF REINFORCING, `localPriceDefence.held=true`, risque calculé ~411 USD BTC ; MA3 étiquetée REJECTED. V5.4 répond `WAIT_NEW_TACTICAL_PRICE_EPISODE`.
- **15h51min12s** : prix 80 139,3, MF REINFORCING mais **la décision originale** affiche `localPriceDefence.held=false`, MA3 TEST_PENDING et stop ~495,5 USD BTC. **Important : un replay recalculé après coup avait montré une défense plus favorable et un stop ~258,3 USD. Le journal de la décision originale prime sur cette reconstruction tardive ; il n'y a PAS une admission incontestable à 15h51.**
- **15h57min12s** : MA3 ACCEPTED, défense locale true, MF CONTESTED, stop ~199 USD. Nouvelle attente.
- **16h00min37s** : prix **80 390,4**, campagne MCB15 LONG, Cross3 UP, MF3/MF15 **REINFORCING**, MA3 **ACCEPTED**, défense locale true, PM Live **+14,5 USD BTC**, PM3 +106,0, PM5 +125,9, stop causal ~**158 USD BTC**, aucune maturité `structurallyLate` déclarée. Toujours `WAIT_NEW_TACTICAL_PRICE_EPISODE`.
- **16h21min10s** : prix 80 743,9, campagne MCB15 LONG, Cross3 UP, MF REINFORCING, MA3 ACCEPTED, nouveau niveau `DEFENDED_PREVIOUS_HIGH` avec `acceptedRetest.state=DEFENDED` et stop ~367,9 USD. Toujours `WAIT_NEW_TACTICAL_PRICE_EPISODE`, puis sommet 80 819,5 environ 30s après.
- **16h39min10s** : prix 80 736,2, nouveau Cross3 UP, MF REINFORCING, MA3/MA15 ACCEPTED, `DEFENDED_PREVIOUS_HIGH` 80 523 avec retest/hold observés, stop ~231,3 USD. Toujours le même blocage.
- **17h01–17h03** : apparition intermittente d'E15 DN Live. #62 SHORT admis à 17h06 après confirmation tactique et prix localement repris, alors que le parent E15→E15 LONG n'était pas encore remplacé par un nouveau pivot confirmé.

## 3. Cause informatique précise : le pivot 3m reste un veto caché

Dans `decision-v54.js` :

```js
const alignedTactic=!!(cross&&cross.direction===candidate&&
  (t.mcb3Direction===candidate||priceCandidate.held));
const reversalRoom=formation||tacticalCounter||t.mcb3Direction===candidate;
const entryEligible=!!(...alignedTactic&&reversalRoom&&...);
```

La première condition reconnaît la reconquête du prix comme possibilité d'alignement tactique, mais la seconde redemande obligatoirement le **dernier pivot structurel MCB3** dans le même sens. Ce pivot provient de `structural-trajectory-v1`, qui ne change LONG qu'après un **creux LBW3 sous zéro** causalement confirmé, tandis que le cours peut progresser pendant de nombreuses bougies sur un lobe positif sans nouveau creux négatif.

Entre 15h30 et le sommet de 16h21, le pivot MCB3 reste SHORT, malgré les croisements et E3 UP, la structure MCB15 LONG, les reprises de prix et les progrès MF.

Le refus persiste aussi à 16h21 et 16h39 après de **vrais épisodes de retest/hold** catalogués par le moteur. Il ne s'agit donc ni d'une absence de structure 15m, ni simplement d'une conversion PM peu forte, ni d'un manque de données. **Le 3m a récupéré indirectement une autorité de veto stratégique que V5.4 devait supprimer.**

### Deuxième écart de contrat
Le pivot du module `structural-trajectory-v1` est un **extremum LBW confirmé par k bougies supplémentaires**, et non, en tant que tel, un événement E15/E3 natif. Dans cet épisode, `LBW15_CREUX` source 14h45 est distinct de `E15 UP` source 15h15. Les deux sont utiles mais leur identité, leur sourceTs, leur disponibilité et leurs rôles **ne doivent plus être confondus** sous une même étiquette « E15 ». Il ne faut pas supprimer ni modifier leurs horodatages historiques.

## 4. Contrefactuel diagnostique, NON déployé

Un replay **strictement en mémoire** modifiant uniquement la deuxième condition en `...||priceCandidate.held` a généré des propositions LONG, notamment vers 15h51 recalculé et 16h00. **Ce n'est pas un backtest de trading** : aucun ledger, aucun taux de réussite et aucune politique de sortie complète n'ont été rejoués ; les sources historiques reconstruites ne concordaient pas entièrement avec le journal réel pour 15h51. Le journal d'origine fait foi.

Il serait dangereux de déployer ce seul `OR` : `actualDefense().held` signifie actuellement principalement un franchissement sur **bougie 3m confirmée au-dessus/dessous d'une frontière locale**, pas nécessairement un **vrai retest défendu**. Remplacer un veto arbitraire par l'autorité mécanique d'une simple cassure recréerait des entrées tardives.

## 5. Proposition de correction **à valider séparément**, pas d'empilement de shadow

1. Garder **MCB15 directeur** depuis l'origine et le cycle causaux ; séparer dans les champs d'état `LBW_EXTREME` géométrique et `E15_NATIVE` confirmé/Live. Ils ne votent pas deux fois.
2. Transformer `mcb3Direction` (dernier creux/crête LBW) en **mémoire de la respiration et de sa maturité**, non veto absolu sur une campagne MCB15 opposée. La chaîne `nouvel E3 UP natif/cross3 + contexte E15 UP + test du prix + MF favorable` doit avoir le droit d'être examinée pour la continuation.
3. Donner une vraie autorité à **la défense du territoire éprouvé**, plutôt qu'au booléen `actualDefense().held` seul. Réutiliser `acceptedRetest.state=DEFENDED`, les épisodes MA3/MA15, le prix et le stop causal. Un simple franchissement rapide d'une MA ne doit pas être présumé une résistance non plus.
4. Préserver les signaux tant que leur phase n'est pas invalidée structurellement ; ne pas réimposer un nouveau cross si la défense du prix a créé une preuve réellement nouvelle. Éviter les réentrées automatiques après profit floor sans requalification.
5. Tester la correction sur les cas négatifs #35–37, #42 et #26, les réussites #59–61 et la campagne LONG manquée, **avec les données as-of qui existaient dans les journaux réels**, avant changement du PAPER actif. Chiffrer aussi les sorties prospectives et les frais, ne pas calculer le succès sur le plus-haut connu après coup.

## Situation à 17h24 CET
V5.4 PAPER `DATA_OK`, ledger 61 clôtures, equity **920,7003 USD** (historique toutes Constitutions confondues), #62 SHORT toujours ouvert à 80 256,3 ; MFE ~112,4 BTC USD, MAE ~98,5, PNL courant enregistré ~−0,11 USD **non réalisé**. V4.9.3 a 18 clôtures, equity historique ~954,31 USD. Ne pas comparer les equities cumulées comme si les moteurs avaient le même début de série.

**Aucune modification active n'a été effectuée pendant ce diagnostic.** Les règles, protections et processus sont intacts. Le diagnostic explique une opportunité **observée après coup**, il ne prouve pas qu'une nouvelle version serait rentable.
