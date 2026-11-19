# BOONOLAB — Audit V551 Cross15 DN 02h15–02h30, sorties et mémoire des campagnes (19 novembre 2026)

**Type : diagnostic reproductible sur les ledgers et observations réelles. Statut : ANALYSÉ · AUCUNE MODIFICATION DU MOTEUR PAPER.**

L'utilisateur demande les résultats de V551, les 6 premiers trades, la réentrée sur mémoire, et l'heure exacte à laquelle le Cross15 DN « vers 2h00 » a été reconnu relativement à la sortie du LONG #4 et à l'entrée du SHORT #5.

## 1. État du ledger à 08h36m45s CET, 19/11

V551 `v5.5.1-paper-ledger-v1`, politique `v5.5.1-mcb3-first-campaign-memory-paper-v1`, `brokerOrdersEnabled=false` :
- **8 trades clôturés, 4 gagnants**, net réalisé après frais **+2,8146 $**, equity réalisée **1 002,8146 $**, frais comptabilisés **12,7593 $** (incluant frais d'entrée de la position en cours). Un **SHORT #9 était ouvert**, net latent simulé environ −1,7266 $ (état ponctuel, sujet à variation).
- Depuis la première entrée V551 du 18/11 18h17m49s : **13,76 h en position sur 14,32 h observées, soit 96,1 % du temps**. C'est une mesure d'exposition, pas un résultat économique.
- Résultats clôturés #1 à #8 : **−1,8101 ; +7,7174 ; −3,9660 ; +4,5564 ; −9,5155 ; +9,6757 ; −4,6264 ; +0,7831** dollars PAPER, après frais. Les huit sorties portent `V551_CONFIRMED_15M_CROSS_LOCAL_POSITION_EXIT` ; pas d'autorité de sortie tactique exercée sur ces exemples.

## 2. Chronologie CROSS15 DN : trois temps distincts

Sources : `data/audit-history.json` (Bâton ~30s), `../data/mcb-live/mcb_15m.csv` (bougies TradingView 15m), `data/v551-paper-decisions.ndjson`, `data/v551-paper-state.json`. **Toutes les heures Europe/Stockholm (CET).**

| Horodatage | Preuve |
|---|---|
| **02h08m13s** | Cross3 SHORT détecté ; épisode mémorisé `short|CROSS3:1795050493601` alors que #4 LONG était encore ouvert |
| **02h15m43,608s** | **Première observation Bâton du passage BW15/LBW15 Live sous zéro dans cette séquence** ; LBW15 − BW15 = **−0,703**, `live15SignalDn` présent, prix BTC observé **62 975,40 $**. Le relevé précédent était encore au-dessus ; pas de retour au signe LONG jusqu'au croisement confirmé de 02h30 dans les relevés de cette séquence |
| **02h30m00s** | Clôture de la bougie 15m ouverte à **02h15**, LBW15 **33,344089**, BW15 **41,172732**, écart **−7,828643** contre **+5,843751** sur la précédente bougie ; `wt1_cross_dn` présent sur **la même bougie**. Le code crée **`CROSS15_CLOSED SHORT` et `E15_CONFIRMED SHORT` au même horodatage déclaré** |
| **02h30m37,875s** | **Première décision du runner V551 effectivement journalisée** avec Cross15 clôturé ; sortie #4 à **62 634,40 $**, raison `V551_CONFIRMED_15M_CROSS_LOCAL_POSITION_EXIT` |
| **02h30m43,124s** | `TRANSFER_ACCEPTED` : parent 15m passe SHORT, après réponse prix/flux/PM |
| **02h30m47,933s** | Entrée #5 SHORT à **62 591,70 $**, **22,57 min après son Cross3 SHORT initial** à 02h08 |

**Ne pas présenter l'horodatage structurel théorique 02h30m00s comme l'heure du premier traitement par V551 : la décision de sortie est prise à 02h30m37,875s.** Le Cross15 Live daté 02h15m43,608s est observé par le collecteur (et son champ `live15SignalDn`), mais V551 ne journalise pas spécifiquement `CROSS15_LIVE` : il enregistre sa pente et attend la confirmation 15m pour sa voie de sortie principale. Des croisements provisoires existaient à d'autres moments de la nuit : « première observation » qualifie **ce mouvement précis**, et non toute la journée.

`E15_CONFIRMED` n'est **pas une confirmation indépendante supplémentaire du Cross15** ici : les deux états sont extraits de la même bougie TradingView 15m clôturée, ce qui rend leur heure identique.

## 3. Restitution économique du LONG #4

- #4 LONG : entrée **00h05m05s** à **62 382,40 $**, sortie **02h30m37s** à **62 634,40 $** ; déplacement favorable final **+252,00 $ BTC**, MFE observé dans le ledger **+884,70 $ BTC**, restitution **632,70 $ BTC** soit **71,52 %** de son MFE ; résultat réel net **+4,5564 $**.
- Lors du premier Cross15 DN Live **02h15m43s**, le prix Bâton est **62 975,40 $**. Une **clôture hypothétique à ce prix exact**, frais simulés 0,05 % par côté, aurait produit **environ +12,75 $ nets**, soit **8,20 $** de plus que le résultat réel. **Ce n'est pas un fill réalisé ni un prix garanti : spread, slippage, routage et réponse ultérieure ne sont pas simulés.**
- À **02h16m13s**, les faits étaient déjà MCB3 SHORT, MCB15 Live SHORT, `PM3 = −156,60$`, pente MF3 `−2,86`, `PM Live = −14,80$`, dernier 15m **encore LONG**. V551 renvoyait pourtant `HOLD`.

## 4. Détection d'un bogue dans le contrat de sortie

Source : `modules/v551/decision.js#positionReview`. Le code pose `const direction=position.direction,d=side(direction)`, soit `d=+1` ou `−1`. Puis :
`g15=signed(o.mcb15.gapSlope3,d)`,
`adversePrice=signed(o.pm.p3,d)<0`,
`adverseMF=signed(o.mf.slope3,d)<0`,
`adversePM=signed(o.pm.live,d)<0`.

Or `signed(x,d)` attend **`'long'` ou `'short'`** ; `side(1)=side(-1)=0`, d'où `signed(...,+1)` et `signed(...,-1)` retournant systématiquement `null`. `null < 0` donne `false`. **Ces preuves adverses n'ont donc aucune autorité dans les sorties V551 actuellement déployées.**

Relecture en mémoire, **sans modification du code PAPER** sur un état as-of à 02h16m13s : décision réelle reproduite `HOLD` avec `adversePrice=false, adverseMF=false, adversePM=false`; correction des arguments au format direction textuelle donne au même instant `true,true,true` et la condition locale de protection serait vraie.

**Important : ne pas déployer une substitution aveugle du paramètre.** Relecture échantillonnée des premiers prédicats de sortie locaux avec direction correcte :
- #2 SHORT : premier déclencheur vers **21h15**, scénario de clôture net **−1,98 $**, alors que sa sortie réelle à 23h15 produit **+7,72 $**.
- #4 LONG : premier déclencheur vers **01h18**, scénario environ **+6,08 $**, alors que le Cross15 Live soutenu plus tard à **02h15** aurait donné environ **+12,75 $** (sur prix observé).
- #8 LONG : premier déclencheur vers **07h50**, hypothétique **−2,39 $**, alors que sortie réelle vers 08h30 **+0,78 $**.

Il s'agit de simulations contrefactuelles simples à partir des relevés Bâton, **sans ticks exacts, prix d'exécution réel, spread, glissement, réentrées ou P&L de campagne reconstitués**. Elles démontrent seulement que l'ancien prédicat tactique, une fois débogué, peut lui aussi fragmenter prématurément les campagnes. L'erreur de type est avérée, **la meilleure politique de protection ne l'est pas**.

## 5. Réentrée sur mémoire : « oui mais »

- **#3 → #4** : même parent `long|TRANSFER:1795040100000`, sortie #3 à **00h00m36s**, nouveau Cross3 LONG **00h01m13s**, nouvelle entrée #4 **00h05m05s** (4 min 29 s après la sortie). V551 **préserve effectivement le parent E15 et consomme une autre clé tactique**. Il ne réouvre pas sans événement Cross3 distinct.
- **#4 → #5** n'est **pas** une réentrée dans le même parent : passage LONG → SHORT après acceptation du transfert 15m. Le Cross3 SHORT du #5 date de **02h08m13s**, puis est exploité à **02h30m47s** après environ **529,8 $ de déplacement BTC déjà accompli** entre Cross3 et entrée. #5 perd finalement **−9,5155 $ nets**. Le modèle conserve l'épisode Cross3, mais ne limite pas correctement sa **maturité économique** après grand déplacement ; la persistance de campagne et le potentiel encore disponible de l'épisode tactique sont deux objets différents.
- Les règles de réentrée ne reposent plus sur les vieux minuteurs V55 (18min Cross3 / 25min E3), ce qui est cohérent avec l'intention utilisateur ; elles doivent cependant mieux qualifier l'épisode consommé / essoufflé sans ajouter un minuteur arbitraire.

## 6. Suites proposées : AUCUNE implémentation PAPER encore autorisée par cet audit

1. **Corriger la faute de type, puis séparer l'observation et l'autorité** : ajouter des diagnostics internes SANS nouveau moteur PM2, comparant sortie actuelle (Cross15 clôturé) à un candidat de protection tactique basé sur MF3/PM/prix et à la persistance du Cross15 Live. Mesurer les faux déclenchements (notamment le gagnant #2) et les pertes de gains (#4).
2. **Journaliser explicitement les trois temps du 15m** : `CROSS15_LIVE_OBSERVED`, `CROSS15_CLOSED_CONFIRMED`, `TRANSFER_CAMPAIGN_ACCEPTED`, avec `observedAt` et `barCloseKnownAt` séparés. La sortie de POSITION peut précéder la fin de CAMPAGNE, sans retour systématique au FLAT sur une seule contradiction 3m.
3. **Conserver la mémoire de qualité de campagne au-delà des tickets** : épisodes tactiques, récupération du territoire, MFE conservé, contre-attaques avec PM/MF et raison exacte de sortie, première reprise valide. Tester la réentrée même parent sur #3→#4.
4. **Contrôler la maturité économique d'un vieux Cross3** : prix gagné depuis l'événement, qualité de la conversion actuelle et trajet 15m encore disponible ; le cas #5 révèle un retard, pas un manque de minuteur.
5. Tests sur #2, #3→#4, #5, #6 et #8 (contre-exemples gagnants/perdants), comparaisons de campagnes entières après frais et sans anticiper l'avenir, avant toute activation PAPER.

**Statuts :** observation et bogue **VÉRIFIÉS**, impact du bogue sur sortie #4 **REPRODUIT**, alternative meilleure économiquement **NON PROUVÉE**, code V551 PAPER **INCHANGÉ**, V55 restant archivé. Sources réelles : `data/audit-history.json`, `../data/mcb-live/mcb_15m.csv`, `data/v551-paper-{state,decisions}.json/ndjson`, `modules/v551/{source,decision,paper}.js`.
