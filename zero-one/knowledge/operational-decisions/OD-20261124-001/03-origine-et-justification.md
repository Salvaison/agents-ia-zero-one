# Origine et justification

24 novembre 2026. Références : BOONOLAB_AUDIT_V553_90_113_V543_320_329_TRAJECTOIRES_CROSS15_PRIX_2026-11-24.md et BOONOLAB_AUDIT_SHADOWS_V553_90_113_V543_320_329_2026-11-24.md. L'interpréteur v0.1 mesure des dérivées locales, crée un nouvel épisode à chaque Cross, mais ne conserve pas l'hypothèse née avant Cross ni les territoires des tentatives précédentes. L'utilisateur valide explicitement les trois couches, indépendantes des trades.

Extraits littéraux de la proposition de l'assistant immédiatement approuvée (la présentation interactive intégrale n'est pas archivée ici ; ne pas prétendre disposer de sa sérialisation complète) :

> Je propose de faire évoluer notre interpréteur géométrique vers une véritable mémoire dynamique des trajectoires, indépendante des positions PAPER.

> Chaque nouvelle inflexion significative de LBW15 doit ouvrir une **hypothèse en observation**, et non une candidature de trade.

> Aucune nouvelle origine ne doit effacer les précédentes.

> BOONO pourrait ainsi conserver deux hypothèses concurrentes :
> 
> - Continuation de la trajectoire actuelle.
> - Formation d'un retournement.

> Je commencerais donc par implémenter cette **Trajectory Memory v0.1**, sans score de conviction arbitraire, sans nouveau veto, sans délai obligatoire et sans modifier V553 ni V543.

Le prompt opérationnel est la formulation exacte de la mission par l'assistant exécutant lui-même sur Amsterdam, pas une citation utilisateur ni une demande à un agent externe. L'autorisation couvre exclusivement le SHADOW. La mise en service se distingue de l'implémentation et des tests. Les choix techniques non explicitement spécifiés seront documentés.
