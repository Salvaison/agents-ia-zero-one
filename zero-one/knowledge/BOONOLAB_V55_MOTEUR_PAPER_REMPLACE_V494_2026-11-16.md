# BOONOLAB — V5.5 PAPER, remplacement opérationnel de V494

**16 novembre 2026 — Amsterdam, déploiement contrôlé.**
**Autorisation utilisateur :** « Tu pourrais remplacer 494 par un moteur V5.5 avec les évolutions proposée ». Le contexte explicite est le comparatif PAPER V494/V543. Il s'agit d'un **second moteur PAPER expérimental**, **pas d'une exécution financée** ni d'un remplacement de V543.

## 1. Origine et résultat

- L'étude des 21 jours clôturés dans `knowledge/BOONOLAB_E1_E4_LIEU_REGIMES_3_SEMAINES_2026-11-16.md` trouve une asymétrie potentielle LONG/SHORT, mais aucun veto universel E1/E4 justifié. La pente LBW15 isolée ne sélectionne pas les meilleures campagnes. Le phénomène retenu est la **chronologie LBW15 → E3 → PM et prix → défense territoriale → E15**, avec E1/E4 et lieu de prix comme contexte.
- V494 est **stoppé** et archivé depuis OD-20261116-001, **216 clôtures, 58 gagnants, net −403,0901 $ PAPER**, sans position ouverte au retrait. Ne pas migrer son capital/trades.
- V543 PAPER `v5.4.3` demeure en ligne et inchangé, avec son ledger `data/v52-paper-state.json`.
- **V5.5** est démarré dans un nouveau processus `boono-v55-paper` : version politique `v5.5-structural-place-regime-paper-v1`, ledger `v5.5-paper-ledger-v1.0`, fichier `data/v55-paper-state.json`, journal des clôtures `v55-paper-trades.ndjson` et journal des décisions `v55-paper-decisions.ndjson`. Nouveau capital initial PAPER **1 000 USD**, notionnel fictif **1 500 USD/trade**, **0 trade**, **position FLAT** au démarrage ; aucune importation du vieux ledger.
- Démarrage as-of `1794835067838`, gardé identique après redémarrage du service. Le flux OKX BTC-USDT-SWAP des transactions et tickers est reçu ; chaque admission est postérieure à ce démarrage. Une décision `WAIT_V55_NEW_MCB3_CROSS` immédiatement après activation prouve qu'il ne réutilise pas le dernier cross antérieur comme nouvelle opportunité.
- `brokerOrdersEnabled=false` et **aucun import/accès broker**. Les frais taker modélisés sont `0,05 %` à chaque entrée et sortie (≈1,50 USD aller-retour au notionnel 1500 USD). **Slippage et funding non modélisés.** La perte maximale en prix de référence est **500 $ de mouvement BTC**, ce qui n'est PAS une garantie de perte du compte nominal ni une exécution réelle.

## 2. Quatre autorités séparées dans V5.5

**A. Admission — nouvelle expérience**, implémentée dans `modules/v5/decision-v55.js` :
- Le dernier cross3 doit être **observé dans les 18 min et postérieur à l'activation V5.5**. E3 natif confirmé récent aligné (<=25min et chronologiquement lié au cross) ou E3 Live actif et observé dans la bougie courante ; E3 seul ne suffit pas.
- Trajectoire LBW15 avec **observations Bâton réellement horodatées**, changements sur 3/15 minutes ; continuation si pente signée 15min >=−1 point et 3min >=−2 points, **inflexion anticipée contre parent E15** si pente 15min >=+4 et 3min >=0. Ces seuils sont exploratoires et modifiables uniquement par nouvel OD après résultats.
- Preuve de **territoire PRIX** : bougie 3m clôturée au-delà d'un front local, puis retest confirmé et tenue, ou retest/MA confirmé et récent extrait sans contradiction du contexte MCB. Un simple contact de MA ou croisement géométrique sans réponse prix ne suffit pas.
- Conversion : PM3 et PM5 signés >=+8 BTC$ chacun, PM Live non franchement contraire (>=−10 BTC$ signé), MF3 signé >=−0,15 ; prix 3m dans le sens d'au moins max(22 BTC$, 0,28× range 3m typique) et déplacement signé 15m au moins −35 BTC$. Ces seuils ne sont pas « preuves statistiques ».
- Contradiction **nouvel E15 natif confirmé contraire plus récent que le parent + cross15 opposé** : veto à une **nouvelle continuation**. Une formation d'inflexion soutenue peut précéder la confirmation du changement géométrique, mais ne reçoit pas autorité stratégique automatique.
- Maturité/prix : ne pas poursuivre une offensive sur le bord directionnel 2h si le déplacement 4h dépasse 4 ranges moyens 15m et que LBW15 n'offre plus d'élan.
- E1/E4 WT1 natifs ne sont évalués qu'**après clôture de leurs bougies 1h/4h** (heuristique d'heure de disponibilité, pas événement natif exact observé). Ils décrivent le macro, **sans veto universel**.
- `BigRange/DailyRange` : les triplets manuels sont appliqués seulement si leur `mtime <= now`. Hors zone de valeur (LONG sous VAL ou SHORT au-dessus VAH) **contre E1 et la direction du prix 2h**, exiger en plus **un nouveau retest réel du prix** et **un E15 confirmé dans le sens ou un E15 Live avec pente LBW15 forte**, plus un déplacement 15m favorable. POC/VAL/VAH = **lieu de prix manuel**, PAS profondeur L2 ni liquidité cachée.

**B. Régime de marché — expérimentation PAPER distincte** :
- Régime connu et frais de moins de 95s depuis `boonolab-market-observer-summary.json`. Aucune reconstruction de l'observatoire hors échantillon n'est inventée.
- `STERILE_HESITANT` : attendre, sauf **défense prix réellement validée** ET déplacement 15m >max(90,0,9×range3m) ET PM positive soutenue.
- `DENSE_CONTRADICTOIRE` n'est **pas** interdit globalement. Si `pathEfficiency<0,18` **ET** `retainedFraction<0,45`, admission différée sauf même triple preuve d'offensive productive. Ceci protège les périodes contradictoires **sans territoire conservé**, pas les campagnes #173/#233 prometteuses à titre d'hypothèse.
- `DIRECTIONNEL_PRODUCTIF` et direction 2h contraire : demander un mouvement 15m confirmé suffisant. `SILENCIEUX_PRODUCTIF` n'est pas un veto absolu. Les classifications restent **non validées hors échantillon**, malgré leur usage explicite dans le nouveau PAPER expérimental.
- Macro E1/E4 tous deux SHORT + direction 2h SHORT : LONG nouveau exige E15 LONG confirmé, mouvement et retest de prix fort ; pas de « petit rebond = marché haussier » automatique.

**C. Protection de position** :
- Un **HARD_RISK indépendant** se déclenche à −500 BTC$ de mouvement contraire sur un tick frais. Le niveau d'invalidation initial est un extrême **des huit dernières bougies 3m clôturées** (+buffer, stop à distance >30 et <500 BTC$), enregistré à l'entrée, jamais retouché rétroactivement.
- Une preuve opposée **E15 natif confirmé APRÈS l'entrée + cross15 contraire + PM/MF adverse** peut demander EXIT même si le parent géométrique est encore ancien. Une perte d'invalidation confirmée par une clôture 3m et contre-flux peut demander EXIT.
- Un transfert LBW15/MCB3/PM adverse peut déclencher protection **seulement avec restitution significative du MFE** (>=max(85,30 % du MFE) et MFE passé >=100 BTC$) ; une contre-vague sans conversion adverse ne ferme pas nécessairement la position. Une hypothèse qui se dégrade avant gains peut être invalidée si prix, LBW15, MCB3, PM et MF convergent.
- Il n'y a **pas de gain-floor autonome +120→90 / +220→180**. Les sorties sont structurelles/économiques ; le risk dur reste souverain. Tests des départs hésitants #165 à maintenir lors des comparaisons.

**D. Réentrées** :
- Dans un **même parent E15**, délai minimum de 15 minutes après sortie et **nouveau cross3 + nouvelle défense de prix** postérieurs à la sortie. `entryKey` consommée et mémorisée, pas de réentrée sur l'ancienne impulsion. Jamais de sortie et d'entrée opposée sur le même tick PAPER. Les parents E15 peuvent contenir plusieurs sous-épisodes, sans réadmission instantanée.

## 3. Architecture et statut des services

- **Read-only common evidence** : `modules/v5/runner-v543.js#latest()` pour les mêmes fichiers Audit, MCB1h/4h/15m/3m et niveaux ; `decision-v543.evaluate(position:null)` est appelé **comme extraction de structure et de preuves**, jamais comme autorité d'admission/sortie V5.5 ; il ne copie ni ordre ni ledger.
- `modules/v5/decision-v55.js` décide exclusivement les nouveaux ENTER/HOLD/EXIT et contextes.
- `modules/v5/paper-v55.js` effectue exclusivement la **comptabilité fictive**, frais, clé entrée et risk hard ; aucune API broker.
- `modules/v5/runner-v55.js` tourne à période 5s, observe le flux public OKX, journalise seulement les états significatifs ; écrit de manière atomique des états et résumés `v55-paper-summary.json`. Son archive ouverte permet calcul du P&L net par **campagne E15** et compte les frais associés.
- **Important** : V55 et V543 possèdent deux connexions au même marché, mais les ticks observés ne sont pas identiques au milliseconde près ; les comparatifs causalement discriminants exigeront une **relecture commune de leurs événements par horloge partagée**. N'attribuer aucune supériorité à la latence ou au hasard des premiers fills.

## 4. Présentation Watch et archives

- `config-server.js` publie `/api/v55-paper` sous authentification, lecture/contrôle `PAPER_ONLY`, `brokerOrdersEnabled:false`, distinction `PAPER_RECENT`/source stale (95s).
- **TRADES → ÉTAT VIVANT** présente V543 et un nouveau panneau V55 (remplaçant le panneau live V494), avec décision, position, compte, E1/E4, LBW15, Big/DailyRange et régime.
- **TRADES → HISTORIQUE** compare V543 et V55, avec une section **V494 arrêtée** repliée et accessible à la demande.
- **VAGUES** : bande supérieure bleue **V55**, bande inférieure rose **V543** ; les rapports de trades `V55:n` ont leur propre route `/api/paper-trade-report/v55/n` et incluent la chaîne d'entrée/lieu/régime. Les vieux V494 restent disponibles via l'archive du ledger, pas comme bande live courante.
- La version BOONO-TV OVH n'est **pas** touchée dans ce chantier, pour éviter d'interférer avec les modifications graphiques en cours. Le précédent retrait des résultats V494 dans TV demeure.

## 5. Tests et limites

- `tests/v5/v55-independent-policy.test.js` : tests de compte nouveau, frais, hard risk, entrée/sortie, E15 confirmé opposé, inflexion contre parent, champ E1/BigRange et régime, anti-churn.
- `tests/ui/v55-watch-replacement.test.js` : contrat lecture seule, route authentifiée, remplacement V494 par V55, portage des rapports et bands.
- Tests régressions Waves/History/Watch (anciens comparateurs mis à jour aux nouveaux moteurs), ancienne version historique toujours vérifiée.
- **45/45 tests ciblés PASS**, syntaxe Node valide, `pm2` V55 et V543 ONLINE, V494 STOPPED, port Watch protégé 302 vers login lorsqu'aucune session valide n'est fournie.
- **Backtest complet hors échantillon non réalisé**. Les 21 jours sont du matériau pour le diagnostic, pas preuve de rentabilité; la nouvelle politique ne doit pas être optimisée rétrospectivement sur seuls gagnants. À l'activation, aucune clôture V55 (donc aucun résultat positif/negatif annoncé).
- Les états S1 LBW15 et E1/E4/Lieu demeurent **SHADOW**, indépendants du V55 PAPER, pour contrôler sa nouvelle autorité. Requiert suivi par parent E15, faux départs, périodes stériles, MFE restitué, frais, gains manqués et réentrées.

**Statuts** : demande V5.5 PAPER **AUTORISÉE**, implémentation et tests **RÉALISÉS**, PM2 et Watch **MIS EN SERVICE**, **résultats économiques non validés**. Financement broker **désactivé**.
