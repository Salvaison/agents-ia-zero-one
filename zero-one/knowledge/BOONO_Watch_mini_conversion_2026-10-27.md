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
