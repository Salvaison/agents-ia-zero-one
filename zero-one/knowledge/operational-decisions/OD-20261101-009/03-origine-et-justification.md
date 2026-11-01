# OD-20261101-009 — Restauration du rideau MCB et amplification de l'affichage prix

## Déclencheur

Le propriétaire demande explicitement de remettre le **rideau de vagues MCB** et le **graphique de prix**, ce dernier devant être **étiré avec une plus grande amplitude**.

L'enquête montre que les scripts conservaient la génération de vrais canaux 15m/3m et de chandeliers 3m ; la V2 graphique du 1er novembre les avait uniquement **cachés en CSS**. Il n'était pas nécessaire de reconstruire un moteur de données ou d'altérer la capture TradingView.

## Autorisation et interprétation

- Rétablir les données MCB 15m/3m dans leur plan de rideau historique, avec une opacité adaptée au décor.
- Agrandir **visuellement** le plan prix de 520×296 à 920×420 px, sans amplifier fictivement les prix ni déplacer les observations OHLC.
- Préserver les dimensions du bureau/BOONO/loft, leurs calques, la source de marché et le trading.
- Conserver une version V1 fonctionnelle et les fichiers de sauvegarde sur OVH.

## Observation déterminante

Le snapshot côté studio livre simultanément `snapshot.market.price=80451.4` avec timestamp ancien (écart d'environ 150.75 heures par rapport aux bougies) et des OHLC 3m beaucoup plus récents autour de 77 729 $. Si l'ancre visuelle reste attachée à ce vieux tick, elle **aplatit** artificiellement le tracé.

Une garde limitée au rendu V2 calcule `sourceTickFresh` (écart ≤ 6 min avec la dernière bougie). Si elle échoue, le prix affiché dans le graphique est ancré sur la dernière **clôture 3m** et étiqueté `TICKER ANCIEN`. Les sources brutes et l'État vivant ne sont pas modifiés. La divergence du flux doit être analysée séparément.

## Statut

**Implémenté :** CSS V2 et options graphiques du chart dans `app.js`, sans toucher au renderer partagé.

**Testé :** simulateur de rendu JS : deux drawWave par scénario et bougies prix non modifiées, tick ancien/frais et retour V1 ; CSS et JS accessibles HTTP 200, `sourceOnline=true`, ancienne calibration intacte.

**En service :** prévisualisation OVH sur port 3091, via tunnel Amsterdam 8310. **À vérifier graphiquement :** l'agencement du rideau, la lisibilité du prix dans le loft et les collisions éventuelles avec les bulles/BOONO.

Les assets et logiques de trades PAPER n'ont pas été modifiés.
