# BOONO Systems — BOONO Watch : mini-graphe Conversion dans l'État vivant

**27 octobre 2026 · amélioration de l'interface uniquement, sans changement de constitution, de version du moteur, de trading PAPER ni de frais.**

## Déjà fait et vérifié avant intervention : divergence par polarité

La correction validée par l'utilisateur **était déjà terminée**, commit GitHub `9c5bc67` à 14h04 CET le 27 octobre : `BOONO_divergences_fraicheur_par_polarite_MA_et_multidiv_2026-10-27.md`. Elle limite les ancres divergentes aux régimes MA confirmés de la même timeframe, prolonge les multidivs irrégulières, réinitialise la famille au changement confirmé de polarité MA et reste **sans autorité d'admission/sortie**. Ne pas la recréer.

Contrôles locaux : les 9 tests `divergence-polarity-multidiv.test.js` passent ; V4.9.4 et V5.4.2 PAPER diffusent actuellement `MA15 ABOVE` après changement confirmé du 27 octobre à 13h45 CET, avec `DATA_OK`. Aucun fichier de divergence n'a été modifié pour ce nouveau chantier.

## Demande utilisateur

Occuper la zone vide du **module 4 « CONVERSION · PM LIVE »** dans `État vivant`, en réutilisant le grand graphique existant « BTC 3m + Conversion ». Préserver tous les paramètres réels, obtenir des carrés acheteur/vendeur relativement plus grands, traits plus fins, caractères adaptés au petit espace et un **axe vertical du prix tous les 500 $ BTC**.

## Architecture livrée

1. `modules/elastic-mini-conversion-v542.js` : **un mini-graphe SVG de 192px de hauteur** dans une colonne adaptable, testé à largeur ~220px et ~430px. Il trace les bougies 3m OHLC, la MA200 3m fine, les lignes et libellés de prix par tranche de 500 $, les repères horaires, le prix absolu BTC en haut, l'axe central fixe et deux carrés transparents adjacents. Aire de carré proportionnelle au volume initiateur BTC observé sur une fenêtre glissante 3m ; position commune des carrés proportionnelle au déplacement du prix sur cette fenêtre, **jamais à PM3, PM Live ni à une intensité fictive**. Couleurs acheteurs vert / vendeurs rouge.
2. **Tous les paramètres d'origine restent visibles** : `ACHAT BTC`, `VENTE BTC`, `Δ PRIX BTC 3m`, `PM3`, `PM5`, `PM Live`, `eff3`, `yield/P75`, `effort/P75`, qualité, direction et statut/temps de chauffe du flux OKX. Lorsque P75/efficacité ne sont pas recalibrés, **afficher « — »**, jamais réutiliser une valeur figée de V4.10.10.
3. `modules/elastic-observer-ui.js` : injecte dans le mini le **même objet JSON de bougies que le grand graphique**, déjà demandé via `/api/elastic-chart-3m`, et la **même télémétrie OKX**. Il n'existe **aucune seconde requête HTTP aux bougies ni aucun second WebSocket**.
4. `modules/elastic-live-conversion-v541.js` : corrige un ancien filtrage qui rejetait les analyses `v5.4.2` ; les PM affichés proviennent à nouveau du vrai V5.4.2 PAPER actif (ou d'une archive V5.4.1 si c'est la source explicite), et jamais de V4.10.10.
5. `modules/config-server.js` : place le mini dans la cellule `4 · CONVERSION` avec CSS responsive, sans supprimer le grand graphique déjà disponible plus bas. Rétablit le mini après chaque actualisation de l'État vivant et sert un seul module statique JS supplémentaire.
6. `tests/v5/v542-mini-conversion-ui.test.js` : validation des graduations par 500 $, des traits fins, de la géométrie deux carrés, des volumes/fraîcheur, de V5.4.2 PM, de l'absence d'autre réseau et du rendu de tous les paramètres.

## Mise en service et contrôles

- Pré-sauvegarde du code d'interface précédent et des ledgers (lecture seule) sous `/root/boono-mini-conversion-before-20261027/`, avec empreintes SHA256.
- Un rendu statique de vérification a été réalisé dans le Chromium du VPS pour 227px de largeur, avec **volumes factices explicitement réservés à cette maquette** (3,31/55,838 BTC) et bougies réelles. Il a confirmé la lisibilité et l'équilibre des carrés ; légère hausse des tailles de légende à 8,5–9px ensuite.
- Les moteurs V4.9.4 et V5.4.2 ne doivent **pas** être redémarrés pour cette modification. Uniquement `config-server` puis sauvegarde PM2.
- Les services PAPER restent indépendants ; `brokerOrdersEnabled=false`. Le compteur MA et les divergences n'acquièrent aucune nouvelle autorité.
- Les routes HTTP de BOONO Watch exigent une session authentifiée. Les tests et un rendu statique Chromium ne prouvent pas à eux seuls l'expérience visuelle dans la session exacte du propriétaire ; dernière validation ergonomique à faire sur son écran.

## Statut des tests

- Nouveaux tests ciblés du mini : **5/5**.
- Tests historiques du graphe Conversion/Elastic : **23/23**.
- Suite complète V4/V5/attention : **272 tests**, dont **260 réussis**, **0 échec**, **12 anciens sautés**.

## Ajustement ergonomique : fenêtre verticale du prix à 1 600 $ et écart 3m sur le graphe

- **Sans changement de version** du moteur ni du module de conversion. Seule la présentation du mini-graphe évolue.
- Plage verticale du prix BTC désormais **fixe à 1 600 USD**, centrée sur la dernière cotation BTC réellement fraîche, sinon sur la dernière clôture 3m disponible. Ancien zoom dynamique jusqu'à environ 2 000 USD abandonné ; chandeliers anciens éventuellement hors plage sont masqués au lieu d'élargir l'échelle.
- Graduations horizontales BTC **tous les 500 USD**, inchangées. Hauteur physique du mini-graphe **192 pixels**, inchangée : aucun redimensionnement des cubes.
- Carrés ACHAT/VENTE, leur ratio de surface en racine carrée des volumes BTC et leur déplacement horizontal commun continuent à utiliser **strictement les mêmes calculs**, indépendants du zoom de l'axe prix.
- **Au bas du graphique SVG**, la valeur `Δ BTC 3m ±XX,X $` montre le déplacement net du prix entre premier et dernier trade OKX de la fenêtre glissante de trois minutes. Vert si positif, rouge si négatif, tiret si la source est périmée. Cette valeur est distincte du BTC absolu en haut et du PM3/PM5/PM Live. La duplication textuelle extérieure a été supprimée.
- Rendu compact Chromium (~214 px) vérifié, graduations 500 USD et texte du bas lisibles avec les horodatages.
- Tests ciblés renforcés : **7/7**, y compris zoom 1600, espacements de prix dans l'écran, invariance géométrique des deux carrés, valeurs signées positives/négatives et invalidation sur flux OKX périmé.
- Suite complète V4/V5/attention : **274 tests**, dont **262 réussis**, **0 échec**, **12 cas historiques sautés**.
- Seul `config-server` requiert un rechargement ; les moteurs V4.9.4/V5.4.2 PAPER et leurs contrats de protection restent inchangés.

## Rectification demandée : occupation intégrale du graphe, chiffres et horaires en rangées distinctes

**Cette rectification remplace le cadrage vertical fixe à 1 600 $ et la position du Δ 3m dans le SVG décrits dans la section précédente.** Elle reste purement graphique et n'impose aucune nouvelle version de BOONO.

- Les espaces libres artificiels **au-dessus et au-dessous des chandeliers** sont supprimés : le graphe utilise presque toute sa hauteur (`padding top/bottom = 3 pixels`) et son axe s'adapte à l'excursion réellement observée sur les bougies affichées avec une petite marge. La plage verticale varie entre **500 et 1 600 USD**, 1 600 $ restant la borne haute, et les graduations de prix demeurent espacées de 500 $. La MA3 distante ne doit plus créer de vide.
- Les **cubes** gardent leurs proportions et **leurs dimensions d'avant l'ajustement** : le facteur de taille reste calculé avec la hauteur de référence de 151 px, même si la surface graphique s'étend maintenant de haut en bas.
- La cotation absolue `BTC XX XXX,X $` est isolée et agrandie (14px) **au-dessus** du graphique, plutôt que d'être dessinée dans le SVG.
- Les libellés visibles **ACHAT** et **VENTE** sont supprimés ; les chiffres de volumes BTC apparaissent maintenant en **11,5px**, vert et rouge, avec les noms conservés seulement pour le titre/infobulle et l'accessibilité.
- Le déplacement `Δ BTC 3m ±XX,X $` est placé dans sa **propre rangée** de 13px, sous les volumes, et devient `—` si la mesure OKX n'est plus fraîche. Ce chiffre provient des trades agressseurs sur **3 minutes**, jamais de PM3 ni de la différence entre le premier et le dernier chandelier du graphique.
- Une **rangée supplémentaire** immédiatement dessous affiche `Début HH:MM` et `Fin HH:MM` du **graphique visible d'environ 90 minutes** (timeframe bougies 3m), fuseau `Europe/Stockholm`. Ces bornes temporelles étaient auparavant inscrites dans le SVG ; elles ne sont pas les limites de la mesure glissante de 3 minutes.
- Les données PM3, PM5, PM Live, eff3, P75, qualité, direction et statut sont conservées. Aucune nouvelle requête API et aucun WebSocket additionnel.
- Nouveau rendu compact statique sous Chromium (colonne 230px, graphique 208px), avec chandeliers réels et volumes de démonstration explicitement fictifs. Les deux nouveaux rangs et le cadrage resserré sont visuellement vérifiés.
- Tests ciblés adaptés aux nouvelles proportions, au cadrage adaptatif plafonné et à l'ordre des rangées ; contrôles des moteurs PAPER, des processus et des ressources d'interface avant déploiement.

## Ajustement typographique — cellule Conversion · 27 octobre 2026

Le mot `Bâton` et sa valeur monétaire demeurent au premier plan ; son complément `· depuis ±XX.X $` est conservé à droite, en **caractères plus petits (8,5 px), gris clair**, sur une seule ligne sans retour automatique. La mise en page de la valeur principale utilise une flexbox alignée sur la ligne de base et ne modifie aucune autre cellule.

`Vitesse 3m ±XX.X $/min` reste affichée. L'indication `· 2m précédentes ±XX.X $/min` est supprimée **uniquement du module graphique de l'État vivant** (et son libellé comparatif `RALENTISSEMENT` de cette même ligne) pour éviter les coupures. Les calculs de cadence et de vitesse de l'algorithme restent intacts ; aucune version de BOONO ni décision ne change.

Contrôle visuel statique Chromium effectué sur une cellule de 224 px avec `Bâton +39.6 $ · depuis -11.1 $` et `PM3 +52.7 $ · PM5 +43.7 $` : aucune coupure de ligne, complément bien gris. Régression complète après correction : **275 tests, 263 réussis, 0 échec et 12 anciens cas sautés**.

## Axe bleu ciel et espace entre l’axe et la frontière des deux cubes — 27 octobre 2026

**Observation demandée :** le point de contact des cubes ACHAT/VENTE s’écarte latéralement de la position centrale de référence. Cet écart n’est **pas** la différence des volumes acheteurs et vendeurs, un spread de cotation, une différence de prix vertical dans la chandelle ou la métrique `eff3`. Il correspond déjà dans le module d’origine à la **translation nette du prix BTC sur 3 minutes, normalisée par l’amplitude du prix observé pendant ces mêmes 3 minutes** :

\[
\text{Déport prix 3m (\%)}=100\times \frac{P_{dernier\ trade}-P_{premier\ trade}}{P_{max,3m}-P_{min,3m}}
\]

Les cubes continuent de se déplacer horizontalement selon `contactX = axeX + déportRelatif × travelDisponiblePx`. Le déplacement en pixels dépend de l'espace disponible et donc des **dimensions relatives des cubes** : seul le déport normalisé en % permet des comparaisons numériques entre les différents instants. Les volumes agressseurs BTC continuent de définir les **surfaces** des carrés, sans affecter le pourcentage du déport.

**Ajout exclusivement visuel :** dans `modules/elastic-mini-conversion-v542.js`, la ligne verticale fixe auparavant gris pointillé devient **bleu ciel `#4a9eff`**, selon l'accent déjà présent dans BOONO Watch. Une bande verticale bleu clair à 17 % d'opacité matérialise l'espace exact jusqu'au contact des deux cubes ; la ligne du contact conserve sa couleur distincte. L'axe fixe signifie `Δ BTC 3m = 0`, et ne représente ni une MA ni un prix absolu.

Sous l'affichage existant `Δ BTC 3m ±XX,X $`, une ligne compacte `Déport prix ±XX,X % du range 3m` caractérise l'espace. Exemple illustratif, et **non un relevé live** : −57 $ de déplacement net dans 155 $ d'amplitude correspond à −36,8 % du range 3m. Sur une maquette étroite, cela a produit ~7,7 pixels d'écart ; ce nombre de pixels n'est pas une unité de trading.

**Source identique** : transactions publiques OKX déjà collectées pour le graphe de Conversion ; aucun nouvel abonnement, aucune nouvelle source, aucun contrat de trading modifié. Si les trades deviennent périmés, aucune bande n'est tracée et le pourcentage revient à `—`. Quand le déplacement net est nul, l'axe et le contact sont confondus. `eff3`, `yield/P75` et `effort/P75` sont inchangés (pas de calcul fictif).

La lisibilité de la ligne centrale et du nouveau pourcentage a été vérifiée dans Chromium sur une maquette de 230 pixels de largeur ; l'intégration dans la session authentifiée utilisateur reste à contrôler. L'amélioration n'entraîne aucune évolution des moteurs V4.9.4/V5.4.2, et aucune modification des seuils, sorties ou entrées.

**Déploiement vérifié — 27 octobre 2026 :** avant redémarrage, sauvegarde du serveur d'interface, du module SVG et des deux ledgers avec empreintes SHA256 sous `/root/boono-conversion-blue-axis-before-20261027/`. Rechargement de `config-server` **uniquement** ; les PID `boono-v494-paper` (962864) et `boono-v542-paper` (962826) sont restés identiques. V4.9.4 et V5.4.2 diffusaient `DATA_OK`, PAPER sans ordre financé ; V5.4.2 comptait 77 trades clôturés au contrôle. Tests V4/V5/attention : **277 cas, 265 réussis, aucun échec et 12 anciens cas sautés**. Le repère bleu et le déport sont des éléments **strictement graphiques**, ne changent ni la politique de trading ni le prix, ni la taille des cubes.

## Fenêtre Conversion 2 h 30 et correction du fond — 27 octobre 2026

L'utilisateur a précisé que **la fenêtre actuelle de chandeliers** devait afficher au moins 120 minutes ; les **deux** représentations du module Conversion (mini et grande vue) sont donc passées de 90 à **150 minutes** sur la même unique source `/api/elastic-chart-3m`, toujours avec les bougies MCB 3m d'Amsterdam et sans nouveau WebSocket ni nouvelle requête. La route lit 53 lignes maximum avec contexte, l'axe temporel visible démarre à T−150 min et se termine au dernier horodatage disponible, sans extrapoler une bougie Live dans le futur. Les deux rangées Début/Fin du mini reflètent cette fenêtre. Les mesures de bras de fer, de déport du prix et de volumes **restent sur leur fenêtre glissante de trois minutes**. Aucune modification des moteurs de trading.

**Rectification visuelle explicite** : l'utilisateur voulait un **encadrement seul** gris ~10 % plus foncé, **et non un fond gris sous les bougies**. La surface autour du graphique (.v52-mini-conversion, padding 4 px) utilise désormais `#e6ebf0` ; la fenêtre de chandeliers CSS (.v52-mini-chart) est `#fff` et son SVG commence par un rectangle intégralement `fill="#fff"`. Les bougies restent donc sur **blanc pur**. Le tracé de la MA200, le ciel bleu du repère de déport et les deux cubes gardent leurs styles et proportions.

Rendu compact Chromium vérifié en 230 px (2 h 30, cadre gris / chandeliers blancs). Tests spécifiques au chargement 150 min et à la séparation cadre/blanc exécutés ; tests complets V4/V5/attention et publication ensuite.

**Finalisation corrective 150 min / cadre gris / chandeliers blancs :** suite complète 279 tests, **267 réussis, zéro échec, 12 anciens cas sautés**. Test spécifique assurant une seule requête de bougies, 150 minutes réellement visibles sur les deux graphiques, et rectangle SVG blanc avec gris réservé au cadre extérieur. Rendu vérifié dans Chromium sur une colonne étroite. Rechargement de `config-server` seul, sans modification des PID des moteurs PAPER.

## Hiérarchie visuelle du module 4 — 27 octobre 2026 (retouche typographique)

Le propriétaire demande la simplification de `4 · CONVERSION · PM LIVE`, sans changement de logique BOONO, d'indicateur, de flux ou de version.

- En tête, ne garder que **`Bâton ±XX,X $`**, accompagné de `· depuis ±XX,X $` plus petit et gris. La ligne `PM3 … · PM5 …` figurant auparavant au-dessus du graphe est **supprimée comme doublon** : la ligne live `PM3 … · PM5 … · Live …` existe déjà en bas.
- **Retirer `Vitesse 3m … $/min` du haut**, puis la replacer entre la ligne efficacité/P75 et la ligne Qualité/direction, dans la typographie petite de l'interface. La source et les calculs de vitesse restent intacts.
- **Transférer la chronologie `MF3 Δ3m … · MF15 Δ10m … · cohérence … · MF15 … · XX,Xs après Bâton` juste après les horaires Début/Fin**, en petit caractère et avec les mêmes données qu'auparavant.
- Ajouter un trait horizontal **gris foncé, fin (1 px `#aebac3`)** sous le prix absolu BTC, sous `Δ BTC 3m`, sous `Déport prix` et sous les horaires `Début / Fin`. Les volumes et le Δ restent ensemble, sans séparateur intermédiaire.
- **PM3 / PM5 / Live en noir `#18222b` et 9 px**, avant `eff3 / yield/P75 / effort/P75`, puis `Vitesse 3m`, puis `Qualité / direction`.
- **Éclaircir uniquement le cadre externe** de `#e6ebf0` à `#f3f5f7`, les bougies elles-mêmes restant sur **blanc pur `#fff`**. Les cubes, le repère vertical bleu ciel, l'échelle BTC, la fenêtre de 150 minutes et la donnée de déport du prix restent inchangés.

Vérification réelle du rendu : exécution du vrai `renderV52Living` dans un contexte de démonstration avec valeurs explicitement fictives issues de l'exemple utilisateur, puis insertion du SVG compact avec bougies historiques réelles. Rendu Chrome sans session authentifiée sur colonne de 234 px : aucune collision, lignes de séparation et hiérarchie vérifiées visuellement. La validation finale dans la session propriétaire reste possible après `Ctrl+Maj+R`. Cette intervention concerne **uniquement BOONO Watch** ; les moteurs V4.9.4/V5.4.2 et leur PAPER ne sont pas modifiés.

**Déploiement typographique vérifié (27/10/2026) :** tests complets **281 au total, 269 réussis, 0 échec, 12 cas historiques sautés**. Contrôle Chromium sur véritable HTML de la carte Conversion en 234 px. Sauvegarde préalable du serveur d'interface et des deux ledgers PAPER, empreintes SHA256 conservées dans `/root/boono-watch-conversion-hierarchy-before-20261027/`. Seul `config-server` redémarré. Les PID V4.9.4 `962864` et V5.4.2 `962826` sont restés identiques. Au contrôle de bascule, V5.4.2 était FLAT, V4.9.4 détenait un SHORT PAPER ; aucune entrée/sortie n'a été forcée et aucun ordre financé n'était autorisé. Route authentifiée BOONO Watch en service.

## Correctif des trois séparateurs du mini-graphe — 27 octobre 2026

Après la réorganisation du module 4, le propriétaire précise la position voulue des traits fins :
- **Aucun trait séparateur sous le prix absolu BTC**, immédiatement avant la fenêtre blanche de chandeliers.
- **Un seul trait gris fin entre les deux volumes acheteur/vendeur affichés en BTC et la valeur \`Δ BTC 3m\`** (bordure basse de \`.v52-mini-volume\`).
- **Aucun trait entre \`Δ BTC 3m\` et \`Déport prix\`**, ces deux grandeurs devant se lire ensemble.
- Conserver les traits fins **après \`Déport prix\`** et **après les horaires Début/Fin** pour isoler les petites informations MF/PM/efficacité/vitesse/qualité.

Correction CSS isolée dans \`modules/config-server.js\` ; aucune modification du graphe, des valeurs OKX, de la fenêtre 150 minutes, de l'axe bleu, des cubes ou des moteurs de trading. Un test dédié vérifie les bordures présentes/absentes. Un rendu Chromium de la véritable composition mobile à largeur 234 px a confirmé la nouvelle hiérarchie.

**Contrôle déploiement :** suite V4/V5/attention 281 tests, 269 réussis, 0 échec, 12 historiques sautés. Sauvegardes du serveur d'interface et des deux ledgers dans /root/boono-conversion-separators-before-20261027/. Seul config-server redémarré ; PID PAPER V4.9.4 962864 et V5.4.2 962826 inchangés. Aucun changement de décision ni sortie forcée ; ancien SHORT V4.9.4 conservé pendant la mise en service.
