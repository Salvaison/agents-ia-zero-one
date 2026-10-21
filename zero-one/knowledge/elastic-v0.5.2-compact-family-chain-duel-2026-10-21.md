# BOONO Systems — Elastic v0.5.2 : interface compacte mono-colonne et chaîne de thèse

Date : 21 octobre 2026. Autorisation de l'utilisateur : retour au format téléphone **même sur ordinateur**, liste des familles compacte, simple séparateur par trait, **une bulle pour toutes les mesures**, puis **une deuxième bulle pour le graphe** avec fenêtre/graduation ; le haut du graphe affiche PM3, PM5, PM Live, efficacité, yield/P75, effort/P75, qualité et direction à la place du dernier événement chronologique. Rejeter le malentendu « conviction = ticker » : conviction au sens d'une **chaîne de phénomènes** soutenant la thèse actuelle MCB. Shadow et UI uniquement, aucun pouvoir de décision.

## Vue commune et disposition

- `body:has(#tab2-statev2.active) .page-wrap` repasse de 780 px à 480 px : même largeur visuelle que la vue téléphone, également sur poste de travail.
- Toutes les familles MCB15, MCB3, FLOW, MA, CONVERSION, BOUNDARY, CONTEXT dans une **seule bulle** ; affichage mono-colonne à toute largeur, rubriques séparées par un filet léger au lieu d'une carte par famille.
- CONVERSION reste dans la liste en abrégé (qualité / direction). Les **chiffres de conversion complets sont rassemblés au-dessus du graphe dans la deuxième bulle**, sans répétition numérique dans la première.
- Deuxième bulle : duel compact, carrés accolés, cadres rectangulaires et graduation du déplacement BTC `-R, -R/2, 0, +R/2, +R` avec `R` égal à l'amplitude 3m observée. Contact des carrés décalé selon le prix net, *indépendamment* du volume qui définit la surface de chaque carré. Prix net en bas du cadre. La ligne de dernier événement chronologique et le long paragraphe explicatif sous les carrés sont retirés.
- Chronologie 6/24/48 h toujours repliée au départ, filtrable et paginée, dans la deuxième bulle sous le graphe.

## Chaîne de thèse (et non ticker)

La partie supérieure indique toujours la proposition MCB, la trajectoire structurelle 15m et la direction des prix. Le bloc sous cet en-tête est renommé **CHAÎNE DE THÈSE LONG/SHORT** et suit les données distinctes :
- E15 / E3 confirmés et Live (signaux natifs) ;
- progression LBW15 et LBW3 depuis la bougie confirmée ;
- croisement BW/LBW15 et BW/LBW3 frais, identifié comme lié au signal natif et **jamais compté comme preuve indépendante** ;
- progression MF15 et MF3 depuis la bougie confirmée ;
- PM Live, PM3, PM5 ;
- état MA3/MA15 si `HELD/REJECTED/LOST` documenté par une bougie confirmée.

Les éléments qui soutiennent le camp MCB sont montrés dans une chaîne **ordonnée par leur premier moment d'observation dans le shadow**, pas par l'heure parfois ancienne de la bougie source. Les conditions adverses restent consultables dans le shadow, sans apparaître comme des doubles « votes » ou un pourcentage de conviction. Lorsqu'une condition cesse de soutenir la thèse, elle disparaît de la chaîne active ; si elle réapparaît ultérieurement, sa date de nouvelle apparition repart correctement. Les Live restent provisoires et ne remplacent pas les confirmés avant confirmation.

Il ne s'agit ni d'une séquence d'entrée obligatoire ni d'un nouveau verrou ; ces phénomènes peuvent apparaître dans un ordre variable. MCB propose ; PM Live est un premier témoin du mouvement, mais l'exécution V4 continue de dépendre des règles de traduction depuis setup, continuité PM et R/R/risque déjà codées. Le champ d'ancienne « conviction ticker » n'est plus affiché au sommet d'Elastic.

## Garde-fous / validation

- Le shadow porte toujours `decisionImpact:false`. Version persistée haut niveau `elastic-observer-shadow-v0.5` inchangée afin de conserver la mémoire ; seule la révision évolue vers v0.5.2.
- Le moteur primaire demeure **V4.10.10-hard-stream-gain-floor-20261021** ; admissions, sorties, TP1, stop dur 120/90 puis 220/180 et plafond 500 inchangés.
- Tests : deux bulles au lieu des sept cartes, largeur bureau 480 px, séparateurs, graphique dans un cadre gradué, chiffres conversion au-dessus, chronologie conservée, chaîne de thèse soutenue par des mesures réelles sans ticker, reconnaissance/reconnaissance successive sans persistance fictive.
- Ne pas modifier les composants ni archives BOONO-TV ; l'ancien Elastic v0.4.3 reste shadow d'audit.
