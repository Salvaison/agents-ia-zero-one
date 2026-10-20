# BOONO — Elastic v0.4.3 : croisement BW/LBW, événement géométrique distinct

Date : 20 octobre 2026. Statut : correction du **shadow Elastic** validée par l'utilisateur. Aucun impact sur la stratégie V4.10.8.

## Principe corrigé

**BW/LBW CROSS est un événement distinct, pas un événement central ni une preuve supérieure.** Il n'est pas confondu avec :
- E3/E15 Live et confirmé : événements natifs MCB avec leurs horodatages source et de disponibilité.
- LBW_ZERO_CROSS : changement de signe de LBW par rapport à son axe zéro, information séparée sur la phase de la vague.

Même lorsqu'un croisement BW/LBW coïncide avec E3/E15, ils ne forment pas automatiquement deux confirmations indépendantes. Les événements géométriques ne sont **pas ajoutés à `proofs`, `activeProofCount` ou `families`** ; ils sont enregistrés dans `milestones` comme observations liées à la même famille MCB3/MCB15.

## Instrumentation du shadow

Données observées, sans nouveau collecteur :
- 3m : `AUDIT.liveBw` et `AUDIT.liveLbw`.
- 15m : `AUDIT.live15BwRaw` et `AUDIT.live15LbwRaw`.

Par timeframe, `waveGeometry` décrit :
- `spread=BW−LBW`, signe et amplitude ;
- `spreadRatePerMinute`, variation signée de l'écart entre deux relevés consécutifs ;
- `relation=BW_ABOVE_LBW/BW_BELOW_LBW/INTERSECTION` ;
- `lastCrossing` avec `sourceTs`, `observedAt`, prix, écart avant/après et sens géométrique (`BW_CROSSES_ABOVE_LBW`, `BW_CROSSES_BELOW_LBW`) ;
- temps écoulé depuis ce croisement.

Les observations doivent être fraîches et espacées d'au plus 90 s ; aucun franchissement n'est inventé à travers un trou plus grand, une absence de valeurs ou un simple signe stable.
Dans les deux chaînes, `BW_LBW_CROSS_3M` / `BW_LBW_CROSS_15M` sont des jalons **partagés et sans polarité stratégique**, avec `GEOMETRIC_CROSS`, non des votes. Les passages zéro LBW existants restent inchangés et secondaires.

## Replay réel du 20 octobre

Lecture chronologique de dix relevés de l'AUDIT entre 16h59 et 17h04, heure de Paris :
- **17h01:13** : croisement BW/LBW 15m, écart −2,897741 → +0,430034 ; origine audit `2026-10-20T15:01:13.295Z`; E15 DN Live apparaît dans la même période.
- **17h02:43** : croisement BW/LBW 3m, écart −1,334294 → +1,499683 ; origine audit `2026-10-20T15:02:43.297Z`; E3 DN Live apparaît.
- LBW3 ne passe sous zéro que plus tard, vers 17h12. LBW15 reste supérieur à zéro au moment de la confirmation E15 DN.

Ces faits établissent la distinction des événements. Ils **ne mesurent pas encore leur contribution probabiliste indépendante** à la réussite d'un trade.

## Interface

Dans chacune des deux fenêtres Elastic au-dessus de l'État vivant, rubrique **CROISEMENTS BW / LBW · ÉVÉNEMENT DISTINCT** affichant :
- écart BW−LBW 3m et 15m ;
- variation par minute ;
- âge du dernier croisement enregistré ;
- rappel « Liés aux E3/E15 · sans double comptage ni autorité de trading ».

Les jalons détaillés restent dans `JALONS CAUSAUX`, sous leur nom propre, avec l'heure de connaissance et la source.

## Protection du périmètre

- `elastic-dual-chain-shadow-v0.4` reste l'identifiant top-level (persistance de l'état). Cette extension est documentée v0.4.3.
- **Ne pas modifier** les admissions, sorties, risk, anti-churn, E3/E15, MF Memory ni les collecteurs.
- Ne pas donner un poids automatique de décision aux géométries : leur valeur sera étudiée dans le laboratoire Elastic par comparaisons temporelles, prix et MFE/MAE.

## Fichiers

- `modules/v4/experiments/elastic-dual-chain-shadow.js`
- `modules/config-server.js`
- `tests/v4/elastic-dual-chain-shadow.test.js`
- `knowledge/elastic-v0.4.3-bw-lbw-cross-distinct-2026-10-20.md`
- `knowledge/version-log.md`
