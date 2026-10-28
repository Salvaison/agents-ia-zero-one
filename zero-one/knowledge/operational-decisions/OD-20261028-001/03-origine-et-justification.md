# Origine et justification — OD-20261028-001

## Déclencheur exact
L'utilisateur demande le 28 octobre 2026 que **chaque décision opérationnelle** conserve **le prompt qui la décrit dans son intégralité**, avec une explication de son origine. Son texte exact est archivé séparément comme document 01. Il ne s'agit pas d'une demande de modifier une stratégie de trading.

## Contexte antérieur et chaîne causale
Le même 28 octobre 2026, après la saturation rapide de plusieurs conversations techniques BOONO et la perte du fil de recherche, l'utilisateur a imposé une routine systématique de compression des analyses, de checkpoint et de conservation de la Knowledge Base. Cette première étape a été documentée dans `BOONO_protocole_recherche_compacte_invalidations_2026-10-28.md`, mise en service en lecture seule avec le commit Git `192a692` et un ensemble de tests.
La lacune identifiée maintenant est explicite : résumer les décisions, implémentations et résultats ne suffit pas à retrouver **la formulation exacte de l'instruction**, l'autorisation et les raisons qui ont conduit à agir. Une réinterprétation ultérieure pourrait modifier la portée réelle du mandat.

## Décision autorisée, auteur et provenance
- **Aucune réécriture de l'autorisation utilisateur.** Texte intégral dans `01-demande-utilisateur-integrale.txt`, attribué à l'utilisateur et à la conversation présente (28/10/2026). Aucun permalink ChatGPT n'a été fourni.
- **Prompt opérationnel distinct :** `02-prompt-operationnel-integral.txt` est la consigne complète rédigée par l'assistant pour implémenter cette procédure documentaire. Ce texte n'est PAS présenté comme un message original de l'utilisateur.
- **Portée autorisée :** règles de documentation et outils pour archiver les décisions BOONO sur Amsterdam/GitHub ; rien sur les moteurs V4/V5, le serveur de rendu OVH ni les règles de trading.
- **Motif :** préserver à la fois l'instruction entière et son origine pour les changements d'équipe, les audits, les désaccords de lecture et les prochaines discussions.

## Critères vérifiables
Chaque nouvelle décision opérationnelle doit avoir avant son implémentation : demande/validation littérale, prompt d'exécution littéral, origine explicative, mandat, statut, empreintes contrôlables. La mise en service et les tests sont des événements séparés. Interdit de réécrire l'ancien prompt pour s'adapter à la politique mise en oeuvre ; dans ce cas établir un nouveau dossier lié.

## Statut initial
Demande documentaire **autorisée par l'utilisateur** ; implémentation, test et publication à enregistrer uniquement après vérification de chaque étape. Le seul mandat ici est la traçabilité opérationnelle.
