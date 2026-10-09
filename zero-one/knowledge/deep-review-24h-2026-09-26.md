# BOONO — Deep Review 24 h — 2026-09-26

Fenêtre causale : 2026-09-25T08:59:25.562Z → 2026-09-26T08:59:25.562Z.
Transport : Remote Desktop Commander, device `BOONOTRADE-VPS`.
Configuration : `V3EXP-20260924-WHERE-NOVETO-DOM2OF4-R1`.
Méthode : OBSERVATION DATA→CONTEXT→WHERE→STATE→SEQUENCE→CONVERSION→DOMINANCE ; DÉCISION ELIGIBILITY→RISK→ACTION.

## Verdict exécutif

[DÉMONTRÉ] WHERE reste strictement non-veto : 2 880/2 880 évaluations ont `location.decisionImpact=false`, zéro veto de localisation. Les 96 raisons contenant le mot WHERE sont des justifications d'admission « WHERE descriptif », jamais des refus.

[DÉMONTRÉ] Le contrat structurel reste cohérent : 2 880/2 880 états `ACTIVE`, onze entrées sur onze alignées au dernier leg E15→E15, trois `EXIT_STRUCTURE` seulement sur nouvel E15 opposé confirmé.

[FALSIFIÉ] L'amélioration économique observée la veille ne se maintient pas sur cette fenêtre : 11 trades, 5 gagnants / 6 perdants, −2,4045 % levier simulé, profit factor 0,685. MFE cumulé 832,9 $, MAE 843,3 $.

[AMBIGU] Le desserrage dominance 2/4 devient préoccupant mais n'est pas causalement isolé : les deux nouvelles entrées directement promues 2/4 perdent −1,8214 %. Depuis l'activation, le sous-ensemble 2/4 est à 0/4 et −3,1400 %. Cependant trois de ces quatre campagnes atteignent 3/4 entre 30 et 150 secondes plus tard, à prix quasi identique ou meilleur.

[DÉCISION] Aucun seuil, code, processus ou rôle de module modifié. La revue dédiée trois-trades reste seule propriétaire d'un changement de seuil.

## DATA / qualité

- 2 880 évaluations, 1 385 décisions et 2 880 shadows lus en streaming depuis les segments NDJSON actifs/récents.
- Zéro ligne invalide, doublon ou régression ; max gap évaluations/shadows 31,3 s.
- Snapshot `boono-live-snapshot-v2.0` généré à 08:59:25Z ; dernières données âgées de 27–30 s.
- La lacune causale du 23/09 reste déclarée [DONNÉES INSUFFISANTES], sans backfill.
- Processus essentiels online ; aucun redémarrage pendant la revue. Disque : 19 % utilisé.
## OBSERVATION

### CONTEXT / MCB

- Prix 84 365 → moyenne 84 034,6 → 84 164,2 $, range 83 130–85 220,9 $, variation −200,8 $.
- Phase 15m : MONTEE 69,8 %, DESCENTE 30,2 %. Nested3m : DESCENTE 54,1 %, MONTEE 45,9 %.
- Régimes : COMPRESSION 31,7 %, TRANSLATION 29,0 %, TENSION_BALANCE 21,3 %, CHOC_COMBAT 11,8 %, HACHOIR 6,2 %.
- Au gel, LBW/BW/MF15 = 66,19/56,54/9,44 et LBW/BW/MF3 = 32,69/41,84/15,35 : géométrie haussière en maturation, sans permission directionnelle autonome.
- Stack MA200 5/5 au-dessus au gel, positionnel uniquement.

### WHERE / niveaux / trendlines

- WHERE pertinente sur 846/2 880 évaluations (29,4 %).
- Confluence actuelle : LGI active 84 156,3 (7 contacts, pente +6,96 $/h) et MA200 15m 84 157,5, le prix étant 84 164,2.
- Par catégorie d'entrée : WHERE courante 3 trades / −1,8831 % ; mémoire WHERE 6 / +0,3837 % ; aucun lieu exploitable 2 / −0,9050 %.
- [DÉMONTRÉ] La seule présence/absence du lieu n'explique pas la performance ; la séquence réaction-déplacement-espace restant demeure nécessaire.

### STATE / SEQUENCE / CONVERSION

- Structure SHORT sur 2 010 évaluations, LONG sur 870 ; neuf états/raffinements, tous `ACTIVE`.
- Legs majeurs : LONG 84 020→85 238,7 ; SHORT 85 238,7→83 413 ; LONG 83 413→84 145,3 ; alternances plus petites ensuite jusqu'au SHORT actif 84 090,2→83 836,2.
- Le mouvement dominant non résolu reste SHORT 85 238,7→83 413 (1 825,7 $), retracé d'environ 48,4 % au gel.
- `fullyRetraced=true` sur 287 évaluations (10,0 %), purement descriptif.
- Les deux admissions pendant `fullyRetraced=true` perdent −2,1524 % au total. Les contrôles ont limité leur nombre, mais leur efficacité économique reste [AMBIGUË] sur seulement deux cas.
### DOMINANCE / divergences

- Dominance persistante LONG : 764 évaluations ; SHORT : 673.
- Promotion expérimentale 2/4 observable sur 277 évaluations.
- Divergences présentes en shadow sur toute la fenêtre, jusqu'à six simultanées ; aucune n'a déclenché seule une entrée.
- Au gel : une divergence haussière, trois baissières et une baissière en formation ; aucune permission autonome.

## DÉCISION

### ELIGIBILITY → RISK → ACTION

- `entryAllowed=true` sur 96 évaluations ; 9 ENTER_SHORT, 2 ENTER_LONG, 450 HOLD, 5 EXIT_EXECUTION, 3 EXIT_RISK, 3 EXIT_STRUCTURE.
- Refus non exclusifs : turning frais absent 2 469 ; dominance 2 274 ; nested3m 945 ; R:R 854 ; régime 520 ; protection/respiration 374.
- WHERE/localisation : zéro veto.
- Capture pondérée des cinq gagnants : 64,4 % de leur MFE.

### Campagnes lieu → réaction → déplacement

- Meilleur trade : SHORT 84 576,3→84 398,5, +2,1022 %, lieu mémoire 84 618,9 cinq minutes avant, 42,6 $ consommés, 556,3 $ d'espace, R:R 2,28, capture 80,7 %.
- Meilleure conversion : SHORT 84 013,9→83 902,7, +1,3236 %, WHERE courant, déplacement initial nul, 271,4 $ d'espace, R:R 3,14 ; sortie après giveback, capture 41,9 %.
- Entrée la plus tardive par déplacement : SHORT 84 831,6 après un lieu à 85 085,6, 254 $ déjà consommés en 4 min 32 s ; MFE 9,2 $, résultat −1,1859 %. [DÉMONTRÉ] Exemple de réaction déjà largement consommée malgré un R:R affiché 1,98.
- Deux campagnes sans lieu exploitable sont mixtes : +0,5085 % puis −1,4136 % ; WHERE non-veto n'est ni validé ni falsifié par elles seules.
- Les deux nouvelles entrées 2/4 : LONG −0,3597 % puis SHORT −1,4617 %. Elles atteignent respectivement 3/4 après 30 s (+7,1 $) et 150 s (+3,9 $ favorable) : le seuil 2/4 n'est pas la cause unique des pertes.

### Occasions manquées

- Douze campagnes alignées structure+nested3m+dominance ont produit au moins 100 $ de MFE à 15 min sans admission.
- Les cas les plus nets : LONG 83 395,7, +351 $ MFE/15 min, bloqué par CHOC_COMBAT et turning absent ; LONG 84 210, +297,2 $, turning absent ; SHORT 85 045, +246 $, turning absent.
- [DÉMONTRÉ] Le turning frais reste le verrou principal et explique une part significative de la faible répartie.
- [AMBIGU] Ces occasions ne justifient pas un desserrage quotidien : plusieurs surviennent en CHOC_COMBAT/HACHOIR et certaines ont une MAE importante.
## Bloc expérimental et gouvernance

Le bloc #3 officiel est à 3/3 :
- SHORT 84 576,3→84 398,5 : +2,1022 % ;
- SHORT 84 636,8→84 826,4 : −2,2402 % ;
- SHORT 84 831,6→84 932,2 : −1,1859 %.

Total bloc : −1,3238 %, 1 gagnant / 2 perdants, profit factor 0,614.

[FINALISÉ] Le bloc #3 a été revu puis archivé avec le verdict `NO_THRESHOLD_CHANGE`. Les huit trades de débordement ont été réconciliés sans perte : bloc #4 `+0,7687 %` (2W/1L), bloc #5 `−0,0281 %` (2W/1L), puis bloc #6 actuellement à `2/3` et `−1,8214 %`. Aucun seuil n'a changé.

## État au gel et scénarios

Prix 84 164,2 $, aucune position V3.

- structure SHORT `ACTIVE` 84 090,2→83 836,2, `fullyRetraced=true` ;
- phase 15m et nested3m MONTEE, aucun turning frais ;
- dominance SHORT persistante 3/4, preuve 0,787, terrain conservé 0,815 ;
- régime CHOC_COMBAT ;
- cible 83 836,2, protection d'exécution 84 296,9, R:R 2,47 ;
- ACTION `WATCH SHORT`, refus : régime, nested3m opposé, turning absent.

Scénario SHORT : perte de la confluence 84 156–84 157, réintégration sous 84 090 puis conversion de 83 836/83 742/83 413, avec turning SHORT frais, nested3m SHORT et sortie de CHOC_COMBAT.

Scénario LONG : maintien de 84 156, franchissement de 84 296,9 puis 84 760/85 238,7 ; cela reste un retracement tant qu'un nouvel E15 LONG opposé n'est pas confirmé.

## Décision finale

Aucun seuil de trading, protection ou responsabilité de module n'est modifié. WHERE reste non-veto ; dominance reste 2/4 avec proof ≥0,62 et terrain conservé. Le suivi des blocs a été réconcilié et le helper de revue transporte désormais automatiquement les overflow. Le prochain changement éventuel reste interdit jusqu'à la troisième clôture du bloc #6.
