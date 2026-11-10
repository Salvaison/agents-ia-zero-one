# BOONO Watch — Fusion du Pronostic et de la Décision + Invalidation

**Date :** 10 novembre 2026  
**Périmètre :** interface privée Amsterdam, BOONO V5.4.3 PAPER, uniquement rendu `État vivant`.  
**Source :** demande propriétaire du 10/11, texte proposé dans le chat et document joint `5pronostic-decision.pdf` (2 pages : état actuel et nouvelle organisation, page 2). Le fichier source demeure attaché à la conversation ; il n'a pas été publié dans le dépôt.

## Ordre demandé (validé pour la présentation)
Titre unifié : **5 · PRONOSTIC · DÉCISION + INVALIDATION**, sans ancienne carte 6 autonome.

1. **CHAÎNE CAUSALE · observation** : PM Live puis Cross3, E3 Live, E3 confirmé, Cross15, E15 Live, E15 confirmé, chacun avec l'horodatage issu du flux déjà observé.
2. **PHASE STRUCTURELLE** : état, campagne, maturité sur 2h, MF15 sur 2h et statut d'extension.
3. **PRONOSTIC** : sens candidat et formulation MCB15 ; **DÉCISION** effective du moteur, tenue visible dans la même ligne (ex. HOLD), sans les confondre.
4. **POSITION** : direction, prix/heure d'entrée et P&L net potentiel de la position papier, seulement si position ouverte.
5. **MFE / MAE / floor / invalidation** : données stockées sur la position, floor indicatif ou exécutoire si la position relève de l'ancienne autorité.
6. **MATURITÉ OFFENSIVE** : classification, origine du mouvement prix 4h, progression BTC, proximité bord 2h, état divergences LBW15/prix, conversion marginale.
7. **RISQUE** : cap historique informatif, seuils floor indiqués comme alertes sous MCB/structure, frais estimés, mobilité, non-veto du niveau.
8. **Détails techniques repliables** : raison de la décision, invalidation contextuelle **actuelle**, preuve et horloge de l'ancre, attention, SHADOW V4.9.3, compte PAPER V5.4.3, version de l'autorité des sorties et épisodes floor. Le volet reste ouvert ou fermé au rafraîchissement automatique.

## Point critique : deux invalidations différentes
Le PDF d'origine comporte une invalidation de la lecture contextuelle (73637,7 $) et celle mémorisée sur la position papier (73537,7 $) ; ce sont des champs différents et il ne faut ni en choisir un en prétendant qu'ils sont identiques ni modifier le niveau d'entrée du moteur. Un contrôle sur le fichier `data/v52-paper-state.json` du 10/11 a confirmé `position.invalidationPrice = 73537,7` $, invariant sur la position, alors que `latestAnalysis.invalidation.price` a évolué au cours des observations (par exemple 73728 $, puis 73870,2 $). La **ligne principale de la position** montre le premier ; le second est conservé dans les détails, explicitement étiqueté `Invalidation contextuelle actuelle`, avec sa source/heure. Aucune valeur de la maquette n'est figée dans le code.

## Implémentation
- `modules/config-server.js`, `renderV52Living` : remplacement de deux `cell()` V5 et de bandeaux externes dispersés par **une seule `cell('prognosis-decision')`** ordonnée. Les cartes 1 à 4 (MCB15, MCB3, LIEU, CONVERSION et ticker 4×15) restent en place.
- Présentation discrète avec lignes serrées, mise en évidence du pronostic, de la position et des avertissements risque, sans nouveau veto.
- Le statut opérationnel `HOLD` (ou autre action au fil des observations) reste immédiatement visible car il est important de ne pas masquer la décision réelle par le seul pronostic.
- Le cas `FLAT` est géré sans MFE/MAE ou ancre de position fictifs. L'ancien volet 6 ne demeure pas dans le DOM.
- Conservation du repli technique à travers les rafraîchissements tous les 10 secondes, même méthode de conservation que LIEU.

## Tests et statuts
- Syntaxe Node du serveur et du script client JS généré : **OK** ; `git diff --check` OK.
- Test VM du rendu sur un état réel V5.4.3 : toutes rubriques dans le bon ordre ; une unique carte 5 et aucune carte 6 ; action HOLD ; invalidation mémorisée vs contextuelle distinctes ; P&L de position ; repli technique conservé après rerender ; état FLAT testé : pas d'affichage d'un ancien MFE. **OK**.
- Redémarrage ciblé `pm2 restart config-server --update-env` : `config-server` online, route HTTP 302 vers authentification attendu. `boono-v494-paper`, `boono-v543-paper`, `boono-v494-elastic-shadow` restent **online et non redémarrés**. Les stratégies, protections PAPER et la scène TV sur OVH sont inchangées.
- **Validation visuelle ouverte :** contrôler le rendu final sur le téléphone/desktop, l'ordre réel de lecture et les retours à la ligne de longs identifiants.

