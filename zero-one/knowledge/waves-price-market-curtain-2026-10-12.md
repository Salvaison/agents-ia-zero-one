# Vagues Price 3m/15m + BOONO-TV Market Curtain — 2026-10-12

## Vagues
La page Vagues devient un outil de lecture visuelle du marché.

- Les grands blocs THÈSE / CONTEXTE / EXÉCUTION sont retirés visuellement ; l'État vivant reste leur source canonique.
- Nouveau bandeau PRIX BTCUSDT synchronisé avec Wave15 et Wave3.
- Sélecteur prix 3m / 15m.
- 24H = ~6h visibles ; 48H = ~12h visibles, scroll horizontal commun.
- Candles avec corps + mèches.
- MA200 issue des données MCB collectées :
  - verte lorsque le close est au-dessus ;
  - rouge lorsque le close est au-dessous.
- Les marques de trades partagent le même axe temporel.
- FLOW / AUDIT est conservé en bas :
  PM · cadence · flow BTC/s · MF15 pente · MF15 Live.

## Source
Le chandelier utilise les mêmes fichiers MCB que les vagues :
- mcb_3m.csv / live
- mcb_15m.csv / live

OHLC et MA200 sont donc alignés causalement avec les données MCB.

## Renderer partagé
Nouveau module browser :
shared/boono-chart-renderer.js

Il fournit le coeur graphique commun :
- drawPrice
- drawWave

Thèmes :
- interface : fond blanc, noir/gris, MA200 rouge/verte ;
- BOONO-TV : transparent, blanc/gris, MA200 rouge/verte.

## BOONO-TV
Le prix 3m est la vue principale du rideau.

Un Market Curtain continu contient :
1. BTCUSDT 3m + MA200 ;
2. Wave15 ;
3. Wave3.

La fenêtre TV couvre environ 6h :
- ~120 candles 3m ;
- 24 bars 15m ;
- Wave3 à sa granularité native.

Le rideau est transparent et masqué autour du centre du personnage afin de donner l'illusion que les données passent derrière BOONO. Les anciens petits panneaux Candle/MCB/Waves sont masqués dans le scene-pack illustré.

## Autorité
Affichage uniquement. Aucun impact trading.
