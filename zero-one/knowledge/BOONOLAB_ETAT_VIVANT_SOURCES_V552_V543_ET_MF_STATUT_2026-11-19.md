# BOONOLAB — État vivant : sources V552/V543 explicites et statut du MF conditionnel

**19 novembre 2026, 19h39 CET — intervention d'interface uniquement.**  
**Statut : intitulés et hiérarchie Watch CORRIGÉS / TESTÉS / MIS EN SERVICE ; intitulé BOONO-TV CORRIGÉ / VÉRIFIÉ ; décisions PAPER INCHANGÉES.**

## 1. Question et réponse exacte

Question utilisateur : « "Je n'ai pas encore modifié les décisions PAPER : V552 v1.2 reste actif ... Cette autorité conditionnelle doit être éprouvée" je comprends pas, c'est un shadow ou c'est actif dans les décisions de 552 et pourquoi est il encore inscrit dans l'interface "état vivant 5.4.3" ».

**Réponse :**
- La règle « **MF15/MF3 arbitre secondaire uniquement lorsque MCB et le prix sont déjà indécis, ou que les preuves structurelles d'une position s'affaiblissent** » existe seulement comme **orientation documentée** dans `knowledge/BOONOLAB_V552_MF_ARBITRE_SECONDAIRE_EN_INCERTITUDE_2026-11-19.md` (commit `6ddd2c7`). **Ce n'est ni un SHADOW PM2, ni un comportement actif** dans les décisions V552.
- V552 PAPER en service, politique `v5.5.2-lbw15-live-vigilance-campaign-paper-v1.2` : MF15/MF3 sont mesurés et classés comme **DESCRIPTIFS, sans veto ni permission indépendante**. L'autorité conditionnelle exprimée par l'utilisateur est **validée conceptuellement, NON IMPLÉMENTÉE**, et exige encore une validation comparative sur faux Cross15 Live et bonnes campagnes.
- V543 (`boono-v543-paper`) et V552 (`boono-v552-paper`) sont **deux moteurs PAPER actifs, autonomes et comparés** ; V551 est arrêté. Il n'existe aucun moteur MF supplémentaire.
- **L'ancien grand panneau Watch `ÉTAT VIVANT — V5.4.3` était VRAIMENT alimenté par V543** (client `loadV52PaperPanel()` → `/api/v52` → `renderV52Living()`), pas par V552. Sous lui un bloc repliable V552 avait sa source distincte `/api/v552-paper`. C'était un problème de priorité visuelle et de compréhension, **pas une confusion de comptes dans le backend**.
- BOONO-TV avait un mélange autorisé mais insuffisamment étiqueté : `boono-tv/bridge.js#normalizeV543Live()` construit sa lecture MCB/État vivant détaillée **à partir de V543**, et transmet séparément `engine552` (compte, position et décisions V552). La scène affichait `s.version` (V543) sans expliciter le moteur PAPER V552 connecté.

## 2. Correction UI réellement déployée

### Watch / Amsterdam

Dans `modules/config-server.js` :
- Au montage dynamique de **TRADES → État vivant**, le premier panneau visible est désormais `V5.5.2 · DÉCISION ACTIVE · PENTE LBW15 LIVE / VIGILANCE / CAMPAGNE`, dont **les seules** valeurs de décision PAPER sont récupérées de `/api/v552-paper`.
- Le grand bloc complet `V5.4.3 · COMPARATEUR PAPER / LECTURE MCB` suit immédiatement. Il continue de récupérer ses **propres valeurs V543** via `/api/v52`, y compris les graphes de conversion et le ticker 4×15 indépendant dont son DOM assure le montage. Ne jamais appeler ces valeurs « calcul de décision V552 ».
- Une ligne supérieure indique `ÉTAT VIVANT · V5.5.2 PAPER · V5.4.3 COMPARATEUR`. L'intitulé `BOONO V5.4.3 · ÉTAT VIVANT` a été remplacé par un intitulé de comparateur explicite et le panneau supplémentaire de structure V543 est étiqueté comme source V543.
- La réorganisation n'efface ni `v52-live`, ni `v52-mini-conversion`, ni `v52-mini-ticker`, ni les autres panneaux d'analyse. Les anciennes archives restent accessibles.
- Back-up pré-modification : `/root/boonolab-archives/V552_WATCH_LABEL_BEFORE_20261119T183437Z/config-server.js`. **Redémarrage `config-server` uniquement**, PM2 sauvegardé ; route V552 HTTP **302 → /login** sans session, contrôle d'authentification préservé.

### BOONO-TV / OVH

Modification **de libellé seulement** dans les trois branches de `renderState(s)` du fichier OVH `/home/ubuntu/boono-tv-studio/runtime/boono-tv/scene/app.js` :
- Lorsque `engine552.status==='DATA_RECENT'`, le bandeau indique `MCB V5.4.3 · PAPER V5.5.2 + V5.4.3`. Sinon, il revient à l'ancien `s.version` : aucune donnée fraîche V552 inventée.
- **Aucun changement de source, d'algorithme, de trading, de Composer, de vidéos, de rotations, de radio ni de graphique.**
- Sauvegarde pré-modification : `/home/ubuntu/boono-tv-studio/backups/V552_LIVING_SOURCE_LABEL_20261119T183519Z/app.js` ; diff reproductible dans le dépôt `scripts/v552-living-source-label-ovh.patch` (3 substitutions ciblées, aucune autre modification OVH).
- Code OVH vérifié avec `node --check` et compilation VM ; vrai `/api/snapshot` reçu, avec `source=V543_PAPER_STATE_READ_ONLY`, `engine552.source=V552_PAPER_LEDGER_READ_ONLY`, `engine552.status=DATA_RECENT`. `boono-studio` et `boono-radio` sont `active`. Pas de redémarrage vidéo nécessaire.

## 3. Preuves et statut PAPER

- **105 tests ciblés PASS / 0 FAIL** (V552 v1.2, V551/V55 non-régression, Watch source, UI historique, BOONO-TV). `tests/v5/v5-live-structure-main-ui.test.js` a été actualisé : le test ancien « V5.2 primaire » était une hypothèse désormais fausse. Il vérifie maintenant la priorité V552 et le comparateur V543, tout en contrôlant la conservation du ticker/conversion.
- Compilation du JS embarqué Watch via VM : réussie ; priorité DOM `v552-paper-details` **avant** `v52-live`, et appels distincts `/api/v552-paper` et `/api/v52`.
- **Aucun fichier `modules/v552/*`, `modules/v5/*`, aucun ledger et aucune politique de trading modifiés** dans cette intervention. À 19h39 CET, V552 et V543 PAPER online, V551 stopped ; V552 v1.2 LONG ouvert, compte réalisé **970,243 USD**, 15 clôtures, observations récentes. Ne pas confondre les résultats V543 avec l'equity V552.
- La richesse des cinq rubriques Watch/État vivant **reste pour l'instant produite par V543**. V552 a un panneau décisionnel propre, mais n'a **pas encore une reproduction autonome de chaque visualisation riche V543** : cette distinction doit rester visible jusqu'à une future refonte de données/UX, et un simple renommage n'y remédierait pas.

## 4. Travaux encore ouverts

**Non réalisé et ne devant pas être annoncé comme actif :** MF comme arbitre secondaire sous `POLARITE_INCERTAINE` ou `CONVICTION_ENTREE_AFFAIBLIE` ; aucun `MF gate` ne doit redevenir global sans preuve. La condition de déclenchement doit être d'abord une incertitude **MCB/prix objectivement observée**, puis MF peut discriminer un doute, sans créer une entrée ou exit lorsque la thèse structurelle est ferme. Évaluer #2, #4, #6, #7–#9 et le SHORT manqué de 15h55 ; documenter admission évitée, bonne continuation préservée et frais, sur données as-of.

**Gouvernance :** correction UI V552 en service et observée par test ; convention MF secondaire **décidée/documentée mais toujours non implémentée/testée/activée sur PAPER**. Ne jamais présenter cette proposition comme un SHADOW qui tourne.
