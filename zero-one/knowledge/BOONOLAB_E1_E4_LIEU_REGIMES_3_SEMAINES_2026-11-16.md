# BOONOLAB — Étude ciblée E1 / E4 confirmés, lieu structurel, régime et préparation V5.5

**Date : 16 novembre 2026, audit Amsterdam.**
**Fenêtre figée : du 26 octobre 2026 à 13h36 CET au 16 novembre à 13h36 CET (21 jours glissants).**
**Portée : diagnostic/SHADOW uniquement. Aucun PAPER V543 ou ordre de broker modifié.**

## 1. Sources et méthode causale

- Historique de clôtures PAPER : `data/v494-paper-trades.ndjson` et `data/v52-paper-trades*.ndjson`, dédoublonnés par `tradeNo`. Inclusion : **entrée dans les 21 jours et sortie terminée au plus tard au cutoff**. Les positions encore ouvertes sont exclues du P&L réalisé.
- MCB1h / MCB4h : `../data/mcb-live/mcb_1h.csv`, `mcb_4h.csv`. Pour chaque `entryAt`, dernier signal natif de type `wt1_cross_up` (E UP) / `wt1_cross_dn` (E DN) **sur une bougie entièrement clôturée avant l'entrée**. **`knownAtProxy=barStart+1h/4h` est une approximation de première disponibilité**, pas la vraie première observation de TradingView ; la date du signal natif n'est pas à confondre avec un pivot géométrique E1/E4.
- La dernière **direction E1 et E4** est conservée jusqu'à nouveau signal natif confirmé, tout en mesurant l'âge du signal et la pente du dernier LBW1/LBW4 clos. Comparaison à `direction` LONG/SHORT de chaque trade.
- **Aucun niveau de BigRange/DailyRange courant n'a été attribué rétroactivement** : `data/levels.json` ne contient qu'un état manuel daté par mtime. Archives antérieures (05/10) trop anciennes pour reconstruire les modifications successives du 26/10 au 16/11. Donc `rangeHistoryCoverage=0` pour les 21 jours étudiés.
- Les étiquettes de régime de marché proviennent uniquement des snapshots réellement enregistrés `boonolab-market-snapshots*.ndjson` **depuis le 7 novembre**, avec jointure sur le dernier `asOf <= entryAt`, écart <=105s ; elles sont **non validées hors échantillon** et relatives à l'activité précédente.
- Le P&L est celui du ledger PAPER (USD notionnel 1500, commissions incluses, sans slippage ni funding). Ne pas confondre MFE/MAE en variation de BTC$ et profit du compte.
- Script reproductible `scripts/boonolab_e1e4_3week_study.py`. Résultat JSON horodaté `data/boonolab-e1e4-historical-20261116.json`. Archive hors Git avec sources, méthode et SHA-256 : `/root/boonolab-e1e4-place-21d-20261116T125634Z/`. Ne pas utiliser le JSON de 21j comme données futures.

## 2. Résultats par alignement du dernier E1/E4 natif

Classes par rapport au trade : `BOTH_ALIGN` (E1 et E4 dans le sens du trade), `E1_ONLY`, `E4_ONLY`, `BOTH_OPPOSE`.

| Groupe | V494 n / gagnants / net USD | Lignée V5 n / gagnants / net USD |
|---|---:|---:|
| E1 + E4 favorables | 15 / 2 / **−54,3099** | 24 / 8 / **−19,7201** |
| E1 seul favorable | 42 / 7 / **−110,1359** | 49 / 21 / **−51,6329** |
| E4 seul favorable | 66 / 17 / **−145,4851** | 67 / 26 / **−53,3563** |
| E1 + E4 opposés | 77 / 27 / **−64,3506** | 63 / 25 / **−75,2608** |
| **Total** | **200 / 53 / −374,2815** | **203 / 80 / −199,9701** |

Lignée **V5.4.3 seulement** (#80–261) : 182 trades, 70 gagnants, −158,3900 $ nets. Les catégories correspondantes : 19 / −6,3824 $ ; 46 / −51,9089 $ ; 61 / −44,0395 $ ; 56 / −56,0592 $. Le mélange des anciennes versions V5 n'est donc pas une seule politique homogène.

**Pas de lien positif universel entre double confirmation E1/E4 et rentabilité** : V494 a mieux réalisé ses inflexions contre les deux confirmations que ses entrées totalement alignées ; V543 peut gagner contre l'ancien parent. Ne pas créer un veto E1/E4 opposés.

**Asymétrie V5 importante, mais échantillon trop faible :**
- 15 LONGs alignés E1+E4 : **−74,074 $**, 3 gagnants.
- 9 SHORTs alignés E1+E4 : **+54,3539 $**, 5 gagnants ; **#173 SHORT +51,0325 $** représente presque tout le résultat ; sans lui, les 8 autres totalisent **+3,3214 $**. Cette observation ne justifie pas une admission automatique SHORT.
- Bootstrap descriptif par jour (21 jours, 2 000 tirages) de la différence de net moyen par trade V5.4.3 (BOTH_ALIGN − BOTH_OPPOSE) : quantile 5 % **−4,76 $**, quantile 95 % **+8,29 $**. L'intervalle traverse zéro ; ce n'est ni un essai randomisé ni une preuve d'absence d'effet causal.

## 3. LBW15 et la compétence V494

La relation « E1/E4 contraires + pente LBW15 favorable au moment d'admettre = bonne inflexion » échoue. Parmi les 77 V494 entrés contre E1 et E4 :
- 40 entrées avec dernière variation LBW15 15m favorable au sens du trade : **−82,23 $** ;
- 37 avec dernière variation LBW15 défavorable : **+17,88 $**.

Cela ne réfute pas l'hypothèse de pré-inflexion structurelle : elle doit considérer **séquence d'extrêmes, resserrement, ralentissement, première reprise E3, retest et traduction PM/prix**, et non une pente isolée. Bonnes campagnes indispensables à ne pas détruire : V494 #96 et #162 ; V543 #165/#173/#233/#239/#243.

## 4. Régime de marché — observation partielle (7–16 novembre)

La classification as-of est retrouvée pour **85 V494 / 200** et **71 V5 / 203** seulement. Pas de reconstruction artificielle des autres dates.

| Régime observé à l'entrée | V494 n / net | V5 n / net |
|---|---:|---:|
| STERILE_HESITANT | 19 / −70,8158 $ | 31 / −51,1022 $ |
| SILENCIEUX_PRODUCTIF | 17 / −37,7151 $ | 9 / −35,9624 $ |
| DENSE_CONTRADICTOIRE | 35 / −152,6731 $ | 20 / **+38,6376 $** |
| DIRECTIONNEL_PRODUCTIF | 14 / +13,7075 $ | 11 / −31,4290 $ |

La valeur V5 DENSE est très dépendante de quelques grandes campagnes gagnantes ; **#233 +44,3753 $** à lui seul dépasse le cumul. Un veto universel des régimes contradictoires aurait effacé une réussite et n'a pas été validé.

**Nouvel objectif** : distinguer `CONTESTED_WITH_TERRITORY` (combat intense mais translation qui conserve le terrain) de `CONTRADICTORY_NO_TERRITORY` (conflits MCB/MF/PM sans progression conservée). L'état `STERILE_HESITANT` mérite une attention spécifique à l'admission, mais même un signal faible ne suffit pas comme veto hors échantillon. Intensité Bâton ≠ profondeur L2 ni liquidité passive.

## 5. Lieu de prix au contrôle et historique manquant

Le 16/11, le `levels.json` actuel n'enregistre qu'un triplet **BigRange : VAL 66 812, POC 77 121, VAH 84 671 BTC$** ; le prix récent est **sous VAL**. **DailyRange : triplet absent** au dernier contrôle. Ces chiffres sont des niveaux manuels, non des mesures permanentes du carnet OKX. Leur usage pour les 403 trades historiques est interdit faute de datation.

À partir de maintenant, le nouveau **SHADOW `boono-e1e4-place-shadow`** archive prospectivement le `mtime` du fichier de niveaux, les valeurs enregistrées, les distances prix/VAL/POC/VAH, la position normalisée non limitée entre 0 et 100 %, les horloges E1/E4, l'alignement candidat, et la qualité/tenue de terrain de l'observateur si la source est fraîche. Les niveaux mis à jour après une entrée ne sont **jamais** réappliqués rétroactivement à celle-ci.

## 6. SHADOW réellement déployé

- Module `modules/attention/boonolab-place-e1e4-shadow.js` et runner `boonolab-place-e1e4-shadow-runner.js`. PM2 `boono-e1e4-place-shadow` ONLINE ; résumé `data/boonolab-place-e1e4-shadow-summary.json`, état et événements rotatifs du même préfixe.
- Lecture seule des MCB1h/4h CSV, du niveau enregistré, des snapshots de régime et du ledger PAPER V543 ; aucune importation de broker, aucun `paper.step`, aucun effet sur les positions. Contrat `decisionImpact:false, entryAllowed:null, exitRequested:null, brokerOrdersEnabled:false`.
- Faits E1/E4 (proxies à la clôture), Big/DailyRange et classement de marché ; proposition `REVIEW_WEAK_UNPRODUCTIVE`, `REVIEW_CONTESTED_WITHOUT_TERRITORY`, `PRESERVE_CONTESTED_WHILE_MEASURING_DEFENCE`. Les frontières de rendement/rétention (0,18 et 0,45) sont **hypothèses descriptives de shadow, pas des seuils PAPER validés**.
- Les admissions et leurs résultats nets sont appariés dès qu'ils sont observables ; la statistique d'admissions PAPER réelles **n'est pas** le P&L d'un portefeuille qui aurait bloqué ces trades. Effets réentrée/position prolongée exigent un futur comparateur à exécution virtuelle cohérente.
- Tests `tests/attention/boonolab-place-e1e4-shadow.test.js` : 4/4 passés (horloges, levels causaux, opposition E1/E4, pas de veto automatique). Le nouveau SHADOW n'altère pas S1 LBW15 ou les deux branches V543 hold.

## 7. Concept de nouveau moteur : BOONO V5.5 (RECHERCHE, non PAPER)

La V5.4.3 reste baseline PAPER jusqu'à une nouvelle autorisation. Un moteur V5.5 doit être reconstruit avec quatre autorités indépendantes :
1. **Admettre** : MCB15/LBW15 dynamique + E3 récent + preuve économique + prix près d'un territoire, complétés par E1/E4 comme contexte daté, pas veto.
2. **Protéger une position** : montée d'une opposition LBW15/E3/PM avec rendement menacé, sans attendre nécessairement invalidation complète de la campagne.
3. **Reconnaître le transfert stratégique** : E15 natif, parent géométrique, cross15, conservation des niveaux et capacité de retest ; une phase `REVERSAL_FORMING` peut précéder un parent changé.
4. **Réautoriser la réentrée** : une nouvelle preuve depuis la sortie, mémoire de parent et frais d'essais ; une clôture n'autorise pas le changement de camp 5 secondes après.

**Trois forks contrefactuels futurs à éprouver** : 
- `V55_FIXED` (baseline V543 inchangée à horloge et coûts identiques) ;
- `V55_LBW_PLACE` (nouvelle hiérarchie E15/LBW, territoire contextualisé E1/E4 et BigRange) ;
- `V55_LBW_PLACE_REGIME` (ajoute la distinction stérile/contradictoire non productif vs conflit productif).

**H0** : aucune amélioration économique nette après frais, réentrées et gains manqués ; **H1** : la hiérarchie évolutive améliore le résultat net **par parent E15 et épisode de marché**, sur journées jamais utilisées pour ses seuils. Préserver #173/#233/#239 et #96/#162 ; tester #247–260 et les derniers jours stériles. Ne jamais présenter une réduction rétrospective de pertes comme une amélioration prospective démontrée.

**Statuts** : enquête 21 jours **RÉALISÉE** ; nouveau SHADOW E1/E4 + lieu **INSTALLÉ/TESTÉ/ACTIF** ; V5.5 **CONCEPT DOCUMENTÉ, aucune politique de PAPER ni risque ni broker modifiée**.
