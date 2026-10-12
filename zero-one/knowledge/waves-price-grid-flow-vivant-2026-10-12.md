# Vagues — price grid refinement + FLOW/VIVANT — 2026-10-12

## Prix
Le graphique prix 3m/15m est agrandi et recadré dynamiquement sur la fenêtre réellement visible.

- hauteur desktop : 300 px ;
- hauteur mobile : 230 px ;
- géométrie des chandeliers adaptative à la densité ;
- échelle verticale calculée sur la tranche visible du scroll, pas sur tout l'historique 24/48h ;
- bornes prix arrondies à 50 USD.

## Grille prix
- ligne horizontale gris très clair 2 px tous les 200 USD ;
- ligne horizontale gris très clair 1 px sur les niveaux intermédiaires de 100 USD ;
- ligne verticale noire 1 px à chaque heure ;
- axe gauche fixe :
  - prix complet écrit tous les 200 USD en gris foncé ;
  - barrette noire tous les 50 USD ;
  - barrette plus longue sur les niveaux 200 USD.

## Trades
Les plages bleu ciel des trades ont maintenant une fine bordure noire sur le graphique prix et sur les vagues.

## FLOW / AUDIT
Le module FLOW / AUDIT est déplacé entre PRIX et VAGUE 15m.

Fond : bleu ciel léger, dans le vocabulaire visuel des rapports.

Contenu conservé :
PM · cadence · flow BTC/s · MF15 pente · MF15 Live.

Bouton `VIVANT` à droite :
- bascule directement vers le sous-menu État V4 / État vivant ;
- aucun rechargement de page.

## Autorité
Affichage uniquement. Aucun impact trading.
