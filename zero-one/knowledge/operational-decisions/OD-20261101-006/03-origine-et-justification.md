# OD-20261101-006 — reconstruction BOONO-TV V2 sur OVH

## Origine

Le propriétaire a validé la nouvelle planche de dix postures de BOONO et, dans la continuité des décisions OD-20261101-001 à 005, a exigé la reconstruction du studio BOONO-TV sur OVH à partir de l'établi, du loft nord, des deux affiches musicales et du chat noir validés. L'utilisateur a lui-même transmis par SCP une archive de ressources préparées en conversation ; son terminal a montré un transfert achevé à 100 %.

## Portée

L'autorisation porte sur le **studio de présentation** OVH et sa composition en couches, sans aucune autorité de trading ni modification des moteurs d'Amsterdam. La géométrie de l'établi change : une **nouvelle calibration préliminaire** des surfaces vidéo a été établie sans écraser le JSON de calibration historique.

## Résultats prouvés

- ZIP : `BOONOTV_v2_20261101_assets_et_apercus.zip`, SHA256 `4488b2a507ba59fc5cc7865e02f842d28e07c4eb6f0a8a175234aad8e2f3e5c2`.
- 29 ressources intégrées sous `assets/boonotv-v2-20261101`, leurs hashes concordent au manifeste.
- Nouveau CSS/JS en service depuis `scene/index.html`, copie source versionnée sous `zero-one/boono-tv/scene-v2/`.
- Fichiers originaux sauvegardés dans `incoming/backup-boono-tv-20261101-before-v2/`.
- La liaison Amsterdam et la capture MarketCipher répondent sur les endpoints privés du studio.
- Les positions de référence des deux surfaces sont des quadrilatères de travail, validés géométriquement sur une simulation localement rendue, **sans contrôle navigateur live final**.
- L'option de retour `?sceneV1=1` et la conservation des assets originaux fournissent une issue de repli rapide.

## Limites ouvertes

Le rendu visuel final dans le navigateur remote doit encore être inspecté avant qualification « parfait » ; certains détourage de BOONO et géométries des bords nécessitent un ajustement manuel. La capture MarketCipher retourne la qualité et le timeframe indiqués par le bridge source ; cette opération ne corrige pas ses propres décalages 3m/15m éventuels.

Publication documentaire **après** les interventions, à la suite du mandat validé. Aucune mise en service des moteurs PAPER n'a été engagée.
