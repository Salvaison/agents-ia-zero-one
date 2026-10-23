# BOONO Systems — V5 : audit critique, arrêt des trades et recherche du malentendu

**23 octobre 2026 — arrêt effectif vers 09:55 Stockholm/Paris ; enquête, AUCUNE correction stratégique.**

## 1. Vérité opérationnelle et préservation

Le processus PM2 `boono-v5-shadow` a été **arrêté**, puis `pm2 save` a conservé son état stopped. Il ne génère plus d'hypothèse, d'entrée ni de sortie automatique V5. `cerveau-central` / BOONOTRADE V4.10.10, TradingView, config-server et BOONO-TV restent opérationnels, sans redémarrage induit.

Le simulateur V5 était en position **SHORT PAPER**, entrée à 81 745,0 $ BTC ; dernière cotation simulée conservée **81 575,3 $**. Cette position reste **ouverte dans l'état figé** : pas de clôture fabriquée, ni de P&L réalisé ajouté. Le contrôle concerne uniquement des positions locales de simulation : `brokerOrdersEnabled:false` ; aucun ordre V5 à montant financé n'a jamais été envoyé.

Copies des preuves horodatées et contrôlées par empreintes SHA256, conservées **uniquement sur Amsterdam** (non publiées sur GitHub) dans `archives/v5-paper-stop-forensics-20261023/` :
- `v5-paper-state.json` ;
- `v5-paper-decisions.ndjson` (1 958 évaluations conservées) ;
- `v5-paper-trades.ndjson` (22 clôtures) ;
- `v5-shadow-memory-state.json` ;
- `elastic-observer-events.ndjson` ;
- `audit-history.json` ;
- `sha256_manifest.txt`.

## 2. Résultat économique des 22 trades V5 clos

| Indicateur | Résultat |
|---|---:|
| Trades clos | **22** |
| Gagnants/perdants | **4 / 18** |
| Taux de réussite | **18,2 %** |
| P&L brut estimé | **−38,74 $** |
| Frais taker modélisés (1 500 $ ×0,05% par côté) | **−33,00 $** |
| P&L net réalisé | **−71,74 $** |
| Equity papier après clôtures | **928,26 $** |
| MFE médian, prix BTC | **64,0 $** |
| Durée moyenne | **33,5 min** |
| Sorties sur chaîne opposée | **14 (0 gagnant ; −61,09 $ net)** |
| Sorties sur gain floor | **7 (4 gagnants ; +0,14 $ net total)** |
| Sortie hard risk 500 $ prix | **1 (−10,79 $ net)** |

Les frais aggravent une stratégie **déjà négative avant frais**. Ni le funding, ni le slippage, ni les écarts de fill ne sont modélisés. Ce simulateur observé sur 30s n'est pas équivalent à des ordres exécutés sur carnet OKX.

### Les 22 opérations et leur relation structurelle

Reconstruction causale de la direction 15m avec **le module V4 exact** `modules/v4/layers/structural-trajectory.js`. Les bougies CSV confirmées ont été limitées aux données dont `barTs+15 minutes <= entryTs`, empêchant l'utilisation des bougies non encore terminées. Ce calcul n'était PAS stocké par V5 en contexte d'entrée ; il sert de **contrôle indépendant a posteriori** avec des données disponibles à la date de l'entrée.

| # | Entrée Stockholm | Sens V5 | Direction E15→E15 reconstruite | Accord | MFE BTC $ | P&L net $ | Motif de sortie |
|---:|---|---|---|:---:|---:|---:|---|
| #1 | 22/10 17:30 | SHORT | LONG | **NON** | 61.0 | -4.97 | Chaîne adverse |
| #2 | 22/10 18:00 | LONG | LONG | OUI | 5.6 | -10.79 | Risque 500 |
| #3 | 22/10 19:42 | LONG | LONG | OUI | 36.3 | -4.45 | Chaîne adverse |
| #4 | 22/10 21:01 | LONG | LONG | OUI | 139.0 | +0.12 | Gain floor |
| #5 | 22/10 21:51 | LONG | LONG | OUI | 7.3 | -6.12 | Chaîne adverse |
| #6 | 22/10 22:45 | SHORT | LONG | **NON** | 73.8 | -5.27 | Chaîne adverse |
| #7 | 23/10 00:01 | LONG | LONG | OUI | 46.7 | -3.75 | Chaîne adverse |
| #8 | 23/10 00:19 | SHORT | LONG | **NON** | 65.4 | -1.84 | Chaîne adverse |
| #9 | 23/10 01:46 | LONG | SHORT | **NON** | 47.7 | -2.82 | Chaîne adverse |
| #10 | 23/10 02:08 | SHORT | SHORT | OUI | 126.9 | -0.53 | Gain floor |
| #11 | 23/10 02:43 | LONG | SHORT | **NON** | 91.8 | -4.90 | Chaîne adverse |
| #12 | 23/10 03:36 | SHORT | LONG | **NON** | 51.8 | -6.09 | Chaîne adverse |
| #13 | 23/10 03:45 | LONG | LONG | OUI | 186.5 | -1.07 | Gain floor |
| #14 | 23/10 04:00 | SHORT | LONG | **NON** | 45.9 | -4.84 | Chaîne adverse |
| #15 | 23/10 04:21 | LONG | LONG | OUI | 457.5 | +1.56 | Gain floor |
| #16 | 23/10 05:30 | LONG | LONG | OUI | 214.2 | +0.10 | Gain floor |
| #17 | 23/10 06:00 | SHORT | SHORT | OUI | 130.1 | -0.05 | Gain floor |
| #18 | 23/10 06:27 | SHORT | SHORT | OUI | 192.3 | +0.00 | Gain floor |
| #19 | 23/10 07:16 | LONG | SHORT | **NON** | 0.0 | -5.26 | Chaîne adverse |
| #20 | 23/10 07:28 | SHORT | SHORT | OUI | 17.7 | -4.82 | Chaîne adverse |
| #21 | 23/10 08:00 | SHORT | SHORT | OUI | 62.6 | -2.71 | Chaîne adverse |
| #22 | 23/10 08:10 | LONG | SHORT | **NON** | 87.3 | -3.26 | Chaîne adverse |

## 3. Anomalie 1 — Confusion d'autorité du E15 (CONFIRMÉE dans le code, vérifiée sur trades)

**Constat :** 9 trades V5 sur 22 ont une direction opposée à la trajectoire 15m `structural-trajectory.js` reconstituée **avec les seules données confirmées déjà disponibles à l'entrée**. Aucun de ces neuf trades n'est gagnant :
- **Contre structure : 9 trades, 0 gagnant, −39,25 $ net**, MFE médian 61 $ BTC.
- **Avec structure : 13 trades, 4 gagnants, −32,49 $ net**, MFE médian 126,9 $ BTC.

Dans `modules/v5/elastic-memory-engine.js`, `processEvent()` prend `e.direction` du dernier événement E15 Live / confirmé et le mémorise comme `anchor.live/confirmed.direction`. Puis `modules/v5/opportunity-engine.js`, `evaluate()`, effectue littéralement :

```js
const slow=a.live&&a.live.observedAt<=ts?a.live:a.confirmed;
const direction=slow.direction;
```

**C'est le malentendu sémantique.** Un signal natif ponctuel E15 et la **trajectoire structurelle causale E15→E15** ne sont pas le même objet. V4 possède justement `modules/v4/layers/structural-trajectory.js`, qui reconnaît un CREUX confirmé comme origine d'une ascension structurelle LONG, et une CRETE confirmée comme origine d'une descente structurelle SHORT ; il maintient ce trajet à travers les respirations locales. **V5 n'importe ni ne calcule cette trajectoire dans son admission**.

Ce n'est donc pas un bug de signe UP/DN inversé de façon universelle. C'est **l'élévation d'un événement tactique en thèse stratégique**, avec le risque qu'un E15 Live opposé mais provisoire l'emporte immédiatement sur l'ancre confirmée.

Des exemples documentés :
- **#1 22/10 17:30 SHORT** : dernière structure causale = CREUX LBW environ **−89,0 / direction LONG** ; V5 sélectionne SHORT après une impulsion prix/PM localement baissière ; perte −4,97 $.
- **#6 22/10 22:45 SHORT** : la même structure E15 reste LONG ; V5 SHORT sur PM3 −9 $ et PM Live −1,4 $ ; perte −5,27 $.
- **#12 23/10 03:36 SHORT** : structure reconstruite CREUX LBW **−44,0 / LONG** ; PM3 −111,8 $, PM5 −179,1 $ ; le prix a déjà reculé d'environ 171 $ dans les 15 minutes précédentes ; sortie neuf minutes plus tard, perte −6,09 $. Nouveau LONG #13 trente secondes après.
- **#19 23/10 07:16 LONG** : structure reconstruite CRETE LBW **+70,1 / SHORT** ; prix +187 $ depuis 30 minutes ; MFE de ce LONG **0 $**, perte −5,26 $ ; nouvelle entrée SHORT #20 trente secondes après, également perdante.
- **#22 23/10 08:10 LONG** : même structure CRETE **+70,1 / SHORT** ; V5 appelle `MCB15 confirmé LONG` la dernière étiquette native E15, non le trajet causal de V4. Perte −3,26 $.

**Observation additionnelle :** les **neuf** admissions contraires à la trajectoire avaient toutes un déplacement de prix sur les **30 minutes précédentes** orienté dans le sens du trade V5. Le système a donc fréquemment suivi une impulsion récente contraire à la campagne supérieure ; ce comportement est compatible avec une entrée en fin de contre-effort, mais ne démontre pas à lui seul le caractère épuisé de chaque impulsion.

**Précaution :** le module V4 de reconstruction des pivots utilise deux bougies de confirmation 15m ; son audit as-of a exclu les bougies non encore clôturées. Ce contrôle est une comparaison indépendante. Les descriptions MCB structurelles des neuf cas sont des **directions reconstruites**, non des champs réellement journalisés par V5 à l'entrée.

## 4. Anomalie 2 — Une mémoire riche qui ne participe pas à la décision (CONFIRMÉE)

Le moteur `v5/elastic-memory-engine.js` suit correctement, à titre expérimental :
- `threads` : segments de vague E15 ;
- `lineageEdges` : liens entre segments, appartenance `UNRESOLVED_CANDIDATE` ;
- `attempts` : tentatives E3 opposées / favorables et séquences temporelles ;
- `hour.buckets` : distribution des qualités sur **4 × 15m** ;
- `observation.mf15Slope`, `mf15` et historique de terrain.

Mais `v5/opportunity-engine.js` ne consomme **aucun** `threads`, `lineageEdges`, `attempts`, `hour.buckets`, `mf15Slope`, `priceHigh/Low`, niveau MCB/range, 1h/4h/Daily/Weekly ou espace économique disponible.

Il ne demande en pratique que :
1. dernier signal E15 Live s'il existe, sinon dernier signal E15 confirmé → **direction proposée** ;
2. dernier événement E3 récent **de la même direction** ;
3. signe des déplacements **PM3 et PM5** ;
4. signe du PM Live (champ `audit.priceMove`).
5. Classe de QUALITÉ observée, **mais non bloquante** : `hardContradictions=contradictions.filter(x=>!x.startsWith('Qualité '))`.

Les preuves peuvent arriver sans ordre rigide — principe validé — mais **l'absence d'ordre rigide n'autorise pas à oublier leur phase ou leur lien causal**.

**Le défaut principal est donc un contrat de données incomplet entre l'architecture de compréhension et l'architecture de décision.** V5 utilisait une collection de signaux corrélés, pas encore sa compréhension des campagnes.

## 5. Anomalie 3 — Une impulsion PM passée pour une opportunité encore ouverte (CONFIRMÉE dans le code)

Le critère d'entrée exige seulement `pm3*direction>0`, `pm5*direction>0`, `pmLive*direction>0` et E3 de la bonne direction. **Aucune valeur minimale PM Live**, aucune comparaison du rendement **marginal** au rendement antérieur, aucune phase `INITIATING/BREATHING/EXHAUSTING`, aucune localisation structurelle ni estimation de rendement net disponible.

Exemples de PM Live tout juste du bon côté malgré une admission :
- #6 SHORT : **−1,4 $** ;
- #9 LONG : **+0,4 $** ;
- #18 SHORT : **−5,9 $** ;
- #20 SHORT : **−0,4 $**.

Une qualité `INEFFICIENT` ou `SILENT` n'interdit pas une admission, puisque QUALITÉ est volontairement sortie des `hardContradictions`. L'intention de ne pas dupliquer la conversion était pertinente, mais **elle ne remplace pas la mesure de sa phase temporelle**, qui n'était pas encore implémentée dans la décision.

Plusieurs entrées utilisent également un ancrage E15 très ancien comme direction d'admission : les événements E15 initiaux des #5, #20 et #21 étaient observés depuis environ 91, 88 et **120 minutes**. L'ancre structurelle peut être légitimement ancienne ; ce qui est erroné est de faire d'une étiquette E15 ancienne une **preuve directe de fraîcheur économique**.

## 6. Anomalie 4 — Churn / inversion de position (CONFIRMÉE)

- **15 inversions de direction dans les 21 passages entre trades successifs.**
- **10 entrées opposées à la position précédente dans les deux minutes suivant la sortie**, plusieurs après seulement **30 secondes**.
- **14 sorties `EXIT_OPPOSING_V5_CAUSAL_CHAIN`**, toutes perdantes : **−61,09 $ net**. Leur MFE médian est seulement **49,8 $ BTC**.
- Identité anti-churn V5 : `entryKey = direction|slow.sourceTs|e3.sourceTs`. Elle interdit de réutiliser **la même paire E15/E3**, mais un nouvel E3 autorise une nouvelle position dans la **même campagne historique**. Ce n'est pas une véritable mémoire de campagne/respiration.
- Un nouveau signal opposé E15/E3/PM assez convergent peut fermer une position, puis ouvrir dans le camp adverse une demi-minute plus tard. **La fenêtre d'exploitation a été confondue avec une campagne nouvelle**.

Séquence aiguë #11→#15 (23/10 02:43–05:25) :
LONG −4,90 ; SHORT −6,09 ; LONG −1,08 ; SHORT −4,84 ; LONG +1,56 = **−15,33 $ net**. Ces trades se suivent dans un marché à contre-efforts rapides sans que le moteur sache conserver une thèse lente commune.

Une autre séquence #19 LONG, #20 SHORT, #21 SHORT, #22 LONG totalise environ **−16,05 $ net** en moins de deux heures. #19 et #22 sont opposés à la trajectoire 15m, mais #20/#21 la suivent et perdent aussi : une **simple correction de direction ne réparera pas le churn ni le timing**.

## 7. Sorties et frais : les protections ne compensent pas le malentendu d'admission

| Sortie | Nombre | Gains | Brut | Frais | Net |
|---|---:|---:|---:|---:|---:|
| Chaîne adverse | 14 | 0 | −40,09 $ | −21,00 $ | **−61,09 $** |
| Gain floor virtuel | 7 | 4 | +10,64 $ | −10,50 $ | **+0,14 $** |
| Risque 500 $ prix | 1 | 0 | −9,29 $ | −1,50 $ | **−10,79 $** |

Les seuils du gain floor V5 (+120/+90, +220/+180 en déplacement de prix) ne sont contrôlés que sur les relevés de **30 secondes**. Une cotation peut déjà avoir traversé le plancher au cycle suivant :
- #10 SHORT : MFE +126,9 $, sortie avec seulement **+52,8 $** prix depuis entrée ; P&L **−0,53 $ net**.
- #13 LONG : MFE +186,5 $, sortie **+23,1 $** prix ; P&L **−1,08 $ net**.
- #17 SHORT : MFE +130,1 $, sortie +79,2 $ ; P&L **−0,05 $ net**.
- #15 LONG : MFE +457,5 $, sortie +166,5 $ prix ; P&L +1,56 $ net, inférieur au plancher théorique +180 $ faute de résolution.
Ce n'est PAS le système de protection dure V4.10.10 sur ticks ; ce sont des stops virtuels V5 et une hypothèse de prix de sortie au relevé suivant. On ne doit donc pas comparer ces résultats à des fills réels garantis.

## 8. Diagnostic hiérarchisé : ce qui est établi, ce qui reste hypothétique

### Démontré
1. **Mauvaise source de direction :** V5 prenait le dernier signal natif E15 (Live prioritaire) pour une trajectoire structurelle MCB, au lieu de l'interprétation causale E15→E15 de V4.
2. **Décision déconnectée de la mémoire :** les séries E15/E3, tentatives, MF et QUALITÉ 4×15m existaient en observation mais n'avaient pratiquement aucun rôle dans l'admission.
3. **Confluence ponctuelle insuffisante :** PM3/PM5/PM Live seulement du bon signe, sans phase, rendement marginal ou terrain restant ; le paper pouvait entrer même sur un PM Live quasi nul.
4. **Churn :** exits sur chaîne opposée, puis réentrées inverses en 30–120 secondes ; les blocs anti-doublons limitaient un événement E3 mais pas la continuité d'une campagne.
5. **Économie défavorable :** gross −38,74 $, frais −33 $, net −71,74 $. Les stops virtuels aux 30s ne garantissaient pas leur niveau de sortie.

### Hypothèses à tester, ne pas promulguer comme règles
- L'appartenance des E3 successifs à une campagne supérieure peut distinguer contre-effort, respiration et bascule de contrôle.
- Une QUALITÉ 4×15m, prise comme synthèse de conversion, et la conservation du terrain pourraient différencier une première impulsion productive d'une dernière impulsion.
- La relation de prix à MCB/range et le régime 1h/4h peuvent servir à apprécier le potentiel d'extension, sans veto universel du contexte lent.
- L'âge économique des confirmations doit être évalué par la phase, non un délai fixe.

### Critère de reprise de l'expérimentation V5
**Pas de redémarrage ni de nouvelle admission** avant de reformuler le contrat observation→thèse→opportunité, puis rejouer **les 22 trades**, les neuf entrées contre trajectoire, les treize entrées alignées et les cas productifs de référence. La protection technique et la comptabilité de frais restent des responsabilités distinctes. Après ces tests, une nouvelle proposition de moteur papier devra être explicitement approuvée. L'état V5 courant demeure gelé.

## 9. Provenance des faits
- Historique V5 `data/v5-paper-state.json` et `data/v5-paper-trades.ndjson` ;
- 1 958 décisions observées dans `data/v5-paper-decisions.ndjson` ;
- `data/audit-history.json`, source des prix/PM Live 30s ;
- `data/elastic-observer-events.ndjson` E15/E3 Live et confirmés ;
- `/root/agents-ia-zero-one/data/mcb-live/mcb_15m.csv` avec reconstitution as-of `modules/v4/layers/structural-trajectory.js` (seulement bougies confirmées avant les entrées) ;
- code V5 `modules/v5/elastic-memory-engine.js`, `opportunity-engine.js`, `paper-trader.js`, `elastic-memory-watch.js`.
- Dossier d'archives figées `archives/v5-paper-stop-forensics-20261023/`.
