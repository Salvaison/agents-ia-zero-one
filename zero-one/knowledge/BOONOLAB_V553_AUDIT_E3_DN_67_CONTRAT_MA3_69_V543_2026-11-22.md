# BOONOLAB — #67 rupture tactique E3 DN et #69 refus MA3 déjà connu de BOONO

**22 novembre 2026. Analyse historique uniquement : V553 PAPER et V543 inchangés.**

## Mandat
L'utilisateur souhaite conserver V553 strictement tel quel, y compris sa permission pré-Cross, afin d'observer les comportements dans plusieurs régimes. Il remarque les bonnes campagnes V543, signale que #69 est explicitement contre-indiqué par BOONO, et demande si #67 reconnaît la cassure survenue au milieu de sa campagne.

Sources Amsterdam : data/v553-paper-state.json ; data/v52-paper-state.json ; data/v553-paper-decisions.ndjson et segment de rotation ; archives Bâton data/audit-14d/audit-20261122T17.ndjson.gz et T18 ; bougies confirmées mcb_3m.csv et mcb_15m.csv ; modules/v553/decision.js ; modules/v5/ma-contract-v531.js et decision-v541.js. Timestamps de bougies = début de bougie, clôtures disponibles seulement au terme de leur timeframe.

## #69 — la connaissance BOONO existe dans la lignée V543

SHORT #69 V553 le 22 novembre à 19:07:50 CET, entrée BTC **60 648 USD**, MA2003m confirmée **60 638,145 USD**. Seulement **9,85 USD** d'espace avant ce support potentiel ; le dernier close connu à 19:06 était 60 831,4 USD, au-dessus de MA3. Première clôture sous MA seulement connue à 19:09, après l'entrée, immédiatement réintégrée au-dessus de MA à 19:12.

Contrôle décisif : exécution en lecture seule de la fonction existante modules/v5/ma-contract-v531.js::evaluate(), au timestamp précis de #69, sur les bougies MCB3m et MCB15m confirmées disponibles, sans inventer de MA Live. Le contrat retourne :
- MA3 : 60 638,1 USD ; inApproach=true, state=REJECTED ;
- **entryGate.block=true** ;
- **entryGate.reason=WAIT_3M_REJECTION**, source 3m ;
- observation : Price is testing an unresolved moving-average frontier.

Il s'agit du comportement réel du module de contrat MA de la lignée V543 REJOUÉ avec les données connues à l'instant #69, et **non de la décision V543 réellement journalisée ce jour-là**. Cette distinction est importante.

V553 connaît la valeur sensor.place.ma3, mais entryReview et exitReview n'en font aucun garde-fou. La MA testée/rejetée était déjà une notion BOONO ; son autorité a été laissée hors de cette reconstruction V553. L'utilisateur demande de NE PAS la rétablir immédiatement.

## #67 — la cassure tactique E3 DN est au milieu de la campagne

LONG #67, entrée 17:03:24 CET à 60 957,5 USD BTC, sortie 18:04:30 à 60 909,4, net −2,683 USD ; MFE +408,4 USD BTC.

Chronologie des clôtures MCB3m, toutes disponibles uniquement à leur heure de clôture :
| CET | Close BTC | Gap MCB3 | Événement |
|---|---:|---:|---|
| 17:33 | 61 273 | +1,43 | LONG faible |
| **17:39** | **61 260** | **−0,03** | **E3 DN natif confirmé** |
| 17:42 | 61 289 | −2,49 | E3 SHORT persiste |
| 17:45 | 61 315 | −2,06 | Prix encore en hausse |
| 17:48 | 61 280 | −3,44 | Opposition tactique |
| 17:51 | 61 212 | −7,69 | Début de retrait du prix |
| 17:54 | 61 202 | −11,08 | Vendeurs persistent |
| 18:00 | 61 222 | −6,68 | MCB3 toujours SHORT |
| 18:03 | 61 051 | −16,44 | Retrait plus marqué |

Le prix atteint encore environ **61 359 USD à 17:43:49**, après le Cross E3 DN confirmé. La cassure tactique n'est donc pas immédiatement un retournement fiable et une liquidation mécanique à 17:39 risquerait d'être prématurée. À 17:45, le Cross15 confirmé restait LONG (gap +13,54).

Vers **17:49:49**, Bâton observe BTC 61 211,9, pente LBW15 3m **−1,55**, MCB3 gap **−6,69**, PM Live **−62,5 USD**. La combinaison devient plus adverse ; le prix reste au-dessus du prix d'entrée. À 17:51 MCB3 gap −9,94. À **18:01:20**, le journal V553 enregistre CROSS15_LIVE_OBSERVED SHORT au BTC 61 176,1 avec gap MCB15 −0,17, MCB3 −8,21, PM Live −15,5 et PM3 −65,1 ; BOONO reste encore HOLD pour attendre la persistance de Cross15 Live. À **18:04:30**, EXIT_LONG sur cross Live opposé et prix adverse, net −2,683 USD.

**Différence détection / interprétation / autorité :** sensor() du moteur inclut les champs mcb3.direction et mcb3.native ; il pouvait donc voir le Cross E3 DN à sa clôture. Mais la mémoire refresh() privilégie E15 parent, LBW15 pente et Cross15 Live, n'émet pas un événement autonome E3_DN_CONFIRMED à 17:39, et exitReview a **early=false** avant Cross15 Live opposé. C'est une absence de rôle de la cassure MCB3 dans la décision, PAS une absence de données MCB3. Le moteur reconnaît la rupture Cross15 Live à 18:01 puis sort à 18:04.

## Comparaison 21–22 novembre, trades clôturés uniquement, frais compris

| Journée de clôture Europe/Stockholm | V543 | V553 |
|---|---:|---:|
| 21/11 | **+88,38 USD**, 6 clôtures | **+108,84 USD**, 18 clôtures |
| 22/11 au moment du relevé | **+15,37 USD**, 4 clôtures | **+14,01 USD**, 14 clôtures |
| **Total** | **+103,75 USD** | **+122,85 USD** |

V543 a notamment réussi les campagnes #303, #307 et #310. Les horaires, positions, nombres de trades, durées et exposition diffèrent ; **ce n'est pas une comparaison A/B à risque et exposition identiques**. Ne pas inclure les positions ouvertes dans le réalisé.

## Décision de travail

- **V553 conservé inchangé** pour observer d'autres marchés, y compris la référence chain.live15At encore incohérente avec firstLiveAt ;
- **pas de réintroduction de contrat MA3 V543**, pas de nouveau verrou E3 ni de sortie avant Cross15 Live ;
- maintenir V543 et V553 en stratégies indépendantes ;
- distinguer pour les études futures le Cross E3 DN précoce de #67, les preuves adverses successives et l'invalidation structurelle Cross15 qui arrive plus tard.

**Statut : audit documentaire uniquement. Aucune modification du code des moteurs ni du ledger PAPER.**
