# BOONO Systems — passation détaillée du 19 octobre 2026

## 0. Fonction de ce document

Ce document est une **passation active** destinée à la prochaine discussion BOONO. Il ne remplace pas la réalité opérationnelle : il la décrit à un instant précis et distingue systématiquement :

1. **serveur Amsterdam = réalité opérationnelle** ;
2. **code = état effectivement implémenté** ;
3. **documents = mémoire et contexte** ;
4. **intentions / interprétations = hypothèses à tester**.

La prochaine discussion doit lire ce document intégralement, puis **revérifier le serveur, le code, les données et Git avant toute modification**.

---

## 1. Snapshot opérationnel vérifié

### 1.1 Instant de référence

Snapshot serveur vérifié le **19 octobre 2026 à 16:45:05, heure de Paris**.

### 1.2 Moteur V4

- Version d’état : `v4.10.7-local-retry-requalification-20261017`
- Version de la dernière évaluation : identique
- Position ouverte : **aucune**
- Nombre de trades clôturés V4 : **143**
- Prix observé au snapshot : **81 996,3**
- Qualité des données MCB : **`DATA_OK`**
- Git `main` / `origin/main` : **`94a76e5` — `Measure Elastic proof conversion`**

Dernière décision au snapshot :

```text
NO_TRADE
candidateDirection: LONG
LOW_EDGE_REQUIRES_MAJOR_MCB_OR_REINFORCED_UP
+ BOUNDARY_CONTEST
+ WAIT_MF_MEMORY
```

La requalification locale n’était pas prête :

- structure 3m : LONG ;
- lobe 3m : SHORT ;
- PM3 non aligné ;
- PM5 aligné ;
- efficacité 3m très faible ;
- Price Behavior intéressant mais insuffisant ;
- MF Memory lente encore opposée au candidat LONG.

Ce snapshot est dynamique. La prochaine discussion doit le revérifier immédiatement.

### 1.3 État Git

Le dépôt principal est synchronisé sur `main` au commit `94a76e5`.

Le worktree contient toutefois de nombreux fichiers BOONO-TV modifiés ou non suivis provenant d’une autre discussion. **Ils ne doivent pas être ajoutés à un commit de logique trading ou de documentation sans demande explicite.** Les commits doivent rester chirurgicaux.

---

## 2. Situation économique réelle

L’intégration des frais a transformé la lecture du système. Le problème principal n’est pas résolu par une augmentation du notionnel puisque les frais sont proportionnels.

### 2.1 Comptabilité fee-aware actuelle

Sur les **51 trades disposant d’une comptabilité de frais** :

- brut : **+54,47 $**
- frais : **−76,51 $**
- net : **−22,04 $**
- réussite : **31,37 %**
- net moyen : **−0,43 $ / trade**

Donc la stratégie est légèrement positive **avant frais**, mais les frais absorbent plus que la totalité de ce brut.

Sur les **18 trades V4.10+** :

- brut : **+12,41 $**
- frais : **−27,00 $**
- net : **−14,59 $**
- réussite : **27,78 %**

Sur les **9 trades V4.10.7** :

- brut : **+25,24 $**
- frais : **−13,51 $**
- net : **+11,73 $**
- réussite : **33,33 %**

Cette dernière fenêtre est trop petite pour conclure. Elle est en plus fortement portée par le trade #142 ; sans ce gros gagnant, la fenêtre V4.10.7 resterait négative. Le système est donc **encore fragile et non démontré rentable**.

### 2.2 Modèle de frais

Configuration par défaut :

- taker : `0,05 %`
- maker : `0,02 %`
- BOONO simule actuellement surtout des exécutions market/taker
- aller-retour de 1 500 $ sans mouvement : environ **1,50 $**
- funding : non modélisé
- slippage : non modélisé

Le PNL net est désormais :

```text
PNL net = PNL brut
        − frais d’entrée
        − frais des sorties partielles
        − frais de sortie finale
```

---

## 3. Évolution majeure de la constitution V4

## 3.1 TP1 / TP2 multi-fractions fee-aware

Un shadow compare des variantes événementielles de TP :

- TP1 : fractions 10 / 20 / 25 / 33 %
- TP2 : fractions du reliquat
- HOLD 100 % comme référence
- frais inclus
- TP2 seulement après **nouveau MFE causal / nouveau terrain**, pas sur une grille arbitraire

Principe :

- TP1 = premier stress adverse productif alors que MCB + MF portent encore la campagne ;
- TP2 = reprise, nouveau terrain, puis nouveau stress ;
- le runner reste soumis aux sorties normales.

Statut : **shadow pur, sans autorité live**.

## 3.2 Plancher économique actif 220 → 180

Règle active :

```text
MFE >= 220 $  → armement
currentSignedUsd <= 180 $ → EXIT_ECONOMIC_PROFIT_FLOOR
```

Cette protection ne demande pas de confirmation supplémentaire : elle protège une viabilité économique déjà acquise.

Elle est distincte :

- du mécanisme gros gagnant `440 → 180` ;
- du TP stress/runner ;
- des sorties structurelles.

Le trade #127 a montré son utilité : une entrée tardive a tout de même fini positive grâce à ce plancher.

---

## 4. V4.10.0 — Protection Stack

Trois corrections actives ont été ajoutées après le trade #125.

### 4.1 `SETUP_LATE` sort du shadow

Un nouveau setup est fermé lorsque :

- le lobe 3m est dans le sens candidat ;
- il a déjà consommé au moins **12 minutes / 4 bougies 3m** ;
- sa recovery est `<= 12 %`, donc il reste proche de son extrême.

Résultat :

```text
SETUP_LATE_CLOSES_ENTRY_WINDOW
```

La règle est fondée sur le cycle 3m, pas sur une distance arbitraire de prix.

### 4.2 Sortie LIVE15 par stack complet

Une sortie peut bypasser l’attente de confirmation 15m si les quatre preuves suivantes sont simultanées :

```text
LIVE15 opposé
+ structure 3m opposée
+ PM adverse productif
+ perte / rejet de MA200 3m
```

Action :

```text
EXIT_LIVE_SIGNAL_STACK_PROTECTION
```

Important :

- LIVE15 seul n’a pas d’autorité de sortie ;
- E3/DN3 seul n’a pas d’autorité de sortie ;
- le ticker n’est pas requis dans ce stack ;
- l’autorité vient de l’empilement convergent.

### 4.3 Cas #125

Trade #125 :

- LONG 81 454,7
- MFE prix +267,2 $
- sortie 81 057,6
- net −8,81 $

Le replay a montré :

- entrée déjà tardive ;
- `SETUP_LATE` l’aurait interdite ;
- 220→180 aurait protégé le gagnant ;
- le stack LIVE15/3m/PM/MA200 aurait protégé plus tôt.

---

## 5. V4.10.1 — Opportunity Freshness

Le trade #127 a révélé qu’un `UP_REINFORCED` confirmé tardivement pouvait artificiellement recréer un setup frais.

Corrections actives :

1. `UP_REINFORCED` ne réinitialise plus l’identité causale du setup.
2. Le passage `STRUCTURAL_TRAJECTORY → NATIVE_UP_REINFORCED` conserve :
   - le même setup ;
   - le même `setupTs` ;
   - la mémoire post-setup.
3. L’origine temporelle du timing est la plus ancienne entre :
   - début du lobe 3m ;
   - 3m UP de synchronisation.
4. Un bypass natif est interdit lorsque :
   - rolling PM3 est opposé ;
   - **et** rolling PM5 est opposé.

### Cas #127

Trade #127 :

- LONG 80 966
- sortie 81 112,3
- net +1,21 $
- MFE +352,8 $
- sortie `EXIT_ECONOMIC_PROFIT_FLOOR`

La nouvelle logique aurait trouvé :

- timing réel déjà consommé ;
- `SETUP_LATE` ;
- PM3/PM5 rolling opposés ;
- donc aucune entrée.

Le trade montre que la sortie était devenue meilleure que l’entrée.

---

## 6. Shadows continus ajoutés

## 6.1 Continuation Re-entry Shadow

But : tester une réentrée dans la même campagne après une sortie protectrice sans réintroduire du churn.

Armement uniquement après une sortie protectrice.

Conditions :

- même thèse 15m ;
- nouvel événement 3m après la sortie ;
- lobe 3m aligné ;
- PM3 et PM5 alignés ;
- efficacité 3m `>= 25 %` ;
- pas de mémoire MF lente opposée.

Particularité expérimentale :

- `structuralDirection3m` n’est volontairement pas un veto ;
- une seule candidature par sortie ;
- suivi MFE / MAE ;
- `reachedEconomicMove` si MFE >= 220 ;
- `churnRisk` si MAE >= 180 avant MFE 220.

Statut : **shadow pur**.

## 6.2 Price Behavior Shadow

Principe majeur validé :

> MCB structure et propose la direction ; le prix est la réalité exécutée du marché.

Le shadow observe le prix même en `NO_THESIS` :

- rendement / effort ;
- cadence ;
- flow ;
- PM 1m / 3m / 5m ;
- efficiencies ;
- durée et excursions de l’épisode.

Classes :

- `EXTREME_EASY_TRAVEL`
- `EASY_TRAVEL`
- `EXTREME_PRODUCTIVE_TRAVEL`
- `PRODUCTIVE_TRAVEL`
- `HIGH_EFFORT_LOW_YIELD`
- `LOW_YIELD`

Il conserve une mémoire des séquences :

- `SIGNAL3_TO_SIGNAL15`
- `SIGNAL15_TO_SIGNAL3`
- `SIGNAL15_ONLY`

Un événement 3m opposé postérieur devient une opposition tactique ; il n’efface pas automatiquement la mémoire stratégique 15m.

Statut : **shadow pur, always-on**.

## 6.3 LIVE15 Acceptance Shadow

Deux expériences sont séparées.

### ENTRY

Le LIVE15 peut être traité comme validé dans le shadow seulement si les autres preuves sont prêtes :

- cohérence 3m ;
- PM3 + PM5 ;
- efficacité ;
- MF Memory ;
- timing ;
- boundary ;
- activité.

### EXIT

Le shadow teste volontairement l’hypothèse dangereuse :

```text
LIVE15 opposé seul = sortie immédiate
```

Il mesure alors :

- terrain adverse évité ;
- récupération manquée ;
- disparition / flip / repaint ;
- latence gagnée.

Résultats initiaux 24 h :

- 47 bougies avec apparition LIVE15 ;
- 19 confirmations même sens ;
- 28 repaint ;
- confirmation brute ≈ 40,4 % ;
- apparition moyenne ≈ 13 min avant clôture ;
- présence >= 80 % : ≈ 90 % de confirmation ;
- présence < 25 % : 0 % de confirmation.

Découverte :

> le danger principal n’est pas seulement « LIVE », mais surtout la faible persistance intra-bougie.

Statut : **shadow pur**. Le stack actif de sortie reste inchangé.

## 6.4 Admission Counterfactual Shadow

Ajouté avec le chantier de qualité des données.

But : exposer ce qu’aurait fait l’admission sans certains verrous, sans modifier la décision live. Il aide à distinguer :

- opportunité réellement ratée ;
- veto utile ;
- données insuffisantes ;
- chaines de preuve incomplètes.

Statut : **shadow pur**.

## 6.5 Structural Handoff Shadow

Observe la transmission structurelle 1h / 15m / 3m et la possibilité de réutiliser une mémoire structurelle après sortie.

Contrat :

- structure éventuellement persistante ;
- preuve d’exécution non persistante ;
- PM/ticker/efficiency pré-sortie non réutilisables ;
- nouvelle preuve post-sortie obligatoire.

Statut : **shadow pur**.

---

## 7. V4.10.5 — Qualité et intégrité des données

Des incohérences et risques de données périmées ont conduit à une couche de qualité explicite.

### 7.1 Data Quality Gate

La donnée MCB périmée ou incohérente ne conserve jamais une autorité d’admission.

Le gate vérifie notamment :

- fraîcheur des fichiers live ;
- âge des lignes live ;
- fraîcheur des historiques confirmés ;
- cohérence des timeframes ;
- déduplication.

Si les données sont dégradées :

- l’entrée est bloquée ;
- l’observation du prix reste possible ;
- le hard risk reste disponible.

Au snapshot de passation : **`DATA_OK`**.

### 7.2 Télémétrie Wave15

L’interface expose l’état de santé de l’historique 15m afin de distinguer :

- absence réelle de signal ;
- trou de collecte ;
- série périmée ;
- retard de confirmation.

### 7.3 V3 leakage

Les traces ou dépendances V3 ont été rendues visibles dans SHADOWS afin qu’une ancienne logique ne puisse pas influencer silencieusement l’interprétation actuelle.

---

## 8. V4.10.7 — Local Retry Requalification

Problème : une campagne 15m consommée pouvait rester bloquée malgré un nouveau transfert local propre.

Exception active et étroite :

```text
même campagne 15m
+ sortie déjà survenue
+ nouvel événement natif 3m dans le même sens, strictement post-sortie
+ aucun événement 3m opposé plus récent
+ structure 3m alignée
+ lobe 3m aligné
+ PM3 et PM5 alignés
+ efficacité suffisante
+ événement <= 45 min
```

Résultat :

```text
LOCAL_RETRY_REQUALIFIED
```

Garanties anti-churn :

- aucune preuve PM pré-sortie n’est réutilisée ;
- le retry reçoit une nouvelle identité ;
- un nouvel E3 ultérieur peut créer un retry suivant ;
- un événement opposé invalide le retry ;
- les tests couvrent absence d’E3, E3 frais, stabilité de la clé et retry #2.

Ce mécanisme est **actif**, contrairement aux shadows.

---

## 9. Elastic Synchronization Shadow v0.3

C’est le chantier conceptuel principal ouvert à la fin de cette discussion.

## 9.1 Principe

Le marché n’est pas lu comme une somme de signaux indépendants ni comme un score instantané.

Il est lu comme :

> une chaîne continue de preuves et contre-preuves qui s’alignent temporellement, vieillissent, se renforcent et se contrebalancent.

Dimensions essentielles :

- sens ;
- ordre causal ;
- âge ;
- persistance ;
- réponse du prix ;
- conversion effort → rendement ;
- counterproofs ;
- localisation / boundary.

## 9.2 Chaîne LONG observée

Exemple conceptuel :

```text
LBW15 se réaligne avec LBW15-0
→ MF3 reprend rapidement
→ MF15 tient / ne se dégrade pas
→ le prix répond dans le même sens
→ PM / ticker / efficiency confirment la conversion
→ E15Live apparaît puis persiste
→ continuation ou entrée LONG si boundary / R:R / fraîcheur le permettent
```

E15Live est une confirmation supplémentaire, pas l’origine.

## 9.3 Chaîne SHORT / changement de camp

Exemple conceptuel :

```text
crête / divergence BW ou prix
→ pente MF15 se dégrade
→ MF3 devient négatif
→ PM vendeur devient productif
→ le prix cesse de progresser
→ le prix répond vers le bas
→ E3 puis E15Live peuvent confirmer
```

## 9.4 Contre-preuves

- MF3 repart puis échoue ;
- MF15 se dégrade contre la thèse ;
- prix stagne ;
- effort élevé sans rendement ;
- rejet de boundary ;
- E15Live disparaît ou flippe ;
- prix répond dans le sens opposé.

## 9.5 v0.2 / v0.3

Durcissements déjà réalisés :

- une preuve MF3 doit être **fraîche après** l’alignement LBW ;
- être déjà au-dessus d’un seuil lors de l’alignement n’est pas une nouvelle preuve ;
- la reprise doit être un vrai crossing ou un swing de recovery ;
- v0.3 mesure la conversion des preuves en terrain ;
- l’interface expose la progression actuelle avant même qu’un épisode soit complet ;
- occurrences et horizons de conversion sont consultables.

Statut : **shadow pur, `decisionImpact:false`**.

---

## 10. Interface et observabilité

## 10.1 Rôles des écrans

- **État vivant** : ce que BOONO comprend et décide.
- **Vagues** : ce que BOONO voit.
- **SHADOWS** : ce que BOONO observe, teste ou aurait pu faire.
- **BOONO-TV** : représentation pédagogique publique.

## 10.2 Vagues — état visuel validé

La page contient :

- PRIX BTCUSDT synchronisé ;
- Wave15 ;
- Flow / Audit ;
- Wave3 ;
- 3m / 15m ;
- 24h / 48h ;
- MA200 verte au-dessus, rouge au-dessous ;
- ligne Live bleue pointillée ;
- échelle prix à gauche ;
- zones de trades bleu ciel ;
- seules les lignes verticales entrée / sortie restent visibles ;
- rapport de trade au clic ;
- légendes dans des popups `i`.

Cette vue permet de juger rapidement :

- timing de l’entrée ;
- structure 15m ;
- phase 3m ;
- traduction du prix ;
- qualité de la sortie.

## 10.3 Onglet SHADOWS

Cartes principales :

- Price Behavior ;
- Continuation Re-entry ;
- LIVE15 Acceptance ;
- Structural Handoff ;
- TP Optimization ;
- MF Memory active ;
- Elastic Synchronization ;
- Admission Counterfactual ;
- qualité / leakage selon la version de l’interface.

Les tuiles de résultat sont cliquables et ouvrent une liste temporelle d’occurrences.

## 10.4 BOONO-TV

Le même renderer partagé alimente un **Market Curtain** derrière BOONO :

- prix 3m + MA200 ;
- Wave15 ;
- Wave3.

Attention : le worktree BOONO-TV contient des travaux non committés d’une autre discussion. Ne pas les mélanger aux chantiers trading.

---

## 11. Trades de référence

## 11.1 #125 — protection insuffisante

- LONG 81 454,7
- net −8,81 $
- MFE +267,2 $
- MAE −397,5 $

Leçons :

- setup tardif ;
- rejet MA200 ;
- 3m opposé ;
- LIVE15 opposé ;
- attente de confirmation 15m trop lente ;
- 220→180 absent à l’époque.

Ce trade a motivé Protection Stack.

## 11.2 #127 — opportunité artificiellement rajeunie

- LONG 80 966
- net +1,21 $
- MFE +352,8 $
- sortie 220→180

Leçons :

- `UP_REINFORCED` ne doit pas recréer un setup frais ;
- PM3/PM5 rolling opposés doivent empêcher le bypass ;
- le plancher économique a limité les dégâts.

## 11.3 #142 — grand gagnant récent

- LONG 80 866,2
- sortie 82 056,1
- net +20,56 $
- MFE prix +1 342,7 $
- MAE prix −31,4 $
- sortie `EXIT_NATIVE_SIGNAL_PROTECTION`

Ce trade explique une part importante du résultat positif de la petite fenêtre V4.10.7. Il ne faut pas confondre ce cas avec une validation statistique globale.

## 11.4 #143 — problème immédiat à reprendre

Trade réel :

- SHORT
- entrée : **19/10 15:37:07 Paris** à 82 305,4
- sortie : **15:48:08** à 82 333,6
- sortie : `EXIT_PROFIT_PROTECTION`
- net : **−2,01 $**
- brut : −0,51 $
- frais : −1,50 $
- MFE : +167,7 $ prix
- MAE : −67,7 $ prix

Analyse visuelle de Benjamin :

- MF décroissant depuis environ 14:30 ;
- divergence 3m DN vers 15:15 ;
- E3 productif ;
- deuxième retest avant MA3 ;
- relation LBW0-15 ;
- prix traverse MA3 ;
- E15Live apparaît puis confirme ;
- le SHORT pouvait être envisagé plus tôt ;
- la sortie a pris une petite respiration pour une vraie invalidation ;
- le prix a ensuite poursuivi de plusieurs centaines de dollars.

Fait nouveau très important issu du LIVE15 Acceptance Shadow :

- premier DN LIVE15 : **15:30:35 Paris**
- prix : **82 443,4**
- avance avant clôture : **14,41 min**
- cohérence 3m : prête
- PM3 : −77,1 $
- PM5 : −133,7 $
- efficacité 3m : 100 %
- MF Memory : SHORT alignée
- timing : ouvert
- boundary / activité : prêts
- signal finalement confirmé DN
- MFE hypothétique avant résolution : **+293,1 $**
- MAE hypothétique : **−8,4 $**

Cela confirme prospectivement qu’au moins une entrée SHORT mieux placée existait avant l’entrée réelle #143.

Cependant, le chantier n’est pas terminé :

1. la chaîne de preuves commençait probablement avant 15:30 ;
2. il faut reconstruire précisément divergence/MF/LBW/MA/PM/ticker/boundary ;
3. il faut comprendre pourquoi la sortie a traité la respiration comme un flip exploitable ;
4. il faut mesurer ce qui distinguait une respiration 3m d’une vraie contre-thèse.

---

## 12. Lecture du marché observée le 19 octobre

La séquence discutée est importante pour le développement du shadow temporel :

1. divergence haussière de la veille ;
2. grande reprise du prix ;
3. accumulation de preuves de crête ;
4. divergence DN / BW divergent ;
5. MF3 devient négatif ;
6. MF15 reste relativement stable ;
7. le prix suit MF3 vers le bas ;
8. petite divergence UP ;
9. MF3 favorable ;
10. E3 ;
11. E15Live ;
12. rebond d’environ 600 $ ;
13. petite divergence DN ;
14. nouvelle bascule vers le SHORT ;
15. trade #143 trop tardif et sortie trop précoce.

La découverte centrale :

> MF15 peut rester le fond relativement inertiel tandis que MF3 décrit les transferts tactiques ; le prix arbitre en confirmant ou non la conversion.

---

## 13. Méthode de travail validée

La méthode doit être conservée dans la prochaine discussion.

### 13.1 Toujours partir des faits

Avant toute proposition :

- lire les trades ;
- lire les évaluations ;
- regarder les Vagues ;
- récupérer les timestamps UTC et Paris ;
- reconstruire la chronologie causale ;
- vérifier le code réellement actif ;
- vérifier Git.

### 13.2 Séparer les fonctions

1. **direction** : MCB ;
2. **timing** : 3m / lifecycle ;
3. **conversion** : prix / PM / ticker / efficiency ;
4. **contexte** : MF Memory / background / boundary ;
5. **économie** : frais / terrain restant / R:R ;
6. **protection** : risk, profit floor, stack live, invalidation.

### 13.3 Shadow avant promotion

Lorsqu’une règle est incertaine :

- `decisionImpact:false`
- événements et occurrences journalisés
- MFE / MAE
- churn
- repaint
- latence
- counterfactual
- comparaison avec la décision réelle

Une règle active doit rester étroite et démontrable.

### 13.4 Ne pas optimiser sur un cas séduisant

Une signature visuellement convaincante n’est pas encore une loi. Il faut mesurer :

- fréquence ;
- persistance ;
- terrain après occurrence ;
- contre-exemples ;
- frais ;
- boundaries ;
- différence entre entrée et sortie.

### 13.5 Discipline Git

- tests V4 complets ;
- `node --check` ;
- replay des trades de référence ;
- commit étroit ;
- push `main` ;
- ne pas embarquer BOONO-TV accidentellement.

---

## 14. Ce qui est actif et ce qui reste shadow

### Actif

- frais fee-aware ;
- hard risk ;
- 220→180 ;
- `SETUP_LATE` ;
- opportunity freshness ;
- PM3/PM5 opposition gate ;
- LIVE15 protection stack complet ;
- MF Memory admission-only ;
- data quality gate ;
- local retry requalification ;
- règles normales de sortie / profit protection.

### Shadow pur

- TP1/TP2 multi-fractions ;
- Continuation Re-entry ;
- Price Behavior ;
- LIVE15 Acceptance ;
- Structural Handoff ;
- Admission Counterfactual ;
- Elastic Synchronization v0.3 ;
- observations de divergence / lineage selon les modules concernés.

Ne pas transformer un shadow en autorité live par simple proximité conceptuelle.

---

## 15. Chantiers prioritaires pour la prochaine discussion

## Priorité 0 — Deep review causal de #143

Reconstituer une timeline toutes les 30 s / 3 min entre environ 14:30 et 16:10 Paris :

- prix ;
- MA3 / MA15 ;
- LBW3 / LBW15 / LBW15-0 ;
- BW ;
- MF3 ;
- MF15 et pente ;
- divergences ;
- E3 ;
- E15Live puis confirmé ;
- PM3 / PM5 ;
- ticker yield / effort ;
- boundary / terrain restant ;
- état setup / blockers ;
- action V4.

Questions :

1. À quel instant exact la chaîne SHORT devient-elle suffisante ?
2. Quelle preuve manquait avant cet instant ?
3. Pourquoi l’entrée réelle n’a-t-elle eu lieu qu’à 15:37 ?
4. Le LIVE15 stack-ready de 15:30 devait-il être la meilleure fenêtre ?
5. Une entrée encore plus tôt était-elle démontrable sans anticipation ?
6. Pourquoi la sortie 15:48 a-t-elle eu lieu ?
7. Quelles preuves SHORT restaient intactes après la respiration ?
8. Quelle contre-preuve aurait réellement justifié la sortie ?

## Priorité 1 — Elastic Sync : preuve / contre-preuve / conversion

Continuer à accumuler les épisodes :

- ordre des preuves ;
- délai entre preuves ;
- persistance ;
- conversion +3 / +6 / +9 / +15 min ;
- MFE / MAE ;
- boundary ;
- price response ;
- false starts.

Ne pas créer tout de suite un score arbitraire.

## Priorité 1 — LIVE15 entry acceptance

Le cas du DN 15:30 est désormais une occurrence prospectivement forte.

À mesurer :

- persistance avant acceptation ;
- gain de prix par rapport à l’entrée confirmée ;
- MFE/MAE ;
- taux de repaint avec stack complet ;
- différence entre signal brut et signal stack-ready.

## Priorité 1 — Sorties sur respiration

Le problème #143 suggère que l’autorité de sortie peut encore être trop sensible à une petite respiration.

À étudier en shadow :

- chaîne SHORT toujours intacte ;
- 3m opposé mais MF15 stable ;
- contre-mouvement non productif ;
- terrain restant ;
- reprise rapide du sens initial ;
- coût d’une sortie puis réentrée.

Ne pas supprimer les protections dures.

## Priorité 2 — Local Retry

Observer si les retries :

- récupèrent réellement des continuations ;
- créent du churn ;
- arrivent assez tôt ;
- respectent le caractère non réutilisable des preuves pré-sortie.

## Priorité 2 — Économie

- continuer TP shadow net ;
- envisager slippage ;
- funding plus tard ;
- juger les variantes en net, jamais en brut seul.

---

## 16. Fichiers de référence

Documents particulièrement importants :

- `knowledge/v4.10.0-protection-stack-2026-10-15.md`
- `knowledge/v4.10.1-opportunity-freshness-2026-10-15.md`
- `knowledge/v4.10.2-continuation-reentry-shadow-2026-10-15.md`
- `knowledge/v4.10.3-price-behavior-shadow-2026-10-15.md`
- `knowledge/v4.10.4-live15-acceptance-shadow-2026-10-15.md`
- `knowledge/v4.10.5-data-integrity-admission-shadow-2026-10-16.md`
- `knowledge/shadows-observatory-ui-v1-2026-10-15.md`
- `knowledge/audit-systeme-logique-boono-2026-10-16.md`
- `knowledge/elastic-sync-v0.3-evidence-conversion-2026-10-19.md`
- `knowledge/version-log.md`

Code principal :

- `modules/v4/core/engine.js`
- `modules/v4/layers/setup-lifecycle.js`
- `modules/v4/layers/action.js`
- `modules/v4/layers/native-signal.js`
- `modules/v4/layers/data-quality.js`
- `modules/v4/experiments/elastic-sync-shadow.js`
- `modules/v4/experiments/live15-acceptance-shadow.js`
- `modules/v4/experiments/price-behavior-shadow.js`
- `modules/v4/experiments/continuation-reentry-shadow.js`
- `modules/v4/experiments/admission-counterfactual-shadow.js`
- `modules/config-server.js`

Données :

- `data/trade-sim-v4-state.json`
- `data/trade-sim-v4-history.json`
- `data/trade-sim-v4-evaluations.ndjson`
- `data/trade-sim-v4-decisions.ndjson`
- `data/audit-history.json`
- MCB CSV sous `/root/agents-ia-zero-one/data/mcb-live/`

---

## 17. Commits de passage importants

- `e41f7cf` — Add LIVE15 acceptance shadow in V4.10.4
- `ba1fd81` — Link Shadows results to occurrence timelines
- `f4ff9a5` — Harden MCB data integrity in V4.10.5
- `b529f3f` — Requalify failed campaigns on fresh local transfer
- `94a76e5` — Measure Elastic proof conversion

Le titre des commits est moins important que leur contenu réel ; inspecter le diff avant toute modification.

---

## 18. Conclusion de passation

BOONO a progressé de règles isolées vers une lecture plus causale :

> structure → timing → reprise/attaque → réponse du prix → conversion → confirmation → contre-preuve.

Les protections et l’observabilité sont nettement meilleures, mais le système n’est pas encore démontré rentable. La prochaine avancée ne doit pas être un desserrage général. Elle doit venir d’une meilleure compréhension temporelle des transferts de contrôle, avec #143 comme cas d’étude immédiat.

Le point de départ exact de la prochaine discussion est donc :

1. moteur V4.10.7, flat ;
2. données saines ;
3. Elastic Sync v0.3 en shadow ;
4. LIVE15 Acceptance a déjà détecté une entrée SHORT prospective meilleure avant #143 ;
5. sortie #143 probablement trop précoce ;
6. objectif : reconstruire la chaîne complète, mesurer, puis seulement décider d’une modification active.
