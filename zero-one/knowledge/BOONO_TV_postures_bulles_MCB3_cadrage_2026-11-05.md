# BOONO-TV — Début visible de la vague MCB3, composition et géométrie des bulles

**Date :** 5 novembre 2026
**Décision :** [OD-20261105-006](operational-decisions/OD-20261105-006/03-origine-et-justification.md)
**État :** implémenté, opérationnel sur les systèmes de présentation, testé en Chromium. Validation esthétique définitive par le propriétaire à confirmer.
**Isolation :** aucun changement V494/V543 PAPER, ledger ou collecteur MarketCipher ; calibration du bureau validée inchangée.

## Clarification explicite de l'utilisateur

L'utilisateur ne demande pas « toute la largeur historique » du MarketCipher 3m. Il demande une fenêtre pertinente sur la **vague actuelle et son début**, avec une **géométrie harmonieuse montrant toute l'amplitude** (sommet et creux), sans écraser les lobes. Cette correction d'interprétation remplace l'hypothèse initiale de conserver tout l'historique horizontal.

## MCB3 réel et capture recentrée

- Contrôle direct du widget du seul onglet TA TradingView \`qljTf3vu\` : \`resolution=3\`, \`symbol=OKX:BTCUSDT.P\`, études présentes \`MarketCipher_B\` et \`MarketCipher DBSI\`. Ne pas confondre le titre historique du *layout* « BOONOTRADE15 » avec le timeframe réel. Les collecteurs 3m/15m sont dans la disposition distincte \`2AqpEMfD\`.
- L'ancienne capture \`x=55, y=425, 1195×165\` contenait trop de bande noire haute et n'enregistrait pas le bas de la vague ; elle déformait ce que BOONO montrait. Des images CDP ont été prises sur plusieurs cadrages puis comparées hors service, sans changer le graphe source.
- La capture active du daemon Amsterdam \`boono-tv/desk/desk-capture-daemon.js\` est désormais \`x=770, y=480, width=580, height=159\` à partir du vrai chart 3m. Le bord gauche est avancé vers un passage proche de la ligne médiane de la vague, le dernier mouvement reste visible à droite, et les extrêmes verticaux sont conservés. Il s'agit d'un cadrage de présentation sur la période récemment affichée, **pas d'une restitution de tout l'historique** ni d'une reconstruction des oscillations. Le daemon TA reste sur une cadence de 60 secondes et exige toujours le vrai symbole/TF.
- Sur OVH, \`scene/boono-v2.css\` projette ce rectangle authentique en \`400×110\` à \`top=17px\`. Les rapports source \`580/159=3,648\` et cible \`400/110=3,636\` sont presque identiques : pas de déformation notable des vagues. Composition \`screen\` conservée pour neutraliser la zone noire résiduelle sans cacher le début. Titres vectoriels haut/bas laissés indépendants.

## Bulle par posture : position et grandeur indépendantes

- Le fichier OVH \`desk/dialogue-script.json\` est rétrocompatible en \`version=1\` : chaque entrée des **12 postures** possède maintenant \`placement:{dx,dy,scale}\` en plus de \`type,text\`. Les textes et types existants sont préservés. Les valeurs initiales neutres \`0,0,1\` ne déplacent aucune bulle approuvée.
- La route privée POST \`/api/dialogue-script\` dans \`studio-server.js\` valide les déplacements horizontaux (−400 à +400), verticaux (−320 à +320) et l'échelle (0,55 à 1,80), ainsi que la vérification d'origine/header déjà active. Les 12 poses doivent être présentes ; écriture atomique sur OVH.
- \`scene/dialogue-editor.js\` : sur la surface gauche État vivant, réglage X / Y et curseur **Grandeur** par posture, « Recentrer » (cette posture seulement) et **glisser-déposer de la bulle** sur la scène droite. Les contrôles mettent à jour l'aperçu visuel léger ; seul **Enregistrer** persiste, et **Annuler** restaure les valeurs antérieures.
- \`scene/layout-editor.js\` combine ces nouveaux paramètres avec la position de référence et la taille existantes de chaque *type* de bulle, sans changer \`desk/projection-config.json\`. Lorsqu'une nouvelle posture est sélectionnée, son propre décalage et sa propre échelle sont réappliqués. L'éditeur ne redevient pas le showcase lourd qui a précédemment contribué à la surcharge du Chromebook.
- Une correction de \`pointer-events\` spécifique au mode édition a été nécessaire pour activer le déplacement à la souris sans rendre les bulles interactives pendant la diffusion normale.

## Titre Conversion et séparation des pastilles

- \`scene/desk-vector-titles.js\` ajoute « **CONVERSION** » en SVG sur la bordure haute de l'écran gauche avec la même géométrie projetée que les deux autres textes vectoriels. Le petit titre raster sous-jacent est masqué seulement dans BOONO V2 pour ne pas faire doublon.
- \`scene/tv-mini-conversion.js\` maintient les dix pastilles rouges/blanches à bord noir et leur calcul strictement basé sur le volume total d'agresseurs OKX sur 3m. Le graphique s'arrête plus à gauche (\`TV_VOLUME_BAND_PX=75\`) tandis que les pastilles sont ancrées vers le **bord droit** (\`x=w−42\`, largeur 38) avec une bande blanche vide séparatrice. Les valeurs/seuils n'ont pas été touchés.

## Tests, sauvegardes et limites

- Sauvegardes Amsterdam sous \`zero-one/boono-tv/backups/OD-20261105-006/\` ; OVH sous \`/home/ubuntu/boono-tv-studio/backups/OD-20261105-006/\`, incluant le JSON de calibration et les textes de bulles existants.
- Tests syntaxe \`node --check\` valides (serveur et JS de scène). Tests Chromium de pose Working réglée \`dx=125,dy=−65,scale=1.35\`, Thinking laissée à \`0,0,1\`, retour sur Working sans perdre les valeurs de brouillon, puis Annuler et contrôle que le fichier enregistré demeure identique. La géométrie ne contamine pas les autres postures ; zéro erreur JS.
- Test du glisser-déposer : un mouvement de souris sur la bulle produit réellement un décalage \`dx=84,dy=42\` dans l'aperçu ; réinitialisation OK. POST idempotent HTTP 200 sans altérer les 12 scripts ; POST placement hors borne HTTP 400.
- Source vérifiée en capture après redémarrage du seul daemon de présentation : \`actualTf=3\`, \`actualSymbol=OKX:BTCUSDT.P\`, rectangle \`580×159\`, 60 s, sans intervention sur les collecteurs ; les processus V494/V543 PAPER restent en ligne.
- Capture OVH \`tests/OD-20261105-006-desk-close.jpg\` : vrai MCB3 recadré sans bande noire supérieure couvrante, extrêmes du lobe visibles, titre CONVERSION SVG indépendant, pastilles décalées du graphique. Script \`tests/verify-OD-20261105-006.js\` + JSON de résultats et \`tests/verify-OD-20261105-006-drag-save.js\`. Le test de défilement hors éditeur reste vert.
- \`desk/projection-config.json\` **inchangé**, SHA-256 \`39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f\`.

**Points restant à valider humainement :** choix artistique du début de vague sur un marché évolutif, lisibilité sur le vrai Chromebook, emplacement des bulles lorsqu'elles sont agrandies fortement, et stabilité longue durée de la capture TA après événements TradingView. Une période fixe de capture ne constitue pas une détection algorithmique du début de chaque vague ; aucune affirmation de cette nature n'est faite.
