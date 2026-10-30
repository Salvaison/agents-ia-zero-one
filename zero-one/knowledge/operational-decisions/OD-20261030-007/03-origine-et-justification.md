# OD-20261030-007 — demande complémentaire de ticker 4×15

Le propriétaire ajoute explicitement au travail de restauration d'Elastic pour V4.9.4 un **ticker d'états sur quatre bougies consécutives de quinze minutes** et exige de le corroborer avec les signaux et résultats du shadow. Ce dossier complète **OD-20261030-006** et ne l'annule pas.

La constitution Elastic V1 du 22 octobre (`knowledge/elastic-operational-v1-constitution-2026-10-22.md`), addendum utilisateur, proposait une distribution temporelle non numérique des qualités de conversion et des efforts/rendements par bougie 15m, régime agrégé sur une heure et distinctions E3/E15/MCB/MF. Le V5 Elastic Memory v0.1 avait amorcé cette lecture, mais s'est arrêté historiquement le 23 octobre. Le nouveau V494 Elastic en construction doit la reconstruire sur les sources 494 effectivement actuelles.

**Choix :** les fractions de temps observées, rapport P75 effort/rendement et prix conservé doivent être **as-of**, alors que les déplacements futurs servent seulement de validation a posteriori. Le ticker corroborera ou contredira des hypothèses, sans devenir une source de votes supplémentaires ni affirmer qu'une impulsion forte implique toujours un retournement. Aucune modification de l'algorithme PAPER V494 ou V543 autorisée.
