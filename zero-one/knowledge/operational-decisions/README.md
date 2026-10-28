# BOONO Systems — registre des décisions opérationnelles, prompts intégraux et provenance

**Règle validée le 28 octobre 2026** : chaque décision opérationnelle doit conserver **le(s) message(s) source intégral(aux)**, **le prompt opérationnel final intégral** et **une explication de son origine**. Un simple résumé ou numéro de version ne remplace jamais les textes originaux.

## Ce qui déclenche l'archivage

Chaque décision opérationnelle qui autorise ou modifie un comportement, script, paramètre, service, déploiement, interface, méthode de recherche, politique ou procédure BOONO. Une observation, hypothèse ou proposition non approuvée est dans la KB comme hypothèse ; elle ne doit jamais être inventée comme autorisation.

Le dossier **doit exister avant le premier acte d'exécution**. C'est un préalable de travail obligatoire pour les agents et nouvelles discussions, pas une collecte automatique des chats par ChatGPT. L'agent doit effectuer l'archivage explicitement via l'outil et le dépôt. S'il ne dispose pas du texte original, il ne doit pas fabriquer de faux verbatim : retrouver la source ou indiquer que l'archive intégrale manque avant d'affirmer la décision exécutable.

## Contenu d'une décision OD-AAAAMMJJ-NNN

- `01-demande-utilisateur-integrale.txt` — texte **copié exactement**, sans synthèse, du ou des messages utilisateur constituant la demande et l'autorisation. Si plusieurs messages forment l'autorisation, préserver chaque texte sans coupure et identifier clairement l'auteur, l'ordre et la référence de la conversation.
- `02-prompt-operationnel-integral.txt` — consigne finale **exactement telle qu'elle est confiée à l'agent exécutant**, avec contraintes, interdictions et critères d'acceptation. Signaler distinctement s'il s'agit d'une formulation rédigée par l'assistant plutôt que par l'utilisateur.
- `03-origine-et-justification.md` — événement déclencheur, analyse et faits antérieurs, raison des choix, références, alternatives rejetées, mandat/autorisation, portée et limites. Les observations rétrospectives ne sont jamais présentées comme des preuves disponibles lors d'un trade historique.
- `manifest.json` — identifiant, référence, mandat et empreintes SHA-256 du contenu original exact. Les fichiers ci-dessus ne sont jamais remplacés silencieusement.
- `events/0001.json`, `events/0002.json`, etc. — étapes successives **AUTORISE / DOCUMENTE / IMPLEMENTE / TESTE / MIS_EN_SERVICE / SUSPENDU / ANNULE / REMPLACE**, chacune avec justification et preuve. Les événements antérieurs sont conservés ; une évolution substantielle fait l'objet d'une **nouvelle décision** liée à la précédente.

Une approbation brève (« oui ») n'est pas un prompt complet autonome. Retrouver la proposition exacte approuvée et la conserver littéralement dans le dossier, en plus du texte court d'approbation. Ne jamais reconstruire une demande originale à partir d'une mémoire résumée.

## Usage, depuis la racine du dépôt

Préparer des fichiers UTF-8 **complets** `/tmp/source.txt`, `/tmp/operation.txt`, `/tmp/origine.md` sans recopier des données de trading volumineuses.

```bash
python3 zero-one/scripts/boono-decision-archive.py create \
  --id OD-20261028-001 --title "Traçabilité intégrale des prompts opérationnels" \
  --user-prompt /tmp/source.txt --execution-prompt /tmp/operation.txt \
  --origin /tmp/origine.md \
  --authorization "Demande explicite de l'utilisateur (source jointe)" \
  --reference "Conversation BOONO du 28 octobre 2026 (sans URL fournie)"
python3 zero-one/scripts/boono-decision-archive.py event \
  --id OD-20261028-001 --status TESTE \
  --description "Tests de conservation des prompts effectués" \
  --evidence "Commande de test et résultats avec date"
python3 zero-one/scripts/boono-decision-archive.py verify
```

Les fichiers préparatoires sous `/tmp` ou dans `data/` ne remplacent PAS l'archive versionnée. Les prompts originaux doivent être figés **avant exécution** ; les événements documentent ensuite les actions réelles. Une révision du prompt ou une nouvelle validation n'efface jamais un ancien prompt : créer `OD-...-002` et expliquer ce qu'elle remplace.

**Confidentialité :** ne publier aucun secret, jeton, mot de passe ou donnée sensible dans Git. En présence d'un secret, conserver l'original intégral uniquement dans un stockage protégé autorisé (non implémenté ici) et sa référence/hachage dans le registre ; si aucun moyen sécurisé n'est disponible, interrompre l'archivage Git de ce contenu et signaler l'obstacle, sans jamais déclarer l'exigence satisfaite par une version tronquée.

**Validation technique :** la commande `verify` vérifie les empreintes des originaux et la chaîne des événements. L'historique Git fournit la traçabilité des modifications de dépôt. Ni les empreintes ni le script ne sont une signature juridique, ni une capture automatique de l'interface ChatGPT.

## Passations

Avant une nouvelle discussion, ouvrir ce registre et `zero-one/data/research-briefs/active-research.md`, puis seulement les rapports pertinents. Chaque compte rendu de passation référence l'identifiant de décision et, si applicable, le commit d'implémentation. Ne jamais prendre `DOCUMENTE` pour `MIS_EN_SERVICE` ou une hypothèse pour une approbation.

## Première décision

- [OD-20261028-001 — rendre obligatoires les prompts opérationnels intégraux avec leur origine](OD-20261028-001/03-origine-et-justification.md)

### Note de provenance du premier dossier (bootstrap)

Pour OD-20261028-001, le document 01 est **exactement** le message utilisateur. Le document 02 est un prompt de mission **rédigé par l'assistant pendant l'installation du registre** pour décrire intégralement cette intervention ; il **n'a pas été envoyé tel quel à un agent externe**. Cette exception de démarrage ne peut pas servir de précédent : à partir des opérations suivantes, le prompt réellement transmis à l'exécutant doit être figé avant exécution. Cette distinction est enregistrée dans le journal d'événements du dossier.
