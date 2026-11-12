# OD-20261112-003 — Refonte complète typoTV02 à cinq rubriques

**Origine :** demande de correction du propriétaire « Mais je ne vois aucune mises à jour de la typo? », appuyée par le PDF de deux pages etat_vivant_typoTV02(1).pdf. La précédente intervention avait changé des termes sans appliquer la composition du PDF.

**Nouvelle référence :** cinq rubriques sur fond noir, titres cyan, valeurs fortes, position PAPER séparée, MA15, DailyRange et BigRange. Les données V5/MCB/OKX sont vivantes et non celles de l'exemple PDF.

**Provenance des chiffres :** data/v52-paper-state.json, data/levels.json et les séries MCB/AUDIT/Elastic. Les deux ranges partagent latestAnalysis.price au même asOf. BELOW_VAL est un constat géométrique ; RANGE_DAILY_LOST n'est pas affirmé sans acceptation.

**Frontière :** changement de présentation et de lectures read-only uniquement ; aucune stratégie, aucun moteur PAPER, aucun ordre, aucun niveau saisi ni calibration OVH ne sont modifiés.

**Validation :** tests JavaScript calculs/rendu, échantillon réel relayé Amsterdam vers OVH, capture Chrome headless du panneau gauche à 1920x1080, cinq rubriques visibles. Validation utilisateur dans le studio complet encore ouverte.
