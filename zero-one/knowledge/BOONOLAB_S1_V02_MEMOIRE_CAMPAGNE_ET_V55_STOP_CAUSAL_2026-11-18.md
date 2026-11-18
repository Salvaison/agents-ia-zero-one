# BOONOLAB — correction V5.5 du stop mécanique et S1 LBW15 v0.2 à mémoire de campagne

**Date d'exécution : 18 novembre 2026 CET.**  
**Demande :** « [stop mécanique huit dernières bougies 3m] mais c'est ridicule ce truc, ça sort d'où? [...] [PM Live +5 $ après mouvement déjà accompli] [...] “S1 v0.2 à mémoire de campagne” Oui ».

## 1. Rectification explicite de l'origine du stop

La sélection de l'invalidation V5.5 selon le plus haut/bas des **huit dernières bougies 3m clôturées** (`modules/v5/decision-v55.js#initialStop` dans la politique `v5.5-structural-place-regime-paper-v1`) a été **introduite par l'assistant lors de la création de V5.5 le 16 novembre**, sans analyse, preuve économique ni validation de l'utilisateur. C'était une substitution arbitraire à la convention existante de **swing/retest structurel réellement confirmé au moment de l'entrée**. Le risque dur de **500 $ de prix BTC** était légitime ; la sélection du niveau stop ne l'était pas. **Défaut technique reconnu, correction mise en service.**

Cas 17/11, 16h43 CET, campagne SHORT parent `short|E15:1794920400000` :
- V543 #273 : SHORT PAPER à **64 277 $** à 16h43m01s, invalidation `MCB3_CONFIRMED_SWING_HIGH` **64 735,70 $** (distance **458,70 $ BTC**).
- Ancien V5.5 : dernier extrême mécanique **65 135 $**, marge à **65 159 $** ; soit environ **882 $** de risque à 16h43m01s et **925,50 $** à 16h43m14s. Résultat `WAIT_V55_CAUSAL_SURVIVABLE_STOP`, même quand les autres preuves étaient présentes.
- Le **sélecteur de lieu purement structurel et horodaté** déjà existant dans `modules/v5/decision-v522.js#structuralPlace` restitue un swing 3m confirmé à **64 714,80 $**, connu avant cette admission. Avec sa marge de volatilité de **22,40 $**, il restitue à 16h43m01s un stop **64 737,20 $**, distance **460,20 $** sous le plafond **500 $**. Treize secondes plus tard, au prix de 64 233,50 $, le même stop implique **503,70 $**, donc est à son tour refusé. **C'est le timing et l'invalidation structurelle, pas l'élargissement du plafond, qui comptent.**
- Ce calcul as-of ne constitue pas le backtest complet du PAPER V5.5 et ne prouve pas qu'il aurait pris, conservé ou gagné #273 : toutes les autres admissions, l'horloge du tick et le risque doivent également être satisfaits.

## 2. Correction V5.5 PAPER v1.1 (MISE EN SERVICE)

`modules/v5/decision-v55.js` :
- Nouvelle politique `v5.5-structural-place-regime-paper-v1.1`.
- `initialStop(input,now,price,dir,territory,levelsMtime,base)` remplace définitivement l'extrême mécanique des huit bougies par `decision-v522.structuralPlace` **en tant que bibliothèque pure**, sans importer de décision de trading V543.
- Niveaux admissibles : swing local 3m confirmé par bougie postérieure, retest réellement tenu, ou référence 15m confirmée, côté réellement protecteur. Un niveau manuel ne peut être inclus si sa date de modification est postérieure à l'instant de décision. Les horaires `sourceTs` et `confirmedAvailableAt` sont conservés.
- **Ne jamais inventer de stop** si aucun niveau causal et économiquement admissible n'existe. Maintien strict du plafond **500 $ de déplacement BTC** ; la taille fixe fictive 1500 USD et les frais paper ne changent pas.
- Aucune modification apportée aux critères de PM, LBW15, régime, gain-floor ou aux autres autorités V5.5 dans cette correction. **Le problème d'entrée tardive #15**, avec PM Live directionnel réduit à **+5 $**, demeure un chantier d'évaluation de la productivité marginale, **sans nouveau seuil arbitraire**.

`modules/v5/paper-v55.js` :
- Changement explicite du contrat de politique de `...-v1` vers `...-v1.1` ; ledger `v5.5-paper-ledger-v1.0` conservé.
- Migration **autorisée uniquement FLAT**, refus en cas de position ouverte et refus des versions de ledger inconnues. Historique, clés d'admission consommées, solde, frais, date de démarrage, compteurs et P&L **strictement préservés**. Horodatage et motif de migration conservés dans `policyMigration`.
- Mise en service après arrêt/contrôle à plat puis relance PM2 de `boono-v55-paper`. Contrôle avant/après : **17 trades historiques**, equity réalisée **970,9447 USD**, frais comptabilisés **25,5169 USD**, 17 clés consommées, position **FLAT**, aucune donnée V494 ou V543 migrée. `boono-v543-paper` inchangé.
- Sauvegarde préalable : `/root/boonolab-v55-structural-risk-before-20261118T001310Z/` (sources et ledger), capture exacte du ledger au moment de la bascule : `v55-paper-state-freeze.json`.

## 3. S1 LBW15 v0.2, mémoire E15 persistante (MISE EN SERVICE EN SHADOW)

**S1 v0.1 reste inchangé et actif** pour comparaison prospective.  
Nouveaux fichiers : `modules/attention/v543-lbw15-s1-v02.js`, `modules/attention/v543-lbw15-s1-v02-runner.js`; PM2 **`boono-v543-lbw15-s1-v02-shadow` ONLINE**. États, résumé et événements distincts, préfixe `data/v543-lbw15-s1-v02-shadow-*`.

Le système conserve, **sans trading**, la mémoire du `parentId` E15, de la direction du parent, des contre-attaques, de leurs déplacements de prix, de leur maximum adverse, de la candidature de reprise, des reprises effectivement observées et des changements de parent. Il mesure **trois référentiels simultanés** :
1. LBW15 dans la direction du **parent E15** ;
2. LBW15 dans la direction du **candidat tactique E3** ;
3. LBW15 dans la direction de la **position PAPER réellement détenue par V543** (peut être différente du candidat et du parent).

Phases hypothétiques : `CAMPAIGN_ACTIVE → COUNTERATTACK → RECOVERY_CANDIDATE → RESUMED`. Le changement explicite de parent (`parentId` différent) produit une transition `PARENT_REPLACED` ; il ne suffit **pas** en soi pour revendiquer un transfert de force accepté sans E15 natif, cross15 et territoire défendu.

- Une attaque E3 plus PM opposés produit **une alerte de protection précoce sans demande de sortie PAPER**. L'alerte reste dans la mémoire, sans prétendre qu'une stratégie de sortie aurait été profitable.
- La reprise du parent nécessite au minimum des familles MCB3/PM et une évolution LBW compatibles, **maintenues dans le temps** avec un prix qui progresse de nouveau dans le sens du parent. L'étiquette `REQUALIFIED_SAME_PARENT_REENTRY_REVIEW` est une **hypothèse** de réadmission, non un ENTER.
- Pas de veto automatique, pas de nouvel ordre broker, `decisionImpact:false`, `entryAllowed:null`, `exitRequested:null`, `brokerOrdersEnabled:false`.
- Source live as-of : état V543 PAPER `data/v52-paper-state.json` et observations réelles S1 v0.1, *lecture seule*. Aucune reconstruction implicite de la mémoire antérieure au lancement comme si elle avait existé prospectivement.

### Relecture descriptive du 17 novembre

Script **lecture seule** `scripts/boonolab-s1-v02-replay-20261117.js`, relecture chronologique des décisions V543 archivées 15h–19h CET sans écrire d'état prospectif ni inventer des ticks futurs.
- V543 #272 SHORT 15h30–16h27 et #273 SHORT 16h43–18h46 possèdent **le même parent E15 SHORT**, malgré des oppositions E3/natives temporaires.
- Sur les journaux historiques disponibles, S1 v0.2 identifie une contre-attaque vers **15h35m46s**, une première reprise vers **16h03–16h05**, de nouvelles contestations, puis **reprise du parent vers 16h36–16h39**, avant l'entrée #273 à 16h43.
- **Mise en garde importante** : les journaux de décisions ont parfois des **trous de plusieurs minutes** ; le replay émet `S1_V02_OBSERVATION_GAP`. Les heures ainsi reconstruites sont des signaux diagnostiques, pas une preuve qu'une stratégie aurait exécuté aux mêmes prix ni que S1 était en production v0.2 à cette date.
- Maintenir des contre-exemples gagnants (#273, #13 V5.5) lors des travaux sur le seuil de productivité marginale.

## 4. Interface Watch

Nouvelle route authentifiée **`/api/shadows/boonolab-lbw15-s1-v02`**, validée en lecture seule par `boonolabReadReadonlyShadow`. Sous **SHADOWS**, nouveau panneau **« S1 v0.2 · Mémoire de campagne LBW15 »**, avec la direction/phase du parent, direction candidate et position, les trois variations LBW15 signées, attaques/reprises, dernier évènement adverse et avertissement d'absence d'autorité PAPER.

S1 v0.1 et son routeur historiques demeurent inchangés et accessibles en parallèle. L'API Watch `/api/v55-paper` est mise en cohérence avec le changement explicite de politique V5.5 v1.1, en exigeant une version reconnue et l'égalité **state.policyVersion = summary.policyVersion** ; elle ne devient pas une route de trading.

Le serveur `config-server` est redémarré ONLINE, PM2 sauvegardé. Vérification HTTP sans session : **302 vers /login** pour les routes S1 v0.2 et V5.5 ; aucune authentification contournée. La compilation JS du navigateur et la présence des panneaux sont testées en Node ; **la session navigateur authentifiée n'a pas été testée visuellement**.

## 5. Tests, réserves et comparaison prospective

- `tests/v5/v55-independent-policy.test.js` : admission structurelle, frais, hard risk, transition FLAT préservant 17 trades et autres tests V5.5.
- `tests/ui/s1-v02-watch-v55-causal-stop.test.js` : cas synthétique du **17 novembre 16h43** reproduisant la distinction du swing à 64 714,8 et du plafond de 500, migration, route S1 v0.2, contrat de version Watch, JS navigateur valide.
- `tests/attention/v543-lbw15-s1-v02.test.js` : mémoire opposée / reprise, référentiels parent/candidat/position, horloges sans futur, changement de parent sans preuve de transfert, alerte non transactionnelle, migration de version refusée.
- Tests S1 v0.1 et V5.5 Watch conservés. **45/45 tests ciblés PASS** à la première vérification d'ensemble, aucun broker.
- La comparaison économique de S1 v0.2 avec S1 v0.1, et la contribution nette du nouvel invalidateur V5.5 restent **à valider prospectivement** ; ne pas conclure sur le P&L d'un shadow sans ledger virtuel indépendant et sans réentrées réalistes.
- Les résultats des tests et la relecture ne remplacent pas le contrôle utilisateur de l'affichage dans Watch.

**Statuts :** V5.5 risk-fix v1.1 **IMPLÉMENTÉ/TESTÉ/MIS EN SERVICE** (PAPER uniquement, sans position lors de bascule), S1 LBW15 v0.2 **SHADOW IMPLÉMENTÉ/TESTÉ/MIS EN SERVICE** et S1 v0.1 toujours actif, seuils de PM marginale **NON MODIFIÉS / SUJET OUVERT**, BOONO-TV et autres services exclus de cette intervention.
