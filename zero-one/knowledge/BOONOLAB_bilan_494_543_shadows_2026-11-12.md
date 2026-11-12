# BOONOLAB — Bilan critique des derniers trades et shadows (12 novembre 2026)

**Audit direct d'Amsterdam du 12/11/2026, vers 16h59–17h04 Europe/Stockholm.**
**Question du propriétaire :** « Analyse des dernier trades et shadow, je doit dire que ce n'est pas concluant! Y a t il qqe chose de bon à sortir de tout ça? »

**Statut : RAPPORT DE RECHERCHE.** Aucun code de décision, seuil, risque, politique d'entrée/sortie, position ou service PAPER n'a été modifié. Les shadows restent sans autorité de trading. Les montants sont des P&L PAPER nets après frais taker simulés ; les simulations n'incluent pas slippage, funding et contraintes de liquidité.

## 1. Résultats PAPER, cohorte commune post-audit 7 novembre à 10h52 CET

| | 494 V4.9.4 | 543 V5.4.3 |
|---|---:|---:|
| Clôtures nouvelles | **39** | **41** |
| Gagnants | 10 (**25,6 %**) | 12 (**29,3 %**) |
| P&L brut avant frais | +4,1631 $ | +21,3670 $ |
| Frais aller-retour modélisés | 58,4798 $ | 61,4994 $ |
| **P&L net** | **−54,3166 $** | **−40,1321 $** |
| Gagnants cumulés | +67,5740 $ | +62,3308 $ |
| Perdants cumulés | −121,8906 $ | −102,4629 $ |

**Constat :** aucun avantage durable démontré. Malgré un brut positif des deux côtés, les frais dépassent l'avantage avant frais. Le groupe 543 n'a pas systématiquement moins de trades depuis le 7 novembre : il en a fait **41 contre 39 pour 494**, même si le 12/11 il est nettement plus sélectif.

**Historique complet, à ne pas mélanger avec la cohorte commune :** V494 PAPER 170 clôtures, net −209,9102 $, equity 790,0898 $ ; lignée V5 complète 230 clôtures, net −239,2311 $, equity 760,7689 $ ; **version V5.4.3 seulement #80–230** 151 clôtures, net −116,3063 $. Anciennes versions de V5 et dates de démarrage différentes rendent les cumuls non comparables comme expérience A/B.

## 2. Le 12 novembre change complètement la lecture de la période

Sur les **trades ouverts le 12/11 et déjà fermés** :
- V494 : **8 LONGs, 0 gagnant, −49,5679 $**. Deux EXIT_RISK (#168 −14,8369 $, #170 −14,0628 $) pèsent **−28,8997 $**, environ 58 % de la perte du jour. Les autres LONGs n'ont pas réussi à installer une campagne rentable. Le #169 est explicitement admis par l'exception `UP_REINFORCED <= −60` avec bypass partiel de confirmation, mais les autres reposent sur la traduction PM/effort habituelle ; **ne pas attribuer tout le désastre à un unique bypass**.
- V543 : **2 SHORTs, 2 gagnants, +15,1348 $**, #229 +4,6430 $ sur 386 min et #230 +10,4918 $ sur 94 min. Les sorties par heure (plutôt que date d'entrée) sont différentes : le #162 SHORT 494 +16,0874 $, entré le 11 et clôturé après minuit, donne un total *par clôtures du 12* moins défavorable à 494 (−33,4805 $). V543 #228, entré le 11 et clos le 12, perd −0,1374 $, d'où un total *par clôtures du 12* +14,9974 $.
- Opposition directe : alors que 494 détient #170 LONG depuis 14h46, V543 entre #230 SHORT à 15h21 ; #170 clôture presque simultanément, −14,0628 $. Pendant la matinée, V494 #163/#164/#165 LONGs chevauchent le SHORT #229 de V543 et perdent tous les trois. **Différence de direction réelle**, pas une comparaison fictive de prix identiques.
- Les moteurs arrivent encore à réussir des campagnes importantes : V494 #149 LONG (10/11) +11,0901 $, #162 SHORT (11→12/11) +16,0874 $ ; V543 #202 LONG +9,8713 $, #203 SHORT +14,3283 $, #214 SHORT +6,7633 $, #226 LONG +6,4533 $, #230 SHORT +10,4918 $. Les exemples gagnants ne prouvent pas la robustesse de la logique globale.
- Au premier relevé 16h59, V494 a **un nouveau LONG ouvert** depuis ~16h55, à 71 540,4 BTC ; l'exposition n'est **pas** incluse dans les P&L réalisés. V543 est FLAT.

**L'échec spécifique V494 :** il cherche sans cesse la reprise haussière pendant que le marché poursuit une forte baisse, ce qui produit des admissions précoces et plusieurs sorties à risque. **L'échec spécifique V543 :** il peut suivre les vagues directionnelles, mais paie trop de faux départs et restitue des gains avant d'admettre la perte de territoire. Ces diagnostics sont descriptifs, non un verdict causal définitif.

## 3. Le résultat par parent E15 de V543

41 trades depuis 7 novembre → **29 parents E15**, dont **7 nets positifs et 22 négatifs**, 9 parents multi-trades, **5 parents ayant changé de camp LONG/SHORT en interne**. Parents notables :
- `long|E15:1794175200000`, #202 LONG +9,8713 et #203 SHORT +14,3283 → **+24,1996 $**, bon exemple d'une campagne mixte rentable ;
- `short|E15:1794228300000`, #206 SHORT −11,033 et #207 LONG −5,786 → **−16,819 $** ;
- `long|E15:1794282300000`, #211–214 LONG→SHORT→LONG→SHORT → **−3,746 $**, quatre admissions pour une même histoire ;
- #227 SHORT seul **−8,5115 $** ; #229 et #230 SHORTs de parents distincts **+4,6430 $ et +10,4918 $**.

L'opposition répétée de stratégies dans un même parent et le coût des réentrées semblent être une faiblesse économique. Ne pas confondre E15 parent et position : les causes d'entrée/sortie doivent être analysées sur leur chronologie.

## 4. Comparaison factorielle V494 A/B/C/D depuis 7/11 10h52, mêmes entrées de cohorte

| Shadow | Clôtures virtuelles | Net |
|---|---:|---:|
| A Original/original | 40 | −60,7312 $ |
| B Original/superviseur sortie | 46 | **−97,5735 $** |
| C MCB15 inflection/original | 29 | **−23,6597 $** |
| D MCB15 inflection/superviseur | 34 | −71,8718 $ |

**Le filtre C** a écarté 11 transactions de A qui totalisent **−37,0715 $** (10 pertes et **une gagnante** +1,4078 $). Le filtre est **associé à un meilleur résultat descriptif**, mais C perd toujours et **a laissé passer les neuf entrées LONG perdantes du labo le 12 novembre**. La supériorité de ses admissions n'est pas démontrée prospectivement. `blockedEntries` du shadow compte des candidatures, pas des trades.

**Le superviseur B/D** a un effet **négatif sur les mêmes entrées** : B−A apparié **−34,1289 $**, D−C apparié **−36,4616 $** ; puis des réentrées propres aux versions supervisées aggravent encore l'économie. Contre-exemples :
- V494 #149 LONG du 10 novembre : A aurait fermé à **+11,09 $**, mais B à **−7,77 $** ;
- V494 #162 SHORT du 11 novembre : A **+16,09 $**, B **−4,54 $** ;
- le superviseur a réduit la perte de certains cas, notamment le LONG du 12 novembre 14h46 : −14,06 à −8,25 $, mais cela ne compense pas les campagnes gagnantes interrompues.

**Conclusion pour ce module :** le superviseur de sortie ne mérite **pas** de promotion en PAPER sous sa forme actuelle ; l'impact sortie→réentrée doit rester observé.

## 5. Shadows de maintien V543 — période 7 novembre à aujourd'hui, 41 entrées appariées

| Variante | 41 clôtures virtuelles net | Écart avec PAPER −40,1321 $ |
|---|---:|---:|
| Structure seule | −41,8125 $ | −1,6804 $ |
| Invalidation rapide | **−63,5063 $** | **−23,3742 $** |
| Territory floor 120/90 | −55,1696 $ | −15,0375 $ |
| Gain-floor actuel + invalidation rapide | −52,1435 $ | −12,0114 $ |

Ce sont des contre-factuels **avec les mêmes 41 entrées et un nombre égal de clôtures**, mais des prix/horloges virtuels différents. Le maintien structurel PAPER est le meilleur du groupe étudié, sans pour autant faire gagner de l'argent. Les floors illustrent la symétrie du problème : sur #227, un floor aurait donné +0,3124 $ contre −8,5115 $ PAPER, mais sur #230 il aurait fermé **−0,2504 $** contre le **+10,4918 $** réalisé. Une règle universelle supprimerait de très belles campagnes.

La variante `STRUCTURAL_LEVEL_AND_TRANSFER` n'est **PAS comparable** : toujours SHORT depuis le trade #167, exposée pendant plusieurs jours, **+166,2956 $ estimés si clôture au dernier cours**, mais **95 réentrées réelles ignorées**, 13 autres trades virtuels déjà clôturés pour −68,4595 $. Ni les risques entre temps, ni le funding, ni les opportunités perdues ne sont compensés dans le résultat. Une grande plus-value latente isolée ne constitue pas une politique validée.

## 6. À quoi correspond le marché — classification as-of, sans ajuster de seuil

L'observateur du 7 novembre a produit **14 815 snapshots horodatés** avant le contrôle, donc il est possible d'associer la classe calculée *avant l'entrée* à chaque trade (tolérance 2 min). Ses **quatre catégories** sont relatives à l'heure précédente / trois heures de référence et ne doivent pas être confondues avec les **six catégories d'intensité/qualité de BOONO-TV** : ces dernières utilisent les seuils exploratoires 0,2262 / 0,552 BTC/s et des conventions différentes.

| Régime de l'observateur à l'entrée | V494 : trades / net | V543 : trades / net |
|---|---:|---:|
| `DIRECTIONNEL_PRODUCTIF` | **7 / +26,811 $** | 5 / −1,721 $ |
| `DENSE_CONTRADICTOIRE` | 12 / −26,624 $ | 14 / +0,062 $ |
| `SILENCIEUX_PRODUCTIF` | 9 / −25,422 $ | 6 / −14,583 $ |
| `STERILE_HESITANT` | 11 / −29,082 $ | 15 / −21,530 $ |

**Piste forte mais non validée :** V494 n'a réalisé de net positif au total que dans ses **sept admissions DIRECTIONNEL_PRODUCTIF**, soit +26,81 $ ; les 32 autres admissions totalisent −81,13 $. **Il serait incorrect d'en faire un veto maintenant** : l'échantillon est petit, la classe s'appuie sur des références descriptives et ce n'est pas vrai pour V543. Des entrées rentables ont aussi lieu en régimes contradictoires. Il faudrait un test aveugle sur les jours suivants, incluant les opportunités perdues et les nouvelles réentrées.

Au dernier point de contrôle, l'observateur classait le marché `DENSE_CONTRADICTOIRE`, avec débit 1h ~1,447 BTC/s, prix net 1h ~+137,4 BTC$, chemin cumulé ~5 100 BTC$, **efficacité nette ~2,69 %**, alors que le prix avait fortement chuté dans les heures précédentes. Il décrit une **bataille volatile** sur la fin de la baisse, pas nécessairement un retournement stratégique confirmé.

**Qualité de l'observateur elle-même encore insuffisante :** sur les 2 347 événements `CONVERSION_STATE` contenus dans le segment courant, **1 479 (63 %) n'ont changé que les composantes internes mais pas le statut affiché** ; le flux événementiel peut donc paraître beaucoup plus actif qu'il n'est réellement. Le champ `MCB3` est `UNKNOWN` dans le dernier résumé. **Avant de bâtir des décisions sur la chronologie, il faut fiabiliser l'observabilité et la définition des transitions**, sans remplacer la logique PAPER ni inventer des changements d'état.

## 7. Ce qui mérite d'être conservé et ce qui ne fonctionne pas encore

**Établi :** les deux moteurs savent encore capturer de grands segments de prix dans certains épisodes (494 #149/#162, 543 #202/#203/#230) ; la lecture structurelle de 543 et les floors subordonnés permettent parfois de conserver des campagnes que les floors auraient annihilées. Les épisodes gagnants sont cependant trop rares pour absorber pertes, frais et churn dans l'ensemble récent.

**Réfuté dans cette cohorte :** superviseur de sortie V494 actuel, invalidation rapide systématique et floors souverains V543 ne donnent pas un meilleur portefeuille. L'ancien shadow « maintenir jusqu'à la perte de niveau ET transfert » reste incomparable car il s'est transformé en une très longue exposition unique et a cessé de participer à 95 entrées.

**Hypothèses ouvertes à tester, sans nouveaux seuils PAPER :**
1. **Admission 494 en marché contre-tendance** : pourquoi ses traductions LONG successives restent-elles admissibles pendant une baisse structurelle, et comment les distinguer de son bon LONG #149 ou du SHORT #162 sans post-sélection des gains ?
2. **543 qualité de campagne et abandon de position** : suivre les parent E15 qui répètent les deux sens, les grandes excursions profitables ensuite rendues, et les preuves qui existent *avant* le prix de sortie. Mesurer en campagne, pas en trade individuel.
3. **Market regime × qualité de prix conservé** : tester si les classes d'intensité et de territoire ont un pouvoir prédictif **sur une période nouvelle**, par moteur et par type d'opportunité, sans réutiliser les résultats qui ont inspiré le seuil et sans compter plusieurs votes corrélés.
4. **Hygiène des données** : dédoublonner les « transitions » de CONVERSION qui ne changent pas de catégorie, rétablir le statut MCB3 en chronologie, vérifier la fraîcheur des sept familles ; ces corrections sont d'observabilité, pas une stratégie de rendement.

**Décision de méthode conservée :** aucune optimisation opportuniste sur les trades du jour ; poursuivre les deux PAPER sans changements, comparer les mêmes mouvements, préparer des shadows analytiques indépendants avant toute future autorité.
