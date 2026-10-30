# BOONOLAB — V494 : contrastes A/B/C/D réalisés et provisoires après frais

**30 octobre 2026 · intervention OD-20261030-009**
**Mandat :** « remettre en route » le panneau **CONTRASTES A/B/C/D · NET APRÈS FRAIS** de BOONO Watch, sans modifier les admissions ou sorties du PAPER.

## Diagnostic avant intervention (lecture seule)

Le comparateur factoriel était **déjà opérationnel** : PM2 `boono-v494-entry-exit-shadow` en ligne, version `boono-v494-entry-exit-lab-v0.1`, quatre branches, données mises à jour tous les ~30 s. À 19:56 UTC, 246 relevés depuis la mise en route ; **les quatre branches avaient la même position LONG virtuelle**, ouverte le 30/10 à 19:46:23 UTC à **76 745,6 $ BTC**, et **zéro clôture par branche**. Aucun décalage de politique observé (`influenceCount=0`). Le P&L réalisé B−A et les autres contrastes étaient volontairement `null`/« — » tant que chaque paire n'avait pas au moins une clôture. **Il n'y avait donc ni panne du calcul ni véritable différentiel économiquement observable**.

Sources : `data/v494-dual-module-shadow-summary.json`, `data/v494-dual-module-shadow-state.json`, commandes PM2, `modules/attention/v494-dual-module-shadow.js`, `modules/attention/v494-dual-ui-summary.js` et `modules/config-server.js`.

## Distinction comptable désormais présentée

La section SHADOWS est conservée, mais comprend désormais **deux lectures non interchangeables** :

1. **RÉALISÉ — CAMPAGNES CLÔTURÉES** : conserve exactement l'ancien contrat. B−A, D−C, C−A, D−B sont `null` tant que chacune des deux branches concernées n'a pas au moins une clôture ; le contraste de l'interaction reste `null` tant que les quatre branches n'ont pas de clôture. Les nombres sont descriptifs, sans appariement causal garanti.
2. **PROVISOIRE — PORTEFEUILLES MARQUÉS NETS APRÈS FRAIS** : affiche pour chaque branche le résultat net des campagnes entièrement clôturées **plus** la valeur estimée de la campagne éventuellement ouverte, en supposant une clôture immédiate au **dernier prix BTC réellement observé**. Les contrastes B−A, D−C, C−A, D−B et l'interaction se calculent sur ces valeurs marquées depuis la première exposition réelle, à la **même heure d'observation**.

### Formule de valorisation (montants en $ de P&L, non déplacements BTC)

Pour une position ouverte, à un prix de référence `P`, un prix d'entrée `E`, et notionnel encore détenu `N_rest` :

```
brut_restant = (P - E) × signe(LONG/SHORT) × N_rest / E
frais_sortie_restants_estimés = N_rest × 0,0005 × (P / E)
net_position_si_clôturée =
    brut_TP1_déjà_réalisé + brut_restant
    - frais_entrée - frais_TP1 - frais_sortie_restants_estimés
net_portefeuille_marqué = cumul_net_campagnes_clôturées + net_position_si_clôturée
```

Une branche FLAT conserve le net de ses campagnes clôturées ; aucune exposition préalable ne constitue pas une preuve de rentabilité. Le calcul respecte le TP1 partiel de 25 % : **le brut TP1 est compté une fois**, les frais d'entrée et de TP1 payés sont déduits une fois, et la commission de sortie restante est seulement estimée. Le calcul ne simule ni exécution au carnet, ni glissement, ni funding. **Ce P&L marqué n'est pas encore encaissé.**

Chaque carte A/B/C/D expose `Portefeuille marqué net (estimation)`, tandis que les positions affichent `net estimé si sortie`. Les contrastes précisent le statut **mêmes positions / aucune divergence**, **expositions divergentes**, **pas encore de clôtures**, ou **aucune exposition**. Un contraste marqué nul avec les quatre mêmes positions signifie une égalité d'exposition, **pas** un avantage démontré des politiques.

### Invariants préservés

- A = entrée V493 + sortie V493 ; B = même entrée + superviseur ; C = filtre MCB15 + sortie V493 ; D = les deux modules expérimentaux.
- Aucun changement de `engine.evaluate`, `entryAllowed`, sorties, stop, hard-risk, frais du simulateur, TP1, ordre financé ou source MCB. La valorisation est **dans `summary(s)`**, après les décisions, sans effet sur leur calcul.
- `brokerOrdersEnabled=false` et `decisionImpact=false` restent contrôlés dans le backend.
- Le frontend `/api/shadows/v494-dual` lit **uniquement** le résumé JSON compact, aucun historique massif. Pas de nouvelle route, ni polling supplémentaire, ni surcharge de l'État vivant.

## Fichiers et tests

- `modules/attention/v494-dual-module-shadow.js` : fonction pure `markedPosition(p)`, ajout de `markedValuation`, `portfolioMarkedNetUsd` et `markedValuationStatus` dans le résumé. La fonction de décision de trading et les positions sauvegardées ne changent pas.
- `modules/attention/v494-dual-ui-summary.js` : projection bornée des valeurs comptables et nouveaux `markedDiff` / `comparisonReadiness`, sans exposition du contexte complet.
- `modules/config-server.js` : deux sections visibles dans les contrastes, réalisé vs provisoire ; lecture de l'exposition, frais et avertissements de non-appairage.
- `tests/attention/v494-dual-marked-contrasts.test.js` : tests nets sans TP1, après TP1, branches identiques, sortie précoce B, cumul réalisé, absence de trade, absence de prix ou source ancienne.
- `tests/attention/v494-dual-shadow-ui.test.js` : tests de rendu supplémentaires, sections, 0 provisoire non trompeur, déviation de politique et XSS existant.

**Résultats des tests :** `node --test tests/attention/*.test.js tests/v4/elastic-observer-v05.test.js` → **92 tests exécutés, 92 réussis, 0 échec** (journal temporaire `/tmp/boono-v494-contrastes-regression.log`). Syntaxe Node et code JS `/app.js` généré compilés sans erreur.

## Contrôle opérationnel

Une copie de l'état et du résumé antérieurs a été enregistrée dans `/root/boono-v494-contrastes-marked-prelaunch-20261030/` avant le redémarrage du **seul laboratoire A/B/C/D**. À ce moment, son état comptait **255 observations**, et **les quatre positions LONG initiales étaient intactes**.

- PM2 `boono-v494-entry-exit-shadow` redémarré une seule fois pour charger la valorisation (PID nouveau : **1892578**), état persistant conservé, aucune reconstitution de trade.
- PM2 `config-server` redémarré pour charger la vue (PID nouveau : **1892708**), PM2 `save`.
- **Non redémarrés :** `boono-v494-paper` (PID **962864**), `boono-v543-paper` (PID **1081650**), `boono-v494-elastic-shadow` (PID **1887174**).
- Vérification du résumé réellement produit ensuite : **256 observations**, quatre branches LONG, zéro clôture, chacune `portfolioMarkedNetUsd = +2,6806 $` au prix BTC **76 959,6 $** ; `markedDiff` sur les cinq contrastes vaut **0,00 $**, `descriptiveDiff` reste `null`. Statut `DATA_RECENT`, `sameExposureAllFour=true`, `influenceCount=0`.
- Les routes UI en accès anonyme répondent toujours par la redirection d'authentification. Le JS réellement généré `/app.js` a été vérifié syntaxiquement ; **rendu exact en session authentifiée utilisateur non vérifié visuellement**.

## Statut et limites

**[AUTORISÉ]** remise en route des contrastes ; **[IMPLÉMENTÉ]** double lecture ; **[TESTÉ]** comptabilité, rendu, non-régression ; **[MIS EN SERVICE]** laboratoires et interface ; **[OUVERT]** premières clôtures et véritables divergences prospectives nécessaires pour identifier un avantage. Les chiffres exposés ne constituent **ni résultat net garanti, ni preuve d'efficacité économique**, car toutes les branches partagent encore les mêmes positions et les frais estimés ne couvrent pas le slippage/funding.

**Provenance et gouvernance :** voir [OD-20261030-009](operational-decisions/OD-20261030-009/03-origine-et-justification.md), texte original `01`, prompt opérationnel `02`, manifeste et événements de statut.
