# BOONO Systems — Incident d'horodatage V5 PAPER, archivage UI, et hypothèses macro

**23 octobre 2026 — correction UI uniquement, aucun moteur décisionnel changé.**

## I. Constat utilisateur

La section V5 du panneau État V4 continuait d'afficher une prétendue preuve actuelle :
- « MCB15 confirmé SHORT observé 07:15 »
- « E3 CONFIRMED SHORT observé 07:45 »
- « PM Live −1,6 $ »

Or **`boono-v5-shadow` est arrêté**, avec un `v5-paper-state.json` gelé depuis le 23/10 **09h56m04s Stockholm / 07h56m04s UTC**. L'hypothèse n'était donc pas en cours, encore moins une nouvelle thèse structurelle sur le marché du début d'après-midi.

Le code `modules/v5/opportunity-engine.js` générait les heures par `toISOString().slice(11,16)`, donc **en UTC**, sans mention de fuseau dans les phrases. Contrôle des événements réels `elastic-observer-events.ndjson` :
- E15 **DN confirmé** à **09h15m44s Stockholm**, source de bougie **09h00 locale** (la chaîne du journal disait à tort « observé 07h15 » sans dire UTC).
- E3 **DN confirmé** à **09h45m44s Stockholm**, source **09h42 locale** (la chaîne disait « observé 07h45 » sans dire UTC).
- Les deux événements sont avérés dans le journal. Ils ne sont **pas** des permissions structurelles E15→E15. À l'arrêt, V5 avait encore confondu le sens d'un événement E15 natif avec la trajectoire E15→E15.

## II. Correctif interface
- L'API auth `/api/v5` expose `paperStatus: FROZEN_ARCHIVE` lorsque le dernier relevé V5 est vieux de plus de 90s, et conserve `lastPaperAt` et la provenance des chaînes `evidenceOriginalTimezone:UTC`, `evidenceSemantic:NATIVE_E15_E3_EVENTS_NOT_STRUCTURAL_TRAJECTORY`.
- Le panneau TRADES → État V4 affiche explicitement **V5 PAPER · ARCHIVE GELÉE**, **MOTEUR V5 ARRÊTÉ / ANCIENNE LECTURE**, avec **ANCIENNE HYPOTHÈSE** et **POSITION PAPER FIGÉE** ; PM et QUALITÉ sont étiquetés historiques.
- Les chaînes d'évidence produites en UTC sont montrées après conversion des horloges en heure Stockholm (en précisant la valeur UTC d'origine). Ainsi 07h15 UTC devient 09h15 Stockholm et 07h45 UTC devient 09h45 Stockholm. Le libellé « MCB15 confirmé » devient **« Événement E15 confirmé »**, pour ne pas confondre l'événement E15 natif avec la direction structurelle E15→E15.
- Les résultats gelés ne changent pas, aucun P&L supplémentaire n'est calculé, aucun trade n'est repris.
- Le bloc distinct **V5 · ENJEU STRUCTUREL (RECHERCHE)** reste actif sur Vagues ; il produit automatiquement ses **données structurées**, mais l'analyse narrative en français précédemment envoyée dans le chat était **rédigée par l'assistant**, non automatiquement par BOONO.

## III. Indicateurs RSI/Stochastic RSI : complément ou redondance ?

Documentation officielle Market Cipher B (https://marketcipher.trade/market-cipher-b/) : six oscillateurs rassemblés dans un même indicateur ; les **Blue Waves (momentum)**, le **RSI** et le **Stochastic RSI** sont décrits comme **couches distinctes**. Cela ne démontre pas que la formule des Blue Waves elle-même intègre numériquement le RSI. Comme ils proviennent tous de données de prix liées, leurs signaux peuvent toutefois être fortement corrélés.

Hypothèse d'étude : récolter RSI / Stoch RSI **en observation parallèle** puis mesurer une contribution supplémentaire à la classification *contexte MCB + territoire pris/conservé* (surventes, maturité de respiration, accélération/rejet), en comparaison avec le même modèle **sans** ces variables. Pas d'ajout de deux nouveaux votes, pas de veto, pas d'ordre sur un simple croisement Stoch RSI.

## IV. Divergences de fond signalées par l'utilisateur

L'utilisateur repère une **divergence haussière 4h du 8 au 15 octobre**, et une divergence de continuation au **Daily**. Données MCB4h confirmées vérifiées dans le CSV historique :
- **08/10 18h Stockholm** : low BTC ~80 351 $, LBW4h ~−74,15 ;
- **15/10 14h Stockholm** : low BTC ~79 725 $, LBW4h ~−51,10.

Le second bas de prix est **plus bas**, et le creux LBW associé **moins négatif** : géométrie compatible avec une divergence haussière 4h. **Ce n'est pas la validation complète des pivots LBW causaux E4h** ni la preuve qu'elle décide à elle seule la tendance future. La divergence de continuation Daily citée par l'utilisateur est une **hypothèse à vérifier séparément**, pas confirmée dans cet audit.

Ces deux objets doivent ensuite s'inscrire dans la narration hiérarchique de BOONO : 1D/4h définissent une **hypothèse de fond**, 1h/15m les périodes de maturation, 3m les attaques. Aucune divergence ne devient un veto automatiquement.

## V. État des moteurs et sécurité
- BOONO V5 PAPER **arrêté** ; `boono-v5-structure-readonly` indépendant continue à enregistrer ses interprétations sur les vagues.
- V4 actif au sens du processus PM2, mais son dernier état de trading observé était très ancien (incident `RangeError: Invalid string length` lors d'une sortie avec garde dur). **Ne pas confondre « PM2 online » avec fonctionnement V4 sain.** Aucune modification de V4 effectuée ici.
- Seul `config-server` est rechargé pour exposer la correction d'interface. Pas de modification de la stratégie, des ordres, des stops ou de BOONO-TV.
