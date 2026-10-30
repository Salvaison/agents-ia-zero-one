# OD-20261030-005 — Exposer le laboratoire V494 dans SHADOWS

L'utilisateur demande le 30 octobre 2026 d'exposer les résultats du shadow à double module Entrée/Sortie dans l'onglet SHADOWS de BOONO Watch.

Source technique vérifiée : le service PM2 boono-v494-entry-exit-shadow (mode SHADOW_ONLY, brokerOrdersEnabled=false, decisionImpact=false) écrit `data/v494-dual-module-shadow-summary.json` (~2.2 Ko actuellement), avec quatre branches :
A EXACT_V493__FROZEN_V493 ; B EXACT_V493__CONTINUATION_SUPERVISOR ; C MCB15_INFLECTION__FROZEN_V493 ; D MCB15_INFLECTION__CONTINUATION_SUPERVISOR.
Les séries de transactions et événements y sont bornées. Aucune nouvelle position clôturée au premier contrôle; afficher absence de résultats, ne pas fabriquer des P&L.
L'onglet SHADOWS existe dans `modules/config-server.js`. `/api/shadows` est une API plus lourde, avec 90s de cache, basée sur des vieux shadows V4 : ne pas ajouter à ce chemin un scan du ledger shadow complet. Préférer endpoint séparé no-store qui lit seulement le summary, et rendu indépendant dans l'onglet SHADOWS.
Limites : B−A etc sont descriptifs, pas preuve d'efficacité causale/PNL comparables sans états et expositions synchronisés. Les premiers épisodes devront vérifier concordance branche A vs V494 réel, puis les divergences.
Le changement autorisé est uniquement interface/observabilité ; V494, V543, ArchiveAudit14D et shadow décisionnel restent inchangés. La demande utilisateur mot à mot est conservée comme document 01, le prompt assistant comme 02, et les étapes dans le journal de décision.