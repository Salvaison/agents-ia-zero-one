# OD-20261030-002 — Recherche V4 protections et continuation

Mandat demandé le 30 octobre 2026 : investiguer historiquement 220/180, comparer V494 avec floors et limites structurelles, expliquer le contrefactuel #102, s'assurer que les règles de confirmation ne coupent pas les grandes campagnes. La recherche est **lecture seule**, sans autorisation explicite de modifier moteurs ou services.

Constats déclencheurs, source code/doc :
- V4.9.3 worktree gelé cdf1936 avec MFE 440 + giveback180 + PM/micro opposés ; protection indépendante 220→180 dans V4.10.0 le 15/10 suite à #125, puis étage120→90 dans V4.10.9 du 21/10 ; V4.10.10 déclenche dès prix observé.
- V4.9.4 PAPER utilise V4.9.3 et ne possède donc pas floors fixes ; V5.4.3 les utilise. Les retracements de #102 et le contraste #47/#49 motivent une enquête contradictoire.
- Compte tenu des collecteurs et de la rotation des données, seuls les 4 derniers trades de la cohorte (#47–50) sont couverts sur prix Audit 30s, les plus anciens via bougies confirmées 3m. Ces replays ne sont pas un contrefactuel exact des fills et ne simulent pas un portefeuille/une réentrée.
- L'utilisation de mapPlace sur V494 est une transposition analytique du code V5, pas une preuve de niveau réellement calculé par V4. WHERE ne devient jamais veto autonome.
Le document 02 reproduit la mission de lecture/étude formulée par l'assistant et réalisée via scripts locaux ; ne prétend pas avoir été envoyé à un agent externe. Le document 01 conserve la demande utilisateur intégrale sans correction orthographique. Les sources et scripts d'étude sont conservés sous data/research-briefs sur Amsterdam ; la KB ne contient pas de flux volumineux.
