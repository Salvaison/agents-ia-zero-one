# BOONO Systems — Audit comparatif des campagnes V5 / V4, gain-floors et sorties

**28 octobre 2026, Amsterdam — recherche en lecture seule, aucune modification des décisions PAPER.**
**Fenêtre de clôtures figée :** V5 #59 (entrée 26/10 13h40 CET) à #84 (sortie 28/10 09h03 CET) ; comparateur V4 #17–35. Les observations ultérieures ne sont pas incluses.
**Statuts :** constat vérifié = ledger/flux/code ; scénario = calcul ex post sans décision active ; proposition = hypothèse NON validée et NON implémentée.

## 1. Comptabilité dans la fenêtre commune

| Compte PAPER | Clôtures | Réussites opérationnelles (net >= -0,25 $) | P&L brut | Frais | P&L net |
|---|---:|---:|---:|---:|---:|
| V5 #59–84, versions d'entrée V5.4 à V5.4.3 | 26 | 18 (69,2 %) | +2,3968 $ | 39,0003 $ | **-36,6038 $** |
| Comparateur V4 #17–35, 9 entrées V4.9.3 puis 10 V4.9.4 | 19 | 9 (47,4 %) | +4,7318 $ | 28,5150 $ | **-23,7835 $** |

Les frais et cycles de position diffèrent. Ce n'est PAS un backtest A/B ni une comparaison par unité de risque ou temps en position. Pour V5, huit échecs significatifs cumulent environ -47,24 $ nets, tandis que dix-huit sorties par gain-floor totalisent **+10,637 $ nets**.

## 2. Chevauchements vérifiés

Par intersection stricte des intervalles [entrée, sortie[, il existe **21 paires chevauchantes**, **12 de même sens, 9 de sens opposés**. Une position V4 peut chevaucher plusieurs opérations V5 ; les paires NE SONT PAS des événements indépendants.

| V5 / V4 | Sens | Durée commune | Net V5 / V4 | Observation principale |
|---|---|---:|---|---|
| #60 / #17 | LONG/LONG | 2,6 min | +1,78 / -5,23 $ | Entrées rapprochées, protection V5 salvatrice |
| #61 / #18 | SHORT/SHORT | 6,7 min | +0,10 / -11,65 $ | 0,6 min d'écart d'entrée, sortie V493 tardive |
| #63 / #19 | LONG/LONG | 20,4 min | +1,65 / +1,89 $ | Accord et deux résultats positifs |
| #64 / #19 | SHORT/LONG | 6,4 min | -0,03 / +1,89 $ | Contre-attaque V5 tactique, quasi neutre |
| #67 / #20 | LONG/LONG | 34,7 min | -0,05 / +5,05 $ | V493 tient la campagne entière |
| #68 / #20 | SHORT/LONG | 21,3 min | -3,59 / +5,05 $ | V5 renverse à tort dans une hausse V493 conservée |
| #69 / #21 | LONG/SHORT | 3,8 min | +0,09 / +2,62 $ | Tentative contraire quasi neutre |
| #70 / #21 | SHORT/SHORT | 50,0 min | +0,09 / +2,62 $ | Même camp, meilleure durée et captation V493 |
| #71 / #21 | LONG/SHORT | 1,0 min | -5,57 / +2,62 $ | Retournement V5 défavorable |
| #71 / #22 | LONG/SHORT | 52,0 min | -5,57 / -0,09 $ | Opposition prolongée ; V493 presque neutre |
| #73 / #24 | LONG/LONG | 33,5 min | -3,38 / +0,60 $ | Même thèse, V5 entre plus tard et termine perdant |
| #74 / #25 | LONG/LONG | 2,7 min | +0,11 / +5,81 $ | V5 capte peu de l'opportunité tenue par V493 |
| #75 / #26 | LONG/LONG | 0,5 min | +0,08 / +1,99 $ | Chevauchement trop court pour conclure |
| #76 / #26 | SHORT/LONG | 1,5 min | -0,20 / +1,99 $ | Opposition très courte, V5 quasi neutre |
| #78 / #27 | LONG/SHORT | 6,7 min | -6,04 / -7,52 $ | Deux directions opposées, deux pertes : marché disputé |
| #80 / #29 | SHORT/SHORT | 31,1 min | +0,10 / +0,35 $ | Accord de camp ; sorties économiquement modestes |
| #81 / #29 | SHORT/SHORT | 21,6 min | -0,09 / +0,35 $ | Nouveau SHORT V5 quasi neutre pendant campagne V4 |
| #82 / #31 | LONG/LONG | 25,6 min | +1,81 / -1,52 $ | Entrées à 2,4 min, différence de sortie majeure |
| #83 / #32 | SHORT/LONG | 20,7 min | +1,39 / -4,75 $ | V5 saisit sens opposé gagnant |
| #83 / #33 | SHORT/SHORT | 10,2 min | +1,39 / -2,78 $ | Même camp mais meilleur timing/protection V5 |
| #84 / #35 | LONG/SHORT | 2,7 min | +1,76 / -2,19 $ | V5 capte transfert haussier tardif, V4 ferme SHORT |

Cas de continuité sans chevauchement strict : V5 #77 SHORT (15h18–15h57 CET, -6,18 $) puis V4 #27 SHORT (16h31–18h31, -7,52 $), et V5 #78 LONG (18h24–18h55, -6,04 $) contre la fin de V4 #27. Le rapprochement #77/#27 reste important, MAIS leurs positions ne se chevauchent pas. La suite #77–#78 et #27 ne démontre aucun camp gagnant.

Lecture de l'architecture réelle : V493 au commit gelé cdf1936 admet MCB/setup + PM post-setup sans veto ticker, puis son setup CONSUMED désensibilise une campagne établie aux contre-efforts PM isolés. V494 ajoute attention temporelle en **observabilité seulement**, aucune nouvelle sortie automatique. V5.4.3 hérite V541/V542 (MCB15 causal dirige, E3 tactique, MF/MA/territoire) et bloque certaines **nouvelles admissions** trop avancées ; son attention temporelle n'impose pas encore de nouvelles sorties. Les deux moteurs ne partagent ni ledger ni comptabilité.

## 3. Gain-floor : ventilation économique

**18 sur 26** V5 sortent via GAIN_FLOOR_120_90_OR_220_180. Ces sorties totalisent **+10,637 $ net**, mais leur économie dépend fortement du palier.

| Palier armé MFE BTC / plancher déplacement BTC | Nombre | P&L net de ces sorties | Mouvement effectivement conservé (moyenne) |
|---|---:|---:|---:|
| MFE >= 120 / plancher 90 | 12 | **+0,54 $** | 82,6 $ BTC |
| MFE >= 220 / plancher 180 | 6 | **+10,10 $** | 171,0 $ BTC |

L'écart au plancher théorique est en moyenne 7,4 $ BTC au palier 90 et 9,0 $ au palier 180 ; l'exécution du simulateur se fait sur ticks observés, NON à prix garanti du niveau. Le ratio de déplacement conservé / MFE moyen est d'environ 56 % au premier palier et 67 % au second. Exemple #62 : MFE +485,5 BTC, clôture avec seulement +171,3 BTC de déplacement, net +1,70 $ ; les protections écartent un risque mais ne cherchent pas l'optimum de capture.

## 4. Contrôles de trajectoire après gain-floor (PAS des sorties structurelles)

À partir des OHLC TradingView/MCB 3m confirmées (ordre intrabougie inconnu), recalcul du net si l'ancienne position était restée ouverte et clôturée **exactement** à +15/+30/+60/+120 minutes après sa vraie sortie :

| Échéance après la vraie sortie | Cas dotés de données complètes | Cas nets positifs au prix observé | Total hypothétique pour ces positions |
|---|---:|---:|---:|
| 15 min | 18 | 11 | -8,18 $ |
| 30 min | 18 | 8 | -4,54 $ |
| 60 min | 18 | 9 | +4,28 $ |
| 120 min | 17 | 7 | -8,46 $ |

Ce ne sont PAS des politiques de trading ni des P&L de portefeuille réalisables ; conserver ces positions interdirait certaines réentrées ultérieures. Sur les deux heures post-sortie, **13/18** cas ont ultérieurement dépassé leur ancien MFE, mais **2/18** (#61 et #69) ont aussi connu une excursion adverse d'au moins 500 $ BTC contre le prix d'entrée. Le rebond ultérieur ne prouve jamais qu'une sortie aurait attendu le bon moment. Cas contrastés : #84 à +60min aurait affiché environ +8,71 $ net vs +1,76 $ réalisé ; #61 à +60min environ -16,14 $ net vs +0,10 $ réalisé, et #69 environ -7,13 $ vs +0,09 $. Les deux premiers paliers jouent donc parfois un rôle vital.

## 5. Étude exploratoire « sans gain-floor, sortie structurelle seulement »

Pour dépasser l'analyse arbitraire +60min, relecture de **2 414 changements d'états décisionnels archivés** du 26/10 04h53 UTC au 28/10 09h18 UTC, avec bougies 3m confirmées connues à chaque état et prix journalisé. Reconstitution indicative du noyau causal V54/V541 pour une position virtuelle conservée : pivot E15 structurel opposé connu après l'entrée OU deux clôtures 3m de l'autre côté de l'invalidation d'entrée, **ET** MF3/MF15 adverses concordants, **ET** défense du prix du camp adverse. Inclut l'examen des rejets MA3 lorsqu'ils sont accessibles ; aucun nouveau veto ni valeur future d'oscillateur n'est inventé. Fenêtre d'observation de 4h depuis l'entrée, avec surveillance de perte -500 BTC aux prix journalisés.

**Résultat indicatif : 16/18 cas ont un événement hypothétique de sortie détecté, dont seulement 6 nets positifs et 10 déficitaires ; 2 cas restent non résolus (#72, pas d'événement en 4h, et #84, fenêtre incomplète).** Le P&L des 16 issues hypothétiques totalise environ **-38,53 $**, au lieu d'environ +8,70 $ réellement obtenu par gain-floor sur ces mêmes seize opérations.

Cas aux hypothétiques sorties positives : #59 (~+2,38 $), #70 (~+4,84 $), #74 (~+0,10 $), #75 (~+0,44 $), #82 (~+0,06 $), #83 (~+1,39 $).
Cas négatifs : #60 (~-1,85 $), #61 (~-7,55 $), #62 (~-2,69 $), #63 (~-8,95 $), #64 (~-0,28 $), #67 (~-3,33 $), #69 (~-4,98 $), #76 (~-8,23 $), #80 (~-4,66 $), #81 (~-5,22 $).
Censurés : #72 et #84.

**LIMITATION CRITIQUE :** ce n'est PAS un replay exact de l'ancien moteur artificiellement maintenu en position. Les journaux sont échantillonnés aux changements, non à tous les ticks 5s ; une décision avec position virtuelle modifierait certaines branches MA/attention et l'admission ultérieure ; stops et slippage intrabougie sont imparfaitement reconstitués. Le chiffre 6/16 est donc une indication de travail, NON le nombre démontré de trades qui auraient réellement fini gagnants avec une stratégie structurelle validée. Le registre Audit en mémoire ne couvre plus intégralement les premières heures, d'où l'usage des journaux et OHLC conservés. Il faudra un shadow de maintien complet pour répondre définitivement.

## 6. Pourquoi les huit pertes sont coûteuses

Les huit pertes : #65 -5,53 $, #66 -4,75 $, #68 -3,59 $, #71 -5,57 $, #73 -3,38 $, #77 -6,18 $, #78 -6,04 $, #79 -12,20 $. Leur MFE BTC maximal est **toujours inférieur à +120 $** ; aucun gain-floor ne pouvait s'armer.

**Fait de code important :** l'admission V5 stocke un entryInvalidation (niveau de référence causal), mais le simulateur ne le traite PAS comme un stop dur déclenché au prix. Il exige une sortie structurelle multi-preuves, ou un hard-risk à -500 $ de mouvement BTC. Les huit trades sont finalement sortis **au-delà** de leur invalidation d'entrée. #79 (SHORT 80 665,3 ; invalidation 80 738,9) n'a été clôturé que vers 81 240,6, excursion défavorable de -575,3 $ BTC, net -12,20 $ : le stop dur -500 n'est pas un ordre limite garanti et s'applique au tick observé.

Attention à la fausse solution : **quatre des 18 sorties réussies (#59, #72, #75, #80) ont également dépassé leur invalidation à un moment**, avant de revenir. Un stop strict au premier franchissement les aurait éliminées. À prix d'invalidation théoriquement rempli exactement, les huit pertes auraient économisé environ +15,68 $, mais les quatre succès sacrifiés auraient coûté -12,96 $ de différence. Gain brut hypothétique du procédé sur ces 12 opérations seulement : **+2,72 $**, avant toute prise en compte de gaps, nouveaux trades manqués et changements de trajectoire ; ce calcul n'est pas un gain réel reproductible.

L'étude des clôtures MCB 3m montre **7/8** échecs avec au moins deux closes consécutives au mauvais côté du niveau ; **1/18** succès (#75) subit aussi cette condition avant de récupérer. Pour six des sept échecs, le deuxième close adverse intervient à environ 0,6–1,3 minute de la véritable sortie : exiger simplement deux bougies ne sauve presque rien. #66 donne un avertissement environ 12,7 minutes avant la sortie ; #79 est trop rapide pour cette règle et exige une sécurité de flux. Un simple stop d'invalidation est donc trop nerveux, tandis que les sorties actuelles attendent souvent trop de preuves tardives.

## 7. Hypothèses de recherche, NON validées

1. **Mémoire de l'offensive qui échoue :** reconstituer à l'entrée et après l'entrée les tentatives prix/MCB15/MF/PM, le rendement marginal et la perte ou la reprise du territoire. Distinguer invalidation brièvement visitée de rejet durable, sans vote multiple de familles corrélées.
2. **Attention de sortie anticipée, sans EXIT sur E3 seul :** comparer une protection conditionnelle déclenchée par un transfert de contrôle progressif contre l'ancienne position, à l'écoute temporelle de V494 et au triplet de sortie V5 (territoire, MF, structure). Mesurer systématiquement faux positifs parmi #59/#72/#75/#80 et sorties trop tardives parmi #65–79.
3. **Protection économique à deux tâches :** conserver un mécanisme de sauvetage du capital sur débuts faibles ; pour les campagnes réellement productives, comparer des planchers sensibles au territoire/MFE et un maintien structurel conditionnel. Ne pas convertir mécaniquement +120→90 en un nouveau seuil actif sans replay.
4. **Replays parallèles sur mêmes horloges :** replay PAPER read-only par épisode pour admission, maintien, transfert, protection, réentrée, frais et drawdown. Deux moteurs actifs uniquement ; aucun troisième trader ni ordre financé.
5. **Mesures d'arbitrage :** net agrégé par épisode/campagne, MFE effectivement capturé, perte évitée, nombre de sorties/entrées, exposition et meilleures opportunités perdues ; ne pas sélectionner uniquement les gagnants rétrospectifs.

## 8. Provenance, incertitudes, gouvernance

Données consultées en lecture seule : data/v52-paper-trades.ndjson, data/v494-paper-trades.ndjson, data/v52-paper-decisions*.ndjson, data/audit-history.json (rétention récente), ../data/mcb-live/mcb_3m.csv ; code modules/v5/decision-v54.js, decision-v541.js, decision-v542.js, decision-v543.js, paper-v543.js, runner-v543.js, baseline-v494-runner.js, modules/attention/listening-v494.js ; docs knowledge/BOONO_V494_V542_ecoute_selective_active_2026-10-27.md et BOONO_V543_maturite_offensive_causale_2026-10-27.md.

Frais modélisés taker 0,05 % par côté, notionnel 1500 $, simulations sans slippage/funding ; observations distinctes des ordres réellement exécutables. Données « futur observé » utilisées **uniquement** dans les évaluations ex post, jamais comme preuve accessible à l'entrée.

**Aucune politique modifiée ; aucun moteur redémarré ; aucune requalification d'ancienne position effectuée.** Conclusions de recherche soumises à discussion et validation distincte. Serveur = état opérationnel ; code = politique effective ; logs = observations ; Knowledge Base = mémoire vérifiable.
