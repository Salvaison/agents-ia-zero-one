# BOONO Systems — consignes de travail persistantes (GitHub / Amsterdam)

Pour toute enquête, audit, replay ou correction sur BOONO Systems :

1. Lire en premier `zero-one/knowledge/BOONO_protocole_recherche_compacte_invalidations_2026-10-28.md` et le checkpoint actif (`python3 zero-one/scripts/boono-research-brief.py show`, si disponible). La Knowledge Base est la source des décisions et passations, pas l'historique du chat.
2. Faire les lectures lourdes et calculs **sur Amsterdam**, pas dans les messages : ne sortir que les agrégats, quelques cas contrastés, les limites et les questions ouvertes. Conserver les preuves intégrales localement sous `zero-one/data/research-briefs/`, non versionné ; utiliser `zero-one/scripts/boono-research-brief.py` pour les audits d'invalidation et les checkpoints.
3. Après chaque découverte substantielle et avant tout changement de sous-sujet / passation de discussion, enregistrer un checkpoint structuré par statuts **constat vérifié / hypothèse / décision validée / implémentation / tests / mise en service / ouvert**, avec provenance, limites et plage temporelle.
4. Pour toute décision réellement approuvée ou intervention effectuée, actualiser la Knowledge Base du dépôt et produire un commit ciblé ; vérifier les tests et le SHA distant. Ne jamais conclure « implémenté », « testé » ou « déployé » à partir d'une simple proposition.
5. Les deux moteurs V5 et V4 restent des simulations PAPER distinctes : aucune modification de leurs règles, du risque, des ordres ou des processus n'est autorisée par ce seul protocole. Aucune écriture sur les ledgers live, aucun redémarrage pour un audit.
6. Préserver le temps de conversation : par défaut < 4 000 caractères de sortie par extrait d'outil et pas de dumps massifs. Référencer les fichiers locaux / KB plutôt que répéter leur texte.

Ce protocole a été explicitement demandé et validé le 28 octobre 2026 pour éviter la perte des recherches lors de la saturation des longues conversations.
