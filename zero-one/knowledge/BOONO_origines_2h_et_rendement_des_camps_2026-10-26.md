# BOONO Systems — Origine des campagnes, test du terrain et rendement des camps

**Audit en lecture seule, 26 octobre 2026 (Europe/Stockholm).** Aucun changement à V5.3.3, V4.9.3, à leurs ledgers ou à l'Execution Lab. Concept utilisateur : reconnaître une campagne par son histoire de 30 min / 1h / 2h, le précédent extrême MCB/prix, le combat pour le terrain, la dégradation du rendement d'un camp et sa réappropriation éventuelle par l'autre. Travail de diagnostic et de synthèse : assistant IA.

## 1. Périmètre et méthode as-of

Cohorte historique **figée des 43 premières clôtures V5** ; neuf gains significatifs (#2, #4, #10, #15, #18, #22, #25, #31, #38) et 25 pertes examinés en comparaison. Bougies prix 3m et MCB15 15m issues des CSV Amsterdam ; une bougie 3m est « connue » à timestampSource+3m et une 15m à timestampSource+15m. Les extrêmes H/L mesurés ne font **jamais** intervenir une bougie non clôturée à l'entrée. Heure d'observation des E3/E15 issue des journaux Elastic (observedAt ≠ timestampSource). Les plus hauts/bas sont ceux des bougies confirmées et leur exactitude peut différer des ticks intrabougie. Conserver ce critère lors d'un futur replay.

Pour chaque entrée et chaque horizon 30m/60m/120m : dernière clôture au début de la fenêtre, variation de prix depuis cette clôture dans le sens de l'entrée, extrême haut et bas confirmé, heure du plus récent extrême pertinent (creux pour LONG, sommet pour SHORT), déplacement déjà parcouru depuis cet extrême, rang de l'entrée dans la fourchette de prix, LBW/BW/MF15 disponibles et leur changement. C'est une **carte de provenance du prix**, non une prédiction de sa prochaine amplitude.

## 2. Les neuf fortes réussites et leur provenance avant l'entrée

| Trade | MCB15 à l'entrée (LBW/BW) | Extrême observé sur 2h, et heure (CET) | Mouvement déjà parcouru depuis cet extrême | Variation des 2h dans le sens de la future entrée |
|---|---|---|---:|---:|
| #2 LONG | −84 / −79 | Bas 79 168, 24/10 17h27 | +300 USD en 6 min | −1 188 USD |
| #4 LONG | +12 / +4 | Bas 79 527, 24/10 18h24 | +779 USD en 106 min | +580 USD |
| #10 LONG | −42 / −47 | Bas 80 050, 25/10 10h21 | +284 USD en 111 min | −34 USD |
| #15 LONG | +42 / +42 | Bas 80 476, 25/10 16h24 | +145 USD en 88 min | +134 USD |
| #18 SHORT | +61 / +64 | Haut 80 919, 25/10 18h24 | −179 USD en 37 min | −140 USD |
| #22 LONG | −74 / −67 | Bas 80 157, 25/10 22h57 | +150 USD en 4 min | −234 USD |
| #25 SHORT | −28 / −26 | Haut 80 714, 25/10 23h06 | −307 USD en 57 min | +31 USD |
| #31 SHORT | −71 / −63 | Haut 80 350, 26/10 01h36 | −710 USD en 67 min | +549 USD |
| #38 LONG | −50 / −56 | Bas 79 323, 26/10 04h57 | +393 USD en 7 min | −18 USD |

Les neuf gagnants importants présentent une variation médiane sur les **2h précédentes de −18,5 USD dans le sens de leur entrée**, contre **+44,7 USD sur les 25 perdants**, mais groupes petits et distributions largement chevauchantes. Sur 30m, la variation médiane est +61,3 USD pour les neuf forts gagnants et +65 USD pour les 25 perdants. **Aucun seuil unique d'extension ni une valeur LBW seule ne sépare les groupes**.

**Interprétation :** #2 et #22 sont des respirations/récupérations depuis un prix d'abord très défavorable ; #18 retourne la poussée acheteuse au sommet MCB15 haut ; #25 reprend la campagne vendeuse après une respiration ; #38 récupère un creux très récent. #4 et #31 sont de réelles continuations **après une grande amplitude déjà parcourue** : elles contredisent toute interdiction sur « 250/325 USD déjà consommés ».

### Détails complémentaires sur les cas retenus

- #2 LONG : prix sous forte pression pendant 2h (~−1 188 USD), creux 79 168 puis +300 avant admission ; E3 UP vers −88 ; MF15 encore structurellement faible. La conversion et le prix révèlent la respiration inverse possible sans exiger l'E15 UP confirmé.
- #18 SHORT : région haute LBW15 +61/BW15 +64, 179 USD sous un sommet observé 37 min auparavant ; « EXCEPTIONAL LONG → INEFFICIENT LONG », puis E15 DN et E3 DN, MF3/MF15 vendeurs. Reconnaît l'épuisement d'une tentative adverse **dans un lieu pertinent**.
- #22 LONG : creux 80 157 seulement 4 minutes avant, LONG à 80 306,7 contre MCB15 SHORT avec E3 UP près de −83 ; durée **40 secondes**, MFE +224,2 USD BTC, MAE 0. C'est une opération tactique remarquable, mais **un seul événement ultra-rapide ne démontre pas la robustesse du signal ; une composante de chance reste possible**.
- #25 SHORT : après l'échec des LONG #23/#24 près des MA3 non acceptées ; prix 307 USD sous sommet 2h 80 714 ; nouvelle chaîne vendeuse E15/MF/PM.
- #31 SHORT : même avec déjà 549 USD dans le sens vendeur sur 2h, la continuation produit encore un MFE de +284 ; distingue dynamique de campagne et simple seuil de déplacement prix.
- #38 LONG : bas 79 323 vers 04h57, prix déjà +393 USD à 05h03 ; la continuation reste productive. Cette entrée réussie n'est PAS l'entrée au point bas ; la question future est de préparer la candidature durant l'inefficacité vendeuse, puis d'utiliser le regain structurel et la défense du terrain pour entrer plus tôt.

## 3. Changements de polarité, échec des #35–37 et distinction avec #38

- #35 LONG 04h22 : changement de MF15 des 2h précédentes **−15,2**, #36 LONG 04h39 **−11,2**, malgré des pentes MF courtes temporairement favorables. Le contexte 2h reste une offensive vendeuse non résolue ; BOONO est trop prompt à transformer l'amélioration MF de 10min en changement de campagne.
- #37 SHORT 04h50 : entrée 79 439,6 presque au **bas de la fourchette des 2h (rang prix 3%)**, après une forte descente, juste avant que le creux soit repris. C'est la dernière attaque potentiellement épuisée, plutôt qu'un bon endroit pour ouvrir une campagne SHORT neuve.
- #38 LONG 05h03 : creux récent 79 323, franchissements E3/cross15 et MF qui reprennent avec une réaction prix démontrée, MFE +324,8 et MAE 30,6. Même si MF15 avait chuté sur 2h, sa trajectoire instantanée se transforme **en présence d'un reclaim du prix**. La pente négative macro seule ne doit donc pas interdire le retournement.
- #39–41 LONG ensuite : tendance correctement suivie mais fragmentée en micro-trades à frais, malgré une campagne MCB15 qui continue.
- #42 LONG 06h59 : prix déjà monté **+747 USD sur 2h**, à **96% de sa plage de prix 2h**, E3 UP ~+55 et MF15 court presque neutre, sortie −3,39 USD net. La position dans la campagne, le terrain déjà conquis et la maturation comptent davantage que la seule direction LONG.
- Comparateur V4.9.3 pendant cette séquence : #14 LONG 04h01–05h01 −3,6172 USD, #15 LONG 05h12–07h30 +0,8589 USD ; total **−2,7583 USD** contre environ **−13,61 USD pour les V5 #34–42**. V4 a été nettement moins déficitaire, pas réellement rentable. Durées et périmètres d'entrée différents : ne pas qualifier cela d'expérience contrôlée.
- #20/#21 SHORT auraient pu rester une seule campagne vendeuse. #22 est un scalp tactique opposé 40s, assez cohérent mais exceptionnel ; #23/#24 deux LONGs suivants devant MA3 sans défense démontrée, #25 restaure la lecture SHORT ; #26 LONG trop vite admis et #29 SHORT sorti sur opposition 15m Live trop fragile. Rejouer la **chronologie du combat** plutôt qu'interdire tous les changements de sens par timer.

## 4. Interprétation du croquis de l'utilisateur

Le schéma manuscrit indique : provenance depuis un sommet → mini-range à deux frontières réellement touchées et éprouvées → attaque productive dont les gains sont ensuite repris → plongée/attaque contestée au-delà de la frontière basse puis récupération → nouvelle offensive vers le haut → respiration/retest plus haut → seconde possibilité d'entrée.

**Deux opportunités distinctes, qui ne doivent pas être fusionnées :**
1. **Entrée précoce** sur un échec causal de la tentative adverse à conserver le territoire, avec MF/MCB3/PM qui se redressent et un niveau d'invalidation réellement défendable ; la seule mèche de sortie du range est insuffisante.
2. **Entrée sur requalification** après reconquête et retest réellement tenu. L'entrée est souvent plus tardive, mais peut être plus démontrée et offrir une cotation passive maker.

La machine n'invente pas N niveaux LGI : une seule **zone active** issue des extrema réellement testés et des MA3/MA15 impliquées. Elle garde son haut, son bas, les tentatives successives et les extrêmes de lobe E3/E15 ainsi que le territoire conservé.

## 5. Mesurer le rendement par camp, avec les données réellement disponibles

Un achat agressif `side=buy` correspond à un trade déclenché par un acheteur (contre un vendeur passif) ; un `side=sell` à une vente agressive (contre un acheteur passif). Ces séries ne mesurent **ni tous les acteurs**, ni leur confiance intrinsèque ; elles mesurent le comportement de ceux qui retirent de la liquidité.

La chaîne OKX/BOONO **dispose déjà de ces ticks avec side, BTC volume et prix**, via `price-stream.js` et `buySellEffort()` dans `elastic-observer-shadow.js` : buyBtc, sellBtc, netAggressiveBtc et tracé prix sur 3m.

Cependant le journal Elastic historique **n'archive pas les volumes agressifs par tranche fixe de temps** ; il retient surtout les TRANSITION de qualité de conversion et les efforts/rendements relatifs P75. On ne peut donc pas reconstruire exactement les ratios de rendement acheteurs/vendeurs pour les 43 trades passés avec ces seules lignes d'événements. Ne pas inventer un indicateur historique.

### Observation prospective compacte proposée (SHADOW, non implémentée)

Réutiliser le flux de ticks existant et former des **buckets non chevauchants de 30 secondes** à partir de `tradeId,ts,side,price,volumeBtc`, avec dédoublonnage. Archiver seulement un résumé par bucket (quelques champs), pas tous les ticks.

- `E_buy(t)=Σ BTC agressifs BUY` ; `E_sell(t)=Σ BTC agressifs SELL` ; déséquilibre normalisé `I=(E_buy−E_sell)/(E_buy+E_sell)`.
- `D_up(t)=max(0, nouvel extrême haut − ancienne limite haute)` et `D_down(t)=max(0, ancienne limite basse − nouvel extrême bas)` ; les frontières sont celles de l'**épisode actif**, pas un plus-haut arbitraire.
- Pendant les périodes où **la pression acheteuse est dominante**, rendement acheteur exploratoire `R_buy=D_up/E_buy` ; analogue `R_sell=D_down/E_sell` lors des attaques vendeuses. Ne pas calculer ou surinterpréter lorsque volume nul/faible, régime indéterminé, marchés croisés ou sans nouveau test du territoire. Les autres agressions simultanées et les offres passives empêchent une attribution causale univoque : ce sont des **mesures comportementales conditionnelles**, pas des rendements des personnes acheteuses/vendeuses.
- Normaliser effort et rendement aux quantiles P75/P95 **de la même phase et TF**, comparer la trajectoire de R à des attaques successives et au volume réellement déployé, plutôt que qualifier un seul segment INEFFICIENT et rentrer aussitôt.
- Mémoriser `terrainAcquis` (déplacement au-delà de la frontière du mini-range), `terrainConservé` après 30–90s ou la prochaine respiration, temps entre attaques, nombre de reclaims/faux franchissements, vitesse de récupération opposée et sourceTs vs observedAt.
- Cas LONG : vendeurs déploient effort croissant, n'obtiennent plus de nouveau bas ou le perdent immédiatement ; le prix reconquiert le mini-range ; les acheteurs commencent à gagner du terrain pour un effort relativement moindre ; E3 UP/MF3 appuient et MF15 cesse de contredire ou amorce son changement de pente → fenêtre candidature et test d'un prix maker défendable.
- Cas position SHORT déjà ouverte : la respiration acheteuse INEFFICIENT ne supprime pas l'ancienne campagne SHORT si le prix ne conserve aucune frontière gagnée ; préserver le droit HOLD/PROTECT et éviter EXIT/ENTER churn.

**Effet attendu à tester :** prendre position plus tôt dans la première reprise asymétrique, refuser la dernière poussée déjà inefficiente du même camp, décrire la qualité réelle des respirations, distinguer une perte tactique d'une campagne invalidée, réduire le nombre de trades/frais sans multiplier les verrous arbitraires.

## 6. Maker/maker : exigence distincte du laboratoire IOC taker B

OKX Europe indique les tarifs de base X-Perps **maker 0,02% / taker 0,05% par jambe**, à vérifier selon compte et produit. Sur 1 500 USD de notionnel, coût théorique : **maker/maker 0,60 USD AR**, taker/taker 1,50 USD, soit économie **0,90 USD par trade** si les deux ordres se remplissent vraiment passivement. Cela correspond à environ **48 USD de déplacement BTC au notionnel 1 500 USD lorsque BTC≈80 000 USD**. L'économie peut donc être absorbée par une entrée passive manquée ou une sortie tardive.

Un achat `post-only` au bid et une vente `post-only` à l'ask **ne deviennent maker que si l'ordre RESTE passif et est ensuite rempli**. S'il croise le carnet, OKX annule le post-only au lieu de l'exécuter taker ; un simple contact prix/bid/ask dans un snapshot ne prouve pas la position en file ni le fill. Le laboratoire B actuel `books5` ne peut pas prouver des fills maker sans suivre les échanges `trades` X-Perp et approximer la quantité réellement consommée devant l'ordre.

Proposer un **mode D maker/maker en shadow** sans ordonnance réelle : ordre post-only hypothétique au meilleur bid/ask ou frontière défendue, simuler refus si croise, durée de vie liée à la validité causale, fills inconnus/possibles/conservateurs selon trades à niveau, annulation ou requalification quand les preuves changent ; sorties maker seulement quand le terrain permet d'attendre. **Si risque dur ou perte prouvée : taker de protection**, avec frais de l'exécution réelle simulée ; ne pas sacrifier le risque à la recherche du tarif maker.

Comparer B et D **sur le même X-Perp**, même horizon et notionnel, PNL net de TOUS les signaux y compris manqués, fills partiels, retards et sélection adverse. Ne pas utiliser A au dernier prix BTC-USDT-SWAP comme comparateur direct d'économies de frais X-Perp.

## 7. Plan de test recommandé, sans modification des moteurs pour l'instant

1. Mettre en évidence la **carte as-of 2h→1h→30min** dans le dossier d'une campagne : dernier extrême prix et son horodatage, LBW/BW/MF15, distance à l'extrême, place dans le range, origine de la dernière respiration.
2. Calculer effort acheteur/vendeur en **30s non chevauchants** et archiver de petits résumés ; mesurer attaques, rendement, absence de prolongation, conservation du terrain, résolution adverse, plus E3/E15 et MA au moment observé.
3. Rejouer spécifiquement #20–#29, #35–#42 et comparer positif #2/#18/#22/#25/#38 pour contrôler faux reclaim, contre-polarité, sortie prématurée et timing de préparation maker.
4. Faire tourner D maker/maker shadow à côté de B, sans modifier admissions V5.3.3 ni stops ; distinguer coût brut théorique des frais maker vs effet des ordres non remplis sur le PNL net.
5. Approuver une évolution active seulement après comparaison prospective sur des campagnes **indépendantes** des cas qui ont inspiré ces règles.

**État : lecture et audit uniquement ; aucun nouveau moteur, collecte, ordre ou shadow n'a été activé dans cette intervention.**
