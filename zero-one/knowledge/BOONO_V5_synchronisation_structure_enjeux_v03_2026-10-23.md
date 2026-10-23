# BOONO Systems — Première tentative de moteur de synchronisation structurelle (V5 recherche v0.3)

**23 octobre 2026 — implémentation réelle, replay et observateur vivant indépendant.**
**Statut : RESEARCH / READ ONLY / AUCUNE PRISE DE TRADE.**

## 1. Demande et principe de conception

Le besoin n'est plus de multiplier les QUALITÉS ou de faire voter PM3/PM5/PM Live. L'utilisateur demande un **langage des relations entre phénomènes**, ancré sur MCB et dans **le lieu du prix** : range, frontières, vagues E15→E15, E3 imbriqués, croisements associés, signaux natifs, MF, acceptation / rejet du prix, puis conversion en rôle descriptif.

Un E15 Live UP/DN n'est **pas** la direction E15→E15. Le moteur reprend le code déjà éprouvé de `modules/v4/layers/structural-trajectory.js` pour dériver la direction structurelle de **bougies terminées** uniquement.

## 2. Code réellement produit

- `modules/v5/structural-story-engine.js` : fonction pure et causale `step(state, {sample,bars15,bars3,bars1h,bars4h,levels,events,levelMode})`. Rend la carte du combat, sa provenance et les questions non résolues.
- `modules/v5/structural-story-runner.js` : `--replay` pour reconstruire les observations du journal Audit disponibles ; `--loop` pour lire régulièrement les **fichiers du collecteur, sans toucher au simulateur V4 ou au paper trader V5**. Mémoires autonomes `data/v5-structural-story-state.json` et `data/v5-structural-story-transitions.ndjson`. Il tourne toutes les **90 secondes** et ne fait aucun appel broker.
- PM2 nouveau processus `boono-v5-structure-readonly`, **watch & reload désactivé**, mémoire limitée à 240 Mio avant reprise. `boono-v5-shadow` (paper V5 qui produisait des trades) reste explicitement `stopped`. V4 `cerveau-central` n'a pas été redémarré.
- Serveur de présentation `/api/v5-structure` : endpoint authentifié, résumé seulement (~1,4 Ko sur le réseau en gzip mesuré sur serveur de test). Dans **TRADES → Vagues**, carte compacte `V5 · ENJEU STRUCTUREL (RECHERCHE)`, observant les hypothèses, les conflits 15m/1h/4h, les enjeux Daily, les tentatives et la fraîcheur. Aucun bouton d'ordre.

### Sens et responsabilités
1. **Trajectoire E15→E15** : direction de référence 15m déduite du dernier pivot causal CREUX→ascension LONG / CRETE→descente SHORT, confirmé selon la politique V4 ; elle ne change pas avec un E15 Live contraire.
2. **Échelles lentes** : 1h/4h déduites séparément de trajectoires confirmées, **contexte descriptif**, sans droit de veto.
3. **Lieu du prix** : `VALUE_UNKNOWN/BELOW_VALUE/LOWER_VALUE/UPPER_VALUE/ABOVE_VALUE` à partir du triplet VAL/POC/VAH Daily sauvegardé ; ajoute les derniers extrêmes de bougies MCB15m confirmées comme **niveaux locaux distincts**. Les limites du **grand range historique ne sont PAS identifiées canoniquement** par ce premier prototype ; il refuse de les inventer.
4. **Enjeu structurel actif** : VAL quand le prix est dessous ou dans la moitié basse de la zone de valeur ; POC dans la moitié haute, VAH au-dessus. Mémorise franchissements, tests, rejet ou retest tenu **provisoirement** ; ceci n'est pas une acceptation durable automatique.
5. **Tentatives** : E3/E15 rattachés aux heures source/observées, essais successifs distincts par timestamp source, prix d'attaque, meilleur effort dans le bon sens, prix actuel vs origine et territoire conservé à +15min réellement mesuré. Des signaux `BW_LBW_CROSS` proches sont reliés au natif correspondant, **pas comptés comme une famille de preuves indépendante**.
6. **MF / prix** : mémoire d'évolution 1h mesurée sur le flux Audit, utilisée pour rendre explicite un progrès qui contredit ou confirme la structure 15m.
7. **Conversion** : QUALITÉ chronologique et PM Live **seulement descriptifs** ; quand le journal Elastic cesse d'alimenter, afficher `STALE_ELASTIC_EVENTS` ou `UNKNOWN`, jamais inventer un signal.
8. **Hypothèses concurrentes** : défendre/reconquérir le VAL pour envisager POC puis VAH, ou échouer/perdre le VAL et surveiller les appuis inférieurs ; continuation possible. Toutes les hypothèses portent `conditional:true`. **Aucun mouvement futur n'est présumé.**

## 3. Replays et premiers résultats

- Replay de **2 926 relevés Audit ~30s**, comparés aux bougies MCB (1h/4h/15m/3m) et aux événements Elastic horodatés. Les CSV sont parcourus par recherche binaire : le replay complet est passé d'une durée excessive à environ **5–13 secondes** malgré l'activité du VPS.
- Premier état réel testé le **23 octobre vers 12h14–12h18 heure Stockholm** : prix de référence ~81 780 $, trajet E15→E15 **LONG** depuis un CREUX causal, tandis que **1h et 4h restent SHORT**. Le prix était dans `LOWER_VALUE`, au-dessus de **VAL Daily ~81 238 $**, sous POC **83 880 $** et VAH **84 904 $** (niveaux actuellement sauvegardés ; peuvent varier).
- Lecture type : `DEFEND_VALUE_REINTEGRATION` **conditionnel**, terrain 1h alternativement repris/perdu, reflux MF15 selon le prélèvement, 15m local LONG **contesté** par horizons lents SHORT. Ce n'est ni `ENTER_LONG`, ni preuve de cassure.
- À cette heure, les derniers événements Elastic étaient âgés d'environ **84 minutes** : QUALITÉ 1h `UNKNOWN` plutôt que donnée interpolée ou dupliquée. Les fichiers Audit et certains MCB continuaient d'évoluer, tandis que l'état de trading V4 connaissait un incident de sérialisation indépendant.
- Historique de niveaux : `data/levels.json` est une **photographie actuelle**, non un flux historique validé à chaque heure. Le replay antérieur porte `HISTORICAL_UNKNOWN` et **ne projette pas les niveaux du 23 octobre dans les décisions du 22**. Le prix/MCB reste analysable.
- La première analyse n'évalue **aucun taux de succès de trade**. Elle produit un langage **réfutable** : lieu, parent, attaque, prix gagné/perdu, conflit, scénario et preuves manquantes.

## 4. Vérifications et limites

- 86 tests de non-régression V4/V5 avant intégration, puis un test supplémentaire pour fraîcheur Elastic (86 au total), y compris : E15 Live opposé n'écrase pas la trajectoire confirmée ; tentative E3 rattachée à la bonne parenté ; effort sans terrain conservé ; niveaux actuels non projetés rétroactivement ; croisements associés au natif ; MF/prix 1h ; vieillissement des sources ; rôle descriptif de la QUALITÉ.
- Le moteur est **indépendant de `opportunity-engine.js`, `paper-trader.js`, `trade-simulator-v4.js`, `cerveau-central`** ; il ne fait qu'écrire ses propres journaux et alimenter un affichage.
- Aucune garantie que les objets `campagne` soient encore correctement délimités par-delà plusieurs E15. Le code représente des **liens et enjeux**, pas encore une reconnaissance prouvée de campagne multi-échelles ni une politique de trading.
- Le « grand range » évoqué par l'utilisateur doit être défini par une source et des bornes **vérifiables** distinctes du profil Daily et des extrêmes locaux. Sans cela, la machine ne peut pas savoir qu'une cassure sort réellement du grand range.
- **Incident V4 toujours ouvert** : la présentation d'un processus PM2 online n'est pas une garantie d'admission/exits fonctionnels ; des logs `Invalid string length` pendant une protection V4 ont déjà été observés. Cette expérimentation n'intervient pas sur V4.

## 5. Étude suivante recommandée

Lire et comparer les **hypothèses V5 Structure** aux trajectoires réelles 22–23 octobre : quand les attaques E3/E15 avaient-elles du terrain, où étaient VAL/POC/VAH effectivement observables, que démontre le prix au prochain retest ? Répertorier **les contradictions** plutôt que déclarer des campagnes validées. Ensuite seulement proposer des conditions d'exploitation papier, qui exigeraient une nouvelle validation. Le trading V5 demeure suspendu.
