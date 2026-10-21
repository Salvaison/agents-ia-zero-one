# BOONO Systems — Elastic v0.5 : familles communes et registre historique

Date : 21 octobre 2026. Autorisé par l'utilisateur (« je valide ton module MA », classes CONVERSION acceptées avec anglais, « autrement je valide aussi le reste, execute »). **Shadow exclusivement**, moteur V4.10.10, actions, risques, admissions et protections inchangés.

## Objectif

Remplacer la restitution confuse de deux tableaux LONG/SHORT redondants par **une synthèse partagée des mesures** et une **chronologie unique persistante**. Les directions LONG et SHORT continuent d'exister comme propositions MCB ; les mesures sont présentées une fois, colorées selon la progression/position. L'ancien Elastic v0.4.3 reste exécuté et archivé pour audit mais **n'est plus la vue principale**.

## Sept familles de l'interface

1. **MCB15 et MCB3** : BW et LBW « valeur de la dernière bougie confirmée (grise) / valeur Live (colorée) », delta LBW par bougie et par minute ; BW/LBW spread et âge du croisement ; E15/E3 confirmé et Live séparés ; relation structurelle E→E, durée réelle et pente prix/durée quand disponible. Le signe absolu du lobe n'est **pas** sa direction. Passage LBW zéro caché de la vue.
2. **FLOW** : MF3 et MF15 confirmés/Live, mémoire MF et son horizon.
3. **MA** : état des contacts depuis les bougies confirmées 3m/15m, distance du prix, compte de retests. États `CONTACT, DEPART, RETEST, HELD, REJECTED, LOST` (+ `UNOBSERVED` pour initialiser). La référence MA200 actuelle est séparée de la géométrie des tests. Critères descriptifs provisoires : contact si range de bougie chevauche MA±0,03 % (avec minimum 5 $), départ si clôture s'éloigne d'au moins deux tolérances, nouveau contact après départ = retest. Aucune règle d'admission ni de durée maximale arbitraire, seuls les nouveaux barres confirmées changent l'état.
4. **CONVERSION** : PM3, PM5, PM Live, eff3, yield/P75, effort/P75, classe et direction.
5. **BOUNDARY** : proximité du range VAL/POC/VAH, niveau/ligne en avant, niveaux et Fib les plus proches disponibles, sans veto nouveau.
6. **CONTEXT** : qualité de marché, qualité de données, trajectoires 1h, 4h, Daily, Weekly (contexte, pas nouvelle autorité).

Les anciennes lignes « X observations, X familles, X oppositions » sont retirées de la surface commune : elles comptaient des conditions booléennes corrélées et affichaient peu de détails. Également retirés : « repris XX », contre-preuves symétriques, signal historique dépassé, jalons et récit récent comme rubriques redondantes. Leurs données brutes peuvent rester consultées dans l'audit v0.4.

## Qualités de conversion en anglais (nomenclature validée)

- `SILENT` : rendement et activité sous références P75.
- `INEFFICIENT` : effort/P75 >=1, rendement/P75 <1.
- `PRODUCTIVE` : rendement/P75 >=1 sans preuve disponible pour qualifier l'effort.
- `EASY` : rendement/P75 >=1, effort/P75 <1.
- `POWERFUL` : rendement/P75 >=1, effort/P75 >=1.
- `EXCEPTIONAL` : yield/P95 >=1.
- `CONTESTED` : directions PM3 et PM5 opposées.
- `ABSORBED` : hypothèse temporelle après observations répétées inefficaces et recul du rendement obtenu.
- `EXHAUSTED` : hypothèse temporelle lorsque la conversion précédemment productive se dégrade sous effort renouvelé.

Ces classes sont diagnostiques **non calibrées en probabilité** ; une qualité instantanée et une étiquette temporelle peuvent coexister sans vote. Le ticker ne choisit jamais à lui seul le camp MCB.

## Récit et cycle de vie

`elastic-observer-shadow-v0.5` tient un état **courant** de chaque phénomène et émet seulement les **transitions** :
- `OBSERVED` : première apparition, Live E3/E15 ou conversion.
- `CONFIRMED` : E3/E15 confirmé ou persistance minimale observée de conversion (3 évaluations successives pour la qualité à titre expérimental).
- `INTERRUPTED` : fin de la condition ou disparition d'un Live.
- `RESTORED` : conversion équivalente réapparue dans une fenêtre d'observation courte.
- `SUPERSEDED` : E3/E15 confirmé opposé plus récent remplace le précédent dans l'état courant, mais conserve les deux dans l'historique.
- États MA : événements nommés `CONTACT`, `DEPART`, `RETEST`, `HELD`, `REJECTED`, `LOST`.

L'E15 DN provisoire **n'efface pas** l'E15 UP confirmé tant que le DN n'est pas confirmé. E3 et E15 peuvent être opposés car ils appartiennent à des horizons distincts. Les croisements BW/LBW (identiques mathématiquement au VWAP MCB Live traversant zéro) figurent dans les lignes MCB. Leur relation aux signaux natifs est marquée, **sans incrément de compte ou vote indépendant**. Les observations sont horodatées au moment où le moteur les connaît (`observedAt`), séparément de l'heure de la bougie source (`sourceTs`).

## Historique durable et consultation

- Écriture des transitions **sur disque** par `modules/trade-simulator-v4.js` dans `data/elastic-observer-events.ndjson`, segments rotatifs de 8 Mo, 32 segments supplémentaires maximum ; une seule écriture par transition, depuis la boucle `day`. Les snapshots V4 restent séparés.
- Route protégée `/api/elastic-history?hours=6|24|48`, avec fenêtre temporelle, liste d'événements, archive limitée à 3 000 événements par réponse (un éventuel tronquage est indiqué).
- Surface principale unique avec 7 familles, suivi des valeurs gris/Live, graphique du duel, chronologie scrollable 6/24/48 h. La chronologie commence **à l'activation de v0.5** ; aucun événement passé n'est inventé rétrospectivement.
- Le journal v0.4.3 avec 24 récits et 30 jalons reste limité par conception historique, mais ne détermine pas cette nouvelle chronologie.

## Duel effort/prix

Le flux public OKX BTC-USDT-SWAP expose pour chaque transaction le volume BTC et le côté initiateur buy/sell. Le simulateur ne change pas la décision : il conserve simplement `volume` et `side` dans `frame.sources.liveTicks`. Le graphique affiche un carré vert pour le volume agressif acheteur et rouge pour le vendeur sur trois minutes, **surface proportionnelle au BTC initié**, avec déplacement net du prix indépendant. S'il manque des volumes identifiables, on affiche « indisponible » et **aucune force n'est inventée à partir du ticker**. Ceci n'est pas la mesure des positions nettes ni du volume caché/passif.

## Validation / garde-fous

- Tests automatisés : progression BW/LBW confirmé→Live, neuf noms anglais, distinction confirmé/provisoire E15 et remplacement, MA chronologiques, duel volume/prix, absence d'événements dupliqués, rendu et choix 6/24/48.
- Intégration du simulateur vérifiée dans un répertoire de données temporaire isolé, sans mutation de `data/` production.
- Toutes les actions V4.10.10, le hard-stop de gain 120/90 puis 220/180, le plafond 500, la gestion TP1, anti-churn et l'ancienne observation v0.4.3 restent intacts.
- Limites : catégories `ABSORBED`/`EXHAUSTED` et les épisodes MA nécessitent une validation statistique ; les trajectoires de marché ne sont pas des confirmations indépendantes ; historique limité à la rétention des segments de rotation, ne pas prétendre conserver toutes les périodes indéfiniment.

## Fichiers

`modules/v4/experiments/elastic-observer-shadow.js` ; `modules/elastic-observer-ui.js` ; `modules/v4/core/engine.js` ; `modules/trade-simulator-v4.js` ; `modules/config-server.js` ; `tests/v4/elastic-observer-v05.test.js` ; `knowledge/version-log.md`.
