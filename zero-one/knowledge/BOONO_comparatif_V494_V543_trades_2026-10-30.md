# BOONO Systems — V4.9.4 vs V5.4.3 : trades récents et shadows

**Enquête en lecture seule sur Amsterdam · 30 octobre 2026, capture à 07:55 UTC / 08:55 CET.** Aucun changement des moteurs PAPER. Tous les calculs lourds ont été faits sur Amsterdam, seuls les résultats sont archivés ici.

**Demande originale, littérale :** « analyse les derniers trades en comparant les perfs des 2 moteurs. Je vois que 494 reste plus performant que 543 (543 ou 541?) mais autant il produit des bons trades sur des mouvements complets qu'il en rate d'autre avec sortie tardive et gros déficit. 543 continue à fragmenter les campagnes, rentré et sortir sur gainfloor systhématiquement. Que fait le shadow de 543 à se sujet? »

## Périmètre

Runners PM2 : `boono-v494-paper` et `boono-v543-paper` en ligne, sans ordre financé. Tous les trades V5 #86–112 portent la politique d'entrée `v5.4.3-causal-offensive-maturity-paper-v1`. La logique de sortie structurelle V5.4.3 vient de V5.4.1 par V5.4.2.

**Fenêtre comparable de nouvelles entrées : 28 octobre 2026 11:33 UTC → 30 octobre 2026 ~07:55 UTC.** On ne somme que les positions clôturées ouvertes dans cette fenêtre ; les deux échantillons ne sont pas des paires indépendantes.

| Indicateur | V4.9.4 #37–49 | V5.4.3 #86–112 |
|---|---:|---:|
| Trades clôturés | 13 | 27 |
| P&L brut | +41,4318 $ | −5,6800 $ |
| Frais | 19,5051 $ | 40,5054 $ |
| **P&L net réalisé** | **+21,9270 $** | **−46,1854 $** |
| Gagnants nets | 6 | 15 |
| Pertes nettes inférieures à −3 $ | 5 | 8 |
| Durée moyenne | 49,0 min | 25,9 min |
| Durée médiane | 34,5 min | 20,3 min |

V4 doit +39,407 $ aux seuls #43 SHORT (+17,112 $) et #49 LONG (+22,295 $) ; ses onze autres clôtures totalisent −17,480 $. V5 : **19 gain-floors = +4,7626 $ net après 28,5061 $ de frais**, mais **8 autres sorties = −50,9480 $ net**. Aucun de ces huit échecs V5 n'avait eu un MFE ≥120 $ BTC : les floors n'avaient jamais été armés.

### Gain-floors V5

| Palier armé | Nombre | P&L net total | Part MFE réellement conservée, pondérée |
|---|---:|---:|---:|
| +120 → +90 $ BTC | 16 | +0,2442 $ | 55,1 % |
| +220 → +180 $ BTC | 3 | +4,5184 $ | 34,3 % |

Le 120/90 sauve principalement des débuts fragiles mais reste quasiment neutre économiquement après frais ; le 220/180 apporte l'essentiel du gain des floors de cette cohorte, sans capturer convenablement les grandes extensions. V5 #102 : MFE +862,3 $ BTC et seulement +179,4 $ BTC conservés (20,8 %) ; net +1,837 $. En comparaison V4 #49 : MFE +1 457,5 $ BTC et +1 218,2 $ BTC conservés (83,6 %) ; net +22,295 $. Différentes positions, pas un A/B.

## Fragmentation par campagne E15

**27 positions V5 dans huit identifiants de campagne E15 ; six campagnes comportent plusieurs trades, soit 25/27 positions.** Les campagnes peuvent contenir des tentatives tactiques inverses, ce ne sont pas automatiquement des positions de même direction.

| Campagne E15 | Trades V5 | Net cumulé | Frais |
|---|---|---:|---:|
| short 1793177100000 | #86 | +1,17 $ | 1,50 $ |
| long 1793193300000 | #87–93 | −15,47 $ | 10,50 $ |
| short 1793217600000 | #94–96 | −5,28 $ | 4,50 $ |
| long 1793259900000 | #97–99 | −3,44 $ | 4,50 $ |
| short 1793270700000 | #100 | −4,36 $ | 1,50 $ |
| long 1793277900000 | #101–105 | −13,24 $ | 7,51 $ |
| short 1793287800000 | #106–108 | −5,49 $ | 4,50 $ |
| long 1793307600000 | #109–112 | −0,08 $ | 6,00 $ |

Comparaisons des fenêtres **réellement chevauchantes** : V4 #40 LONG +7,97 $ vs V5 #88–89 +1,45 $ ; V4 #43 SHORT +17,11 $ vs V5 #95 ≈0 $ ; V4 #45 LONG +3,80 $ vs V5 #96 +0,15 $ ; V4 #49 LONG +22,30 $ vs V5 #109–110 −0,30 $. V5 #111–112 sont postérieurs à la sortie de V4 #49 : ils ne se chevauchent pas. Sur la seule campagne #109–112, V5 paie 6 $ de frais pour −0,08 $ net.

## La faiblesse symétrique des sorties tardives

- V4 #47 LONG (29/10 21:30–22:03 UTC) : MFE +229,2 $ BTC, puis MAE −516,4 $ BTC et EXIT_RISK à 78 918,3 $ (entrée 79 434,7 $), **−11,2465 $ net**. Dès le premier HOLD, l'observateur indiquait `REVERSAL_ATTENTION`, sans transfert déclaré ; il ne demandait pas de sortie.
- V5 #92 LONG : MFE 0, MAE −520,4 $ BTC, hard-risk −500, **−11,052 $ net**. L'action structurelle au même événement était **`HOLD_V54_3M_RESPIRATION_NOT_EXIT`**.
- À 30/10 07:54 UTC, V4 a une **position #50 SHORT encore ouverte**, entrée 78 514,7 $, prix décision 78 040,9 $, net indicatif en cours ~+7,55 $. Non compté dans le réalisé. Au même instant V5 est flat (`WAIT_ACTUAL_ACCEPTANCE_OR_RETEST`, mémoire offensive `DEFERRED`) : la difficulté V5 comprend également des admissions manquées.

## Que fait le shadow de V5.4.3 ? — lecture du code et des décisions

**1. L'observateur d'attention V5** hérité de V5.4.2 maintient les phases `DISCOVERY → CAMPAIGN_HOLD → REVERSAL_ATTENTION → TRANSFER_EXAMINATION`, mais son état est explicitement `attentionOnly=true`, `exitRequested=null`, `riskOverride=false`. Ce n'est **pas** un shadow de portefeuille conservant virtuellement les positions après sortie.

**2. À 18 des 19 sorties gain-floor pour lesquelles un événement de décision est encore archivé**, la décision de maintien V541/V542/V543 était `HOLD` **18/18**, et l'attention affichait `REVERSAL_ATTENTION` **17/18**, `CAMPAIGN_HOLD` **1/18** ; `transferPossible=false` **18/18**. Il ne faut donc ni interpréter cette attention comme une demande EXIT, ni déduire une plus-value contrefactuelle. Au niveau des sept sorties structurelles/MA archivées, l'attention était aussi `REVERSAL_ATTENTION` et le transfert observateur restait faux.

**3. `paper-v543.js` applique en priorité hard-risk −500 $ BTC, puis floor +120→+90 ou +220→+180 au tick frais, puis seulement EXIT structurel.** Une décision `HOLD` n'empêche jamais le floor de sortir la position.

**4. La mémoire V5.4.3 (`DEFERRED` / `REQUALIFIED`) est active pour l'admission, pas pour les sorties.** Le shadow `v493-exact-shadow.js` évalué ~30 s est une admission V493 indépendante en position virtuelle FLAT, sans suivi du maintien. L'ancien fichier de mémoire élastique V5 a été actualisé pour la dernière fois le 23/10 ; l'Execution Lab actif évalue l'exécution et les fills, pas des sorties de campagne.

**Conclusion documentée : aucun shadow actuel ne produit un P&L de maintien V5 contrefactuel complet.** Les `HOLD` observés à la sortie ne sont pas un replay avec décisions futures, risque, sorties, frais et réentrées.

## Propositions d'enquête — non validées comme règles PAPER

1. Préserver 120/90 comme filet de sécurité dans la baseline jusqu'à démonstration comparative.
2. Tester une alternative au 220/180 : protection évolutive ancrée sur un nouveau creux/sommet 3m confirmé, retest défendu, ou MA acceptée ; respecter les preuves disponibles à chaque tick et empêcher la baisse d'un floor déjà acquis.
3. Tester une alerte et une sortie anticipée à la **perte de l'invalidation initiale** avec preuve de transfert/contreconversion et règle d'urgence sur forte vitesse de perte ; examiner expressément les fausses alertes des trades ayant récupéré.
4. Replay lecture seule synchronisé, **position virtuelle, mêmes ticks, frais, exposition, drawdown, réentrées et séquences complètes** ; comparer les résultats **par campagne** et confronter #47/#49 V4, #92/#102/#103 V5, et contre-exemples historiques #75/#80.

## Provenance et gouvernance

Code chargé inspecté : `modules/v5/runner-v543.js`, `decision-v543.js`, `decision-v542.js`, `decision-v541.js`, `paper-v543.js`, `modules/attention/attention-memory.js`, `modules/attention/v493-exact-shadow.js`. Ledgers : `data/v52-paper-trades.ndjson`, `data/v494-paper-trades.ndjson`. Journaux de décisions : `data/v52-paper-decisions*.ndjson` (26/27 événements de clôture représentés) et `data/v494-paper-decisions.ndjson`. États live : `data/v52-paper-state.json`, `data/v494-paper-state.json`, `data/v542-admission-shadow-state.json`, `data/v53-execution-lab-state.json`.

**[CONFIRMÉ]** chiffres ledger, code d'autorité et états des shadows ; **[HYPOTHÈSE]** gains possibles d'un maintien structurel ou d'une meilleure invalidation ; **[VALIDATION UTILISATEUR]** aucune règle nouvelle ; **[IMPLEMENTATION/TESTS/MIS EN SERVICE]** aucun changement de trading, de runner, de shadow ni d'exécution. Rapport documentaire uniquement ; les statistiques sont limitées à la fenêtre figée et ne démontrent pas une espérance de gain durable.
