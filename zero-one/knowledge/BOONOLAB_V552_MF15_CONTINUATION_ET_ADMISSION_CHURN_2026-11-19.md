# BOONOLAB — V552 : fermer l'admission sans invalider la continuation, lecture MF15/MCB15 du 19 novembre

**19 novembre 2026 — orientation d'analyse et proposition de contrat.**  
**État : DOCUMENTÉ ; AUCUNE MODIFICATION PAPER V552.** L'utilisateur observe que deux périodes de volume élevé semblent correspondre à des offensives SHORT non consolidées, et propose de fermer certaines conditions d'ENTRÉE dans ces marchés tactiquement agités, tout en permettant le MAINTIEN d'une position de campagne confirmée par MF15.

## Données effectivement contrôlées

Sources : `data/audit-history.json` (Bâton, relevés ~30 s), `../data/mcb-live/mcb_15m.csv` (MCB15), volume **OKX BTC-USDT-SWAP 15m clôturé** (champ `volCcy` en BTC, distinct des contrats et du prix USD). Heures CET 19/11.

- **08h00–08h15** : volume **2 739 BTC**, soit **182,6 BTC/min** ; variation de la bougie **−121,2 $ BTC**. Sur Bâton : 08h00 prix ~63 745 $, MF15 ~−0,65 ; 08h13 ~63 605 $, MF15 ~−0,98 ; 08h30 ~63 548 $, MF15 +1,65 ; 09h00 ~63 683 $, MF15 +3,89. Une tentative vendeuse réussit localement, mais **n'établit pas durablement de continuation baissière**. Le creux de 08h30 (~63 548) est supérieur à celui de 07h30 (~63 493).
- **10h00–10h15** : volume **1 722 BTC**, soit **114,8 BTC/min**, variation NETTE de la bougie **+32,1 $ BTC**. Bâton : prix 10h00 ~63 676, jusqu'à 10h09 ~63 892 puis 10h14 ~63 731 ; 10h30 ~63 655, 11h00 ~63 835. MF15 Live ~+0,48 à 10h00, +2,28 vers 10h09, +1,17 à 10h30, +9,78 à 11h00. C'est un **combat violent, mais PAS une bougie baissière confirmée** ; il serait infondé de déclarer une agression vendeuse sur la seule base du volume total. Il faut distinguer hypothèse de rejet des tentatives SHORT et preuve des ordres agressifs vendeurs, laquelle n'est pas disponible ici.
- **04h15–11h00** : hausse nette BTC ~+1 386 $, MF15 Live ~−37,7 → +5,3 à 11h00 ; volume total OKX clôturé **26 227 BTC**, soit ~**64,8 BTC/min** (contre ~90,5 BTC/min sur la référence 24h de la capture à ~12h00). Le volume de lancement de 04h15–05h00 était ~93,9 BTC/min ; 05h00–05h15 **207,3 BTC/min**, mais cette bougie avait une variation **haussière** : ne pas la qualifier par défaut d'offensive SHORT.
- **07h30–11h00** : la trajectoire MCB15 est instable (environ **14 Cross15 Live, 5 Cross15 clôturés et 27 changements Cross3 Live**), pour ~+327 $ de progression nette BTC ; sur 08h–11h seulement ~+75 $ BTC malgré ~10 066 BTC négociés. Les swings tactiques sont fréquents et économiquement peu rémunérateurs après frais, malgré MF15 de fond globalement en hausse.
- Les versions PAPER V551/V552 précédemment analysées ont souffert du *churn* #7–#11 dans ce régime. **Les succès/pertes après entrées et sorties ne prouvent pas à eux seuls que les mêmes positions auraient mieux fait en restant ouvertes** : un contrefactuel intégral avec frais/exposition/risque reste à calculer.

## Nouvelle asymétrie de responsabilité proposée : ADMISSION ≠ MAINTIEN ≠ PROTECTION

**1. ADMISSION (FLAT) — marché contradictoire : vigilance et abstention possibles.**  
Si BW15 et LBW15 latéralisent / recroisent sans conserver de territoire, si MCB3 oscille fréquemment et si MF15 ne confirme pas la direction candidate, un nouveau Cross3/Cross15 ne suffit PAS pour autoriser une entrée. L'entrée contraire à la progression MF15/prix est particulièrement suspecte. Même un LONG aligné avec MF15 ne doit pas être acheté automatiquement en haut du range : juger la position structurelle du prix, PM Live et la conversion marginale, les retests et frais. Aucun plafond de nombre de croisements, de minutes, ni seuil volume chiffré additionnel n'est validé.

**2. MAINTIEN (POSITION DÉJÀ OUVERTE) — reconnaître une campagne encore productive.**  
Un LONG en cours peut rester valide même lorsque MCB3 et Cross15 Live sont provisoirement opposés si MF15 ralentit peu ou se redresse dans la direction LONG, si MF3 montre des contre-attaques vendeuses incapables de conserver leur progression, si PM Live retrouve le sens de la campagne après chaque respiration, et si les creux du prix restent défendus / plus hauts. Le signe absolu MF15 peut être négatif au début d'un retournement : sa **trajectoire** compte. Pour un SHORT, appliquer la lecture symétrique. Cette cohérence de MF15 **permet le HOLD**, elle n'est pas une garantie ni une interdiction de sortir.

**3. PROTECTION — risque toujours souverain et territoire effectivement cédé.**  
La présence d'un MF15 favorable n'interdit jamais une sortie de risque ou de perte économique majeure. Si la contre-offensive montre persistance MCB3, Cross15 Live durable, PM Live adverse et perte de prix conservée, V552 peut protéger sa position avant l'invalidation formelle de campagne. La position peut sortir sans qu'un trade inverse soit autorisé. Maintien du plafond PAPER adverse de 500 $ de prix BTC, sans changement ici.

## Vérification de l'implémentation actuelle

Les modules `modules/v552/vigilance.js` et `modules/v552/decision.js` mesurent déjà BW/LBW15, leurs pentes, MF15/MF3, PM et la polarité incertaine. L'admission différée dépend de `uncertainProof` (MF15/MF3 et PM favorables lorsque les DEUX pentes 15m sont relativement faibles), mais **ce n'est pas encore une politique complète de qualité de marché à deux autorités distinctes ADMISSION vs MAINTIEN**. Le maintien V552 reste piloté en grande partie par la sortie Cross15 clôturée et une protection Live sélective ; MF15 accompagne l'alerte, mais son autorité de maintien quand les croisements 15m clôturés se succèdent n'est pas encore explicitement établie.

## Prochain test sans prolifération de moteurs

Dans **la même instance V552**, journaliser de façon observationnelle :
- `REGIME_TACTIQUE_CONTRADICTOIRE` avec BW/LBW15, Cross3, MF15, PM Live, lieu et rendement prix/volume ;
- `NEW_ENTRY_STATUS` : admissible / à différer / candidat contre-trend contesté ;
- `HELD_POSITION_STATUS` : campagne encore soutenue par MF15, territoire conservé, risque à protéger ;
- `CONTRE_EFFORT_RESULT` : tentative SHORT productive ou échouée, prix effectivement conservé après retour MCB3/Cross15.
Évaluer les campagnes qui seraient conservées et les nouvelles admissions évitées après **frais**, en utilisant les bons trades comme contre-exemples. Ne pas réintroduire les SHADOWS V551 arrêtés. **Aucun changement du PAPER dans cette intervention documentaire.**

**Synthèse :** fermer la possibilité d'une nouvelle entrée dans une polarité tactique improductive n'implique pas de fermer une position déjà engagée dans une campagne soutenue par MF15 et par le prix. Le protocole doit distinguer les deux autorités au lieu de déclencher un retournement sur chaque cross.
