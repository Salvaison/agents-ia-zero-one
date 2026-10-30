# BOONOLAB — Intégration du Shadow Entrée/Sortie V494 dans BOONO Watch → SHADOWS

**30 octobre 2026 — intervention OD-20261030-005 — interface en lecture seule.**
**Demande utilisateur originale :** [OD-20261030-005 / demande intégrale](operational-decisions/OD-20261030-005/01-demande-utilisateur-integrale.txt). [Origine, consignes et limites](operational-decisions/OD-20261030-005/03-origine-et-justification.md).

## 1. Objectif et réalisation

Rendre consultables dans **BOONO Watch → TRADES → SHADOWS** les résultats du laboratoire factoriel V4.9.4 Entrée/Sortie, déjà en service sous **boono-v494-entry-exit-shadow**, sans toucher aux politiques PAPER originales.

Un panneau **V4.9.4 · LABORATOIRE ENTRÉE / SORTIE · 4 BRANCHES** apparaît **au sommet de SHADOWS**, sans remplacer les shadows historiques.

| Branche | Entrée | Sortie |
|---|---|---|
| A | V493 originale exacte | Sortie V493 originale |
| B | V493 originale exacte | Superviseur expérimental de continuation |
| C | Filtre inflexion MCB15 (uniquement si V493 autorise) | Sortie V493 originale |
| D | Filtre inflexion MCB15 | Superviseur expérimental |

Chaque carte expose : **P&L net réalisé après frais, frais cumulés, nombre d'entrées et de clôtures, répartition LONG/SHORT (effectif et P&L net), nombre d'entrées filtrées, TP1, position ouverte, gain latent, MFE/MAE, invalidation initiale, motifs de sortie**. Un volet « Dernières clôtures » montre les cinq dernières opérations de chaque branche, avec prix d'entrée/sortie, résultat net, frais, MFE, MAE, giveback et raison de sortie.

Une section **Contrastes A/B/C/D** montre B−A (effet Sortie avec Entrée originale), D−C (Sortie avec Entrée filtrée), C−A (Entrée avec Sortie originale), D−B et le contraste d'interaction D−C−(B−A). Les comparaisons P&L restent **« — »** avant la première clôture sur les deux branches correspondantes, et **restent descriptives, non appariées** ensuite : pas de prétention à isoler un effet causal pur si les dates, positions et réentrées diffèrent.

Deux panneaux à ouvrir : **Influence des sorties sur les entrées** (exposition divergente, entrée filtrée, événement explicite EXIT_ENABLED_REENTRY lorsque le superviseur a rendu possible une nouvelle entrée pendant que la référence restait engagée) et **Derniers événements** (entrées, clôtures et événements récents).

Concordance de l'exposition de la branche **A** avec le PAPER V494 réel affichée **à l'instant de la comparaison**, sans présenter cela comme une réplication intégrale du ledger historique.

## 2. Intégration technique et performance

**Fichiers changés :**
- `modules/attention/v494-dual-ui-summary.js` : projection stricte du résumé persistant en réponse destinée au navigateur, identités et versions contrôlées, les champs lourds/trading omis, cinq derniers trades par branche, huit événements/occurrences d'influence au maximum, détails texte bornés, âge des observations et statut DATA_RECENT/SOURCE_STALE.
- `modules/config-server.js` : route REST authentifiée **GET /api/shadows/v494-dual**, lecture exclusivement du petit `data/v494-dual-module-shadow-summary.json`. Fichier supérieur à 256 KiB ou état non-SHADOW refusé ; erreur localisée HTTP503. Cache-control privé/no-store ; aucune écriture.
- Dans `tab2-shadows` : conteneur `shadowV494Dual`, styles compacts et réactifs, rendu autonome, détail des quatre branches, échappement HTML des champs. Dépliants restés ouverts pendant le rafraîchissement conservés.

**Charge sur l'interface :** aucun scan de `audit-history.json`, de l'archive 14 jours, du fichier de décisions V494 ni du ledger shadow intégral. La nouvelle requête s'effectue **uniquement quand SHADOWS est sélectionné**, en parallèle de son chargement historique, puis à sa cadence déjà existante d'environ **30 secondes** ; pas de timer supplémentaire. Le panneau compact continue de fonctionner si l'ancien endpoint SHADOWS échoue.

**Source réellement contrôlée lors de la mise en service :** environ **2 117 octets JSON** depuis le résumé réel, quatre branches, aucun trade encore clôturé, statut DATA_RECENT. Les cartes affichent **EN COLLECTE** et les deltas « — », pas de bénéfice nul inventé.

**Contrat de sécurité :** `brokerOrdersEnabled=false`, `decisionImpact=false`, versions `v494-dual-shadow-ui-v1` / `boono-v494-entry-exit-lab-v0.1`. Aucun appel à un module d'ordres, pas de nouvelle route POST, aucune modification des runners ou limites de V4.9.4/V5.4.3 ; le laboratoire reste SHADOW, l'interface purement observation.

## 3. Vérifications et déploiement

- **8 tests ciblés** nouveaux : validation version/autorité/branches, réduction à cinq trades et huit influences, affichage des quatre cartes avant clôtures, XSS échappé, conservation des volets ouverts, indépendance de l'ancien endpoint, gestion des sources anciennes.
- **67/67 tests Node** passés, en incluant V494 shadow, V494/V542, lecture Fibo et composants de l'État vivant. Syntaxe du **JavaScript entier** réellement généré depuis `app.js` vérifiée par `vm.Script`.
- **Test HTTP authentifié après redémarrage :** `GET /api/shadows/v494-dual` = **200**, A/B/C/D présents, décision désactivée, 2 117 octets ; `GET /` = 200 avec conteneur ; `GET /app.js` = 200 avec fonction de rendu/chargement ; accès anonyme `GET /api/shadows/v494-dual` = **302** vers login.
- **PM2 redémarré : config-server uniquement** et `pm2 save`. Les processus `boono-v494-paper`, `boono-v543-paper`, `boono-v494-entry-exit-shadow` et `boono-audit-14d` sont demeurés en ligne, sans redémarrage des moteurs.
- Aucun fichier BOONO-TV ni ancien shadow de trading modifié. Le rendu a été testé par simulation DOM + vérification HTTP ; **pas encore constaté visuellement dans la session navigateur authentifiée de l'utilisateur**.

## 4. Statuts et travaux ouverts

**[AUTORISATION]** utilisateur demande affichage du laboratoire ; **[IMPLÉMENTATION]** API et panneau quatre branches ; **[TESTS]** 67 cas passés et intégration HTTP authentifiée ; **[MISE EN SERVICE]** interface à jour et service autonome inchangé ; **[POLITIQUE PAPER ACTIVE]** V494/V543 inchangées.

Pour interpréter les premières statistiques, comparer en priorité la fidélité de la branche A vs V494, les entrées rendues possibles par B/D, les sacrifices de continuation, la captation du MFE, le P&L net *par campagne* et les frais. Les chiffres sont expérimentaux, sans preuve de supériorité tant que des observations prospectives comparables n'existent pas.
