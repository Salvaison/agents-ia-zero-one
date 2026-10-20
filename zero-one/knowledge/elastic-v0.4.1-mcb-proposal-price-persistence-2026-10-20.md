# BOONO Systems — Elastic v0.4.1, proposition MCB et mémoire du prix

Date : 20 octobre 2026. Statut : **correction du shadow Elastic v0.4 seulement**, pas d'autorité sur les trades.

## Problème confirmé
Vers 17:15 Paris le 20 octobre, l'E15 DN était confirmé et MCB indiquait `REVERSAL_FORMING SHORT` ; Elastic continuait d'afficher « LONG PRINCIPALE » jusqu'à ~17:33 car :
1. sa variable `mcbProposal` privilégiait l'ancienne `structuralDirection` 15m sur la candidature MCB actuelle ;
2. son changement d'étiquette exigeait une conjonction **instantanée** PM3/PM5 + efficacité + trois familles de preuves.
3. le vieux E15 UP restait présenté comme preuve confirmée active même lorsqu'un E15 DN plus récent existait.

## Correctifs
- `primaryThesis` / `mcbAuthority` suivent immédiatement `baseThesis.candidateDirection` (ou sa direction) si la donnée MCB est saine. Une proposition MCB n'est **pas** une permission d'entrée.
- `structuralDirection` expose séparément la trajectoire causale 15m confirmée ; on peut voir « MCB SHORT proposé / trajet structurel LONG » pendant le transfert.
- `priceDominance` décrit exclusivement la conversion de prix observée sur 3/5/15/30 min dans l'AUDIT, sans score ou pseudo-probabilité. La convergence 15 et 30m est distincte de la direction MCB ; lorsque 15m rebondit mais 30m conserve un grand mouvement vendeur, le contexte 30m reste visible comme **contesté**, non effacé.
- `handoffs` enregistre le changement de proposition MCB, sans attendre une confluence PM simultanée. Les mesures PM, E3/E15, MF et leur cycle de vie restent présentes dans les chaînes.
- Un E3/E15 confirmé provenant d'un signal plus ancien que le dernier événement confirmé opposé passe de `ACTIVE` à `SUPERSEDED` : sa mémoire est conservée, mais elle ne contribue plus aux observations actuellement actives. L'instant source du natif reste distinct de sa première observation.
- Interface État V4 (au-dessus de l'État vivant) : en-tête `MCB propose`, `trajet 15m`, `prix 15/30m` ; dans chaque fenêtre, prix 15/30m et nombre **d'observations / de familles** (« pas des votes »), et mini-section « signal historique dépassé ».

## Replay #148 / 17h15
Relecture isolée des évaluations enregistrées du 20 octobre (timestamps des journaux UTC) :
- 17:14 Paris : PM vendeur et prix en baisse, ancienne candidature MCB LONG ;
- **17:15:40 Paris : nouvelle proposition MCB SHORT** ; la nouvelle version bascule immédiatement `primaryThesis=short` tout en affichant `structuralDirection=long`.
- 17:16 : ancien E15 UP classé `SUPERSEDED`, E15 DN courant `ACTIVE`.
- 17:30 : `structuralDirection=short` ; pas de deuxième basculement artificiel de la thèse principale.
- 17:33 : la logique précédente attendait jusqu'ici avant de basculer SHORT.
- 17:36 : fenêtre de prix 30m ≈ −603 USD, fenêtre 15m ≈ +93 USD ; le shadow affiche les deux mesures, sans croire qu'une respiration annule tout le mouvement précédent.

La chronologie est retrospective et ne constitue **pas** une performance d'entrée/sortie ni une probabilité calibrée.

## Contraintes et limites
- Version top-level conservée `elastic-dual-chain-shadow-v0.4` pour maintenir les deux chaînes persistantes lors du rechargement ; champ `revision = mcb-proposal-and-price-persistence-v0.4.1`.
- Toutes les évaluations de trading demeurent V4.10.8, sans modification de `action.js`, `setup-lifecycle.js`, anti-churn, risque, sorties, seuils ou collecteurs.
- La dominante de prix 15/30 est un **descriptif de terrain** : des fenêtres opposées n'ont pas été réconciliées par un score arbitraire. Il reste à apprendre la valeur économique et l'âge effectif des interactions dans un Elastic ultérieur.
- Les preuves MCB/LBW/MF/PM restent corrélées. Le nombre de preuves est explicitement une mesure d'observations, pas un vote probabiliste.
- Tous les tests de la suite V4 et le test de rendu doivent passer avant déploiement.

## Fichiers
`modules/v4/experiments/elastic-dual-chain-shadow.js`, `modules/config-server.js`, `tests/v4/elastic-dual-chain-shadow.test.js`, cette archive et `knowledge/version-log.md`.
