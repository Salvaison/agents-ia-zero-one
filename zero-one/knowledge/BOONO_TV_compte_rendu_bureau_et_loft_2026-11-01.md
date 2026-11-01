# BOONO-TV — Compte rendu de conception : bureau canonique et loft musical

**Date :** 1er novembre 2026
**Périmètre :** direction artistique BOONO-TV, **aucun changement de trading ni déploiement du studio**.
**Registre :** [OD-20261101-001](operational-decisions/OD-20261101-001/03-origine-et-justification.md)
**Livrable approuvé :** [Bureau et ordinateur — référence canonique v1.0](BOONO_TV_bureau_ordinateur_reference_canonique_2026-11-01.md)

## 1. Objet et résultat

Cette séquence a fixé l'apparence physique du **bureau-ordinateur** de BOONO et amorcé une nouvelle étude du **loft dans lequel évolue le personnage**. Le propriétaire a approuvé la dernière illustration de l'établi, la description détaillée qui en résulte et sa conversion en référence Markdown. Il a demandé simultanément un premier dessin du loft vide (ni BOONO ni bureau).

Le loft musical **a été illustré dans la conversation** ; il **n'a pas encore fait l'objet d'une validation explicite**. Ni les deux dessins ni leurs découpages techniques ne sont réputés intégrés au studio OVH par ce compte rendu.

## 2. Chronologie des choix graphiques

| Étape | Intervention et résultat | Statut |
|---|---|---|
| Références initiales | Mugshot du robot bleu carré, atmosphère comic papier journal, première scène d'atelier avec console à deux écrans et rack sous le bureau | Sources d'inspiration |
| Première itération | Établi de menuisier usé, deux écrans encastrés et vissés dans le laiton, grande roue centrale, rack visible, câblage industriel, vue trois quarts | Piste retenue |
| Annotation utilisateur | Déplacer les modules **devant les écrans**, sur un rebord avant élargi ; fixer l'enseigne lumineuse BOONO TV sur la façade ; intégrer prises et faisceaux data-optiques lumineux ; garder strictement ferrures et style | **VALIDÉ** |
| Épuration | Supprimer les modules sur la surface **derrière** les deux écrans ; conserver ce grand plateau de bois libre, sauf le boîtier technique latéral gauche | **VALIDÉ** |
| Dernier rendu | Meuble, perspective et ferrures approuvés ; écrans, commandes avant, enseigne cyan et rack conservés ; surface arrière libre | **VALIDÉ** |
| Description du 01/11 | Fiche détaillée bureau/ordinateur acceptée par le propriétaire (« Ok Validé ») | **VALIDÉ** |
| Nouvelle pièce | Grand local industriel à baie vitrée au nord ; fond spacieux ; batterie et instruments à la place du lit ; salon vintage dans le haut droit ; image **sans bureau ni BOONO** | **DEMANDE EXÉCUTÉE COMME CONCEPT VISUEL ; VALIDATION DU RENDU EN ATTENTE** |

## 3. Ce qui devient canonique pour le bureau

- **Support :** ancien établi de menuisier, bois patiné beige/brun clair, épais, usé mais solide.
- **Structure fixe :** ferrures épaisses d'acier noirci/laiton terni, renforts à emplacements conservés, cadrage trois quarts légèrement plongeant.
- **Surfaces :** deux grands écrans tactiles inclinés encastrés au laiton et une console électromécanique à molette centrale.
- **Répartition :** instruments propres à BOONO sur l'écran gauche ; véritable capture TradingView/MarketCipher sur l'écran droit. Les tracés illustratifs ne sont pas des données live.
- **Façade :** rebord avant élargi, modules encastrés et panneau lumineux « BOONO TV » bleu cyan.
- **Arrière du plateau :** bois volontairement nu, aucun rang de modules derrière les écrans ; maintien de l'unité de brassage à gauche.
- **Dessous :** rack informatique apparent avec ventilations, unités, interfaces et signaux lumineux.
- **Interconnexions :** connecteurs vissés, câbles de données/optique avec points lumineux rouges, bleus et verts.
- **Style :** comic industriel rétro, raster/halftone, granulation papier journal, traits noirs et imperfections d'impression ; palette froide bleu pétrole/gris/bois délavé, sans domination de lumière ambrée.
- **Compositing :** meuble statique sans robot et sans objets mobiles ; contenu des écrans, mains, lumière et accessoires restent des couches séparables.

**Qualification :** ces éléments décrivent une **apparence artistique validée**, non la présence matérielle de cette console ni l'infrastructure informatique réelle d'Amsterdam. La console BOONO-TV est une représentation scénique en lecture seule, sans autorité sur les ordres et le risque.

## 4. Nouvelle orientation du loft : cahier des charges reçu

Le propriétaire souhaite une **grande pièce industrielle**, dont une vaste baie vitrée donne vers le nord. Sa lumière principale doit donc évoquer un **jour diffus et plutôt froid**, compatible avec la palette déjà fixée.

La zone située **derrière l'emplacement futur de BOONO assis à son bureau** est vaste et offre une vraie profondeur architecturale, à la différence d'une cabine de trading serrée. Le premier plan doit rester dégagé pour superposer plus tard le bureau et le personnage en couches indépendantes.

À la place du lit antérieurement envisagé, installer un **set musical** : batterie complète et instruments, avec amplificateurs, clavier/synthétiseur, micros, pédales et branchements si utiles au dessin. L'espace musical doit ressembler à un endroit où l'on peut réellement jouer, pas à un fond décoratif générique.

En **haut à droite de l'image**, organiser un coin salon **vintage**, avec sièges anciens, table basse et matière textile patinée ; la position spatiale est demandée, mais le nombre et le modèle exacts des sièges restent ouverts.

**Exclusion formelle de l'illustration du loft :** aucun bureau, aucune console de trading et aucun BOONO. Les deux composants seront installés ultérieurement dans le moteur de scène.

## 5. Premier résultat de la pièce (proposition visuelle, non validée)

Une nouvelle illustration panoramique est produite dans la conversation : architecture industrielle, grande verrière à gauche laissant entrer une lumière froide, scène musicale avec batterie et instruments à gauche, espace central de circulation et tapis, salon ancien à droite, arrière-plan urbain, tuyauteries, étagères, plantes et quelques luminaires secondaires.

L'ensemble conserve les trames imprimées et le grain de la référence. **Ces détails non explicitement prescrits — skyline, affiches, tapis, plantes, luminaires et mobilier de salon exact — sont des choix de proposition de l'image, pas des décisions déjà approuvées.**

Cette image est un visuel de dialogue dans ChatGPT. **Pas d'asset binaire dans ce commit**, pas de nouveaux calques créés sur OVH, pas de mise en service.

## 6. Frontières techniques et conditions pour la suite

L'architecture BOONO-TV existante prévoit les plans **loft → projections de données → bureau → surfaces d'écrans → BOONO et mains → bulles/FX** avec homographies. Le nouveau fond doit pouvoir remplacer uniquement le décor, sans redessiner l'établi ni créer de doubles contours.

La validation du bureau n'implique pas qu'il soit déjà converti en image de production à alpha contrôlé. Il faudra notamment :
1. Valider l'image du nouveau loft et ses implantations (baie, batterie, salon), ainsi que la compatibilité de sa perspective avec le bureau.
2. Déterminer le recadrage dans le panneau scène (référence technique historique : 1200×1080 pour le loft, au sein d'un montage 1920×1080).
3. Produire les assets fixes et masques éventuels, laissant bureau, écrans vivants, personnage et effets indépendants.
4. Préserver le vrai MarketCipher à droite et les instruments de BOONO à gauche ; vérifier la capture et ses droits de diffusion avant publication.
5. Mesurer puis ajuster les homographies **sans écraser** le fichier vivant `/home/ubuntu/boono-tv-studio/runtime/boono-tv/desk/projection-config.json` sur OVH.
6. Tester l'ensemble d'abord en prévisualisation, sans interaction avec les processus de simulation PAPER sur Amsterdam.
7. Après une autorisation distincte, documenter toute éventuelle implémentation, test et mise en service comme événements réels, et non comme acquis supposés.

## 7. Qualification et provenance

- **Constat :** les images et demandes de la séquence sont visibles dans la conversation ; GitHub contient l'historique de BOONO-TV et le protocole documentaire, mais la nouvelle image n'y est pas commise.
- **Décision validée :** identité et description du bureau/ordinateur.
- **Proposition ouverte :** dessin précis du loft musical, placement des éléments et ambiance détaillée.
- **Réalisation documentaire :** cette fiche, sa spécification liée, l'index et l'archive OD.
- **Non réalisé dans cette intervention :** intégration du visuel sur OVH, animation, mise à jour du navigateur, calibration, diffusion publique, changement de BOONOTRADE.

Références d'arrière-plan : [passation BOONO-TV du 13/10](passations-sources/2026-10-28-import/BOONO-TV_passation_complete_2026-10-13%282%29.md) ; [passation BOONO Systems TV/Watch/PRO du 19/10](passations-sources/2026-10-28-import/BOONO_Systems_passation_TV_Watch_PRO_2026-10-19%283%29.md) ; [index BoonoLab](BOONOLAB_INDEX.md). La préférence esthétique actuelle **remplace pour ce nouveau travail** l'éclairage chaud évoqué dans l'ancienne passation.

**Prochain jalon :** validation ou corrections du loft par le propriétaire, avant conception des assets séparables et intégration technique.
