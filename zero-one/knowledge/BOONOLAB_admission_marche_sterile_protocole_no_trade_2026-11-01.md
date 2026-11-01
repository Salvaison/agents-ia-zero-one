# BOONOLAB — Quand ne pas trader : admission trop précoce en marché stérile et contradictoire

**1er novembre 2026 — protocole de recherche, sans changement PAPER.**
**Origine, message exact du propriétaire :**
> Je trouve que dans ce marché les moteurs ont tendance à rentrer trop tot, il manque qqe contraintes, qqe confirmations supplémentaire pour l'entrée dans un tel marché. BooNo devrait éviter de trader dans un tel marché

**Statut : HYPOTHÈSE D'ADMISSION À ÉPROUVER, PAS UNE RÈGLE VALIDÉE.** Aucun seuil/veto ni politique LIVE/PAPER n'est modifié ici. La demande indique clairement l'objectif d'éviter les entrées dans un marché peu exploitable, **mais ne définit pas de frontière d'admission mesurée ni n'autorise un seuil numérique arbitraire**. Référence : [audit du 1er novembre](BOONOLAB_marche_contradictoire_liquidite_active_campagnes_2026-11-01.md), [méthode BoonoLab](BOONOLAB_methodes_analyse_et_criteres_2026-10-28.md), [conventions et seuils](BOONOLAB_conventions_seuils_verrous_actifs_2026-10-28.md).

## 1. La difficulté confirmée — quatre phénomènes, ne pas les confondre

- **Environnement pauvre** : de vendredi 30 octobre à dimanche 1er novembre, sur 01h–20h locale, débit estimé `volumeFenetreBtc/winSec` de **0,862 à 0,174 BTC/s** médian, déplacement absolu de Bâton **22,55 à 2,60 BTC$**. Source : archives Audit14D, fenêtres glissantes corrélées.
- **Chaînes contradictoires** : dimanche, **47 E3 LONG confirmés, 46 E3 SHORT confirmés** ; 21 des 69 quarts d'heure avec E3 confirmé comportent les deux sens ; 14 bougies 15m sur 26 avec BW/LBW15 observé présentent les deux sens. **Les croisements Live ne sont pas des retournements E15 confirmés**.
- **Entrées initiales sans suite** : V494 dimanche #69 SHORT MFE 8,5 BTC$, #70 SHORT 6,9, #72 SHORT 18,6, #73 LONG 20,0, #75 SHORT 19,9, toutes perdantes après frais. V543 #140 SHORT MFE 33,7 BTC$ et #142 LONG MFE 0 : confirmations d'admission insuffisantes dans leurs épisodes particuliers.
- **Entrées initialement productives mais mauvaises sorties** : V543 #141 SHORT MFE 254,6 BTC$ puis −2,2296 USD net à la sortie, et V494 #71/#74 MFE >160 BTC$ puis net négatif. **Ces cas ne sont PAS équivalents à une admission sans potentiel** ; les utiliser pour durcir un filtre d'entrée confondrait admission et maintien.

Un MFE mesuré après la position n'est pas une preuve qui était disponible à l'entrée. Une « bonne » admission doit être défendue par des observations `availableAt <= entryAt`, puis jugée sur le comportement et coût de campagne, pas seulement sur son résultat final.

## 2. Les verrous existants : pourquoi un simple supplément de confirmations ne suffit pas

### V4.9.4

`modules/v4/layers/market-quality.js` définit `DORMANT` (seul état bloquant directement l'admission), `CHOP_SHADOW` / `LOW_EDGE_SHADOW` (qualités défavorables mais seulement conditions partielles renforcées) et `DIRECTIONAL/MIXED`. `modules/v4/layers/setup-lifecycle.js` distingue majeure paire MCB15, exception `UP_REINFORCED`, réautorisation rolling 3m/5m, nouvelle preuve après sortie; `modules/v4/layers/action.js` exige déjà certains PM/efficacités en CHOP et conserve des bypass natifs conditionnels. **Le régime difficile est reconnu, mais trop de candidatures peuvent encore arriver et être autorisées sans qu'une continuité de territoire ait été éprouvée.**

L'audit a **recalculé retrospectivement** la qualité à l'heure de l'entrée avec les fenêtres Audit historiques et les équations de ce module (ce n'est pas une capture du champ `marketQuality` exact du moteur à l'époque) :
- Vendredi 30 octobre, **9/10** entrées V494 auraient été classées `CHOP_SHADOW` ; ces neuf comprennent **cinq gagnantes** et totalisent **+29,27 USD nets** sur leur ledger réel.
- Samedi 31 octobre, **9/10** auraient été `CHOP/LOW_EDGE` et **aucune** des dix entrées n'était gagnante.
- Dimanche 1er novembre, **7/8** auraient été `CHOP/LOW_EDGE` ; leur groupe comprend le SHORT **#76 à +4,7429 USD net**, MFE 469,4 BTC$.

Cela **réfute un veto universel sur `CHOP_SHADOW`**, qui bloquerait aussi des mouvements authentiquement productifs. Un seuil de **débit inférieur à 0,25 BTC/s** aurait lui aussi rejeté #58 (vendredi, +7,8419 USD) et #76 (dimanche, +4,7429 USD) : seuil **non validé**. Le ticker à l'entrée de #76 classait même la conversion `INEFFICIENT`, effort/P75 ~8,43 et rendement/P75 ~0,88. **Ne pas transformer `POWERFUL`, `EASY`, `INEFFICIENT` ou `SILENT` en verdict indépendant** : leur qualité ponctuelle est sensible aux micro-fenêtres.

### V5.4.3

`modules/v5/decision-v541.js` exige déjà cohérence du parent MCB15/E15, opportunité 3m causale, MF, MA, ancre de risque et territoire présumé défendu; `decision-v543.js` ajoute mémoire de maturité. Mais le champ `entryContext.economics.viable`, bien que disponible, **n'est pas un veto d'entrée**. Une étude le rendrait inapplicable en l'état : **12/14** entrées V543 du vendredi avaient `viable=false`, **15/16** le samedi, et **6/6** le dimanche, **dont trois trades nets positifs**. Le calcul de « room » au prochain bord n'est donc pas une prévision calibrée du potentiel total de la campagne.

Sur les entrées V543 #137–144, `tacticalAdmission.allowed=true`, `checks.verifiedTerritory=true` et `flow15.qualityGrade=REINFORCING` se retrouvent également sur des faux départs. Plusieurs `testedTerritory.status=CONFIRMED_MA3_ACCEPTED_AFTER_PRICE_CONTACT` signifient **contact/acceptation MA3**, mais le code de la preuve précise qu'un simple franchissement local n'est **pas** un territoire indépendamment défendu. Exemple #142 LONG : MCB15 parent LONG, PM3 +62,2, PM5 +48,5, PM Live +21,6, MF3/MF15 apparemment cohérents, MA3 acceptée, pourtant MFE **0** BTC$ et perte nette −3,0493 USD. **Ajouter encore un vote parmi ces mêmes familles ne suffit donc pas.**

**Contre-exemples d'abstention générale** : #139 LONG entre en `STRUCTURAL_REVERSAL_FORMING` contre un parent SHORT, avec débit préalable faible, mais atteint MFE +271,4 BTC$, net +0,8176 USD ; #144 SHORT produit MFE +302,1 BTC$, net +0,9041. Un veto de toutes les formations contraires au parent E15 ou de tous les faibles débits supprimerait aussi ces bonnes tentatives.

## 3. Hypothèse de nouvelle autorité : `MARKET_EXPLOITABILITY / NO_NEW_ENTRY`

**Une phase de marché n'est pas un nouveau signal directionnel.** Ne pas doubler les votes E3/cross ou MF/même divergence. Proposer une **machine d'état d'attention à l'exploitabilité**, distincte de la direction du parent MCB15 :

1. **`OBSERVE_NORMAL`** : admissions inchangées ; des signaux MCB/PM propres continuent de pouvoir initier une campagne.
2. **`FRAGILE / CONTRADICTORY`** : observer simultanément, *sur des fenêtres réellement couvertes*, la pauvreté de traduction prix/effort, la répétition de chaînes tactiques LONG et SHORT contradictoires, et l'absence de **territoire prix confirmé tenu**. Le débit relatif au passé et l'horaire/week-end sont de **simples descriptions** ; pas de veto isolé.
3. **`NO_NEW_ENTRY`** : seulement si **la stérilité de traduction et l'instabilité de polarité et le défaut de conservation du territoire** sont corroborés dans les familles indépendantes. Bloquer de **nouvelles** entrées, pas les sorties/protections des positions déjà ouvertes ; préserver hypothèse MCB15, source et mémoire E3/E15, refus et motif, pour que l'observateur ne reset pas son histoire.
4. **`REQUALIFYING`** : levée du droit d'abstention **par une nouvelle preuve causale**, non par simple écoulement du temps : nouveau test de frontière prix et **acceptation conservée après la dernière contre-attaque observée**, ou réelle continuation de parent confirmé avec retest ; PM3/PM5/Live prouve translation durable au-delà de l'effort; MF confirme la persistance ou n'invalide pas la requalification. Une conversion silencieuse peut requalifier si **le prix conserve réellement le territoire**, même à faible débit ; éviter un quorum arbitraire de volume.
5. Retour `OBSERVE_NORMAL` seulement si le régime a démontré un rendement/territoire à nouveau exploitables, sans nécessairement avoir besoin d'un E15 entièrement inversé.

**Hiérarchie recommandée, à soumettre à la validation expérimentale :** MCB15 thèse / phase E15 → **examen d'exploitabilité du marché (abstention ou requalification)** → prix/MA/territoire post-signal et post-contre-attaque → PM/MF indépendants et rendement net → risque. Le nouvel examen ne vote pas LONG/SHORT et ne transforme pas WHERE en veto universel ; il peut suspendre des entrées **si une situation contradictoire multi-famille est prouvée**, et être levé par preuve également indépendante. Pour les retournements `STRUCTURAL_REVERSAL_FORMING` et les admissions MCB15 nouvellement inversées, privilégier une vraie **acceptation territoriale post-dernier signal adverse**, plutôt qu'un simple autre E3 ou contact MA. Pour les continuations soutenues, autoriser l'exemption si une défense déjà démontrée persiste.

**Les seuils (durée/part de fenêtres CHOP, définition de rendement stérile et stabilité de la défense, taille du déplacement économiquement exploitable par rapport aux frais) ne sont PAS démontrés par cette cohorte.** Ne pas inventer un « 5 minutes », « 0,25 BTC/s », « 250/325 $ consommés » ou « deux E15 obligatoires » sans test indépendant. Le seuil de rentabilité peut être dérivé des frais (à ~77 000 BTC/USDT et 0,05 % taker/côté, déplacement d'équilibre ~77 BTC$ pour 1 500 USD notionnels) mais **il ne constitue ni une exigence de déplacement pré-entrée ni une prédiction de range**.

## 4. Protocole expérimental à réaliser AVANT promotion sur PAPER

- **Détection en shadow et as-of** sur les deux PAPER, sans affecter les ordres ni les exits : journaliser chaque `ENTER` candidat, motif d'abstention ou requalification, composantes MCB15 / origine E3 / croisement BW-LBW / prix tenu / PM / MF / Bâton et environnement, **disponibilité horodatée**. Toute absence de source = `UNKNOWN`, pas preuve de marché stérile.
- **Deux tests opposés** : (A) réduire les petits faux départs #69, #70, #72, #73, #75 (V494) et #140, #142 (V543) ; (B) vérifier les exceptions qui doivent survivre si leurs preuves sont réellement antérieures : V494 #58/#76 et V543 #139/#143/#144. Les mauvais P&L issus de la **sortie** (#141, #74, #71) ne sont pas utilisés comme preuve qu'une admission devait être interdite.
- **Replay/évaluation sur fenêtres non chevauchantes et campagnes E15** : compter sans double vote les candidatures refusées, reprises efficaces et fausses permissions, P&L net réellement évité **si abstention**, commissions économisées, gains manqués en cas de faux veto, latence des entrées requalifiées, exposition de même parent, et rentabilité économique du portefeuille hypothétique. Un simple retrait des trades perdants du ledger sans reproduire les nouvelles admissions permises **n'est pas un backtest complet**.
- **Perspective prospective** : au moins plusieurs campagnes et régimes différents, pas seulement le week-end 30/10–1/11, avant d'introduire une autorité de NO_TRADE. Décrire les « événements qui rendent le marché à nouveau exploitable » sans exiger que l'on devine à l'avance le début d'une grande vague.
- **Gouvernance :** cette note est une hypothèse/protocole pour discussion. Aucun code/paramètre/admission en PAPER V494 ou V543 n'a été changé dans cette enquête. Toute validation de mise en service se documentera séparément (source intégrale, prompt opérationnel, tests, déploiement et nouveaux résultats).

## 5. Décision de méthode

**Ce qu'il faut construire :** une **faculté d'abstention** fondée sur le défaut persistant de traduction et de territoire dans un marché contradictoire, avec un mécanisme explicite de **réouverture des admissions** lorsqu'une preuve nouvelle apparaît.

**Ce qu'il ne faut pas construire :** un veto « samedi », un seuil brut de volume, un filtre `CHOP_SHADOW` autonome, un blocage universel des `STRUCTURAL_REVERSAL_FORMING`, ni un veto automatique sur `economics.viable` dans son état actuel. Chacun aurait rejeté des opportunités réelles dans les cas examinés.

**Résultat visé :** moins de faux départs et de frais, sans rendre BOONO aveugle aux débuts discrets mais prouvés de véritables campagnes.
