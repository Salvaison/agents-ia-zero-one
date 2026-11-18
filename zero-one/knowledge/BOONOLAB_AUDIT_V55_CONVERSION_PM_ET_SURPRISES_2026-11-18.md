# BOONOLAB — Audit à froid des règles V5.5 qui produisent des admissions trompeuses

**18 novembre 2026, Amsterdam.** Portée : audit du code et des états PAPER en lecture seule après demande explicite : « "l'entrée tardive avec PM Live SHORT à seulement +5 $" ???? c'est quoi ça aussi? tu as d'autre surprise comme ça? »

**Statut : constat vérifié sur code déployé et 17 trades clos, AUCUNE correction PAPER décidée dans ce contrôle.** Le risque-stop mécanique 8×3m a déjà été corrigé dans la politique V5.5 v1.1 sous OD-20261118-002 ; il ne faut pas confondre cette correction déjà en service avec l'audit présent.

## 1. La formule exacte de « PM Live +5$ SHORT »

Source : `modules/v5/decision-v52.js` : `pmLastBaton = last.priceMove` du relevé Audit Bâton ; `pmSinceBaton = price live OKX - last.lastPrice` ; `pmCombined = pmLastBaton + pmSinceBaton`. Dans `modules/v5/decision-v55.js`, `pmLiveDirectional = direction(±1) × pmCombined`. Ce n'est **pas** un bénéfice PAPER, une liquidité mesurée, un décompte d'ordres, ni une confirmation indépendante du MCB. PM3 et PM5 sont des fenêtres de déplacement de prix plus longues qui **se recouvrent** : ce ne sont pas deux votes indépendants.

Le trade #15 SHORT est exécuté le **17/11 à 17h27m39s CET**, prix **63 929,60 USD BTC** ; à l'admission `pmLiveDirectional=+5`, `pm3Directional=+144,5`, `pm5Directional=+183,4`, `mf3Directional=+2,3` (signes normalisés SHORT). Chronologie `v55-paper-decisions.segment-20261117T215542281Z.ndjson` : à **17h27m14s** PM directionnelle **−0,3**, à **17h27m39s** **+5,0** (ENTER), à **17h27m44s** **−60,2** (HOLD), à **17h28m14s** **−37,1** (HOLD). Ces valeurs fluctuent beaucoup avec les ticks ; +5 seul ne démontre pas l'épuisement, mais ne démontre pas une conversion fraîche non plus.

### Règle actuelle qui a effectivement autorisé #15

`conv.productive` exige **PM3 signée >8, PM5 signée >8, MF3 signée ≥−0,15, PM combinée signée ≥−10 USD BTC**. L'admission *accepte donc une PM directionnelle légèrement adverse jusqu'à −10* et la qualifie `productive:true` si les autres horizons sont favorables. Cette convention a été introduite par l'assistant lors de V5.5 le 16/11. Elle est consignée dans la constitution, mais **ce fait documentaire ne constitue pas une validation économique de l'utilisateur**.

Les mécanismes `marketGate` exigent `pmLiveDirectional > 15` **seulement pour l'exception aux marchés STERILE_HESITANT ou au DENSE_CONTRADICTOIRE très inefficace**. Pour `DIRECTIONNEL_PRODUCTIF`, comme au trade #15, le filtre de conversion permet **+5**. Il n'existe pas de plafond d'admission `PM Live>40`.

## 2. Constat quantitatif sur les 17 clôtures V5.5 (petit échantillon !)

| PM combinée signée à l'entrée | Nombre | Gagnants | P&L net USD PAPER | Trades |
|---|---:|---:|---:|---|
| Négative (tolérée ≥−10) | 3 | 1 | +3,93 | #2, #7, #17 |
| Entre 0 et +10 | 1 | 0 | −3,19 | #15 |
| Strictement >10 et <40 | 7 | 0 | −38,10 | #1, #4, #5, #6, #9, #11, #16 |
| ≥40 | 6 | 4 | +8,30 | #3, #8, #10, #12, #13, #14 |

L'ancienne statistique V5.3.3 du 26/10 (« 8/11 gagnants PM Live entre 10–40 ; 1/8 au-delà de 40 ») était **in-sample** et ne valide pas une interdiction PM>40. Le micro-échantillon V5.5 le plus récent montre même la tendance contraire. **Ne pas optimiser une règle de plafond sur ces 17 résultats.** Les horizons PM3, PM5 et PM Live sont mathématiquement corrélés.

## 3. Autres surprises identifiées à auditer/proposer à décision distincte

### A. MA15 confondue avec défense complète

`decision-v55.js#provenTerritory` commence par chercher `CONFIRMED_3M_BREAK_RETEST_HOLD`, mais **en cas d'échec retombe sur `base.readings.structural54.testedTerritory.validated`**, qui peut avoir été validé par une logique MA15. #14 SHORT a précisément été admis avec `territory.kind=MA15_CLOSED_CONTACT` alors que le régime était `STERILE_HESITANT`, et s'est terminé à **−6,9988 USD net**. La phrase en commentaire « Merely touching an MA never counts as defence » n'est donc pas imposée à toutes les branches du code. Il faut différencier contact/acceptation/retest effectivement conservé, sans interdire toutes les MA.

### B. Maturité persistante V543/S1 non intégrée à V5.5

Dans `runner-v55.js#independentlyEvaluate`, le moteur appelle `decision-v543.evaluate` avec **`position:null`, `previousAttention:null` et `previousOffensiveMaturity:null`**, et en extrait les preuves `readings`. Le `deferNewEntry` avec mémoire persistante de V543 n'est **pas** appliqué tel quel à V5.5 ; V5.5 a son propre veto `matureEdge` beaucoup plus conjonctif : `twoHourPriceRank≥0.9` ET `origin4h.progressVs15mRange≥4` ET `slope15<5`. Un PM faible et une impulsion avancée ne suffisent donc pas à déclencher ce veto. S1 v0.2 est un observateur **SHADOW**, n'a **aucune influence** sur V5.5 PAPER.

La prétendue « indépendance complète » du modèle V5.5 doit être nuancée : **ledger, politique de décision et flux ticks propres, mais extraction structurelle dépendante du code évaluateur V543 à chaque tick**, sans son état attention/position mémorisé. Changer l'évaluateur V543 peut par conséquent modifier les preuves remises à V5.5.

### C. Stop d'invalidation enregistré ≠ ordre de stop absolu

Depuis v1.1 l'invalidation candidate est structurelle, mais pendant la position V5.5 elle est demandée comme sortie seulement si **au moins une des deux dernières bougies 3m confirmées a clôturé au-delà du niveau avec marge ET si PM adverse OU cross3 opposé** (ou si d'autres règles de transfert/contre-attaque s'appliquent). Le cap `-500 BTC USD` sur un tick frais est distinct et **mesuré depuis l'entrée**, et aucun véritable ordre stop n'est placé chez un broker. L'invalidation n'est donc pas une liquidation automatique exactement au niveau ; cette condition a besoin d'être explicitée et évaluée, particulièrement en volatilité violente. Le ledger ne modélise ni glissement ni financement.

### D. Exception de marché « stérile » reposant sur seuils non calibrés

La sortie du lecteur de régime porte `status=DESCRIPTIVE_SHADOW_NOT_VALIDATED`, mais `decision-v55.js#marketGate` transforme sa catégorie en **autorité d'admission** (avec exception si territoire validé, progrès 15m ≥max(90,0,9× range médian 3m), PM combinée favorable >15). C'est un seuil d'essai explicite mais non validé hors-échantillon. #14 en `STERILE_HESITANT` passe cette exception avec `MA15_CLOSED_CONTACT`. Sur les 17 trades V5.5, **8** entrent classés stériles (net **−20,89 USD**). Cette lecture ne fournit pas une preuve causale suffisante pour décréter un veto sur toutes les campagnes stériles.

### E. Plusieurs autres seuils conjonctifs d'entrée et sortie restent expérimentaux

Admission : `freshCross ≤18 min`, `E3 natif récent ≤25 min` ou Live ≤3m, slope LBW15 continuation ≥−1/3min ≥−2, mouvement 3m ≥max(22,0,28× range médian), prix signé 15m ≥−35, antichurn 15min. Une poursuite peut donc être admise avec légère pente LBW15 contraire, prix 15m presque neutre/négatif, PM combinée légèrement défavorable.

Protection : contre-attaque `cross3Opp && E3Opp && adversePM && (lbw15Opp3m || lbw15Opp15m)`, puis restitution `MFE≥100` et `giveback≥max(85 USD BTC, 30% MFE)`. Cette logique explique la sortie tardive #15 avec MFE environ +476,6 de mouvement BTC, mais au final net **−3,1879 USD PAPER**. Une critique du seuil ne constitue pas une validation d'une nouvelle règle alternative.

## 4. Décisions / statut

- **AUCUNE règle PAPER modifiée durant cet audit.** V5.5 v1.1 + V543 restent en service sous leurs contrats actuels jusqu'à décision explicite.
- Priorité d'évaluation : distinguer conversion immédiate neutre/faible/adverse, traduction supplémentaire après admission et maturité du mouvement ; réserver un statut qualitatif `COMPATIBLE_NOT_PROVEN_PRODUCTIVE` à la tolérance PM négative (proposition, NON implémentée).
- Proposer une révision séparée du statut `MA15_CLOSED_CONTACT` comme défense, du raccordement de mémoire S1 v0.2, et de l'invalidation de position, après analyse des contre-exemples gagnants.
- Réduire les « surprises » : faire apparaître publiquement et systématiquement dans la KB les règles codées, leur autorité, leur provenance, leur état de validation et le trade qui les a déclenchées.

**Sources internes :** `modules/v5/decision-v52.js`, `modules/v5/decision-v55.js`, `modules/v5/paper-v55.js`, `modules/v5/runner-v55.js`, `data/v55-paper-state.json`, `data/v55-paper-decisions.segment-20261117T215542281Z.ndjson`, `knowledge/BOONO_audit_43_trades_2026-10-26.md`, `knowledge/BOONOLAB_V55_MOTEUR_PAPER_REMPLACE_V494_2026-11-16.md`, `knowledge/BOONOLAB_S1_V02_MEMOIRE_CAMPAGNE_ET_V55_STOP_CAUSAL_2026-11-18.md`.
