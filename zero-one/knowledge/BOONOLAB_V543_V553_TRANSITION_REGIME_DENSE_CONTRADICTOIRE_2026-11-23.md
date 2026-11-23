# BOONOLAB — Changement de régime et divergence V543/V553, 21–23 novembre 2026

**23 novembre 2026, vers 18h CET — AUDIT en lecture seule, pas une revue systématique des trades.**

## Mandat

L'utilisateur constate une dégradation soudaine des mouvements de BOONO, trop de changements de direction, des inflexions LBW15/Cross15 mal récompensées, des confirmations qui semblent de plus en plus nombreuses, et une résistance relativement meilleure de V543. Question de recherche : qu'est-ce qui a changé — le moteur ou la praticabilité du marché ? Quelle leçon conserver des différences entre les deux moteurs ?

**Précision de version constatée au serveur :** boono-v552-paper est arrêté depuis le 20 novembre, alors que boono-v553-paper et boono-v543-paper sont en ligne. Les observations récentes portent donc sur V553 (non V552). V552 ne peut pas produire de trades 21–23 novembre.

Sources rouvertes sur Amsterdam : data/v553-paper-state.json, data/v52-paper-state.json, data/v552-paper-state.json, data/audit-history.json, archives horaires Bâton data/audit-14d/audit-2026112{0,1,2,3}T*.ndjson.gz/ndjson, data/boonolab-market-snapshots*.ndjson, data/boonolab-practicability-shadow-samples*.ndjson, data/boonolab-ticker4x15-samples*.ndjson, code décision modules/v553/{decision,market}.js et modules/v5/{decision-v541,ma-contract-v531}.js, santé PM2 et empreintes du code. Les chiffres sont PAPER **clôturés**, frais inclus ; les positions ouvertes sont exclues du P&L net réalisé.

## 1. Mesure financière, trades clôturés PAR JOUR DE CLÔTURE, Europe/Stockholm

| Journée | V543 : clôtures / gagnants / net USD | V553 : clôtures / gagnants / net USD |
|---|---|---|
| 21/11 | 6 / 2 / **+88,38** | 18 / 6 / **+108,84** |
| 22/11 (journée complète) | 5 / 1 / **+10,98** | 17 / 3 / **−3,56** |
| 23/11 (jusque ~18h) | 6 / 1 / **−25,53** | 17 / 1 / **−79,68** |

**Correction d'interprétation : V543 perd aussi le 23 novembre. Il résiste beaucoup mieux que V553 mais ne présente pas de performance positive aujourd'hui.** Les comptes, tailles et horaires diffèrent ; ceci n'est pas une expérience randomisée d'exposition égale.

Sur le 23 novembre, **V553 réalise -54,17 USD brut, paie 25,51 USD de frais, net -79,68 USD**. V543 réalise -16,53 USD brut, paie 9,00 USD de frais, net -25,53 USD. Sur l'écart de P&L net de 54,15 USD, ~16,51 USD sont la différence arithmétique de frais, ~37,64 USD la différence de résultat brut (non attribution causale de stratégies contre-factuelles).

## 2. Est-ce BOONO qui a soudainement changé sa politique ?

**Non, l'évidence disponible soutient davantage un problème d'adéquation au régime qu'un changement de logique :** les fichiers et règles de modules/v553/decision.js/market.js restent les mêmes ; aucun changement de policy actif entre le 21 et le 23 novembre a été identifié. Les deux succès/échecs apparaissent à rythme similaire :

| Mesure V553 | 21/11 | 23/11 avant 18h |
|---|---:|---:|
| Entrées dans la journée | 18 | 18 (dont une encore ouverte au relevé) |
| Temps engagé du moteur | 81,7 % | 85,8 % |
| Âge médian chaîne causale→entrée | 63,0 secondes | 63,5 secondes |
| Nouvelles entrées clôturées analysées | 18 | 17 |
| Trades atteignant un MFE BTC ≥500 USD prix | 5 | 3 |
| Ces trades effectivement bénéficiaires à leur sortie | **5/5** | **0/3** |

Le nombre d'entrées et le temps engagé étaient déjà importants lors de la bonne journée. Le problème actuel n'est pas simplement « soudain plus de trades » : **les mêmes mécanismes ne produisent plus des campagnes qui retiennent leurs gains**.

Sur les 17 entrées V553 clôturées le 23 : **17/17** avec pente LBW15 3m, variation gap15, MCB3 Live, PM3 et PM Live favorable au sens choisi ; **16/17** avec market=EMERGING_DIRECTION ; **9/17** anticipant une direction différente de la dernière bougie MCB15 confirmée. La mémoire de chaîne réclame encore **2 observations positives** ; elle n'a pas automatiquement augmenté ce quorum selon le marché. La sensation d'« hésitation » peut venir du retour rapide des signes, de leurs rejets et de la baisse de valeur économique de la confluence — non d'une multiplication logicielle des vérifications. La présence formelle de LBW15 **ne garantit pas** la maturité de la figure complète.

L'exception EMERGING_DIRECTION peut encore relâcher SUSPEND_NEW alors que l'historique de marché n'a pas accumulé de persistance exploitable ; le bug connu du champ chain.live15At/firstLiveAt subsiste. L'utilisateur demande explicitement de **laisser le moteur tel quel** pour l'observer dans des régimes différents. Ne pas patcher.

## 3. Changement réel de structure de marché

SHADOW autonome de régimes **observational, non validé en tant que veto**, sur plages comparables 00h–18h CET :

| Classification | 21/11 | 22/11 | 23/11 |
|---|---:|---:|---:|
| DENSE_CONTRADICTOIRE | 12,7 % | 26,5 % | **44,2 %** |
| STERILE_HESITANT | 52,1 % | 42,7 % | 27,0 % |
| DIRECTIONNEL_PRODUCTIF | 27,3 % | 22,3 % | 19,0 % |
| SILENCIEUX_PRODUCTIF | 7,9 % | 8,5 % | 9,7 % |

**Observation déterminante :** ce n'est PAS seulement le volume faible ou le marché stérile. Le SHADOW voit une transition de moments stériles vers des phases **denses ET contradictoires** où du mouvement et de l'effort existent mais se combattent. Entre 14h et 15h le 23/11, prix BTC +~2442 USD net, alors que le signe du gap LBW15−BW15 Live a basculé **18 fois dans les relevés Bâton 30s** ; ce ne sont PAS 18 E15 confirmés ! La brusque croissance du prix n'est donc pas nécessairement accompagnée d'une direction MCB15 Live stable.

Données Bâton échantillonnées 30s sur la journée 23/11 jusqu'à 18h : BTC net +~906 USD sur chemin absolu échantillonné de ~65 837 USD, efficacité net/chemin ~1,38 % ; cependant le 21/11 complet avait déjà efficacité journalière ~1,40 % et de grandes campagnes profitables. **La faible efficacité jour entière n'est donc pas un classifieur fiable en soi.** Ce sont les ÉPISODES et leur traduction du mouvement dans les minutes qui suivent l'inflexion qui changent l'opportunité.

## 4. Pourquoi V543 perd moins

V543 applique aujourd'hui des critères plus structurels et coûteux en preuve : E3 aligné à son parent ou contexte de retournement qualifié, mémoire de campagne, MF3/MF15, PM non adverse, espace encore disponible, tests et acceptations de MA3/MA15, lieu et risques. Le code modules/v5/decision-v541.js demande une opportunité tactique et structurelle qualifiée et la résolution des tests MA en conflit. V553 exploite davantage la chronologie rapide de l'inflexion LBW15 et la confluence PM3/MCB3 qui peut durer seulement deux relevés.

Le 23/11 entre minuit et 18h :
- V543 environ **54 % du temps en position**, 6 clôtures, -25,53 USD.
- V553 environ **86 % du temps en position**, 17 clôtures, -79,68 USD.
Les protections de V543 ne lui garantissent pas des gains : seul un trade clôturé gagnant sur six, certains maintiens peuvent encore être trop longs. Il sélectionne surtout moins d'expositions, de façon plus structurée.

Il serait dommage de fusionner aveuglément V543 dans V553 : sur le 21 novembre, V553 reconnaissait des campagnes que le filtrage structurel tardif aurait pu manquer. **Le bon objet à apprendre n'est pas plus de confirmations répétées d'un même signal : c'est la preuve d'une TRADUCTION ÉCONOMIQUE durable et de la maturité de la figure**.

## 5. La même courbe peut être bien lue mais produire zéro P&L : exemples ciblés

- #74 et #75 LONG vers 01h22–01h38 : 2 confirmations et Cross15 Live dans le sens du trade ; prix déjà vers la borne supérieure 4h (position fraction ~0,90 et 0,97), MFE seulement **14,5 / 26,8 USD BTC**, pertes respectives **-6,13 / -9,31 USD net**. Signal local reconnu, lieu et rendement marginal non résolus.
- #87 SHORT vers **14h52**, hard risk ~-500 BTC USD, net **-14,69 USD** après moins de 4min ; suivi d'un #88 LONG dès **14h57**, qui détient une très grande excursion favorable BTC **+1712,1 USD**, mais la laisse totalement revenir, net **-2,56 USD** à 15h51. **Le problème n'est pas seulement manquer les inflexions : une bonne direction peut être captée puis totalement restituée**. #88 avait déjà PM3 >+1700 USD à l'admission, donc maturité du mouvement / entrée tardive également à qualifier.
- Entre ces deux extrêmes, #76 et #77 avaient des MFE BTC **+676,5 / +684,2** mais finissent négatifs. Le 21/11, les **5** trades V553 avec MFE ≥500 BTC USD étaient TOUS sortis bénéficiaires ; le 23/11, les **3** ayant ce MFE sont TOUS sortis perdants. Petit échantillon, observation descriptive non preuve statistique.

## 6. Ce que les SHADOWS identifient et manquent encore

L'interpréteur géométrique v0.1 produit une description de la forme, mais **ne prédit pas à lui seul la praticabilité économique**. À l'entrée 23/11, 7 lectures CROSS_LIVE_NAISSANT_EN_OUVERTURE, 5 lectures SEPARATION_ACCELERANTE, 4 ralentissements, 1 refermeture ; les deux classes « prometteuses » accueillent de nombreuses pertes ! Les trois profils expérimentaux du SHADOW praticabilité ne signalent comme bloqué qu'**un seul** des 17 trades perdants ou gagnants clôturés de ce jour (#84 via les deux profils plus larges), et ne capturent pas la série entière. Cela interdit toute promotion de ce SHADOW en garde PAPER.

La suite doit être la **mémoire d'exploitabilité par épisode** : compter faux départs, réplications de Cross15 sans prix conservé, maturation/épuisement LBW15, défense/reprise MA3, contre-attaques, interactions E1/E4. Réouverture sur preuve d'offensive **et de marché**, sans veto systématique sur STERILE, DENSE ni sur les anticipations pré-Cross15 bonnes. Comparer comme falsification les campagnes #43/#58/#61 et les échecs #62–#89, avec données as-of. Et évaluer séparément la **sortie** (restitution MFE) sans rendre le moteur hypersensible aux premières respirations.

## Conclusions et statut

**Ce que l'on SAIT :** comportement actif et politique V553 inchangés, forte différence de gains retenus, marché 23/11 plus souvent DENSE_CONTRADICTOIRE que le 21, V543 moins exposé, V543 lui-même perdant 23/11. Les signaux LBW15/MCB3/PM restent directionnellement alignés dans toutes les entrées 23, donc le moteur n'a pas abandonné son déclencheur.
**Ce que l'on SUPPOSE :** l'interaction entre régime dense contradictoire, réouverture prématurée de marchés non validés, manque de mémoire maturité/lieu et sortie tardive explique l'effondrement. Une attribution causale exige un replay complet et des observations prospectives sur d'autres épisodes.
**Décision :** NE PAS MODIFIER V553, NE PAS réactiver V552, NE PAS fusionner V543, NE PAS activer de filtre SHADOW en PAPER. Étude, comparaison et traçabilité seulement.
