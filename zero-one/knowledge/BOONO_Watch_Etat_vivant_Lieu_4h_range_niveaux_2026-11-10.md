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


## Ajustement du 10/11 — 15h35 CET, demandé et mis en service

**Demande utilisateur :** supprimer le texte « 4h · précédent / confirmé · contexte » et présenter sous « 3 . Lieu » une ligne compacte « 4h BW4 [précédent]/[confirmé] · LBW4 [précédent]/[confirmé] ». L'utilisateur demande également de vérifier la formule de progression en pourcentage du grand range et indique en avoir enregistré un.

**Implémentation UI (sans politique PAPER) :** titre « 3 · Lieu », ligne « 4h BW4 ... · LBW4 ... » ; suppression de la redondance textuelle « précédent gris / dernier confirmé couleur », couleurs et horodatages des bougies conservés.

**Formule vérifiée dans \`livingPlaceLandscape\`** : \`(prix - VAL) / (VAH - VAL) × 100\`. Le **POC** est absent du calcul du pourcentage ; sa distance signée s'affiche séparément \`prix - POC\`. Les seuls inputs sont le **prix** de l'analyse V5, les trois niveaux \`VAL / POC / VAH\` enregistrés par l'utilisateur, groupés par identifiant et scope. Cette formule est géométrique, elle ne reconstruit pas le profil de volume. Hors VAH/VAL, le rendu indique « prix sous VAL » ou « prix au-dessus de VAH » plutôt qu'un pourcentage.

**Point ouvert / anomalie de persistance potentielle :** à 15h35 CET, \`data/levels.json\` avait été modifié à 15h22 CET mais contenait **uniquement** le triplet \`daily\` groupe 4 (VAL 81 289 / POC 83 861 / VAH 84 861). Aucun triplet \`big\` (issu de \`big-range\`) n'était enregistré sur Amsterdam malgré l'indication de l'utilisateur. Aucun niveau n'a été modifié ou créé pour « compléter » l'information. L'enquête sur l'éditeur/sauvegarde des ranges reste ouverte.

**Tests :** syntaxe serveur OK ; extraction et \`node --check\` du JS client servi par \`/app.js\` OK ; rendu client isolé vérifiant l'en-tête et les quatre valeurs BW4/LBW4 -42.4/-45.1, -42.8/-49.7 OK ; redémarrage ciblé de \`config-server\` et HTTP 302 vers authentification OK ; \`boono-v494-paper\` et \`boono-v543-paper\` online et non redémarrés. Validation visuelle navigateur utilisateur encore ouverte.


## Ajustement du 10/11 — après 15h45 CET : extension hors Value Area et référence Fair Value

**Demande utilisateur :** « Maintenant celà devrai etre affiché! » puis « Oui c'est embetant donc nous devons considerer audessus/au dessous de la Fair Value qui indique des positions de prix étendue ». Suite à la réserve sur l'affichage sans pourcentage sous VAL ou au-dessus de VAH, l'interface doit conserver des distances et un degré d'extension lisibles.

**Constat vérifié :** \`data/levels.json\` contient désormais le groupe 8, \`VAH big = 78 125\`, \`POC big = 63 998\`, \`VAL big = 61 259\`, enregistré le 10/11. Le point ouvert antérieur « pas de big-range enregistré » est résolu à la date de ce contrôle. Le groupe 4 \`daily\` demeure distinct et inchangé. La valeur du prix varie au fil du temps.

**Deux échelles descriptives indépendantes (sans seuil d'entrée ni sortie) :**
1. **VAL → VAH**, \`100 × (prix − VAL)/(VAH − VAL)\`. Échelle **non plafonnée** : VAL=0 %, VAH=100 %, en dessous de VAL négatif, au-dessus de VAH supérieur à +100 %. L'écart BTC au VAL est conservé.
2. **POC comme référence de Fair Value**, \`100 × (prix − POC)/(VAH − POC)\` lorsque prix ≥ POC, ou \`100 × (prix − POC)/(POC − VAL)\` lorsque prix < POC. POC=0 %, VAH=+100 %, VAL=−100 %. L'échelle est **asymétrique** si POC n'est pas à mi-chemin, et reste non plafonnée. POC est ici un *repère tiré des niveaux manuellement inscrits*, pas une estimation indépendante de juste valeur fondamentale.
3. Si prix au-delà de la Value Area, affichage complémentaire **EXTENSION HAUTE** ou **EXTENSION BASSE**, montant BTC au-delà de la frontière et pourcentage de la *largeur totale VAH−VAL*. Si POC n'est pas strictement entre VAL et VAH, sa mesure normalisée reste indisponible, au lieu d'un calcul fictif.
4. \`prix − POC\` en dollars BTC est toujours affiché en complément.

**Test sur les niveaux effectivement enregistrés** au prix de mesure de 74 240 $ : position VAL→VAH **77,0 %**, position relative POC **+72,5 %** (segment POC→VAH), distance au POC **+10 242 $**. Exemples synthétiques : prix 80 125 $ → 111,86 % du range et +114,16 % relatif au POC, extension supérieure de +2 000 $ ; prix 59 259 $ → −11,86 % du range et −173,02 % relatif au POC, extension inférieure de −2 000 $. Les extrêmes synthétiques ne sont pas des prix enregistrés du marché.

**Contrôle technique :** calcul isolé sur le registre live + tests aux bornes VAL, POC, VAH et au-delà ; parsing du JS client ; test du rendu HTML État vivant contenant les pourcentages non limités et les étiquettes d'extension : **OK**. \`config-server\` relancé, HTTP 302 authentification attendu, runners PAPER V494/V543 online sans redémarrage. **Rendu dans le navigateur de l'utilisateur encore à apprécier.**

**Gouvernance :** seul \`modules/config-server.js\` est modifié pour cette étape (lecture et présentation). Aucune écriture dans \`data/levels.json\`, aucune modification des stratégies, de l'autorité, des verrous ou des positions. Les résultats sont des repères de localisation, **pas des probabilités de retournement, des qualifications de surachat/survente ou des motifs de trade**.

