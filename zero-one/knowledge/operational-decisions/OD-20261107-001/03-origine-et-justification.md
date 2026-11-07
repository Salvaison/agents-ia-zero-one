# OD-20261107-001 — Observatoire multi-familles, menace de position et régimes de marché

**Origine utilisateur :** après une analyse de V543 #182, le propriétaire estime qu'une reprise adverse importante consécutive à une grande impulsion justifie l'invalidation **dès les premières ~60 secondes**, avant les confirmations E3/E15 tardives. Il valide la construction d'un journal complet de **sept familles causales** avec **lecture non perturbée par les rafraîchissements de 30 secondes**, ainsi que les chantiers d'observation de menace et de qualification de marché.

**Périmètre autorisé** : modules indépendants en SHADOW, recherche comparative et UI de lecture. **Aucune modification des sorties ou des admissions PAPER** : sa remarque sur « sortie à mon avis » est une hypothèse de performance à tester prospectivement et sur replay, et ses « propositions » faisaient explicitement référence à des observateurs sans autorité. Toute promotion ultérieure en sortie réelle PAPER exige décision et tests séparés.

**Contexte probant :** #182 SHORT à 75 941 $ BTC, creux 74 939,5 $ vers 16h05m44s, rebond +206,6 $ à 16h06m44s, +340,3 $ à 16h07m14s ; la chute est un mouvement de cours, pas une preuve de liquidations forcées sur OKX. Le prix observé 16h06m44s permet un net virtuel de +14,21 $ sans slippage contre +3,89 $ réel, mais plusieurs contre-attaques antérieures dans la même campagne se sont avérées temporaires. Ne pas fabriquer une première alerte exclusive tardive si un shadow a déjà détecté des avertissements plus tôt.

**Éléments existants réutilisés** : causal-event-feed-v54 (E3/E15 BW-LBW), attention-memory, evidence-adapters, ma-polarity-memory, v494-elastic-ticker et v494-elastic-state-layer. Ce dernier possède sept dimensions d'états, **distinctes** des sept familles événementielles exigées. Protéger la session et la lecture de la Chronologie : une vue séparée sans polling navigateur.

**Gouvernance** : approbation implémentation SHADOW et UI, pas de seuils adoptés sur moteur. Documenter AUTORISE, IMPLEMENTE, TESTE, MIS_EN_SERVICE séparément avec preuves réelles, et toutes limites d'échantillon. PAPER V494/V543 et leur capital de simulation intacts.
