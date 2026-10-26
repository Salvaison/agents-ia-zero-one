# BOONO Systems — Audit causal des 43 premiers trades V5, sorties, changements de camp et Execution Lab

**Audit établi le 26 octobre 2026 vers 08h05–08h15 CET, Amsterdam.** Concept et critères de marché définis par le propriétaire BOONO Systems ; diagnostic/réconciliation des sources par IA. **Aucune modification des décisions, des ordres ou des stops actifs.**

## Périmètre, preuve et précautions

- **43 trades V5 clôturés à l'ouverture de l'audit**, du 24 octobre 14h38 CEST au 26 octobre 07h30 CET, sur environ 41,9 heures de temps réel. **39 entrées dans les dernières 24 heures**, pas 43. Le #44 LONG était ouvert vers 08h00 CET à l'ouverture de l'audit. Le ledger étant actif, les chiffres ci-dessous sont figés à ce relevé et ne désignent pas nécessairement les compteurs actuels.
- Réalité serveur : `data/v52-paper-state.json` historique individuel des entrées/versions/PNL/MFE/MAE, `data/v52-paper-trades.ndjson` et événements, `data/audit-history.json` environ 30 secondes par observation, `data/elastic-observer-events.ndjson` (observedAt MCB3/15) ; couche politique `modules/v5/paper-v52.js`, `modules/v5/decision-v53.js`, `modules/v5/decision-v531.js`, `modules/v5/decision-v532.js`, `modules/v5/decision-v533.js`.
- L'Audit roulant disponible démarre **25 octobre 07h46 CET** : les quatre premiers trades V5 ne sont pas couverts par les analyses de prix **après sortie** ; ne jamais inventer ces observations.
- Les extrema après sortie sont des maxima/minima des **échantillons Audit toutes les 30 secondes**, non des plus hauts/bas tick par tick. Ils sont des plafonds rétrospectifs de possibilités, jamais des fills réalisables ou des prévisions.
- Les phases `MCB15_CONTESTED` et `MCB15_OFFENSIVE_...` à l'entrée viennent des états enregistrés dans les trades. La mémoire structurelle E15→E15 diffère de l'offensive courante : une divergence avec la mémoire ne signifie pas automatiquement un contre-courant.
- Le compte utilise des ordres PAPER à 0 USD. Les frais aller-retour simulés sont environ 0,1% du notionnel (~1,50 USD sur 1 500 USD). Prix d'exécution original idéal au dernier tick BTC-USDT-SWAP ; slippage réel et funding non modélisés.

## 1. Performance et cohorte

| Mesure | V5 : 43 clôtures, toutes versions |
|---|---:|
| Gagnants / perdants | **18 / 25 (41,86% de réussite)** |
| Net cumulé | **−55,5622 USD** |
| Equity PAPER | **944,4378 USD** |
| Frais des 43 clôtures | **64,5023 USD** |
| Brut avant frais | **+8,9401 USD** |
| Taille moyenne trade | 1 500 USD notionnel |
| Durée médiane trade | 13,2 minutes |
| Gagnant moyen net / perdant moyen net | +0,920 USD / −2,885 USD |

Pour les 39 entrées des dernières 24h : 16 gagnants, net **−54,7224 USD**, frais **58,4997 USD**, brut **+3,7773 USD**. Les frais sont un obstacle économique majeur, mais les pertes d'admission et de sortie comptent également. Un gain brut légèrement positif ne rend pas cette stratégie rentable en pratique.

Versions V5 : V5.2 (3 trades, −2,64 USD), V5.2.2 (4, −6,23 USD), V5.3 (4, −7,53 USD), V5.3.1 (3, −5,34 USD), V5.3.2 (1, +1,84 USD), V5.3.3 (28, −35,67 USD). Ce mélange empêche d'attribuer tous les résultats à la constitution V5.3.3.

Comparateur V4.9.3 : **11 nouvelles entrées sur les mêmes dernières 24h**, 3 gagnants, net **−27,3766 USD**, frais ~16,49 USD. V4 trade moins, mais perd lui aussi. Ne pas confondre fréquence inférieure et qualité structurelle démontrée.

## 2. Phases de marché reconstituées à partir de MCB15

| Période CET | Lecture prix et MCB15 | Trades V5 entrés, net |
|---|---|---:|
| 25/10 08h–12h | Après E15 UP de 08h15, E15 DN confirmé 09h30, dégradation 15m vers LBW −67, creux BTC 80 050 | #5–8 : **−11,45 USD** |
| 25/10 12h–19h | Reprises 15m, cross15 et E15 UP/DN alternés, hausse jusqu'à 80 919 ; oscillateur approchant le haut | #9–17 : **−11,93 USD** |
| 25/10 19h–23h | E15 DN confirmé à 19h00 ; repli de ~80 740 vers 80 232 (puis 80 157) ; structure de campagne SHORT | #18–21 : **−0,22 USD** |
| 25/10 23h–26/10 04h | Rebonds violents mais forte continuation vendeuse vers 79 340 puis 79 422 ; nombreuses tentatives de polarité | #22–33 : **−17,69 USD** |
| 26/10 04h–07h | Creux 79 323 puis récupération vers 80 268 ; E15 UP confirmé 04h01 puis 05h15 ; longs précoces et tardifs | #34–42 : **−13,61 USD** |
| 26/10 07h–08h | Cross15 DN 07h15 puis E15 DN confirmé 07h30 | #43 : **+0,16 USD** |

Les six blocs totalisent les 39 trades du dernier jour. La partie 23h–07h représente **−31,29 USD** : c'est le cœur de la dégradation, alors même que le marché offre de grands déplacements dans les deux sens.

Durant 25/10 08h–26/10 08h, Elastic enregistre **65 événements BW/LBWcross15**, ainsi que **22 E15 confirmés** (11 UP, 11 DN). Les croisements intra-bougie et les confirmations E15 ne sont pas une série un-à-un. Cette fréquence rend dangereuse toute lecture de chaque cross15 opposé comme un retournement stratégique démontré.

## 3. Contre-courant, mémoire et polarité

- **5 admissions réellement opposées à l'offensive 15m connue** : #16 SHORT, #22 LONG, #26 LONG, #27 LONG, #32 LONG. Deux gagnants, trois perdants, PNL combiné **−6,47 USD**.
- **17 opérations en phase `MCB15_CONTESTED`** : six gagnants, total **−27,97 USD**. Statut de transition fréquent et non synonyme d'opposition.
- **16 admissions contre l'ancienne trajectoire E15→E15 mémorisée** : net **−20,12 USD**. Cette statistique ne justifie **aucun veto par mémoire seule** : #25 SHORT, #30/#31 SHORT, etc., ont suivi une nouvelle offensive productive avant que la mémoire du pivot ait tourné.
- **8 inversions de direction en moins de 5 minutes après sortie**, 10 en moins de 10 minutes. Séquences critiques : #8→9 (25s, −6,38 cumulés), #16→17 (~3s, −4,32), #24→25→26 (−4,09), #36→37→38 (−6,43). Les chiffres de séquence sont la somme des PNL nets enregistrés.
- **Exception à ne pas éliminer** : #22 LONG contre 15m SHORT mais E3 bas (~−83,4) et attaque productive, gagné +1,64. Interdire toutes les respirations tactiques contre MCB15 serait une erreur ; il faut distinguer scalp de respiration et nouveau retournement stratégique.

## 4. Pourquoi BOONO sort actuellement

| Sortie code | Nombre | Gagnants | PNL net |
|---|---:|---:|---:|
| `GAIN_FLOOR_120_90_OR_220_180` | **20** | 18 | **+16,30 USD** |
| `DEFENDED_PRICE_LEVEL_LOST_WITH_OPPOSING_CONVERSION` | 11 | 0 | **−34,64 USD** |
| `STRUCTURAL_LEVEL_LOST_WITH_OPPOSING_CONVERSION` (ancien) | 2 | 0 | **−8,21 USD** |
| `MCB15_OFFENSIVE_REVERSAL_AND_MF_PRICE_OPPOSE` | **8** | 0 | **−24,62 USD** |
| `INVALIDATION_STRUCTURELLE` (anciennes versions) | 2 | 0 | −4,39 USD |

Soit 20 sorties de floor à +16,30 USD, contre **23 sorties sur invalidation à −71,87 USD**. L'EXIT_RISK dur de −500 USD déplacement BTC n'apparaît pas parmi les sorties. Les 18 vrais gagnants viennent tous des floors, dont les ticks d'exécution peuvent parfois passer sous le niveau initial 90 USD, transformant un floor théoriquement gagnant en PNL net nul ou légèrement négatif.

**Cause technique n°1 : le plancher de gain ne connaît pas la phase MCB15.** Dès qu'une position atteint MFE +120 USD BTC, le ledger fixe un floor +90 ; si MFE +220, floor +180. Dès que le prix observé revient sous ce floor, il clôture, même si E15 est aligné et MF15 récupère. Ce choix est une protection d'urgence validée, mais peut fragmenter une même campagne.

**Cause technique n°2 : le niveau de protection 3m est parfois traité comme une invalidation de campagne.** La fonction `evidenceAgainstPosition` déclenche `persistent` lorsque le prix reste de l'autre côté du stop sur au moins deux relevés Audit espacés de 25 s et que PM3/PM5 sont adverses, ou lorsque le niveau est fortement dépassé avec PM3/PM5 opposés. Elle ne vérifie pas nécessairement que MCB15 a changé de camp, ni que PM Live plus récent confirme encore le camp adverse.

**Cause technique n°3 : une offensive MCB15 adverse Live peut provoquer EXIT sans E15 contraire confirmé.** V5.3 calcule `actualFailure` sur `posture.liveDirection` opposée, PM3/PM5 opposés et pente MF15 défavorable. Une seule traversée BW/LBW15 pendant une forte volatilité peut remplir les conditions puis se retourner rapidement, sans être une preuve de retournement durable. Il ne faut pas attendre E15 confirmé dans tous les cas, mais il faut distinguer `WARNING`, `PROTECT` et `EXIT` par les épreuves du prix et la persistance réelle.

## 5. Exemples décisifs — séquence, cause et suite

### #20 SHORT, 22h17–22h29 : stop tactique face à une campagne MCB15 encore vendeuse

Entrée 80 434,8 ; sortie 80 476,6 ; **−2,28 USD net**. Stop fixé au swing haut confirmé 3m **80 476,6**. À la sortie, BW/LBW15 = −2,0 (vendeur), MF15 ≈−1,2 et pente 10m ≈−0,4, **PM Live Bâton −8,4 USD vendeur**. Le moteur applique pourtant `DEFENDED_PRICE_LEVEL_LOST_WITH_OPPOSING_CONVERSION`, sur le swing 3m et les fenêtres PM3/5 retardées.

Le prix est redescendu de **~72 USD BTC en 4 minutes**, avant la réentrée SHORT #21, puis jusqu'à **305 USD BTC supplémentaires sous le prix de sortie** dans les 30 min, avec seulement ~11 USD de recul adverse dans cette fenêtre. Fort candidat à une fausse invalidation stratégique plutôt qu'un vrai retournement MCB15.

### #29 SHORT, 02h07–02h25 : exit sur polarité Live opposée fugitivement

Entrée 79 948,5 ; sortie 80 169,7 ; **−5,65 USD net**. L'E15 **SHORT** avait été confirmé vers 02h15. Le BW/LBWcross15 UP est observé vers **02h24min41s** ; à la sortie ~02h25 l'écart LBW15−BW15 est +3,0, mais MF15 reste à −5,1 et le dernier PM Live Bâton est vendeur (−19,5 USD BTC). Aucun E15 UP confirmé ne valide cette reprise dans cette fenêtre.

Dès 02h28–02h30, l'écart 15m redevient vendeur, MF15 se dégrade et le prix repart à la baisse. Prix jusqu'à **~770 USD BTC plus bas** au cours des 30 minutes suivantes, sans nouveau prix défavorable au SHORT de plus de 90 USD depuis la sortie sur les relevés Audit. Diagnostic prioritaire : exit sur cross15 provisoire et PM3/5 opposés, sans assez de mémoire de l'offensive E15 SHORT confirmée.

### #14 LONG, 16h33–17h25 : sortie prudente, PAS automatiquement incorrecte

Sortie **−2,99 USD** sur inversion MCB15/MF. Le prix reprend ensuite jusqu'à +290 USD BTC dans les 30 min avec faible retrait adverse. MAIS un E15 DN a bien été confirmé à **17h15**, avant la sortie. Ce cas exige une étude de requalification d'un nouveau LONG, pas une condamnation rétrospective de l'EXIT.

### #25 et #30 SHORT : conservation de la campagne vs floor de position

- #25 SHORT entré 80 407,7, MFE 567,6 USD BTC, sortie 80 239,9 (+167,8 USD BTC, net +1,63). Plus tard le prix retrace la respiration puis se déplace encore de +420 USD BTC vendeur après sortie, avec au maximum 49 USD adverse sur 30 min. Le #26 LONG contre MCB15 SHORT échoue (−2,93).
- #30 SHORT entré 79 936,5, MFE 136,1 USD BTC, sortie 79 849,9 (+86,6 USD BTC, net +0,13). MCB15 et MF15 restent vendeurs à la sortie ; une minute plus tard le prix baisse davantage, et le potentiel supplémentaire mesuré en 30 min atteint +450 USD BTC. Réentrée SHORT #31 après 4 min, gagnante mais frais supplémentaires.

### #38–41 LONG : bonne campagne, mal conservée

#38 LONG à 79 716,4, MFE +324,8 BTC et sortie +175,6 BTC (+1,80 USD net) ; à la sortie LBW15−BW15 ≈+20,4 et MF15 s'améliore fortement (≈+5,2 sur 10 min). La baisse temporaire de PM Live lors de la respiration ne réfute pas la campagne. Puis #39, #40 et #41 sont trois autres LONGs de la même séquence, aux gains petits/négatifs après frais.

Les quatre LONGs #38–41 rapportent ensemble **+1,70 USD net**, avec ~6,00 USD de frais. Calcul illustratif EX POST d'un seul ticket tenu de l'entrée #38 à la sortie #41, sans les floors : déplacement +488,5 USD BTC, net théorique ~**+7,69 USD**, maximum adverse depuis l'entrée initiale ~26,4 USD BTC. **Ce n'est pas un résultat réalisable avec la protection actuelle : le floor aurait probablement interrompu le ticket.** L'exemple montre ce qu'il faut tester dans un shadow de campagne.

### #42 LONG : entrée tardive plutôt que sortie « trop tôt »

Entrée 80 235,9 après un cross3 UP vers +54,7, MF15 seulement neutre (pente +0,1), puis MF15 vire défavorablement et l'écart BW/LBW15 se réduit. Sortie sur niveau perdu, **−3,39 USD net**. Le prix continue ensuite à baisser. Comparer au LONG #38 entré plus tôt sur E3 vers −52,3 (+1,80 USD net), avec MF3/MF15 véritablement en récupération et MCB15 en extension. **C'est le problème de localisation/maturité E3, pas seulement une question de MA acceptée.**

## 6. Viabilité après sortie — mesure à 30 minutes

Pour chaque trade dont les 30 minutes suivant la sortie sont présentes dans l'Audit, mesurer (a) le meilleur déplacement dans l'ancien sens, (b) le pire déplacement contre l'ancien sens, (c) la chronologie du premier +90 USD BTC favorable / −90 adverse. Les valeurs sont relatives au prix de sortie.

- Floors : **18/20 suffisamment suivis**. 10/18 atteignent au moins +90 USD de continuation en 30 min ; **9/18** y parviennent avant un déplacement adverse −90. Mais 7/18 connaissent d'abord un choc adverse de −90. Seules **5/18** connaissent à la fois au moins +90 USD favorable ET moins de 90 USD adverse durant l'intégralité des 30 min : #25, #30, #34, #38, #39.
- Sorties sur niveau MCB3 (11 nouvelles) : #9, #13, #20 et #23 présentent dans les 30 min un mouvement de continuation ≥+90 USD BTC sans excursion adverse de −90 depuis le prix de sortie. Cette observation doit être filtrée par la validité causale et la réaction réelle aux niveaux, pas transformée en « toujours ignorer le stop ».
- Sorties sur inversion MCB15/MF (8) : #14, #16, #29 satisfont le même test a posteriori. Le #14 disposait pourtant d'un E15 DN confirmé avant son EXIT et le #16 était un SHORT **contre** un 15m offensif LONG : ne pas qualifier automatiquement toutes ces sorties d'erreurs.
- Sur les quatre premiers trades historiques (#1–4), **pas d'Audit post-sortie conservé** : données insuffisantes.

### Comparaisons illustratives de campagnes (pas des backtests de stratégie viable)

| Campagne | Réalisé par entrées/sorties multiples | Ticket unique tenu du premier prix au dernier prix, sans les stops actuels |
|---|---:|---:|
| #18–21 SHORT, 19h00–22h51 | −0,22 USD net, ~6 USD de frais | +6,40 USD net théorique ; MAE vs première entrée ~37 USD BTC |
| #30–31 SHORT, 02h30–02h46 | +1,60 USD net, ~3 USD de frais | +7,03 USD net théorique ; MAE ~44 USD BTC |
| #38–41 LONG, 05h03–06h26 | +1,70 USD net, ~6 USD de frais | +7,69 USD net théorique ; MAE ~26 USD BTC |

Le ticket unique suppose en particulier qu'une autre constitution de floors autorise la survie des respirations ; il ne peut pas servir à prétendre à un PNL réellement capturable sans rejouer les phases et stops successifs.

## 7. MF, phases, MA et sélection d'entrée

- Classification `REINFORCING` présente pour 21 trades (11 gagnants), PNL total **−20,27 USD** : la cohérence MF est nécessaire pour l'effort, mais ne suffit pas à rendre le **timing et le lieu** exploitables.
- `TACTICAL_LEADING` pour 7 trades : seulement un gagnant, PNL **−15,57 USD**. Hypothèse à tester : lorsque MF3 progresse sans soutien réel de MF15, il faut une meilleure démonstration d'acceptation du prix avant d'exposer une campagne, surtout dans les phases contestées. Ce n'est pas une preuve statistique sur 7 cas.
- MA3 `ACCEPTED` à l'entrée pour 15 trades : 5 gagnants, PNL **−22,05 USD**. Une MA franchie et tenue n'est ni une garantie de continuation ni un signal d'entrée autonome. Son intérêt est dans la mémoire des rejets, retests, conservation du terrain et localisation dans MCB15.
- Les entrées LONG sur cross3 UP déjà très positif (≥+40) : 6 opérations et PNL **−3,81 USD**, dont #39/#40/#41/#42 dans la fin de reprise, alors que #38 (cross3 UP vers −52) a bénéficié de la reprise plus tôt. Nécessité de requalifier la maturité **par sa position LBW3 dans le cycle et par MF15**, non par simple synchronisation.

## 8. Execution Lab public X-Perp : conclusions et biais

Snapshot du lancement le 25/10 14h50 CET au 26/10 ~08h05 CET.

- **32 signaux PAPER** suivis, dont 31 campagnes clôturées. Le labo ne reconstruit pas rétroactivement les onze opérations antérieures.
- B taker IOC estimé : **30/32 entrées FULL** ; deux entrées PARTIAL. 29/31 full à l'entrée parmi les clôturées ; 25/31 avaient entrée et sortie B entièrement remplies.
- C déclenchement prix + IOC : 20 déclenchements ; 14 entrées FULL, 6 PARTIAL ; 5 annulations sur offensive MCB15 opposée, 5 sur déplacement adverse, 2 expirations 60s. Parmi les clôturées, 13 entrées C FULL et 12 sorties C FULL.
- **11 campagnes intégralement comparables A/B/C**, PNL net cumulé : A −23,1379 USD, B −22,1353 USD, C −24,5635 USD. Delta B vs A +1,0026 USD ; C vs B −2,4282 USD. Ces comparaisons ne démontrent pas de gain d'exécution pur parce que A utilise BTC-USDT-SWAP, B/C le BTC X-Perp, avec évolution du basis et délais d'observation.
- Spread médian observé **~0,10 USD BTC**, délai signal→observation labo médian **~888 ms**. B remplit généralement au meilleur prix disponible ; la limite de 2–8 USD ne signifie pas payer cette marge en moyenne.
- Le filtre C évite certaines pertes (#16, #20, #26, #29, #32, #41) mais manque aussi des gains (#18, #21, #22, #27, #31, #38). Sur les 11 campagnes à taille et remplissage comparables, C fait légèrement moins bien. Les résultats globaux de C, incluant les fills partiels ou non-trades, ne sont pas comparables directement aux PNL du plein notionnel A/B.
- Conclusion : le carnet et l'IOC immédiat B sont réalisables **en simulation top-5**, mais **ne corrigent ni admissions tardives, ni churning, ni sorties trop rapides**. Aucun ordre réel n'a été envoyé. Frais taker X-Perp de compte réel non vérifiés.

## 9. Recommandations de recherche, AUCUNE modification active autorisée par cet audit

**Priorité A — Machine de campagne et sortie (shadow isolé, pas refonte)**
- Séparer `THESIS_ACTIVE`, `POSITION_OPEN`, `FLAT_AFTER_PROTECTION` et `NEW_EVIDENCE_FOR_REENTRY`. Une sortie de position ne doit pas effacer la thèse MCB ni inventer une thèse opposée.
- Comparer shadow 1 « actuel 120/90 et 220/180 », shadow 2 « sécurisation partielle puis trailing fondé sur structure MA/MCB15, sans sortir tout le ticket sur respiration E3 », shadow 3 « EXIT adverse 15m/PM avec preuve price acceptance ». Les pourcentages de prise partielle et les nouvelles limites sont **hypothèses** ; conserver les protections du PAPER actif.
- Évaluer pour chaque trade : PNL net économique après frais, MFE capturé, adverse excursion, temps de survie, fausses sorties, réentrées obligatoires, pertes catastrophiques évitées et taux d'annulation.

**Priorité B — Réduire les invalidations 3m fausses**
- `DEFENDED_PRICE_LEVEL_LOST` doit distinguer une atteinte d'un swing3 tactique d'une perte démontrée de territoire. Appliquer la mémoire des épisodes MA3/MA15 et le changement réel de camp MCB15 ; vérifier **PM Live récent, efficiency et MF15**, et pas uniquement PM3/PM5 recouvrants avant de conclure à la persistance adverse.
- Tests essentiels : #20 (maintien SHORT tant que MCB15 et MF15 vendeurs), #9 (requalification LONG sans churn), #35/#36 (protection utile pendant le vrai repli), #42 (ne pas tenir un LONG tardif avec terrain effectivement perdu).

**Priorité C — Hiérarchie des polarités, séparée entre EXIT et nouvel ENTER**
- Une offensive 15m BW/LBW opposée en Live déclenche d'abord `WARNING` et peut déclencher `PROTECT` ; EXIT si le prix abandonne réellement un territoire ou si PM/MF adverses se renforcent de manière causale. E15 natif confirmé peut renforcer la conclusion sans être systématiquement obligatoire pour agir.
- Après un EXIT, le SHORT/LONG opposé a besoin de sa propre chaîne (nouvel E3/cross, E15 Live cohérent, MF, conversion productive, lieu et risque), pas un simple `EXIT` transformé en `ENTER_OPPOSITE`. Pas de cooldown temporel arbitraire.
- Préserver les respirations E3 extrêmes réellement exploitables (#22) tout en rejetant les achats tardifs contre 15m (#26, #32) et l'attaque inverse trop précoce (#16).
- Tests : #28/#29 en micro-volatilité, #37 puis #38 en vrai retournement, #25 puis #26 en fausse conversion en LONG.

**Priorité D — Économie et taker**
- Conserver B IOC immédiatement en shadow et le comparer à la cotation **du même instrument** ; contrôler les frais et le spread X-Perp par catégorie de taille et la latence. Ne pas déclarer B rentable sur les deltas A/B de deux instruments.
- Recalibrer C uniquement en shadow : déclenchement basé sur renouvellement de la chaîne MCB/PM/MF et réépreuve du prix, pas seulement un déplacement mécanique de 3–8 USD qui peut arriver dans une dernière impulsion ou après que la fenêtre s'est éteinte.
- Priorité à réduire les pertes et la multiplication des frais, pas à multiplier le nombre d'entrées.

**Gouvernance :** les versions PAPER V5.3.3 et V4.9.3, le moteur protégé V4.10.10, l'Execution Lab et BOONO-TV sont intacts à la fin de l'audit. Les résultats exposés sont descriptifs et rétroactifs ; aucun gain prospectif n'est démontré.

## Annexe — 43 opérations figées

Codes : **O** offensive MCB15 courante, **M** dernière trajectoire mémorisée, **!** entrée contre l’offensive courante. `Après30` = meilleur mouvement favorable / pire mouvement adverse en USD BTC depuis la sortie et sur les relevés Audit disponibles (ce ne sont pas des fills).

| # | Entrée CET | Sens | O / M | Cross E3 (LBW) | Sortie (cause) | MFE / MAE BTC$ | PNL net $ | Après30 favor. / advers. BTC$ |
|---:|---|:---:|:---:|---:|---|---:|---:|---:|
| 1 | 24/10 14:38 | LONG | —/L | +67.0 | ancienne invalidation | 0.0 / 33.5 | -2.12 | — |
| 2 | 24/10 17:33 | LONG | —/S | -88.2 | Gain floor | 332.1 / 148.7 | +1.75 | — |
| 3 | 24/10 18:47 | LONG | —/L | -7.6 | ancienne invalidation | 0.7 / 41.0 | -2.27 | — |
| 4 | 24/10 20:10 | LONG | —/L | +48.1 | Gain floor | 294.3 / 75.7 | +1.80 | — |
| 5 | 25/10 08:41 | LONG | —/L | +23.7 | ancien niveau | 10.3 / 104.7 | -3.38 | +20.7 / -226.9 |
| 6 | 25/10 09:42 | LONG | —/L | -73.0 | ancien niveau | 5.0 / 179.0 | -4.84 | -38.1 / -229.8 |
| 7 | 25/10 10:25 | LONG | —/L | -82.0 | Gain floor | 169.7 / 80.3 | +0.17 | +11.2 / -131.3 |
| 8 | 25/10 11:46 | SHORT | S/L | -23.2 | 3m niveau perdu | 4.5 / 101.9 | -3.41 | +16.0 / -161.5 |
| 9 | 25/10 12:00 | LONG | L/L | -53.5 | 3m niveau perdu | 26.0 / 79.1 | -2.98 | +161.1 / -16.4 |
| 10 | 25/10 12:11 | LONG | L/L | +0.1 | Gain floor | 220.0 / 24.7 | +1.78 | +96.1 / -96.0 |
| 11 | 25/10 13:25 | SHORT | S/L | +74.2 | 3m niveau perdu | 0.0 / 76.1 | -2.92 | +22.4 / -60.7 |
| 12 | 25/10 14:04 | SHORT | S/S | +5.5 | Gain floor | 165.9 / 49.9 | -0.01 | +18.4 / -121.5 |
| 13 | 25/10 15:00 | SHORT | S/S | -6.6 | 3m niveau perdu | 31.4 / 59.7 | -2.34 | +93.5 / -41.2 |
| 14 | 25/10 16:33 | LONG | L/L | +12.4 | MCB15/MF inverse | 75.1 / 84.7 | -2.99 | +289.8 / -24.5 |
| 15 | 25/10 17:51 | LONG | L/S | -17.4 | Gain floor | 296.4 / 0.0 | +1.84 | +10.2 / -95.4 |
| 16 | 25/10 18:28 | SHORT | L/S ! | +55.1 | MCB15/MF inverse | 3.7 / 74.4 | -2.70 | +129.8 / -48.1 |
| 17 | 25/10 18:44 | LONG | L/S | +8.3 | MCB15/MF inverse | 22.7 / 15.1 | -1.61 | +53.9 / -124.0 |
| 18 | 25/10 19:00 | SHORT | S/S | +23.5 | Gain floor | 230.6 / 49.2 | +1.75 | +45.5 / -29.5 |
| 19 | 25/10 20:54 | SHORT | S/S | -18.2 | Gain floor | 141.9 / 53.7 | +0.15 | +83.3 / -41.5 |
| 20 | 25/10 22:17 | SHORT | —/S | -31.0 | 3m niveau perdu | 66.2 / 56.7 | -2.28 | +305.4 / -11.4 |
| 21 | 25/10 22:33 | SHORT | S/S | -44.0 | Gain floor | 140.6 / 46.7 | +0.17 | +143.5 / -345.1 |
| 22 | 25/10 23:01 | LONG | S/S ! | -83.4 | Gain floor | 224.2 / 0.0 | +1.64 | +185.1 / -94.5 |
| 23 | 25/10 23:18 | LONG | L/S | -6.1 | 3m niveau perdu | 15.5 / 104.8 | -3.33 | +108.4 / -49.0 |
| 24 | 25/10 23:27 | LONG | L/S | +4.9 | 3m niveau perdu | 70.7 / 81.3 | -2.79 | +10.5 / -539.9 |
| 25 | 26/10 00:03 | SHORT | S/L | +21.8 | Gain floor | 567.6 / 22.5 | +1.63 | +419.8 / -48.9 |
| 26 | 26/10 00:39 | LONG | S/L ! | -89.2 | 3m niveau perdu | 0.0 / 76.5 | -2.93 | -28.1 / -395.0 |
| 27 | 26/10 00:59 | LONG | S/L ! | -69.2 | Gain floor | 143.8 / 154.2 | +0.17 | +116.8 / -302.7 |
| 28 | 26/10 01:47 | SHORT | S/L | +40.1 | MCB15/MF inverse | 87.2 / 160.9 | -4.52 | +224.9 / -100.9 |
| 29 | 26/10 02:07 | SHORT | S/L | -9.3 | MCB15/MF inverse | 73.5 / 262.0 | -5.65 | +769.8 / +10.7 |
| 30 | 26/10 02:30 | SHORT | S/L | -23.4 | Gain floor | 136.1 / 49.9 | +0.13 | +450.0 / -80.0 |
| 31 | 26/10 02:42 | SHORT | S/L | -23.4 | Gain floor | 284.0 / 39.0 | +1.48 | -18.2 / -447.8 |
| 32 | 26/10 02:55 | LONG | S/L ! | -71.7 | MCB15/MF inverse | 34.0 / 110.4 | -2.64 | +240.6 / -170.2 |
| 33 | 26/10 03:33 | SHORT | S/L | +0.6 | MCB15/MF inverse | 87.6 / 106.8 | -0.86 | +24.1 / -267.9 |
| 34 | 26/10 04:01 | LONG | L/L | -48.6 | Gain floor | 140.4 / 0.0 | +0.02 | +119.6 / -62.5 |
| 35 | 26/10 04:22 | LONG | L/L | +22.9 | 3m niveau perdu | 54.0 / 151.4 | -3.71 | +129.4 / -212.3 |
| 36 | 26/10 04:39 | LONG | L/L | +0.7 | 3m niveau perdu | 59.8 / 163.4 | -4.58 | +513.3 / -124.0 |
| 37 | 26/10 04:50 | SHORT | —/L | +2.1 | MCB15/MF inverse | 72.5 / 160.2 | -3.65 | -44.8 / -460.1 |
| 38 | 26/10 05:03 | LONG | L/L | -52.3 | Gain floor | 324.8 / 30.6 | +1.80 | +167.8 / -54.3 |
| 39 | 26/10 05:30 | LONG | L/L | +43.9 | Gain floor | 167.8 / 0.0 | +0.04 | +176.6 / -58.0 |
| 40 | 26/10 05:52 | LONG | L/L | +43.6 | Gain floor | 136.8 / 26.2 | +0.10 | +122.3 / -91.1 |
| 41 | 26/10 06:13 | LONG | L/L | +51.3 | Gain floor | 127.9 / 84.9 | -0.25 | +36.3 / -101.2 |
| 42 | 26/10 06:59 | LONG | L/L | +54.7 | 3m niveau perdu | 35.3 / 113.5 | -3.39 | +22.1 / -193.5 |
| 43 | 26/10 07:23 | SHORT | S/L | -16.9 | Gain floor | 134.8 / 0.0 | +0.16 | +47.7 / -163.6 |

**Contre l’offensive courante (critère explicite et non déduit de l’ancienne mémoire) : #16, #22, #26, #27, #32.**

Toute continuation post-sortie est une observation rétrospective du marché ; elle ne dit pas si le stop, la MA, la conversion et les frais auraient autorisé un maintien réel. Les trade IDs et PNL de cette annexe sont figés à 43 clôtures ; les nouveaux trades qui suivent ne modifient pas cette archive.
