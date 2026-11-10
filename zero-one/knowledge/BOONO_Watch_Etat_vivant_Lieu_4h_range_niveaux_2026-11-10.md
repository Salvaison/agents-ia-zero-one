# BOONO Watch — État vivant : colonne unique et reconstruction de LIEU
**Date : 10 novembre 2026.**  
**Périmètre : interface privée Amsterdam, lecture seule.**

## Origine et autorisation
Demande de l'utilisateur dans la discussion BOONOTRADE du 10/11 :
> « ils sont mieux représenter en une colonne comme dans le téléphone, MCB3 sous MCB15 »

> « je verrais plus: BW4/LBW4 précédent en gris/dernier confirmé . E4confirmé. Puis j'y mettrais la distance parcourue du grand Range et distance au POC »

> « Je mettrai là les niveaux enregistrer avec en dessus DS 75595 . distance -457$ et en dessous WS 65743 distance 3389$ »

L'utilisateur conteste la provenance des affichages « FIB ENREGISTRÉ groupe 6 ratio 0.4 » et « FIB CAMPAGNE illustratif », et ne souhaite plus la ligne « Frontière de contexte dans le sens candidat ».

## Constat dans les sources
- `data/levels.json` contient un couple d'ancres manuel **groupe 6** : fib0 87 649 $ / fib1 58 500 $. Le ratio 0,382 = **76 514,1 $**. La valeur 0,4 à l'écran provenait de l'arrondi à une décimale, non d'un ratio différent.
- Le précédent « FIB CAMPAGNE » était calculé séparément par `modules/v5/fib-context-readonly.js` depuis l'origine géométrique de campagne et un extrême rolling 2h. Il ne représentait **pas** le Fibonacci manuel.
- La seule paire de frontières `VAL / POC / VAH` complète dans le registre porte le suffixe **daily** (VAL 81 289 $ / POC 83 861 $ / VAH 84 861 $). Il n'existe pas à ce contrôle de triplet explicitement classé **big-range**. Ne pas appeler ce daily « grand range ».
- Les niveaux ponctuels enregistrés les plus proches autour du prix test sont DS 75 595 $ au-dessus et WS 65 743 $ au-dessous ; leur distance est recalculée à chaque relevé et porte le signe **prix − niveau**, pas un nombre figé de la capture.
- Le CSV MCB 4h confirmé fournit BW/LBW de deux bougies consécutives et des champs natifs `wt1_cross_up` / `wt1_cross_dn`. L'E4 est présenté avec sa bougie source et l'instant de clôture/confirmation estimé à +4 h.

## Réalisé et activé sur Amsterdam
- Une seule colonne pour les cartes de l'État vivant (MCB15 suivi de MCB3 et de LIEU), CSS limité à `.v52-main .v52-grid` pour ne pas changer les autres écrans.
- Dans LIEU : présentation précédente/gris → dernière bougie 4h confirmée, dernier E4 confirmé, grand range explicite si enregistré, distance au POC et progression, sinon range daily clairement étiqueté.
- Niveau enregistré le plus proche **au-dessus** et **au-dessous**, sans choisir une frontière selon le sens de trading ; convention de distance affichée.
- Suppression des deux lignes FIB équivoques en tête de LIEU. Le Fibonacci manuel 0,382 et les ancres restent accessibles dans « Autres repères » ; pas de FIB campagne dans cette nouvelle carte.
- MA3/MA15, mémoire des retests, territoire et ancre de risque préservés dans les détails dépliables ; ils restent indépendants des décisions.
- Données consultées côté serveur dans l'endpoint privé authentifié `/api/v52` via `livingPlaceLandscape`, sans route publique supplémentaire ni écriture dans le fichier des niveaux.
- Aucun changement dans les runners PAPER, les seuils, les ordres ou la politique de risque.

## Vérifications
- Syntaxe du serveur ET du JavaScript client généré : **OK**.
- Exécution isolée du calcul LIEU sur le `levels.json` et le CSV 4h : **OK** (DS/WS, rang daily, signal 4h DN, absence grand range).
- Test de génération HTML de l'État vivant : **OK** (ordre des cartes, 4h, ranges, DS/WS, FIB manuel, suppression FIB campagne).
- PM2 `config-server` : **online** après restart ; HTTP local : **302** vers l'authentification ; les runners `boono-v494-paper` et `boono-v543-paper` sont restés **online**.

**À valider :** inspection visuelle dans la session authentifiée de l'utilisateur, y compris la lisibilité sur ordinateur/téléphone et les évolutions de valeurs à plusieurs rafraîchissements. HTTP 302 ne prouve pas, seul, cette validation.

**Frontière de référence :** `modules/config-server.js` (UI + télémétrie uniquement) et `modules/v5/v53-causal-chain-view.js` (chronologie MCB en lecture seule, ajustée lors de l'étape précédente du 10/11).

