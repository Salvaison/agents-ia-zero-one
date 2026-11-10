# OD-20261110-003 — Volume global moyen et qualité de conversion distincts sur le ticker 4×15

**Origine :** demande explicite du propriétaire le 10 novembre 2026, à la suite de l'enquête « SILENT/INEFFICIENT malgré un volume élevé ». Le message intégral est dans \`01-demande-utilisateur-integrale.txt\`. Elle prolonge l'OD-20261110-001 et l'OD-20261110-002.

**Besoin :** première valeur = moyenne du volume échangé sur la tranche ; seconde = deux principales qualités et leurs parts temporelles, **inchangées** ; autres métriques conservées.

**Constat et source :** la comparaison effort/rendement V493 est basée sur des fenêtres de mesure différentes. Des bougies OKX d'une minute fournissent une mesure indépendante du volume exécuté \`volCcy\` en BTC, contrôlée en lecture seule. La présente opération **n'altère pas** les pourcentages historiques des qualités, pour maintenir une comparaison honnête. Leur recalibrage exige une décision d'étude séparée.

**Frontière de changement :** module de volume autonome d'observation et petit enrichissement de l'endpoint authentifié \`/api/shadows/v494-elastic\` et de son rendu dans l'État vivant de BOONO Watch. Aucune entrée, sortie, veto ou ledger PAPER affecté. Aucune modification du studio BOONO-TV.

**Statuts :** autorisé, implémenté, testé, mis en service ; visuel final à valider par le propriétaire, event log dans le registre.

