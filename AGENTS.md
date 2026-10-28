# BOONO Systems — consignes de travail persistantes (GitHub / Amsterdam)

**Point d'entrée de toute nouvelle discussion BoonoLab :** lire `zero-one/BOONOLAB_START_HERE.md` (architecture, qui est BOONO, objectifs et difficultés), puis `zero-one/knowledge/BOONOLAB_INDEX.md` (sources spécifiques, anciennes passations intégrales, registre et état vivant). Ces deux documents sont génériques : ne pas les remplacer par une ancienne photographie de version.

Pour toute enquête, audit, replay ou correction sur BOONO Systems :

1. Après la carte générale et l'index, lire `zero-one/knowledge/BOONO_protocole_recherche_compacte_invalidations_2026-10-28.md` et le checkpoint actif (`python3 zero-one/scripts/boono-research-brief.py show`, si disponible). La Knowledge Base est la source des décisions et passations, pas l'historique du chat.
2. Faire les lectures lourdes et calculs **sur Amsterdam**, pas dans les messages : ne sortir que les agrégats, quelques cas contrastés, les limites et les questions ouvertes. Conserver les preuves intégrales localement sous `zero-one/data/research-briefs/`, non versionné ; utiliser `zero-one/scripts/boono-research-brief.py` pour les audits d'invalidation et les checkpoints.
3. Après chaque découverte substantielle et avant tout changement de sous-sujet / passation de discussion, enregistrer un checkpoint structuré par statuts **constat vérifié / hypothèse / décision validée / implémentation / tests / mise en service / ouvert**, avec provenance, limites et plage temporelle.
4. Pour toute décision réellement approuvée ou intervention effectuée, actualiser la Knowledge Base du dépôt et produire un commit ciblé ; vérifier les tests et le SHA distant. Ne jamais conclure « implémenté », « testé » ou « déployé » à partir d'une simple proposition.
5. Les deux moteurs V5 et V4 restent des simulations PAPER distinctes : aucune modification de leurs règles, du risque, des ordres ou des processus n'est autorisée par ce seul protocole. Aucune écriture sur les ledgers live, aucun redémarrage pour un audit.
6. Préserver le temps de conversation : par défaut < 4 000 caractères de sortie par extrait d'outil et pas de dumps massifs. Référencer les fichiers locaux / KB plutôt que répéter leur texte.

Ce protocole a été explicitement demandé et validé le 28 octobre 2026 pour éviter la perte des recherches lors de la saturation des longues conversations.

## Exigence complémentaire — prompts d'origine intégraux (28/10/2026)

**OBLIGATOIRE avant chaque intervention opérationnelle BOONO :** lire `zero-one/knowledge/operational-decisions/README.md`. Créer un dossier `OD-AAAAMMJJ-NNN` avec le(s) texte(s) utilisateur d'origine **mot pour mot**, le **prompt d'exécution intégral effectivement confié à l'agent**, et une **explication de l'origine** (déclencheur, observations, données, décisions antérieures, motifs, autorisation, portée et limites). Distinguer la parole de l'utilisateur de la reformulation de l'assistant. Ne pas substituer une synthèse à la preuve originale. La commande `zero-one/scripts/boono-decision-archive.py create` crée un enregistrement neuf, non écrasable par l'outil, avec SHA-256 ; `event` trace chaque état, et `verify` contrôle les originaux et l'historique.

Pour une validation abrégée (« oui »), inclure aussi dans le dossier la proposition originale exacte approuvée et les messages du contexte nécessaires, avec auteurs. Si une source intégrale n'est plus accessible, ne jamais l'inventer ni prétendre qu'elle est archivée. Tout changement de portée ou de prompt produit un NOUVEL identifiant lié à l'ancien ; une décision DOCUMENTÉE n'est ni IMPLÉMENTÉE, ni TESTÉE, ni MISE EN SERVICE. Ne pas versionner de secrets en clair dans Git. Le registre est une procédure explicite, pas une capture automatique des chats.
