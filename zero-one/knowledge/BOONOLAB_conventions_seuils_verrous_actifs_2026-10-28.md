# BOONOLAB — enquête des conventions, seuils et verrous réels de BOONO

**28 octobre 2026, 12h33 CET (fin de fenêtre de mesure).** Audit en **lecture seule** sur Amsterdam : code des deux runners PAPER, dépendances réellement chargées, états, NDJSON de décisions et Knowledge Base. **Aucun paramètre modifié, aucun replay de rentabilité produit, aucun ordre financé.** Dossier de provenance : [OD-20261028-003](operational-decisions/OD-20261028-003/03-origine-et-justification.md).

**Lecture des statuts :** **[ACTIF]** condition influençant aujourd'hui les ordres PAPER ; **[OBSERVATION]** calcul visible sans autorité ; **[HYPOTHÈSE]** risque de verrou déduit du code, à confronter aux données ; **[OUVERT]** preuve manquante ou contrôle à faire. Les valeurs en **$ BTC** sont des écarts de cours BTC, non des dollars de P&L ; `MF` et `LBW` sont exprimés en unités d'indicateur.

## 1. Périmètre et architectures réellement chargées

| | V5.4.3 | V4.9.4 |
|---|---|---|
| Runner PM2 au contrôle | `boono-v543-paper` | `boono-v494-paper` |
| Chaîne décisionnelle | `decision-v543 → v542 → v541` (V54 pour les positions anciennes) | `baseline-v494-runner` charge le **vrai V4.9.3** depuis worktree figé `cdf1936` ; `listening-v494` le décore en observation |
| Politique | Mémoire de maturité offensive ajoutée aux contraintes d'entrée V5.4.1 | Admissions et sorties **identiques** au moteur V4.9.3 historique ; attention temporelle sans nouvel EXIT |
| Fréquence théorique du runner | **5 s** (ticks/prix observés) | **30 s** (snapshots du relais/bâton) |
| Compte | Ledger `v52-paper-*` indépendant | Ledger `v494-paper-*` indépendant |
| Brokerage | `brokerOrdersEnabled=false` | `brokerOrdersEnabled=false` |

Références : [runner V543](../modules/v5/runner-v543.js), [décision V543](../modules/v5/decision-v543.js), [paper V543](../modules/v5/paper-v543.js), [runner V494](../modules/v5/baseline-v494-runner.js), [attention V494](../modules/attention/listening-v494.js), [activation V494/V542](BOONO_V494_V542_ecoute_selective_active_2026-10-27.md), [activation V543](BOONO_V543_maturite_offensive_causale_2026-10-27.md). Le code V493 de référence est dans le worktree local `/root/boono-v493-baseline/zero-one/modules/v4/`, ref Git `cdf1936`. Les anciens V4.10.10, V5.4.1 et V5.4.2 ne sont **pas des troisièmes moteurs actifs**.

## 2. Conventions de trading — ce qui est principe, pas seuil

**V5 :** trajectoire **E15→E15 du 15m = directeur stratégique** ; 3m/E3/croisements = tactique ; MF = qualité et mémoire, sans inventer une direction ; MA = confrontation/territoire réel ; PM = traduction et timing ; niveaux/WHERE = lieu, **sans veto de localisation autonome revendiqué**. Séparer campagne, position et opportunité. La phase (`STRUCTURAL_CONTINUATION`, `STRUCTURAL_REVERSAL_FORMING`, `TACTICAL_RESPIRATION`) n'ouvre pas seule un ordre. V5 **n'entre qu'avec une chaîne tactique E3 + prix défendu + flux compatibles + invalidation survivable**.

**V4 :** MCB propose un setup, structure 3m/15m synchronisée ; PM neuf **après setup** confirme que le prix démarre, ticker **n'est pas requis pour l'entrée**. Une fois en position, le setup devient `CONSUMED` ; le moteur tient l'hypothèse à travers des respirations jusqu'à risque ou preuve de renversement. L'attention `DISCOVERY → CAMPAIGN_HOLD → REVERSAL_ATTENTION → TRANSFER_EXAMINATION` est aujourd'hui **observatoire** sur V4.9.4, pas une sortie active. 1h = qualificatif, 4h = permission particulière de capitulation LONG, Daily/Weekly = contexte.

**Commun :** observer uniquement les preuves disponibles à `asOf`, distinguer Live et confirmé, ne pas compter deux fois les familles corrélées, ne pas imposer une péremption fixe après 250/325 $ de déplacement, ne pas confondre réussite opérationnelle quasi neutre avec rentabilité nette après frais.

## 3. Seuils V5.4.3 et véritables conditions d'entrée [ACTIF]

| Famille / seuil exact | Effet |
|---|---|
| **Fraîcheur :** tick ≤ **25 s** ; dernier Audit ≤ **65 s** ; dernier MCB 3m confirmé ≤ **8 min** ; MCB 15m confirmé ≤ **25 min** ; source ≤ **95 s** au niveau du PAPER | Sans santé satisfaisante, pas de nouvelle entrée ; `STRUCTURAL_SOURCES_STALE` ou `STALE_SOURCE_NO_ENTRY`. Une nouvelle bougie 3m **et** 15m attend sa première mesure Audit actuelle : `WAIT_MCB_NEW_BAR_FIRST_SNAPSHOT` ; ce n'est pas automatiquement une panne. |
| **Structure :** directeur E15 causal ; E3/cross3 dans le même sens, suffisamment nouveau et native E3 confirmé ou Live cohérent | `WAIT_MCB3_INSIDE_MCB15_CAMPAIGN`, `WAIT_MCB3_CROSS_ALIGNED_WITH_PARENT`, `WAIT_NATIVE_E3_CONFIRMATION_OR_VALID_LIVE`. Un ancien pivot 3m opposé n'a pas autorité propre. |
| **Contre-offensive tactique :** cross3 `direction × level ≤ −55` ; LBW15 `direction × valeur ≤ −45` ; prix défendu | Autorise la candidature `TACTICAL_RESPIRATION`, pas un retournement stratégique autonome. Le `STRUCTURAL_REVERSAL_FORMING` exige E15 Live opposé + cross3 + prix tenu. |
| **Territoire :** retest 3m **cross → extension → retest → tenue**, ou MA3/MA15 **acceptée après contact confirmé** ; retest `tol=max(10, 0,14×range3m)` | `WAIT_ACTUAL_ACCEPTANCE_OR_RETEST`. **Un prix qui avance avec un PM fort sans cette défense confirmée peut être refusé**. Source : `structural-evidence-v541` / `v53-causal`. |
| **MF :** MF3 directionnel **> +0,15**, MF15 **> +0,15** pour `REINFORCING`, ou MF15 **≥ −0,15** pour `TACTICAL_LEADING` ; compatibilité MF3 > −0,15 ; exception tactique pour MF15 adverse | Une hausse/baisse prix seule ne suffit pas. Les MF sont des variations sur fenêtres 3m et 10m, non des seuils absolus du MF15. |
| **PM :** si PM3, PM5 et PM Live sont **tous trois du mauvais signe**, veto | `WAIT_PM_OPPOSED_TO_STRUCTURE`. **Pas de plancher chiffré PM3/PM5 fixé dans ce dernier prédicat** ; la chaîne E3/MF/territoire reste exigeante. |
| **MA200 :** contact `max(5$, 0,03 % de MA)` ; approche 3m `max(2×tol, 0,65×range3)`, 15m `max(2,5×tol, 0,5×range15)` | `TEST_PENDING` / `REJECTED` près de la MA peuvent interdire une entrée ; MA15 contestée peut devenir **contextuelle** si défense MA3 confirmée dans la campagne 15m. Rejet qualifié après ≥ **2 contacts** avec extrema réels. MA distante seule = pas de veto. |
| **Invalidation d'entrée :** stop causal du bon côté, distance **strictement 0–500 $ BTC**, déjà disponible ; zones de défense min `max(36$, 0,8×range3)`, buffer `max(12$, 0,14×range3)` | Sans ancre survivable, `WAIT_NO_CAUSAL_SURVIVABLE_INVALIDATION`. Niveaux WHERE cartographiés ne donnent une ancre qu'après vraie preuve de défense. |
| **Maturité V541 :** près du bord du range 2h (`rang ≥0,9`) + E3 en bande directionnelle `≥40` + MF15 ne progresse plus `≤0,15` + aucune défense | `WAIT_EXTENDED_WAVE_NEAR_PRICE_RANGE_EDGE`. Autre cas : rang 2h `≥1` + bande E3 `≥60` + distance depuis défense > range15 médian. Pas de seuil fixe de prix « déjà consommé ». |
| **V543, nouveau verrou :** bord 2h `rang ≥0,9`, distance à extrême `≤ ½ range3 médian` **ET** divergence LBW15 contre une référence E15 du même régime MA15 **ET** PM3/PM5 directionnels positifs mais PM Live faiblissant et PM depuis Bâton adverse | `LATE_OFFENSIVE_CONFIRMATION` : **diffère les nouvelles entrées uniquement**, pas les sorties. La mémoire `DEFERRED` persiste jusqu'à retest réellement défendu *après l'alerte* + PM renouvelé, ou retour du LBW15 à la référence + PM. Une simple nouvelle E3 ou amélioration fugace de PM ne réinitialise pas le veto. |

Sources détaillées : [decision-v541.js](../modules/v5/decision-v541.js) (principalement lignes 183–386), [evidence V541](../modules/v5/structural-evidence-v541.js), [MA contract](../modules/v5/ma-contract-v531.js), [v53-causal](../modules/v5/v53-causal.js), [offensive-maturity-v543.js](../modules/v5/offensive-maturity-v543.js), [decision-v543.js](../modules/v5/decision-v543.js). **Tous ces seuils ne sont pas des « verrous » du même niveau** : certains caractérisent une zone, certains qualifient une candidature et d'autres interrompent une nouvelle admission.

## 4. Seuils V5 de sortie, risque et réentrée [ACTIF]

- **Notionnel 1 500 $**, capital de départ papier 1 000 $, **frais taker 0,05 % par côté** (environ 1,50 $ A/R de frais pour un trade entier à prix voisin). Financement/slippage non modélisés.
- **Hard-risk à −500 $ de déplacement du cours BTC**, pas −500 $ de P&L monétaire. **Gain-floor** : MFE cours ≥ **+120 $** arme sortie au retour vers **+90 $** ; MFE ≥ **+220 $** relève le plancher à **+180 $**. Le runner V5 évalue le prix reçu environ toutes les **5 s** ; le seuil est **un déclenchement logiciel au tick observé**, pas un ordre stop garanti.
- **EXIT structurel :** pivot E15 opposé confirmé depuis l'entrée **OU** deux clôtures 3m de l'autre côté de `entryInvalidation` ; **ET** MF3/MF15 adverses (chacun `< −0,15` dans le sens de l'ancienne position) ; **ET** prix réellement défendu par le camp opposé. **Autre voie :** rejet MA3 depuis une acceptation réelle, récent ≤ **12 min**, avec ces mêmes preuves MF et prix.
- **Point décisif :** `entryInvalidation` **n'est pas un stop dur prix autonome** ; sa perte ne déclenche pas EXIT sans la conjonction précédente. Voir [l'audit des invalidations](BOONO_protocole_recherche_compacte_invalidations_2026-10-28.md).
- **Anti-churn PAPER** : une clé `cross3+campagne+éventuel retest` n'est consommable qu'une fois ; conservation des **350 dernières clés**. Une nouvelle entrée après sortie dans la même campagne et même sens exige un **nouvel E3 natif** post-sortie, ou un **nouveau retest accepté** reconnu avec requalification ; la fenêtre de changement de politique exige aussi une preuve post-activation. Des propositions `ENTER` peuvent donc être refusées **après** le calcul de la décision.

Sources : [paper-v543](../modules/v5/paper-v543.js) (lignes 14, 75–194), [decision-v541](../modules/v5/decision-v541.js) (sorties lignes 350–386).

## 5. V4.9.4 : seuils effectifs de l'ancien moteur V4.9.3 [ACTIF]

Les seuils se trouvent dans la version **gelée** `cdf1936` : `modules/v4/layers/{setup-lifecycle,market-quality,price-translation,ticker-confirmation,structural-room,capitulation-guard,action,risk}.js` et `modules/v3lab/layers/where.js`. Le runner actuel V494 **ne redéfinit pas les décisions**. [Consulter la source historique V493 gelée sur GitHub](https://github.com/Salvaison/agents-ia-zero-one/tree/cdf1936/zero-one/modules/v4/layers).

| Domaine / seuil | Application et pouvoir |
|---|---|
| **Fraîcheur du runner V494** | Pour **ENTER**, horodatage de marché âgé de **<90 s** et fichier `mcb_3m_live.csv` modifié depuis **<120 s** ; une entrée est refusée sans `DATA_OK`. Cette vérification ne conditionne pas de la même manière les sorties d'une position existante : leur fiabilité dépend du snapshot réellement reçu. |
| **Setup structurel** | `WAIT_3M_15M_SYNC` si structure 3m opposée au candidat MCB 15m ; un E3/lobe ne peut pas remplacer une trajectoire 3m confirmée lorsqu'elle existe. |
| **Qualité MCB** | Paire E15 d'extrêmes opposés : écart LBW **≥80 unités** = `PAIR_MAJOR_QUALITATIVE`, **qualitatif seul**. Mais une paire sous 80 combinée à `LOW_EDGE` suspend la création du setup, sauf `UP_REINFORCED`. |
| **Marché dormant / chop** | Sur **30 min** : range < **44 $ BTC** ET somme des mouvements < **110 $ BTC** = `DORMANT_MARKET` bloque. Sur **60 min** : efficacité < **0,08** + ≥ **30 flips/h** = `CHOP_SHADOW` ; efficacité ≤ **0,12** + ≥ **35 flips/h** = `LOW_EDGE_SHADOW` ; ces deux derniers bloquent **seulement avec paire sub80 non renforcée**. |
| **WHERE, MA, limites** | `BOUNDARY_CONTEST` **bloque le setup** : MA200 15m fraîche devant le prix dans une bande de tolérance (~**0,1 %** du cours), S/R cartographiée à **≤100 $ BTC** du prix et du côté visé, ou **trendline active** située devant le prix. La branche trendline n'a pas de distance maximale supplémentaire dans `structural-room.js` ; fraîcheur du catalogue TL ≤ **3 min** dans `where.js`. |
| **MF temporel** | Une mémoire opposée dominante sur **2h/4h** peut bloquer `WAIT_MF_MEMORY`. Pour la contester : transfert MF **30m → 1h → structure et lobe 3m** du candidat, puis PM roulant **STRONG_TRANSLATION**. Ainsi le 1h n'a pas de veto « background » autonome, mais **participe à un veto indirect de transfert MF**. |
| **4h capitulation LONG** | Si 4h descendante dans un creux profond **LBW ≤−60**, attendre UP 4h **confirmé ≤−60**, puis **nouvelle preuve haussière 15m postérieure**. La même armée 4h ne peut pas financer une nouvelle campagne LONG après échec sans nouvelle confirmation. Exception spécifique, pas veto macro symétrique sur tous les trades. |
| **Signal 15m renforcé** | `UP_REINFORCED` 15m **≤−60**, actif au plus **90 min** si aucun DN plus récent, peut ouvrir candidature LONG exceptionnelle. `UP_REINFORCED_3M` ferme la fenêtre d'un **nouveau SHORT**, mais avertit seulement sur SHORT ouvert. |
| **PM d'admission** | Après setup : déplacement net `|PM| ≥10 $ BTC`, efficacité `≥25 %`, continuité prix 3m de bon signe. En `CHOP/LOW_EDGE`, aussi 5m aligné et efficacité 3m **≥37,5 %**. Exception LONG renforcé : déplacement net post-setup **≥50 $ BTC** et efficacité **≥12 %**. Ticker **qualifie**, mais n'est pas le dernier verrou. |
| **Permanence des setups** | `THESIS_CONSUMED_WAIT_MCB_CHANGE` et `CAMPAIGN_RETRY_NEEDS_NEW_15M_EVENT_AFTER_FAILED_TRADE` empêchent la répétition du même setup ou une relance après échec sans signal 15m post-sortie. `SETUP_OPEN/LATE/EXPIRED` est un shadow de timing, **sans veto général actif**. |
| **Risque / sortir** | Hard-risk **−500 $ BTC** au prochain cycle observé ; entrée et sortie fee-aware à 0,05 %, notionnel **1 500 $**. Une position mal amorcée peut sortir `EXIT_EXECUTION_FAILURE` si P&L directionnel <0, MFE ≤ **55 $ BTC** (ou ≤ **220 $** pour reclaim de range) **et** PM/microstructure adverses. |
| **Conserver des gains V4** | Dès MFE ≥ **440 $ BTC**, giveback ≥ **180 $ BTC**, PM et microstructure adverses : protection MFE. Si MCB/MF portent encore la campagne, TP1 partiel de **25 %** ; runner conserve une respiration jusqu'à **360 $ BTC** de giveback si la structure le justifie. Ce n'est **pas** le gain-floor fixe **120→90 / 220→180 de V5**. |
| **Sortie V4 en inversion** | Pivot/MCB adverse + PM adverse + **ticker confirmé**, ou signal natif E15 adverse avec MCB3 et PM opposés ; exception `UP_REINFORCED` 15m sur SHORT peut sortir directement. Micro adverse : yield ≥ P75 avec effort ≥ P75 ou yield ≥2×P75 ; PM 3m adverse fort (notamment `|net3|≥50`, efficacité ≥0,4) dans certaines sorties. |

La fréquence V4 de **30 s** signifie que les protections et la MAE conservée sont fondées sur les observations du simulateur, **pas sur un ordre boursier natif intratick**. La déclaration de hard-risk V4 dans `risk.js` dépend des prix et de la MAE **effectivement observés par le runner**.

## 6. Mesure empirique des verrous sur les journaux

**Fenêtre commune :** **26/10 23h33 UTC → 28/10 11h33 UTC** (36h). Journaux `v52-paper-decisions*.ndjson` et `v494-paper-decisions.ndjson`, dédoublonnés par horodatage/action/raison. Ce sont des **enregistrements de changements de décision**, pas tous les cycles 5/30s, ni des trades ou opportunités indépendantes. Plusieurs refus coexistent ; seuls certains sont affichés.

| Observable sur 36h | V5.4.3 (732 changements, 574 WAIT) | V4.9.4 (600 changements, 508 NO_TRADE/WATCH) |
|---|---:|---:|
| Première observation d'une nouvelle bougie MCB | **190** | — |
| Défense du prix/retest non reconnu | **160** | — |
| Désaccord phase/trajectoire 3m–15m | **153** | **269** (`WAIT_3M_15M_SYNC`) |
| E3 natif insuffisant | **47** | — |
| Confrontation niveau/frontière `BOUNDARY_CONTEST` | — | **190** |
| Mémoire MF lente opposée `WAIT_MF_MEMORY` | — | **117** |
| Transfert MF3m insuffisant | — | **79** |
| Marché `LOW_EDGE` dans paire faible | — | **77** |
| Transfert MF1h insuffisant | — | **45** |

V4 archive **plusieurs raisons simultanément** (301 enregistrements d'attente contiennent une combinaison de motifs) ; les nombres de lignes de cette table ne s'additionnent pas. V5 choisit ordinairement **le premier motif** de sa liste, donc ces fréquences sont une **borne d'observabilité**, pas un classement complet des obstacles causaux.

**Deux observations supplémentaires vérifiées :**
- V5.4.3 : **10 enregistrements `ENTER` proposés**, **6 `ENTER_PAPER`** et **4 refus** au niveau du PAPER : `V541_SAME_CAMPAIGN_AWAIT_NEW_NATIVE_E3_OR_PROVEN_RETEST`. Ce ne sont pas quatre opportunités indépendantes : certains enregistrements peuvent réévaluer une même candidature.
- V5.4.3 : parmi **732 changements**, **27** portent la classification `LATE_OFFENSIVE_CONFIRMATION`, mais **0** n'a le motif d'action `WAIT_OFFENSIVE_CHAIN_ALREADY_EXTENDED_AWAIT_REQUALIFICATION`. Le diagnostic de maturité est donc **observable**, sans démonstration sur cette fenêtre d'une **entrée autrement exécutable effectivement empêchée** par ce nouveau veto. Une évaluation contrefactuelle des candidats précis est nécessaire.

## 7. Inventaire des verrous contradictoires ou potentiellement cachés

| Rang d'étude | Constats et niveau de preuve | Ce qu'il faut vérifier |
|---|---|---|
| **P0 — WHERE indirect V4** | **[CODE PROUVÉ]** `context.js` proclame `CONTEXT_ONLY_NO_...VETO` ; pourtant `structural-room.js` construit `admissionBlocked=BOUNDARY_CONTEST` depuis les champs WHERE, puis `setup-lifecycle.js` applique `!roomReady` comme veto. **190 enregistrements mentionnent ce verrou** (pas 190 trades). En particulier une trendline active en avant peut être considérée contestée **sans distance maximale de confrontation**. | Rejouer les épisodes `BOUNDARY_CONTEST` avec catégorie, écart, fraîcheur et issue prix ; confronter à la décision utilisateur historique **WHERE informatif, jamais veto autonome**. **Ne pas neutraliser sans étude et validation distincte.** |
| **P0 — Invalidation V5 n'ordonne pas EXIT** | **[CODE ET LEDGER PROUVÉS]** `entryInvalidation` est stocké et contrôlé pour l'admission, mais son franchissement seul n'est pas la sortie. EXIT exige structure/MA + MF doublement adverse + prix adverse défendu, ou hard-risk −500 $. Huit grosses pertes #65/#66/#68/#71/#73/#77/#78/#79 ont franchi leur invalidation. | Rejouer franchissement, nombre de clôtures adverses, MF/PM et territoire *as-of*, puis mesurer faux positifs des récupérations #18/#59/#72/#75/#80. Ne pas imposer immédiatement un stop à la première mèche. |
| **P0 — Cause unique de WAIT V5 masque les autres** | **[CODE PROUVÉ]** `decision-v541.js` calcule `entryEligible` comme une conjonction, mais publie `reasons.find(...)`, **une seule raison prioritaire**. Plusieurs contraintes (qualité `flowQuality`, `health`, maturité, espace d'invalidation) ne possèdent pas toujours de motif distinct visible. `paper-v543.js` peut encore rejeter après `ENTER`. | Dans un **observateur read-only**, journaliser pour chaque candidature le vecteur complet des clauses, leur origine, et le résultat du simulateur ; ne pas analyser seulement `reason`. |
| **P1 — MF de retournement contradictoire V5** | **[RISQUE LOGIQUE DÉDUIT DU CODE]** `mfCompatible` accepte un `STRUCTURAL_REVERSAL_FORMING` même quand MF15 directionnel est inférieur à −0,15 ; **mais** `entryEligible` exige aussi `flowQuality=REINFORCING/TACTICAL_LEADING` (hors exception `tacticalCounter`), ce qui peut refuser la même formation. **Aucun des 15 changements `REVERSAL_FORMING` de la fenêtre** n'a présenté précisément MF3 > +0,15 et MF15 < −0,15 : effet réel non observé. | Test ciblé avec entrée de formation et MF15 opposé, sans changer la politique. Si l'exception est intentionnelle, l'expliquer et le journaliser ; sinon décision de correction ultérieure. |
| **P1 — Preuve de territoire V5 peut retarder** | **[CODE/FRÉQUENCE]** `WAIT_ACTUAL_ACCEPTANCE_OR_RETEST` est l'un des refus les plus courants ; peut contraindre un mouvement productif ou silencieux jusqu'au retest de MA, ou à la succession cross–extension–retest–hold, alors que la fenêtre économique s'amenuise. | Replays de mouvements acceptés trop tard et d'attaques prématurées, avec MF/PM prix et frais ; conserver le rôle stratégique MCB15. |
| **P1 — Anti-churn après avis d'entrer** | **[CODE/OBSERVÉ]** V5 retient consommations de clés et exigences post-sortie ; 4/10 enregistrements d'ENTER récents refusés au PAPER. V4 possède les états `THESIS_CONSUMED` et `CAMPAIGN_RETRY...`. | Comparer les quatre refus aux preuves fraîches disponibles, sans recycler le même ancien setup ; mesurer opportunités effectivement manquées, pas refus bruts. |
| **P1 — 1h V4 « sans veto » mais transfert MF1h obligatoire** | **[CODE/OBSERVÉ]** `againstReady=true` retire le veto 1h de fond, mais un camp qui contredit MF2h/4h doit obtenir MF30m, MF1h, structure/lobe3m et PM fort. 45 changements avec `WAIT_MF_TRANSFER_1H`. | Vérifier si la mémoire adverse est encore productive ou déjà invalidée par le prix ; mesurer coût du transfert tardif. Le veto n'est pas un veto 1h global, mais une dépendance **conditionnelle** réelle. |
| **P1 — Sortie V4 tardive par quorum** | **[CODE/OBSERVÉ HISTORIQUE]** entrée V4 sans ticker obligatoire, mais sortie par inversion souvent soumise à MCB opposé + PM + ticker ; `CONSUMED` protège une campagne puis peut retarder son abandon. | Confronter #17/#18, #20–#27 et les chevauchements V5 #77/#78 ; comparer réouverture de l'attention, pas une EXIT sur E3 isolé. |
| **P2 — Qualité/temps et rares veto de maturité** | **[CODE]** `WAIT_MCB_NEW_BAR_FIRST_SNAPSHOT` est une attente normale due au calendrier 3m/15m, pas une panne. V543 retient une déférence après preuve tripartite mais sa conséquence réelle sur les entrées n'est pas établie par les 36h archivées. | Distinguer durée d'attente, santé des flux, latence économique et veto réel ; mesurer un épisode complet avec tick/MCB/Audit synchronisés. |

**Attention économique :** le signal d'un marché potentiellement favorable n'est pas une permission de négliger le risque. Un garde-fou peut économiser davantage sur les mauvais trades qu'il ne coûte sur les bons ; seule une comparaison causale fee-aware, sur les mêmes épisodes et avec exposition, peut trancher.

## 8. Suite recommandée — étude sans changement d'autorité

**Priorité 1 : observabilité des vétos.** Créer un export *read-only* par épisode : phase E15/3m, `entryEligible`/toutes les clauses, raison du PAPER, horodatages, qualité des données, niveaux et distances, action finale. Mesurer séparément obstacles **réels** et conditions simplement déclarées.

**Priorité 2 : deux familles de replays ciblés.** (a) V4 `BOUNDARY_CONTEST` + `WAIT_MF_MEMORY/TRANSFER`, en séparant la position du prix et la production de la nouvelle campagne ; (b) V5 `WAIT_ACTUAL_ACCEPTANCE_OR_RETEST` + invalidations non protégées, comparant échecs et réussites sans effet de hindsight.

**Priorité 3 : tests de contradiction.** Qualité MF / `REVERSAL_FORMING`, nouvelle entrée V5 refusée après `ENTER`, source ancienne d'une trendline, seuil du gain-floor et sortie au tick observé, différence entre raison primaire et motifs cachés.

**Statut final de cette enquête :** conventions et valeurs **identifiées dans le code**, fréquence des motifs **mesurée dans les journaux**, risques de blocage **hiérarchisés mais pas encore corrigés**. Les deux moteurs PAPER continuent sous leurs règles existantes. Toute promotion d'un shadow, relâchement de seuil ou modification d'EXIT exige une nouvelle décision opérationnelle avec prompt intégral et origine dans le registre.

**Liens de passation :** [BOONOLAB_START_HERE](../BOONOLAB_START_HERE.md) · [index BOONOLAB](BOONOLAB_INDEX.md) · [audit gain-floor/invalidation du 28/10](BOONO_audit_comparatif_V543_V494_gainfloor_sorties_2026-10-28.md) · [protocole de recherche compacte](BOONO_protocole_recherche_compacte_invalidations_2026-10-28.md).
