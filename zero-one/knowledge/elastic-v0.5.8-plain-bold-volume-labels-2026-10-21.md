# BOONO Systems — Elastic v0.5.8 : chiffres BTC colorés sans plaquette

Date : 21 octobre 2026. Demande de l'utilisateur : enlever le rectangle blanc translucide des étiquettes à l'intérieur des deux carrés ; ne conserver que le montant de BTC en **rouge/vert 100 % opaque, gras** ; rétablir au-dessus du graphique les lignes « ACHAT XX.XXX BTC » et « VENTE YY.YYY BTC » comme avant.

## Modification d'interface (shadow pur)

- Retrait intégral des balises SVG `el-volume-label-back` (fond blanc, fond semi-transparent) et `el-volume-side` (texte ACHAT/VENTE dans les carrés).
- Uniquement **une balise texte `el-volume-amount` par carré**, affichant la quantité agressive en `BTC`, couleur verte `#16804b` et rouge `#bf4149` avec `fill-opacity=1` et `font-weight=900`.
- Les quantités au-dessus de la surface de bougies sont restaurées : `ACHAT ... BTC` et `VENTE ... BTC` ; elles affichent les mêmes volumes de transactions initiées sur la fenêtre de 3 minutes.
- Police adaptée à la taille du carré, compression `textLength` pour les petites dimensions. Volume inférieur à 0,01 BTC conserve plus de précision afin d'éviter l'affichage trompeur « 0,000 BTC ».
- Les carrés et leurs bordures semi-transparentes, leur déplacement autour de la ligne centrale, les bougies OHLC 3m, la MA200 et la valeur prix du déplacement restent inchangés.

## Sûreté et validation

- Tests du texte à l'intérieur de chacun des carrés, sans fond ni libellé latéral, couleur 100 % opaque et poids 900, avec valeurs au-dessus et petite valeur BTC.
- Aucun changement à la logique de décision V4.10.10, aux entrées, sorties, frais, stops, données de marché, historiques ou BOONO-TV.
- Rechargement de `config-server` uniquement ; `cerveau-central` n'est pas rechargé même si un trade est ouvert.
