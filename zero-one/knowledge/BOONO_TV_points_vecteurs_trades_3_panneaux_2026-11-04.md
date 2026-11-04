# BOONO-TV — Points MCB, textes vectoriels, cubes agrandis, trois panneaux de 12 s

**Date du contrôle :** 4 novembre 2026, Europe/Stockholm.
**Statut :** implémenté et actif dans la prévisualisation OVH ; contrôles Chromium réalisés ; appréciation esthétique définitive à confirmer par le propriétaire.
**Décision opérationnelle :** [OD-20261104-003](operational-decisions/OD-20261104-003/03-origine-et-justification.md).
**Filiation :** [correction prix LIVE et conversion du 04/11](BOONO_TV_live_conversion_evenements_2026-11-04.md).

## Changements observables

1. **Vagues et rideau :** les événements natifs E3 et E15 sont maintenant marqués par les seuls disques rouge/vert. Suppression de leur texte autour des points, sans changement de l'oscillateur, du timeframe, du caractère LIVE/confirmé ni des fourchettes de trades déjà présentes sur les trois graphes analytiques. Le rideau conserve son absence de fourchettes.
2. **Qualité de conversion :** le texte flou sous la transformation CSS matrix3d est masqué ; une couche SVG indépendante dans le système de coordonnées du loft affiche la vraie chaîne « Qualité UNCLASSIFIED », « Qualité CONTESTED », etc., avec fond de contraste. Cette couche suit le quadrilatère et le déplacement/zoom du bureau issus de la calibration vivante du studio. Le texte reste vectoriel jusqu'à la composition navigateur.
3. **MarketCipher :** la seconde étiquette SVG affiche « MarketCipher B - 15min » si l'image de capture active est effectivement en 15m, et « MarketCipher B - 3min » lorsque la capture est en 3m. On ne ment pas sur le timeframe : le panneau conserve la véritable capture TradingView relayée depuis Amsterdam.
4. **Conversion mini :** dans la copie de rendu SVG dédiée à BOONO-TV, les deux carrés acheteur/vendeur ont une dimension maximale augmentée d'environ 92 à 141 unités SVG (environ +53 %) et une zone visible un peu plus haute. Le rapport de surfaces continue de dépendre de la racine carrée des volumes acheteur/vendeur réellement observés ; les volumes, prix, traits et classifications ne sont pas inventés. Le petit cube peut naturellement rester inférieur au grand si les volumes sont très déséquilibrés.
5. **Troisième panneau :** ajout de « TRADES ACCOMPLIS » à gauche. Lecture des seuls trades PAPER clôturés V494 et V543 issus des deux ledgers réels Amsterdam sur 48 heures : horodatage local de la sortie, moteur/numéro, LONG/SHORT, entrée/sortie BTC, résultat net USD après frais. Jusqu'à 13 dernières clôtures visibles, avec résumé net calculé sur toutes les clôtures de la période. Les positions ouvertes et les shadows ne comptent pas comme trades accomplis.
6. **Rythme :** les trois panneaux s'affichent dans l'ordre État vivant → Prix/Vagues → Trades, exactement 12 000 ms par vue, puis répétition. Pour les essais, les URL de prévisualisation avec panel=state, panel=charts ou panel=trades restent bloquées sur le panneau demandé.

## Périmètres techniques

- Amsterdam : seul le bridge de présentation en lecture seule zero-one/boono-tv/bridge.js s'enrichit des champs netPnlUsd, feesUsd et exitReason depuis les journaux PAPER existants. Le service PM2 boono-tv seul a été redémarré pour la publication de ces champs.
- OVH : fichiers actifs scene/chart-views.js, scene/tv-mini-conversion.js, scene/index.html, scene/styles.css, scene/boono-v2.css, nouvel adaptateur scene/desk-vector-titles.js. Le compositing existant, MarketCipher capturé, personnages et assets graphiques validés ne changent pas.
- **Intouchables :** moteurs PAPER V494/V543, leurs états et ledgers, renderer partagé Watch, réglages trading, projections calibrées et fichier desk/projection-config.json.
- Sauvegarde complète des fichiers OVH avant modification : /home/ubuntu/boono-tv-studio/backups/2026-11-04-svg-trades-12s/
- Sauvegarde du bridge Amsterdam avant modification : zero-one/boono-tv/bridge.js.pre-20261104-svg-trades
- SHA-256 calibration inchangée avant/après : e11d7ba720166bbfeabdf8cb0c03a1926044e3679601f074baaa0ad9dddecedc

## Tests et preuves

- Syntaxe JavaScript Node : valide pour les fichiers de scène et le bridge modifiés. Le studio OVH continue de répondre et le bridge Amsterdam publie les transactions clôturées avec le résultat net réel.
- Test Chromium tête libre de la prévisualisation : titres SVG « Qualité CONTESTED » et « MarketCipher B - 3min » visibles en situation, changement simulé de capture à 15m rendant précisément « MarketCipher B - 15min » puis rétablissement 3m ; zéro erreur JS.
- Sur les graphiques, interception de Canvas : aucun texte E3/E15 dessiné ; événements rouges/verts toujours présents.
- Contrôle du troisième panneau : 27 clôtures PAPER sur 48 h au moment du test (15 V494, 12 V543), dont 13 présentées ; un exemple de résultat net réel après frais est V543 #165 +38,45 $ (donnée ponctuelle, pas bilan durable).
- **Test de rotation en navigateur sur 37,74 s :** à environ 2 s État vivant, 13 s Graphiques, 25 s Trades, 37 s État vivant ; attributs aria-hidden cohérents, prix OKX mis à jour et zéro exception JavaScript. Durée d'attente par panneau : 12 s.
- Scripts et captures de contrôle sur OVH : tests/verify-vector-trades-20261104.js, tests/verify-3-panels-12sec-20261104.js, tests/vector-trades-20261104-result.json, tests/verify-3-panels-12sec-20261104-result.json, captures boono-20261104-vector-state.jpg, boono-20261104-dot-waves.jpg, boono-20261104-trades-panel.jpg.

## Limites

La vectorisation est une solution de présentation : elle ne transforme pas les images sources ni ne crée de nouveaux signaux. La lisibilité varie encore avec le cadrage, le personnage placé devant les écrans et la réduction à la taille réelle de prévisualisation. Le résultat esthétique reste à juger sur l'écran du propriétaire. La variation de la qualité et la disponibilité de la capture 15m dépendent des flux réels. La fenêtre des trades reste glissante sur 48 h ; les totaux cités sont des exemples horodatés et non une performance garantie. La stabilité de long terme après reconnexion réseau n'est pas démontrée par les tests locaux. Aucun signal MCB ni trade n'a été recomputé à partir de la scène.
