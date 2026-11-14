# BOONOLAB — PASSATION FINALE 494 / 543 / SHADOWS

**Date et fenêtre de référence : 14 novembre 2026, état des PAPER et shadows figé vers 08h18 Europe/Stockholm.**
**Nature : diagnostic, capitalisation, orientation de recherche. Aucun moteur PAPER, processus PM2, shadow, risque, seuil ou position n'a été modifié pour cette passation.**

## 0. Mission et verdict

Cette passation clôt la discussion BOONOLAB consacrée à l'émergence et à l'évaluation des deux moteurs autonomes **V4.9.4 (494)** et **V5.4.3 (543)**, de leurs shadows, de la chronologie causale et des régimes de marché. Il faut poursuivre la recherche de performance dans une nouvelle discussion sans perdre les découvertes ni inventer de nouvelles règles en réaction aux dernières pertes.

**Verdict établi :** les deux moteurs possèdent des comportements opérationnels interprétables, parfois très performants à l'échelle d'un trade ou d'une campagne, mais **aucun avantage net robuste n'a été démontré**. Les frais et faux départs absorbent la plupart des gains, et les qualités des sorties changent radicalement selon le régime. Un nombre de bonnes campagnes ne suffit pas à démontrer la rentabilité d'une politique.

**Différence la plus instructive :** 494 est souvent meilleur aux **points d'inflexion**, avec une grande réactivité tactique ; 543 est souvent meilleur pour **accompagner une offensive structurelle déjà traduite**, parfois avant qu'un E15 opposé soit confirmé. Leur principal danger n'est donc pas le même.

## 1. Référence financière et dernière période, source réelle

Toutes les sommes sont des USD de P&L simulés **nets après commissions**, sans funding ni slippage. Les MFE/MAE exprimés en BTC$ sont des variations du cours, pas un profit sur un notionnel de 1 500 USD.

| À ~08h18 CET le 14/11 | V494 PAPER | V543 PAPER |
|---|---:|---:|
| Trades cumulés de leurs ledgers complets | 187 | 240, **plusieurs versions V5** |
| Gagnants cumulés | 50 / 187 (26,7 %) | 99 / 240 (41,3 %) |
| P&L net cumulé des ledgers | **−296,0207 USD** | **−205,9698 USD** |
| Frais enregistrés dans les états, **incluant l'entrée des positions ouvertes** | 281,2077 USD | 360,6845 USD |
| Equity simulée | 703,9793 USD | 794,0302 USD |
| Position non clôturée au contrôle | LONG ouvert ~66 984,8 BTC | LONG ouvert ~67 244 BTC |

**Version V5.4.3 isolée :** #80–240, **161 clôtures, 66 gagnantes**, P&L brut avant frais **+158,3861 USD**, frais **241,4319 USD**, **net −83,0450 USD**. Les **187 trades V494 clôturés** totalisent un brut de **−15,5644 USD**, frais de clôtures cumulés **280,4575 USD** et net −296,0207 USD. L'état vivant enregistre **281,2077 USD de frais**, soit **0,7502 USD** supplémentaires associés à la position encore ouverte. Les totaux de l'état PAPER (frais incluant l'entrée en cours) ne sont donc pas exactement le total des frais des clôtures. Ces historiques ne sont **pas des essais A/B appariés** : démarrages et adaptations des versions différents.

**Depuis notre bilan du 12/11 à 17h, par heure de clôture, figé à 08h18 :**

| Mesure | 494 | 543 |
|---|---:|---:|
| Nouvelles clôtures | 17 | 10 |
| Gagnantes | 4 | 4 |
| Brut avant frais | −60,6407 $ | +48,2210 $ |
| Frais | 25,4697 $ | 14,9600 $ |
| **Net** | **−86,1105 $** | **+33,2613 $** |

**Attention aux deux bornes :** pour les seules entrées depuis le 12/11 17h, V494 a **16 clôtures, −89,4808 USD**, toutes LONG ; la différence vient du LONG #171 entré avant la borne mais clôturé après. V543 a **10 entrées clôturées, +33,2613 USD** (6 LONG à **−25,02 USD**, 4 SHORT à **+58,28 USD**). Les positions ouvertes sont exclues de tous ces résultats réalisés. **Les ledgers continuent de vivre après 08h18 : ne pas remplacer ce snapshot figé par les nouveaux cumuls sans dater la mise à jour.**

**Changement de contexte le 13/11 :** de 00h à 07h CET, le Bâton enregistre une chute du prix d'environ **−3 323 BTC$**, débit agressif médian **0,987 BTC/s**. De 07h à midi, rebond d'environ **+1 325 BTC$**. Le 14/11 de 00h à 08h, encore **−869 BTC$**, débit médian ~0,547 BTC/s. Ce n'est pas un seul marché stable ; l'intensité, les reprises et les retours changent rapidement.

### Derniers épisodes discriminants

- **543 #233 SHORT**, 13 nov. 01h27–05h18, 71 149 → 68 974 BTC : **+44,375 USD**, 231 min, ~84 % du meilleur déplacement BTC conservé ; le parent E15 antérieur était encore LONG, mais MF/PM et défense prix soutenaient la formation d'une offensive vendeuse. **494 ouvrait alors plusieurs LONGs contre cette baisse** et accumulait sorties de risque.
- **494 #180 et #181 LONG**, 13 nov. 07h02 puis 09h04, **+7,323 et +11,268 USD** : capacité d'inflexion/rebond toujours présente. Ensuite, 494 est resté fortement orienté LONG à travers d'autres baisses.
- **543 #239 SHORT**, 13 nov. 21h27–14 nov. 00h34, **+15,566 USD**, 186 min, encore en formation de retournement sous ancien parent LONG. **543 #236 SHORT**, au contraire, −12,830 USD sur hard-risk ; ses bonnes directions n'excluent pas de lourds faux départs.
- **494 #179 LONG**, entré 13 nov. 06h10, **−19,796 USD**, MAE 837 BTC$ ; **#187 LONG**, 14 nov. 04h27, **−16,090 USD** après seulement 5 min. Ils montrent le risque d'ouverture contre un marché violemment baissier et le fait que le stop PAPER −500 BTC$ n'est pas un prix garanti lors d'un mouvement accéléré.

## 2. Découvertes communes — les notions qu'il faut préserver

1. **Chaîne d'autorité causale :** thèse **MCB15 / E15** → dynamique tactique **MCB3 / E3** → prix, frontière, MA et mémoire de retest → qualification MF et traduction PM Live/PM3/PM5 → rendement/effort et persistance → risque et exécution. Les familles corrélées ne sont pas des votes indépendants. MCB1h/4h servent de contexte et ne doivent pas réintroduire un veto universel.
2. **Live ≠ confirmé ≠ territoire acquis.** Un E3 opposé ou un croisement BW/LBW peut être une respiration, une contre-attaque ou le début d'un changement de campagne. Des chaînes opposées se développent souvent simultanément, surtout quand le prix ne conserve pas son déplacement.
3. **Une campagne possède une histoire, pas seulement un signal actuel :** origine des pivots E15, maturité, extrêmes LBW signés, MA acceptée/rejetée/retestée, tentative adverse et terrain défendu. Une inflexion E3 récente peut appartenir à une offensive déjà mûre. Le maximum absolu de LBW15 sur **45 minutes glissantes** n'est ni l'origine ni l'extrême historique d'une vague ; son signe et son heure doivent être conservés.
4. **Économie de conversion :** il faut distinguer **effort engagé**, **rendement immédiat** et **territoire finalement conservé**. La force, la volatilité ou une belle oscillation MCB ne garantissent pas un mouvement exploitable. **PM Live**, PM3 et PM5 sont des fenêtres liées mais non identiques : forte dissonance parfois alerte majeure, parfois respiration négligeable.
5. **Position ≠ campagne ≠ droit de réadmission.** La dégradation économique d'une position peut justifier son examen avant l'invalidation de toute la campagne. Fermer un LONG ne rend pas nécessairement un SHORT admissible **5 secondes plus tard** sous le même parent E15 ; il faut une nouvelle preuve causale.
6. **Frais et fragmentation sont centraux.** Les deux moteurs peuvent être positifs avant commissions et perdants après. L'analyse doit se faire **au niveau du parent de campagne**, frais et essais ratés compris, avec comparaison des opportunités empêchées.
7. **Ne pas surajuster les pertes connues.** Les mêmes labels « MF REINFORCING », « MA3 ACCEPTED », « prix défendu » ou faible débit se retrouvent parmi gagnants et perdants. Un filtre « CHOP », « week-end », « PMLive >40 BTC$ », « economics.viable » ou « attendre confirmation E15 » sans contre-épreuve couperait également de bonnes campagnes.

## 3. V494 : compétences, limites et environnement favorable

**Forces réellement observées**
- Entrées parfois **très proches des inflexions** et plus précoces que 543. Exemples : LONG **#96 +29,792 USD** le 4 nov., puis **#49 +22,295**, SHORT **#162 +16,087** le 11 nov., LONGs **#180/#181 +18,591 USD** le 13 nov.
- Capable de continuer un mouvement même avec un parent 15m encore contradictoire, en utilisant la transition MCB3, PM et l'acceptation progressive. Les campagnes **#95–96** donnent +21,446 USD net après un premier essai perdant ; **#161–162** donnent +11,70 USD.
- Capable parfois de grandes campagnes (120–180 minutes) : son problème n'est pas une impossibilité absolue de tenir.
- Plusieurs réussites **silencieuses et peu volumineuses** : #58 débit préalable ~0,208 BTC/s, #76 ~0,100 BTC/s, sans le droit d'en faire une politique d'entrée systématique.

**Faiblesses observées**
- Trop d'entrées contre une tendance encore productive, particulièrement des **LONGs sous grande pression vendeuse**. Après le 12/11 17h, ses **16 trades entrés et clôturés sont tous LONG**, net −89,481 USD ; cinq EXIT_EXECUTION_FAILURE, quatre EXIT_RISK, cinq EXIT_NATIVE_SIGNAL_PROTECTION, un EXIT_MFE_PROTECTION, un EXIT_PROFIT_PROTECTION.
- L'exception **UP_REINFORCED** et la réactivité au 3m peuvent accorder trop vite une autorité à une contre-attaque, même si elle devient parfois une excellente inflexion (#96). **Toutes les mauvaises entrées ne viennent pas de cette exception**.
- Sorties natives et rapides suivant E3/PM opposés : protection utile pour certaines entrées ratées, mais **fragmentation, réentrées et frais** dans les marchés hésitants.
- En volatilité extrême, durcissement du risque PAPER après dépassement d'un prix théorique : #179 a dépassé 800 BTC$ de MAE. Un hard-cap en déplacement du cours n'est pas la garantie d'un prix d'exécution.

**Marchés a priori favorables (hypothèses appuyées par l'échantillon) :** phases d'inflexion avec une heure de cours encore opposée mais une reprise tactique récente et une réponse/activité de prix qui se matérialise ; mouvements actifs où la conversion conserve son terrain ; éventuellement mouvements silencieux avec une réelle persistance.

**Marchés défavorables :** faible productivité et nombreuses oscillations MCB3/15 ; grandes chutes où les E3 UP tactiques deviennent de faux départs ; forte volatilité bidirectionnelle qui déclenche les protections natives avant continuation, puis la réadmission immédiate.

**Signature positive chiffrée, hors preuve prospective :** parmi les dix meilleurs trades nets, **7/7 couverts par Audit** avaient un déplacement **3m favorable et 60m contraire** à l'entrée, 15m parfois contradictoire. Sur 125 trades V494 avec une couverture 60m suffisante, cette signature apparaît **48 fois** : **17 gagnants, +19,98 USD** ; les **77 autres, 12 gagnants, −196,10 USD**. Ce signal est loin d'être suffisant (31/48 perdants), mais pose une hypothèse d'inflexion spécifique V494 à éprouver sans veto de volume.

## 4. V543 : compétences, limites et environnement favorable

**Forces**
- Lecture plus continue des **phases stratégiques MCB15** et de la maturité de campagne : retests, territoire et mémoire MF ; suit mieux les offensives qui se traduisent déjà en prix, parfois **avant** la confirmation d'un nouvel E15 contre l'ancien parent.
- Grandes campagnes : **#173 SHORT +51,033 USD**, **#165 LONG +38,455**, **#161 SHORT +23,057**, **#162 LONG +20,847**, **#233 SHORT +44,375** et **#239 SHORT +15,566**. Après le 12/11, quatre SHORTs ont donné **+58,28 USD**, compensant les six LONGs à −25,02.
- Meilleure continuité de position après subordination des gain-floors 120/90 et 220/180 à MCB/structure le 31 octobre ; le hard-risk −500 BTC$ reste indépendant. Les anciennes clôtures souveraines au gain-floor détruisaient les campagnes directionnelles.
- Peut exploiter des contresens tactiques **contre l'ancien parent E15** si un vrai transfert prix/MF/PM est en formation. Les succès #173/#233/#239 sont des exemples essentiels : **ne pas bloquer tous les STRUCTURAL_REVERSAL_FORMING**.

**Faiblesses**
- Les sorties requièrent parfois une conjonction tardive : MA3 rejetée **depuis l'entrée**, ou pivot E15 opposé confirmé / deux clôtures 3m au-delà de l'invalidation ; **en plus** MF3+MF15 adverses et défense du prix opposé. Résultat : des campagnes initialement justifiées rendent une grande partie du MFE avant EXIT.
- **#182 SHORT** : menace économique perceptible à 16h06m44s après ~1 001,5 BTC$ de baisse et +206,6 BTC$ de rebond en 60s, alors que MF15 encore baissier ; PM Live déjà **+217,2** au journal V543 16h06m39s, PM3 −128,9 et PM5 −303,8. MCB tarde. Contre-exemple : sur **#173 SHORT**, une forte contradiction Live similaire fut une simple respiration et a été suivie d'une grande baisse ; une sortie immédiate universelle détruirait la campagne.
- La protection d'une POSITION n'est pas bien séparée de l'invalidation d'une CAMPAGNE ; une clôture peut également autoriser trop vite un retournement de sens. **#184 LONG sorti, puis #185 SHORT admis cinq secondes après** dans le même parent E15 LONG.
- Certaines entrées sont expliquées mais **insuffisamment hiérarchisées** (#183/#187 SHORT contre parent E15 UP et prix/MA contradictoires). Une hypothèse tactique ne vaut pas acceptation territoriale.
- Churn interne et prix conservé insuffisant : le parent **#158–161 ne gagne que +8,158 USD**, malgré #161 à +23,057 USD ; le parent **#181–182 ~+0,016 USD** malgré #182 +3,889 ; le parent **#231–233 +31,363 USD** malgré #233 +44,375. L'inversion de camp peut s'effectuer sous un même parent E15.

**Marchés favorables :** offensives directionnelles dont le mouvement a déjà commencé sur 15m/60m, même sous un parent ancien encore contraire ; prix retesté/défendu et MF renforçants ; mouvements prolongés à rendements élevés où les floors auraient coupé trop tôt.

**Marchés défavorables :** alternance forte de chaînes SHORT/LONG et faux retests ; stérilité économique après frais, phases où le prix redevient adverse avant que la structure confirme ; reprise assez puissante pour rendre un grand MFE mais dont les MF lents ne se sont pas encore inversés.

**Signature positive rétrospective :** dans les dix meilleurs trades V5.4.3 **10/10** étaient précédés de 15m de déplacement favorable et **9/10** de 60m favorable, même si six étaient STRUCTURAL_REVERSAL_FORMING. **9/10** avaient FLOW REINFORCING, **10/10** un territoire déclaré confirmé. MAIS **80 des 89 trades perdants** portaient également REINFORCING, et **8 des 10 meilleurs** avaient economics.viable=false. Ces attributs ne sont pas des verrous admissibles seuls.

## 5. Les shadows — acquis et limites précis

**V494 A/B/C/D** : A entrée d'origine / sortie d'origine ; B même entrée / superviseur de sortie ; C filtre d'inflexion MCB15 / sortie d'origine ; D filtre + superviseur. Ces portefeuilles virtuels ont leurs **propres admissions et réentrées**, pas toujours identiques au vrai PAPER V494.

Au 14/11 vers 08h18, cumuls depuis lancement : **A −267,525 USD (130 clôtures)**, **B −320,580 (146)**, **C −173,131 (92)**, **D −227,017 (105)**. C a réduit de nombreuses admissions et pertes, mais reste déficitaire ; le superviseur B/D apparaît globalement plus mauvais.

Du 12/11 17h à 14/11 08h18, sur les positions virtuelles clôturées : **A 13/−75,385**, **B 16/−82,156**, **C 12/−70,820**, **D 15/−77,220 USD**. Sur les 13 admissions identiques, B améliore les exits de **+12,240 USD**, mais crée trois trades supplémentaires coûtant **−19,011 USD** : **meilleure sortie ≠ meilleur portefeuille**. Dans la fenêtre précédente, son effet apparié était fortement négatif. Aucune promotion de ce superviseur n'est justifiée.

**V543 forks de maintien, 10 entrées nouvelles comparables :** PAPER **+33,261**, STRUCTURE_ONLY **+33,635**, EARLY_INVALIDATION **+44,271**, TERRITORY_FLOOR_120 **−13,632**, BASELINE_PLUS_FAST_INVALIDATION **−7,768 USD**. L'invalidation précoce a aidé **ce dernier épisode** (+11,010), alors qu'elle a fait moins bien dans les cohortes précédentes et reste défavorable dans son cumul. Les floors auraient coupé #233 à **~+0,244 USD** au lieu des **+44,375 USD** PAPER. **Ne pas re-souverainiser les floors**.

Le fork **STRUCTURAL_LEVEL_AND_TRANSFER** reste dans un SHORT virtuel #167 depuis longtemps, avec un **gain estimé si sortie au prix courant ~+248 USD**, mais **106 réentrées PAPER ignorées** et les coûts de longue exposition/funding/réexécution non comparés ; son « résultat » n'est pas un résultat réalisé ni un meilleur moteur démontré.

**Elastic V494 / ticker 4×15** : qualité SILENT / INEFFICIENT / PRODUCTIVE / EASY / POWERFUL / EXCEPTIONAL / CONTESTED selon effort et rendement P75/P95, plus hypothèses temporelles ABSORBED / EXHAUSTED. **CONTESTED originel ne signifie que PM3 et PM5 opposés**, pas PM Live opposé aux deux. La forte dissonance PM Live/PM3/PM5 est une autre dimension : sur 1–7 novembre, **25 snapshots à trois chiffres contradictoires**, dont 23 Live opposé à PM3+PM5. Sur onze épisodes séparés 45m, PM Live est suivi favorablement seulement **2/11 à +3m**, **4/11 à +15m**, **6/11 à +45m**. Aucune autorité EXIT n'en découle.

**Observatoire nouveau à sept familles** MCB15 / MCB3 / FLOW / MA / CONVERSION / BOUNDARY / CONTEXT, plus shadow de menace de position et quatre classes de régime, est **en service, lecture stable sans refresh automatique** dans Watch → TRADES → SHADOWS. Mais l'observabilité est incomplète : statut **MCB3 = UNKNOWN** dans le résumé récent, événements CONVERSION souvent déclenchés par des changements numériques sans vraie transition de catégorie (~63 % dans l'étude précédente). La « qualité de territoire » de l'observateur est encore largement **un proxy prix sur 1h**, pas une mémoire de toutes les acceptations/retests MA/MCB. **Ne pas lui donner de droit d'entrer/sortir.**

## 6. Compréhension des marchés : favorable / adverse doit dépendre du moteur

**Trois intensités descriptives** basées sur débit agressif horaire (proxy Bâton des 200 derniers trades, pas profondeur passive L2) : FAIBLE sous **0,2262 BTC/s**, MÉDIAN **0,2262–0,552**, FORT à partir de **0,552 BTC/s**. Frontières ajustées sur 1–7 novembre et **non validées hors échantillon**. Chacune se combine avec PRODUCTIF/IMPRODUCTIF = six classes affichées dans BOONO-TV (shadow descriptif depuis 12/11). Productivité horaire = trajet net/chemin, rétention du meilleur écart et ordre de grandeur des frais. Une qualité de conversion Elastic (EASY, POWERFUL) ne décrit **pas** le même objet qu'une classe de marché.

**Quatre classes de l'observateur d'Amsterdam** (SILENCIEUX_PRODUCTIF, STERILE_HESITANT, DIRECTIONNEL_PRODUCTIF, DENSE_CONTRADICTOIRE) utilisent **des références relatives** à l'activité précédente et sont **une grille différente des six classes de BOONO-TV**. Ne pas les fusionner ni présenter leurs limites comme compatibles avant harmonisation.

**Constat sur les admissions depuis le 12/11 17h, régime connu avant entrée** :
- V494, **13 trades DENSE_CONTRADICTOIRE pour ~−102,95 USD nets**, tous LONG, 2 SILENCIEUX_PRODUCTIF ~+6,15 USD, un STERILE_HESITANT ~+7,32. La perte actuelle vient de son obstination LONG dans un contexte 2h encore vendeur ; non de la seule intensité « forte ».
- V543, **trois entrées DENSE_CONTRADICTOIRE ~+47,71 USD nets** (les grandes offensives vendeuses), sept STERILE_HESITANT **−14,45 USD**.
- **Un même régime DENSE_CONTRADICTOIRE peut favoriser 543 SHORT et défavoriser 494 LONG simultanément.** Le label horaire ne remplace pas le sens du parent 2h/4h, la trajectoire de prix et la maturité de campagne. Exemple : #233 gagnant s'est présenté sous DENSE_CONTRADICTOIRE, il serait éliminé par un veto universel de cette classe.

**Reconstruction antérieure :** le week-end du 31 octobre–1 novembre a connu un débit agressif ~0,18 BTC/s contre ~0,86 BTC/s le vendredi précédent, avec de nombreux croisements E3/LBW antagonistes et peu de conversion. 494 y a beaucoup fragmenté. Mais de bons trades sont venus de périodes silencieuses (#58/#76 et #172 V543). Puis, durant la chute productive du 5 novembre, 543 a capté la trajectoire alors que 494 a cherché trop tôt des rebonds. Le 6 novembre, marché très actif mais contradictoire, les deux ont souffert : conserver une position comme #182 n'a pas suffi à conserver son MFE.

**Hypothèse H1 à mettre à l'épreuve :** la valeur d'une preuve varie avec l'intensité, la directionnalité, la maturité et la tenue du territoire. **H0 concurrente :** les moteurs fixes restent plus robustes ; tout nouveau filtre adaptatif sacrifie des gains et accroît les frais. H1 n'a pas encore été validée.

## 7. Recommandations hiérarchisées pour le prochain chantier

**P0 — Geler les baselines et fiabiliser les preuves (AVANT toute politique).** Conserver V494 et V543 PAPER inchangés ; photographier versions, equity, règles et transactions ; préserver hors du cycle UI l'historique glissant Audit14D. Ajouter aux nouveaux journaux la vraie identité de **campagne parent V494** : au 12/11, seuls **93 des 171** trades V494 étaient appariables au marqueur de lobe du shadow A. Ne pas extrapoler ce taux à toutes les dates ni réécrire les campagnes historiques non vérifiables. Réparer MCB3 UNKNOWN, dédoublonner les transitions CONVERSION sans changement catégoriel, distinguer heure source, première disponibilité et confirmation. **Seule une observation fiable permet une amélioration responsable.**

**P1 — Qualifier le régime sans créer un veto.** Unifier l'interprétation des **3 intensités × productif/improductif** avec une **mémoire 4×15 / 2h / contexte 4h**, sans effacer la notion DENSE_CONTRADICTOIRE ni la distinction entre marché fort directionnel et bataille intense sans territoire. Rechercher pour chaque bande des critères de restitution, défense/retest MA, persistance MF et MCB15 ; recalibrer les frontières **avec données passées seulement**, mesurer stabilité et couverture. Éviter de qualifier la liquidité du carnet sans snapshots L2, spreads, slippage.

**P2 — Tester l'admission par moteur en SHADOW, pas par suppression rétrospective.** V494 : détecter la différence entre **inflexion tactique naissante après mouvement contraire** (#96, #49, #149, #180) et **faux rebond dans une forte baisse 2h** (#175, #178, #179, #187). Mesurer prix réellement reconquis, retest et nouvelle preuve après un essai raté ; ne pas rendre UP_REINFORCED globalement interdit. V543 : observer les **STRUCTURAL_REVERSAL_FORMING** productifs (#173/#233) contre injustifiés (#183/#187), et la nécessité de requalification après réentrée de camp opposé (#184→#185 en 5s). Réutiliser mémoire des campagnes au lieu d'ajouter une minuterie fixe.

**P3 — Séparer protection de POSITION, survie de CAMPAGNE et réadmission.** Étudier en shadow les forts givebacks après une extension mature, le premier retour adverse 30–60s, PM Live vs PM3/PM5, MF et MA, avec conditions liées au territoire. #182 signal d'alerte précoce ; #173 contre-exemple à une sortie trop nerveuse. Une sortie virtuelle doit être évaluée avec le **coût des sorties successives et des réentrées manquées**, pas seulement l'amélioration d'un trade choisi. Les contrôles de risque dur demeurent non négociables.

**P4 — Évaluation rigoureuse :** comparer les deux baselines aux forks sur **la même horloge**, mêmes coûts et disponibilité des sources ; grouper par parent E15 et par épisodes de marché, pas par relevé 30s corrélé. Split temporel « conception → futur tenu à l'écart », tester journées stériles, moyennes, fortes directionnelles et fortes contradictoires, y compris transitions rapides et périodes de choc ; rapporter gains conservés, gains ratés, churn, drawdown, durée/exposition, P&L net, frais, sensibilité au slippage. Évaluer H0 **avant** de promettre une adaptation des seuils.

**P5 — Promotion prudente :** ne proposer un changement PAPER qu'avec des exemples gagnants conservés (notamment V494 #96/#149/#180, V543 #165/#173/#233/#239) **ET** des faux départs réellement mieux discriminés, sur des journées **jamais utilisées** pour régler le modèle. Pour chaque modification, préparer un OD : autorisé, implémenté, testé, mis en service, puis fenêtre d'évaluation où la baseline de référence reste accessible.

**Ce qu'il faut éviter :** seuil de volume universel, veto « week-end » ou « DENSE_CONTRADICTOIRE », règle EXIT sur PM Live à trois chiffres seule, retour aux floors souverains, cumul naïf des confirmations MCB/MF/PM corrélées, reprise de V4.10.10 comme moteur actif, addition du P&L latent au réalisé, interprétation des 48h BOONO-TV comme P&L à vie.

## 8. Sources, outils et autorité technique

**Dépôt :** [Salvaison/agents-ia-zero-one](https://github.com/Salvaison/agents-ia-zero-one), branche **main** ; application Amsterdam **/root/agents-ia-zero-one/zero-one** ; accès ordinateur autorisé BOONOTRADE-VPS via Desktop Commander. PM2 au 14/11 : **boono-v494-paper, boono-v543-paper, boono-v494-entry-exit-shadow, boono-v494-elastic-shadow, boono-v543-hold-shadow, boono-market-regime-shadow, boono-audit-14d, config-server** observés en ligne. Ne pas toucher aux **fichiers BOONO-TV / shared** actuellement modifiés dans un autre chantier.

**Ledgers :** data/v494-paper-state.json, v494-paper-trades.ndjson ; data/v52-paper-state.json, v52-paper-trades.ndjson, v52-paper-decisions*.ndjson ; data/audit-14d/audit-*.ndjson.gz.

**Hygiène de la Knowledge Base :** le contrôle de la décision **OD-20261114-001** passe individuellement. Au moment de cet audit, la vérification globale de tous les dossiers OD échoue sur un **statut non reconnu dans OD-20261110-007**, appartenant à un autre chantier. Ne pas réparer ce dossier concurrent dans cette passation ; le faire réconcilier par son responsable lors d'une maintenance documentaire.

**Shadows :** v494-dual-module-shadow-summary.json / events.ndjson ; v543-campaign-hold-shadow-summary.json / events.ndjson ; v494-elastic-shadow-summary.json et v494-elastic-state-observations*.ndjson ; boonolab-market-observer-summary.json et boonolab-market-{events,snapshots}*.ndjson.

**Modules :** modules/v4/layers/market-quality.js et action.js ; modules/v5/decision-v541.js, decision-v543.js, paper-v543.js, ma-polarity-memory-v541.js ; modules/attention/{attention-memory,evidence-adapters,v494-elastic-ticker,v494-elastic-state-layer,v494-dual-module-shadow,boonolab-causal-chronicle,boonolab-position-attention,boonolab-regime-observer}.js.

**Documents de référence (ne pas remplacer par cette synthèse) :**
- [Méthodes et critères](BOONOLAB_methodes_analyse_et_criteres_2026-10-28.md) ; [conventions/verrous](BOONOLAB_conventions_seuils_verrous_actifs_2026-10-28.md).
- [Étude des meilleures campagnes](BOONOLAB_meilleures_campagnes_V494_V543_conditions_2026-11-12.md) ; [bilan shadows au 12 novembre](BOONOLAB_bilan_494_543_shadows_2026-11-12.md).
- [Régimes et dissonances PM](BOONOLAB_PM3_PM5_PMLive_dissonance_regimes_2026-11-07.md) ; [observatoire 7 familles](BOONOLAB_observatoire_sept_familles_regimes_protection_2026-11-07.md).
- [Audit sorties #182–189 et mémoire](BOONOLAB_audit_V543_182_189_chronologie_memoires_2026-11-07.md) ; [gain-floors et marché faible](BOONOLAB_V494_weekend_regime_V543_floor_MCB_structure_2026-10-31.md).
- [Six qualités de marché BOONO-TV](BOONO_TV_conversion_six_qualites_marche_2026-11-12.md), [volume ticker 4×15](BOONO_Watch_Conversion_Ticker4x15_2026-11-10.md). Les pourcentages du ticker sont des **parts du temps observé / mesure de volume OKX 1m**, non des scores indépendants de qualité.

## 9. Prompt de démarrage à copier dans le nouveau chat

> Nous reprenons BOONOLAB à partir de la passation [BOONOLAB — PASSATION FINALE 494/543/SHADOWS](BOONOLAB_PASSATION_FINALE_494_543_SHADOWS_2026-11-14.md), audit figé au 14/11/2026 vers 08h18 Europe/Stockholm. Les deux PAPER V494 (inflexions réactives) et V543 (campagnes structurelles maintenues) sont cohérents mais nets cumulés négatifs ; leurs shadows et l'observatoire 7 familles sont actifs. Lis la passation, contrôle l'état LIVE d'Amsterdam et la Knowledge Base, sans supposer les chiffres inchangés. Notre nouvelle mission est **améliorer économiquement l'admission, la conservation des campagnes et la protection des positions**, en étudiant leur comportement selon les **trois intensités × productif/improductif**, les transitions de régime et le territoire réellement défendu. Commence par fiabiliser l'observabilité et proposer 2–3 expériences discriminantes en SHADOW avec H0/H1, métriques et contre-exemples gagnants. Ne change aucune règle, seuil, PAPER, frais ou politique broker avant notre validation explicite. Documente chaque décision et ses étapes dans la KB GitHub, distingue faits, hypothèses et résultats virtuels, et préserve les fichiers BOONO-TV hors périmètre.

---

**STATUT DE PASSATION :** diagnostic effectué, deux moteurs PAPER et leurs shadows toujours actifs et non modifiés. **Amélioration algorithmique encore à concevoir/tester, pas déjà exécutée**.
