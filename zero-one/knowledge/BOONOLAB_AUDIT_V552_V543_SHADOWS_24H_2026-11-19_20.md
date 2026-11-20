# BOONOLAB — Audit des 24 dernières heures V552, V543 et SHADOWS
**Période figée : 19 novembre 2026, 10h49m28s → 20 novembre 2026, 10h49m28s CET.**

**Statut : ANALYSE EN LECTURE SEULE.** Aucun changement de politique, ledger PAPER, processus, Watch ou BOONO-TV.

## Mandat et sources exactes

L'utilisateur constate une nouvelle série de pertes, des entrées incessantes et une faible autorité des premières inflexions LBW15 Live et Cross15 Live ; il souhaite vérifier les 24h de trades et les SHADOWS, confronter les seuils réels et identifier des conditions de marché à exclure **sans brider le moteur ni fermer mécaniquement les campagnes existantes**.

Les données ont été rouvertes sur Amsterdam : data/v552-paper-state.json, data/v52-paper-state.json, data/v552-paper-decisions.ndjson, data/audit-history.json, ../data/mcb-live/mcb_15m.csv, data/boonolab-ticker4x15-samples.ndjson, data/boonolab-market-snapshots.ndjson, data/v543-campaign-hold-shadow-events.ndjson, data/v543-campaign-hold-shadow-summary.json, data/boonolab-place-e1e4-shadow-summary.json ; règles modules/v552/decision.js, paper.js, vigilance.js et market-quality.js. Le ticker autonome historique a fourni une classification avant l'entrée de chaque trade. La série autonome market-snapshots n'est complète que depuis le 20 novembre vers 05h50 CET et **ne peut être présentée comme couverture 24h**. Les anciens shadows S1/mcb3-first sont stoppés depuis le 18 novembre ; ne pas les présenter comme actifs sur cette période.

## Résultats nets PAPER du même intervalle

| Mesure | V552 | V543 |
|---|---:|---:|
| Clôtures | **16** (#12–27) | **11** (#289–299) |
| Gagnants | **4** | **2** |
| Brut | −41,5749 $ | −39,2233 $ |
| Frais | 23,9959 $ | 16,5183 $ |
| **Net réalisé sur les clôtures** | **−65,5710 $** | **−55,7419 $** |
| Exposition sur 24h (y compris positions encore ouvertes) | **77,0 % / 18,48h** | **43,4 % / 10,41h** |
| Durée moyenne des clôtures | 68,5 min | 61,3 min |

**Distinction de versions :** parmi les clôtures V552, trois portent entryPolicyVersion v1 (−12,294 $), une v1.1 (−6,207 $), **12 la politique v1.2 (4 gains, net −47,070 $)**. L'analyse des 24h chevauche donc les mises à jour. Au terme de la coupe, V552 #28 était SHORT ouvert depuis 10h05 ; V543 #300 SHORT ouvert depuis 09h45, exclus des résultats nets clôturés.

| # V552 | Direction | Heure d'entrée → clôture CET | Résultat net | Raison |
|---|---|---|---:|---|
| 12 | LONG | 19/11 10h18 → 11h30 | −1,47 $ | Cross15 confirmé |
| 13 | SHORT | 11h31 → 12h45 | −5,29 $ | Cross15 confirmé |
| 14 | LONG | 12h45 → 13h15 | −5,54 $ | Cross15 confirmé |
| 15 | SHORT | 13h16 → 15h00 | −6,21 $ | Cross15 confirmé |
| 16 | LONG | 18h25 → 20h15 | −5,60 $ | Cross15 confirmé |
| 17 | SHORT | 20h32 → 21h50 | +7,71 $ | Protection structurelle Live |
| 18 | SHORT | 21h57 → 22h00 | −1,98 $ | Cross15 confirmé |
| 19 | LONG | 22h45 → 00h39 | +0,23 $ | Protection structurelle Live |
| 20 | LONG | 20/11 00h42 → 00h45 | +1,75 $ | Cross15 confirmé |
| 21 | LONG | 01h15 → 02h53 | **−13,89 $** | Hard risk 500 $ BTC |
| 22 | SHORT | 02h53 → 03h56 | **−14,14 $** | Hard risk 500 $ BTC |
| 23 | LONG | 03h57 → 05h15 | −7,03 $ | Cross15 confirmé |
| 24 | SHORT | 05h19 → 06h30 | +0,99 $ | Cross15 confirmé |
| 25 | LONG | 06h39 → 08h30 | −2,27 $ | Cross15 confirmé |
| 26 | SHORT | 08h32 → 09h15 | −8,40 $ | Cross15 confirmé |
| 27 | LONG | 09h21 → 10h00 | −4,44 $ | Cross15 confirmé |

**Cas extrême :** #21 sort à 02h53m38s et #22 ouvre SHORT 5 secondes plus tard ; #22 ressort sur hard risk à 03h56m58s puis #23 ouvre LONG 5 secondes plus tard. #21/#22 = **−28,03 $ nets**, #21/#22/#23 environ **−35,06 $**. Le moteur inverse la direction avant que la qualité économique de la nouvelle offensive soit réellement établie.

## 1. Ce que montrent vraiment les SHADOWS de marché

Sur chaque entrée V552, classification du ticker 4×15 **AS-OF** (dernier relevé antérieur à l'entrée, âge inférieur à 90s) :

| Régime observé à l'entrée | Nombre | Gagnants | Net |
|---|---:|---:|---:|
| DENSE_CONTRADICTOIRE | 8 | **0** | **−46,41 $** |
| STERILE_HESITANT | 4 | **0** | **−29,85 $** |
| SILENCIEUX_PRODUCTIF | 4 | **4** | **+10,68 $** |

Ces 16 transactions constituent un petit échantillon, non un essai prospectif ou une garantie. La classification à l'entrée **ne signifie pas** que rejeter les mauvais trades aurait laissé inchangées les entrées suivantes, le capital et les frais. Dans les 2 880 observations 4×15 de la période, 34,7 % sont STERILE_HESITANT et 33,7 % DENSE_CONTRADICTOIRE, soit **68,4 % dans ces régimes**. Les classes SILENCIEUX_PRODUCTIF (17,3 %) et DIRECTIONNEL_PRODUCTIF (14,3 %) occupent les autres 31,6 %.

V543 confirme la direction d'étude, avec un contre-exemple utile : 6 entrées en STERILE_HESITANT net −32,72 $ mais un petit gagnant +0,77 $ ; 4 en DENSE_CONTRADICTOIRE net −29,75 $ ; **SHORT #294 à 16h34 en DIRECTIONNEL_PRODUCTIF net +6,73 $**.

Ne jamais transformer les catégories horaires en veto rigide : **19/11 15h54**, régime encore DENSE_CONTRADICTOIRE MAIS ticker qualité POWERFUL vendeur, PM3 −244,5 $ BTC, effort 1,747×P75, rendement 1,272×P75 ; l'offensive de baisse naît alors et le régime devient DIRECTIONNEL_PRODUCTIF avant V543 #294. Un régulateur doit reconnaitre une **tendance émergente productive** sans attendre que l'étiquette une heure s'adapte.

Les services boono-ticker4x15-shadow, boono-market-regime-shadow et boono-e1e4-place-shadow sont **SHADOW_ONLY**, decisionImpact=false. L'E1/E4/Place shadow n'accorde aucune admission : entryAllowed=null / exitRequested=null. Le ticker n'entre pas actuellement comme condition dans V552.

Le shadow v543-campaign-hold teste **seulement les entrées V543** et ne doit pas être attribué à V552 : sur 11 matched trades, STRUCTURE_ONLY net −55,2206 $ contre V543 PAPER −55,7419 $ ; EARLY_INVALIDATION net −44,0566 $, soit amélioration de 11,6853 $ ; 7 sorties plus tôt. Cela atténue les pertes mais ne rend pas le modèle profitable, et ne teste pas les futures réentrées.

## 2. Les conditions de marché des 24h

Relevés Bâton ~30 secondes : **165 changements de polarité MCB3 Live, 51 Cross15 Live, 21 Cross15 clôturés**. Ce sont les bascules de signe observées, pas nécessairement autant d'événements natifs E3/E15 distincts.

Rapport descriptif path efficiency = valeur absolue de la variation nette / somme des variations absolues sur les relevés 30s ; comparatif entre périodes, non rendement économique P&L.

- **19/11 11–15h :** net BTC +173 $ sur chemin de prix 7 766 $, efficacité 2,2 %, **20 Cross15 Live**, 25 Cross3 Live, 3 Cross15 clôturés, majorité DENSE/STERILE. Net V552 des clôtures de ce bloc −12,29 $.
- **19/11 15–19h :** baisse nette −1 245 $ sur chemin 17 017 $, efficacité 7,3 %, flux médian Bâton ~103,8 BTC/min. V552 n'exploite pas correctement le retournement SHORT dès 15h54, bien que le ticker ait observé POWERFUL ; V543 #294 arrive plus tard et gagne.
- **20/11 01–04h :** net BTC **+162 $** sur chemin 12 917 $, efficacité 1,3 %, médiane ~62,3 BTC/min, 6 Cross15 Live/22 Cross3 Live, deux hard stops V552 #21/#22.
- **20/11 07–10h45 :** net BTC −235 $ sur chemin 10 290 $, efficacité 2,3 %, pertes V552 #25–27 ~−15,11 $.

**Ce n'est pas la simple volatilité qui est défavorable : c'est l'effort et le nombre de renversements tactiques sans prix conservé.** Un volume important peut coexister avec une translation productive ; il ne faut pas bannir l'intensité en elle-même.

## 3. Pourquoi Cross15 Live et pente LBW15 n'exercent pas leur autorité

Modules/v552/vigilance.js enregistre la première inflexion de LBW15 pente Live (WATCH_OPEN), observe Cross15 Live et MCB3, pente BW15, débit et PM. Mais modules/v552/decision.js n'autorise EXIT anticipé que si toutes ces conditions successives sont réunies :
1. MCB3 et Cross15 Live opposés avec éloignement et progression adverse du prix 3m ET du prix depuis le premier Cross15 Live, PM Live confirmant ;
2. La contre-offensive a déjà subi une respiration puis **reconquis un extrême** (protectiveTransfer=true) ;
3. La position a **encore un gain latent positif après frais**, restitution du MFE plus grande que le déplacement favorable encore détenu (economicGainAtRisk=true) ;
4. Le parent ne soutient plus entièrement la position.

Une **entrée ratée devenue perdante ne peut donc pratiquement pas sortir par cette protection économique** ; elle attend Cross15 clôturé ou hard risk.

Statistiques : **12/16 sorties V552 sur Cross15 confirmé 35–49 secondes après clôture 15m ; 2/16 protections Live ; 2/16 hard stops**. Exemples : #14 opposé Live à 13h00, sorti à 13h15 ; #16 à 20h00, sorti à 20h15 ; #23 à 05h05, sorti à 05h15 ; #26 SHORT à 09h04, sorti à 09h15. Il ne s'agit pas de recommander une liquidation immédiate de tous ces signaux.

**#21 LONG**, Cross15 DN Live 20/11 02h45m15s, MCB3 SHORT/PM adverse, décision loguée à 02h45m18s : HOLD CROSS15_LIVE_WATCH_COUNTER_NOT_YET_CONVINCING. Hard stop 02h53m38s à 61 550,1 $. Un **fill hypothétique non garanti** au prix Bâton 62 003,4 $ du premier Live aurait donné ~−2,94 $ nets au lieu de −13,89 $.

**#22 SHORT**, Cross15 UP Live 03h52m45s ; à 03h53m18s counterConvinces=true MAIS protectiveTransfer=false, donc HOLD. À 03h56m58s counterConvinces=true et protectiveTransfer=true, mais POSITION DÉJÀ PERDANTE donc economicGainAtRisk=false ; le décideur affichait encore HOLD et PAPER fermait sur hard risk. Fill hypothétique à 61 802,2 $ lors du premier Live : ~−7,78 $ nets, contre −14,14 $ réel. Ce n'est pas une simulation complète.

**Contre-exemples décisifs :** #20 LONG aurait perdu ~−0,92 $ si fermé au premier Live au lieu de gagner +1,75 $ ; #24 SHORT aurait perdu ~−2,91 $ au premier Live au lieu de gagner +0,99 $ réel. **Cross15 Live déclenche la vigilance, pas une sortie automatique.**

## 4. Pourquoi la réentrée est quasi automatique

Le décideur mémorise le dernier Cross3 Bâton pendant que la position est déjà ouverte et crée une nouvelle clé d'épisode à chaque changement de signe MCB3. Le ledger marque utilisée seulement la clé Cross3 qui a réellement servi à une admission : les épisodes non négociés pendant le trade peuvent devenir la première candidature une fois FLAT.

Le ledger enregistre lastExit mais ni la fonction d'admission ni le paper.step n'exigent de **réhabiliter économiquement la campagne après la perte** ou une nouvelle preuve de prix postérieure à la sortie. Au tick suivant (~5s), un Cross3 encore en mémoire peut donner une entrée opposée. Aucun hard-stop quarantine fonctionnel ni délai : deux reversals en 5 secondes après hard risk.

Épuisement de tactique : market-quality.js compare le déplacement BTC depuis Cross3 à la médiane des 15m ranges clôturés sur l'heure précédente, MAIS n'écarte cet épisode tardif que s'il n'y a **ni breakout des extrêmes 1h ni reprise après respiration**. Or dans une impulsion violente le breakout désactive cette sécurité. Exemples :
- #22 SHORT : **Cross3 déjà âgé de 31,5 minutes**, le prix avait **déjà parcouru 866 $ BTC** dans le sens du SHORT à l'admission après hard stop #21 ; résultat −14,14 $.
- #23 LONG : Cross3 âgé de 20,3 min, déjà +469 $ BTC dans son sens ; résultat −7,03 $.
- #26 SHORT : Cross3 âgé de 13,9 min, +336 $ BTC ; résultat −8,40 $.
- #28 SHORT (encore ouvert à la coupe) : Cross3 âgé de 26 min, +240 $ BTC.

**Défaut logique supplémentaire prouvé :** support = waveSupports && conversion && priceRetained && live3Aligned && marginalProgress ; uncertainProof = waveSupports && live3Aligned && marginalProgress && conversion && priceRetained. C'est la MÊME expression commutative. Donc dès que support=true, uncertainProof=true et la clause (!uncertain || uncertainProof) ne **réduit jamais les admissions** dans POLARITY_UNCERTAIN. Seul le filtre distinct marketDeferred peut bloquer, mais il n'est pas raccordé aux SHADOWS 4×15.

## 5. Seuils réellement présents (et absents)

- **HARD_RISK_BTC_USD=500** : 500 $ de variation défavorable du cours BTC, PAS 500 USD d'equity ; avec NOTIONAL=1500 et prix ~62 000 $, cela donne ~−12 $ brut puis frais.
- **TAKER=0.0005** = 0,05 % par côté, frais aller-retour ~1,50 $ sur 1500 $ nominal.
- **Fee break-even** : en polarité contestée, progrès dans le sens candidat depuis Cross15 > BTC price × 0,001, soit ~62 $ BTC pour couvrir deux frais ; ce minimum est parfois contraignant, parfois non appliqué lorsque entryPrudence=false. Ne prouve pas que le reste du mouvement est frais.
- **Flat BW15/LBW15** : deux pentes courtes en valeur absolue <= médianes glissantes de leurs variations 3m sur 4h ; statut POLARITY_UNCERTAIN existe, mais son second verrou est redondant et ne bloque aucune entrée à lui seul.
- **Cross3 exhaustion** : déplacement signé depuis Cross3 > médiane des bougies 15m récentes de l'heure précédente, hors retest/reprise/breakout ; trop facile à court-circuiter dans un marché à forts extrêmes.
- **Protection Live économique** : exige gain latent positif, restitution importante et reprise de contre-offensive ; ne protège pas la plupart des tentatives perdantes.
- **Gain-floor 120/90 en déplacement BTC** (ancien contrat discuté) : **AUCUNE protection floor indépendante de ce type en v1.2**. 12 trades sur 16 ont atteint MFE>=120$ BTC ; 8 de ces 12 finissent pourtant perdants. Cela justifie l'étude, PAS la promesse qu'un floor fixe aurait sauvé 8 trades.
- **MF15/MF3** : v1.2 descriptifs ; la future fonction d'arbitre secondaire en marché incertain est documentée mais NON active. Ne pas redonner un veto général sur signe MF.
- **Lieu/MA et volume** : surtout descriptifs dans V552 ; shadow E1/E4/place est observation-only, ne donne aucune permission.

## 6. Recommandation : réguler le marché, pas multiplier les moteurs

**Contrat de recherche recommandé, sans implémentation dans cette intervention :**

**A. Autorité MARKET_ADMISSION**, intégrée à l'unique V552 mais distincte du décideur tactique et de la gestion d'une position, avec états sémantiques ADMISSION_OUVERTE / QUALITÉ_CONTESTÉE / SUSPENSION_NOUVELLES_ENTRÉES. Mesurer sur 4×15 : cohérence MCB15 (pente Live LBW/BW, croisements persistants ou hachés, Cross3), efficacité volumique, réponse prix/PM, **territoire conservé après contre-attaques**, lieu extrême/milieu de range ; MF secondaire uniquement quand MCB/prix sont déjà indécis. Cet état ne se remet PAS à ADMISSION_OUVERTE au premier tick où la pente n'est plus plate. Pas de seuil horaire rigide ni de veto global DENSE/STERILE.

**B. Sortie de POSITION distincte.** LBW15 pente Live déclenche attention dès l'inflexion ; MCB3, PM Live, MF secondaire en incertitude, prix adverse et Cross15 Live doivent pouvoir conduire à une sortie locale lorsqu'une tentative échoue, même sans gain latent antérieur. Conserver les campagnes productives quand le Live opposé ne parvient pas à garder le prix (#20/#24) et le hard risk indépendant.

**C. Réadmission après sortie / hard stop.** Une clé Cross3 née pendant l'ancienne position est mémoire descriptive, NON une autorisation de reprendre 5 secondes après hard risk. Une nouvelle preuve de prix et de conversion **POSTÉRIEURE à l'invalidation** doit requalifier le setup. Pas de minuterie arbitraire : le marché peut se réouvrir immédiatement s'il prouve une reprise réellement productive.

**D. Exception cruciale de tendance émergente.** Le marché horaire peut toujours s'appeler DENSE au premier changement LBW15, alors que Cross3, PM Live et le prix commencent un transfert de force productif. La requalification doit pouvoir réouvrir l'admission en cours de quart d'heure, avant le retard de classification d'une heure ; exemple 19/11 15h54.

**E. Tests AVANT toute activation PAPER.** Rejouer 24h et les contre-exemples avec observations as-of ; comparer nombre d'entrées supprimées, bons trades conservés (#17/#19/#20/#24 et V543 #294), sortie anticipée sur #21/#22, faux signaux #20/#24, exposition et frais, périodes non exploitées, qualité de campagnes complètes après réentrées. Aucun gain futur inventé. La métrique 0/12 vs 4/4 est prometteuse mais trop petite pour constituer une garantie.

## Décision à ne pas confondre avec l'analyse

**LES DEUX PAPER ET TOUS LES SHADOWS RESTENT INCHANGÉS.** Rapport documente les résultats observés, bugs/autorités et recommandations de recherche ; ne constitue pas une nouvelle version V552 ni un mode de trading activé.
