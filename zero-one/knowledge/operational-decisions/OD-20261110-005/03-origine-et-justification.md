# OD-20261110-005 — Pronostic et Décision + Invalidation réunis

**Source de l'autorisation :** utilisateur de BOONOTRADE, 10 novembre 2026, texte de remplacement et PDF `5pronostic-decision.pdf` attaché. Le verbatim de la demande figure dans `01-demande-utilisateur-integrale.txt`. Le PDF lui-même reste dans la conversation, non publié.

**Constat :** la disposition précédente juxtapose Pronostic et Décision dans deux cartes puis projette chaîne causale, attention, risque, maturité, position, compte PAPER et autorité floor en bandeaux distincts. Cette densité gêne la lecture sur téléphone.

**Décision UI :** déplacer les éléments demandés dans une seule carte 5, en respectant la distinction *pronostic MCB15* vs *décision effective*, et déplacer les informations purement techniques dans un volet repliable.

**Invariance structurelle :** `position.invalidationPrice` n'est pas nécessairement `analysis.invalidation.price`. La première valeur est mémorisée pour la position en cours ; la deuxième est un niveau contextuel recalculé. Les deux restent consultables sans modification du moteur.

**Limites :** aucune nouvelle règle d'entrée/sortie, aucune intervention dans les données de marché, aucun changement TV sur OVH. Le test rendu Node ne remplace pas la validation visuelle du propriétaire sur téléphone.

