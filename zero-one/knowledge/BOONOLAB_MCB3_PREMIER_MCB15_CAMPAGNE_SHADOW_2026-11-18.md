# BOONOLAB — Nouveau SHADOW MCB3 premier signal, MCB15 juge de campagne (18/11/2026)

**Statut : IMPLÉMENTÉ · TESTÉ · EN SERVICE EN SHADOW UNIQUEMENT.** Aucune modification PAPER V5.5 v1.1, V543, BOONO-TV ni aucun ordre financé.

## 1. Mandat et correction du modèle

L'utilisateur a corrigé la hiérarchie proposée dans la discussion du 18/11 : **MCB3 (LBW3/BW3/E3) reste le premier indicateur de l'ENTRÉE**, que MCB15 peut confirmer ou contester. MCB15 (LBW15/BW15/E15) contrôle le cadre et la continuité de campagne et peut mieux éclairer les sorties ; MF15/MF3, lieu/liquidité, PM/conversion et risque ont chacun des fonctions distinctes. Il récuse l'idée qu'une « frontière réellement établie, datée et observée » serait une invalidation intrinsèquement certaine : **aucune frontière de prix n'est garantie**. « Voilà à toi de jouer ! » autorise le chantier, pas une invention de nouveaux seuils prouvés ni la présentation d'un shadow comme moteur PAPER rentable.

Le modèle précédent V5.5 codait 18 min pour la durée maximale de Cross3, 25 min pour E3 confirmé, une série de conditions de territoire, PM, MF3, prix, régime, lieu, maturité et stop préalables à chaque entrée. La lecture demandée est **structurelle, non checklist événementielle**. En particulier, une réponse de prix à un niveau n'est pas un stop économiquement assuré et le MF15 lent doit pouvoir être informatif.

## 2. Nouveau moteur descriptif, indépendant des décisions et des comptes

- `modules/attention/boonolab-mcb3-first-mcb15-shadow.js` (pure, `boonolab-mcb3-first-mcb15-wave-shadow-v0.1`).
- `modules/attention/boonolab-mcb3-first-mcb15-shadow-runner.js`, service PM2 **`boono-mcb3-first-mcb15-shadow`**, fréquence 15s, état et résumé `data/boonolab-mcb3-first-mcb15-shadow-{state,summary}.json`, logs rotatifs `-events.ndjson` et `-samples.ndjson`. **Aucune écriture ou import de `paper.step`, de compte trader ou broker**.
- Sources : `data/v52-paper-state.json#latestAnalysis` et `modules/v5/runner-v543#latest()` en **lecture seule**, Audit Bâton horodaté, bougies 15m MCB clôturées, contexte V55 PAPER en lecture seule, observateur de régime descriptif. **L'objet parent E15 vient toujours de l'évaluateur V543, qui possède ses règles amont : zéro nouveau seuil dans ce SHADOW ne signifie pas zéro seuil dans les données d'origine.**
- La candidature tactique est **`geometry.cross3` observé**, non la candidature corrigée par le parent. Un événement MCB3 après activation initialise un épisode distinct `direction|cross3.ts`, sans péremption artificielle 18/25 min. E3 confirmé est une indication supplémentaire, pas une autorisation préalable.
- Le comportement BW15/LBW15 est lu sur **LIVE** (écart, variation 3m/15m et relative vitesse des deux courbes) ET sur les **deux dernières bougies 15m clôturées disponibles** (sens et nouveau croisement confirmé après clôture). Le `cross15` géométrique enregistré n'est pas automatiquement une confirmation clôturée.
- Parent E15 conservé à travers Cross3 opposés ; phases mémorisées `CAMPAIGN_ACTIVE`, `COUNTERATTACK`, `PARENT_RESUMPTION_ATTEMPT`, `PARENT_RESUMED`, `CONFIRMED_15M_PARENT_DISPUTE`. Parent modifié seulement lorsque **l'identité de parent observée** change, pas au premier toucher BW15/LBW15.
- MF15 variation 10m et MF3 variation 3m sont interprétés **qualitativement et conjointement** (les petites pentes restent visibles), sans nouveau seuil de magnitude ni veto indépendant ; PM3/PM5/PM combinée et prix 3m/15m sont réponses d'effort et ne donnent pas une direction indépendante.
- Lieu : MA3/MA15, niveaux cartographiés, territoire V543 restent **références descriptives seulement**, ne sont ni des niveaux certains, ni des verrous d'admission ; liquidité affichée : `volumeFenetreBtc/winSec` Bâton exprimé en BTC/min, **pas carnet L2 ou transactions acheteur/vendeur séparées**.
- Risque : la règle PAPER adverse 500 $ de prix BTC existe toujours dans V55/V543 **sans modification par ce SHADOW**. Aucun nouveau « stop structurel garanti » n'est revendiqué. Sortie sur E3 opposé : *demande d'examen local*, pas rupture automatique du parent. Croisement 15m confirmé opposé : *alerte structurelle majeure*, pas transmission automatique d'ordre.

## 3. Relecture causale du 17 novembre, sans simulation fictive

Script lecture seule : `scripts/boonolab-mcb3-first-replay-20261117.js` ; environ **209 décisions V543 archivées entre 15h00 et 19h00 CET**, **41 trous de plus de 90s** explicitement relevés. Cette relecture dispose des bougies 15m clôturées as-of, mais **pas** de l'Audit 30s continu sur toute la plage : prix de réponse sur 3m/15m et activité historiques sont `UNKNOWN` quand absents. Pas de P&L SHADOW simulé.

Faits reconstitués :
- Parent SHORT persistait pendant les conflits V5.5 #14 et V543 #272 ; vers 15h35m46s MCB3 était LONG et le 15m restait SHORT : `TACTICAL_COUNTERPARENT`.
- **15h45m56s** : un croisement BW15/LBW15 LONG **confirmé sur clôture 15m** alors que parent SHORT subsistait. Ce cross15 n'a pas fait disparaître durablement la campagne : **16h03m16s** MCB3 et 15m étaient à nouveau SHORT. Il n'est donc **pas scientifiquement défendable de décréter cross15 confirmé = liquidation systématique du parent**, mais il mérite une forte autorité d'ALERTE.
- **16h39–16h43 CET** : Cross3 SHORT, 15m Live SHORT et clôturé SHORT, parent toujours SHORT ; au même instant V543 entre SHORT #273 à 16h43m01s tandis que l'ancien V55 l'avait manqué puis rentrait tard #15.
- Nouveau parent LONG observé vers **18h30m37s**. **34 changements Cross3** distincts dans les journaux de cette fenêtre contre **1 changement de parent E15** : bonne illustration du danger de transformer chaque événement 3m en campagne indépendante, **pas une fréquence exhaustive des vrais ticks MCB**.

Baselines PAPER exacts, non attribués au SHADOW : V55 #14 −6,9988 $, #15 −3,1879 $ ; V543 #272 −5,1431 $, #273 +10,111 $ nets. Aucun modèle de position virtuelle avec frais, réentrées et sorties alternatives n'est encore validé pour ce nouveau moteur.

## 4. Watch, tests et statut

- Route authentifiée `/api/shadows/boonolab-mcb3-wave` vérifie `SHADOW_ONLY`, `decisionImpact=false`, `brokerOrdersEnabled=false`, version exacte et fraîcheur.
- Sous **Watch → SHADOWS**, nouveau panneau repliable « BOONOLAB · MCB3 PREMIER SIGNAL / MCB15 JUGE LA CAMPAGNE » : 3m cross/native/live, 15m Live/clôturé/gap/pentes, MF15/MF3, PM, lieu, volume Bâton et mémoire de campagne ; n'efface ni S1 v0.1 ni S1 v0.2.
- **53 tests ciblés PASS, 0 FAIL** : causalité, absence de signal futur sur bougies clôturées, cross15 confirmé non converti automatiquement en EXIT, mémoire du parent, MF15 faible, contact MA non promu en défense certaine, API/UI et non-régression V55/S1.
- `boono-mcb3-first-mcb15-shadow`, `config-server`, V55/V543 PAPER et S1 v0.2 PM2 **ONLINE**, services sauvegardés. API répond **302 /login** sans session, protection normale. **Rendu réel dans la session navigateur utilisateur non observé**.

## 5. Prochain niveau de preuve avant d'autoriser PAPER

L'essai prospectif doit comparer le temps entre la première hypothèse Cross3 et la réaction BW15/LBW15/MF15/MF3, et déterminer si la nouvelle hiérarchie réduit les admissions tardives **sans** augmenter les faux départs, les frais, ou les changements prématurés de parent. Construire ensuite un simulateur de **positions complètes** (risk 500, frais, exposition, coups tactiques et reprise), en conservant les bonnes campagnes de V543 et les trades gagnants V55 comme contre-exemples. **Aucune promotion automatique de cette interprétation dans V5.5 PAPER** tant que la politique de sorties et son comportement économique ne sont pas vérifiés. L'absence de nouveaux seuils ne prouve ni la qualité des signaux ni la rentabilité.

**Statuts :** principe de hiérarchie MCB3-first / MCB15-judge = CORRECTION UTILISATEUR ; SHADOW = IMPLÉMENTÉ/TESTÉ/EN SERVICE ; moteur V55 PAPER = INCHANGÉ ; validation économique et migration = OUVERTES.
