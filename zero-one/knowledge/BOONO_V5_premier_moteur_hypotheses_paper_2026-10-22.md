# BOONO Systems — V5 : premier moteur de décision + paper trading autonome

**22 octobre 2026 — module expérimental sur Amsterdam, séparé du moteur V4.10.10.**

## Validation de périmètre
L'utilisateur précise que BOONO V5 ne doit pas seulement observer ; **il doit aussi proposer des hypothèses et exécuter des trades** afin d'éprouver ses chaînes causales sur des résultats concrets. V4 reste actif indépendamment, sans modification de ses admissions, stops ou trade ledger.

## Architecture opérationnelle V5 v0.1
- **Compréhension :** `modules/v5/elastic-memory-engine.js` observe les ancres E15 confirmées/Live, les tentatives E3, les croisements BW/LBW (liés aux signaux natifs, pas votes distincts), les qualités de conversion et une distribution temporelle 4×15m. Les appartenances de segments E15 à des campagnes plus larges restent **non résolues**, non inventées.
- **Hypothèse :** `modules/v5/opportunity-engine.js` propose un camp MCB15 confirmé ou un retournement E15 Live encore provisoire, exige un E3 récent orienté dans ce camp et PM3, PM5 puis PM Live dans la même direction. L'ordre d'observation des preuves n'est pas imposé. La qualité `POWERFUL/EASY/...` **qualifie** le diagnostic, mais n'est pas une autorité indépendante ni un vote de plus. État observé : `WAIT_TACTICAL_CONVERGENCE`, `TRANSLATION_CONTESTED`, `EARLY_EXECUTABLE_HYPOTHESIS`. Les raisons de contradiction restent affichées.
- **Exécution :** `modules/v5/paper-trader.js` reçoit seulement ces hypothèses et gère **un compte papier indépendant** (capital de référence 1000 $, notionnel 1500 $, une position maximum), frais taker modélisés 0,05% par côté, MFE/MAE observés, protection à 120/90 puis 220/180 USD de déplacement BTC et risque prix 500 USD. Une chaîne opposée complète peut fermer une position ; aucun retournement automatique. L'identité E15/E3 utilisée empêche de multiplier les réentrées sur la **même preuve**.
- Les entrées ne peuvent démarrer qu'après activation de ce paper trading V5 et après apparition d'une chaîne E3 observée depuis cette activation. Il n'y a **aucune transaction rétroactive** fabriquée à partir des archives rechargées.
- La vérification de fraîcheur de V5 surveille les fichiers MCB live et confirmés, et le dernier Audit, séparément. Les entrées sont bloquées si ces sources sont périmées.
- **Aucun appel broker**, aucune transaction OKX même « ordre 0$ » : `brokerOrdersEnabled:false`, simulations comptables locales uniquement. Les fills sont supposés au prix Audit du cycle 30s ; le slippage/funding et les écarts entre cycles ne sont pas modélisés. Les protections de prix sont **virtuelles, évaluées aux relevés 30s**, et ne garantissent pas un stop réel.
- **Journal :** `data/v5-paper-state.json`, `data/v5-paper-decisions.ndjson`, `data/v5-paper-trades.ndjson` (à partir des premières clôtures), en plus des mémoires et échantillons V5. Historique compact rotatif séparé des archives V4.
- **UI :** carte `BOONO V5 · HYPOTHÈSES + PAPER TRADES` dans TRADES → État V4, à côté d'Elastic v0.5.8 qui demeure l'interface V4 actuelle. Route authentifiée compressible `/api/v5` qui expose une réponse compacte : hypothèse, preuves, contradictions, distribution QUALITÉ sur quatre bougies 15m, position, P&L net, compte papier et dernières clôtures.
- **Garde-fous :** V4.10.10 conservé, toutes ses positions et protections inchangées ; V5 ne modifie aucune donnée V4. Le paper trading est **expérimental et non validé économiquement**. Les premières règles de décision sont des hypothèses falsifiables, pas une politique de trading définitive.

## Corrections de qualité durant l'implémentation
- Les événements de qualité Elastic arrivent souvent quelques secondes après les relevés Audit. Le lecteur initial les écartait avant la prochaine observation ; correctif : tampon `backlog` conservant les événements dont `observedAt` est futur pour la donnée Audit courante.
- Au redémarrage, V5 reconstitue les samples Audit manqués avec les événements observés dans l'ordre causal ; **aucun trade rétroactif n'est ouvert pendant la récupération**.
- Les transitions de qualité `CONFIRMED` sans nouvelles métriques chiffrées ne doivent plus effacer les mesures PM/effort précédentes dans la mémoire descriptive.
- `/api/v5` est strictement lecture seule pour le navigateur. L'interface ne transmet aucune action de trade.

## Tests, limites, prochaine analyse
- Tests V5 : la formulation est symétrique LONG/SHORT, source E15 et E3, PM cohérent, qualité qualifiante ; gestion des coûts, stops, non-réentrée sur même événement, rejet des données dégradées et absence d'ordre broker.
- Tests V4 inchangés.
- Revoir les hypothèses fermées et refusées, ainsi que les cas de 03h30 du 22/10 et les dernières mauvaises admissions V4, pour apprendre les vrais critères de maturité. Avec V5 paper, nous pourrons cette fois comparer **des opérations V5 réalisées et comptabilisées** aux opérations V4, et non seulement des observations ex-post.
