# BOONO — rétablissement flux V3 — panne stockage/sérialisation — 23/09/2026

## Statut

[CHANGEMENT AUTORISÉ] Intervention limitée au stockage, à la sérialisation et à la livraison V3. Aucun seuil ni aucune règle de trading n'a été modifié.

## Cause racine

- [FAIT OBSERVÉ] `data/trade-sim-v3lab-decisions.json` avait atteint 536 854 797 octets pour 8 000 objets.
- [DÉMONTRÉ] `appendCapped()` relisait le tableau entier puis `JSON.stringify()` réécrivait l'intégralité du fichier à chaque décision.
- [DÉMONTRÉ] `cerveau-central` a enregistré `RangeError: Invalid string length` dans `writeJson -> appendCapped -> recordDecision`.
- [FAIT OBSERVÉ] décisions/état figés vers 06:36Z ; dernière évaluation/shadow V3 valide 06:38:08.330Z.
- [FAIT OBSERVÉ] évaluations = 500 656 073 octets ; shadow = 456 195 398 octets : risque de croissance non bornée également démontré.

## Période causalement indisponible

- [DONNÉES INSUFFISANTES] décision/état : à partir de 2026-09-23T06:36:34.805Z.
- [DONNÉES INSUFFISANTES] évaluations/shadow : après 2026-09-23T06:38:08.330Z.
- Point de reprise causal V3 : 2026-09-23T09:13:37.951Z.
- Aucun backfill, aucune admission reconstruite, aucune action antidatée. Marqueur : `data/v3lab-causal-gaps.json`.

## Sauvegardes / archives

- Backup code/état : `archives/v3lab-pre-storage-repair-20260923T090753Z`.
- Archives données : `archives/v3lab-storage-archive-20260923T091118Z/`.
- SHA256 décisions : `518a4e7b0c02f33e98e61d702fd7eef257e694f67a2cd00bf1d8a6ab9a63e533`.
- SHA256 évaluations : `65400aeeed56791c53b3e788997eee449f7f3d083439838e75614c60dbc7ca6a`.
- SHA256 shadow : `3e798d0ee8d59b3972f31b5ef8e0f481cecf029893b7e6d8d63f4c6c16aa8725`.

## Architecture de stockage retenue

- Nouveau helper : `modules/v3lab/storage/rotating-ndjson.js`.
- Format : NDJSON append-only.
- Rotation : 32 MiB par segment.
- Décisions : 8 segments maximum + actif (~288 MiB plafond théorique).
- Évaluations : 16 segments maximum + actif (~544 MiB plafond théorique).
- Shadow : 16 segments maximum + actif (~544 MiB plafond théorique).
- Rotation par `renameSync()` atomique avant création d'un nouvel actif.
- Chaque ligne est écrite via descripteur append puis `fsyncSync()` ; une interruption ne rend pas tout le journal illisible. Les lecteurs ignorent une éventuelle ligne partielle.
- `trade-sim-v3lab-state.json` est désormais écrit via temporaire + rename atomique.
- `trade-sim-v3lab-history.json` reste JSON borné en nombre et ne faisait pas partie de la panne ; taille observée ~11 MiB.

## Compatibilité lecteurs

- `/api/trades` lit désormais les 200 décisions récentes via `readRecentNdjson()` ; plus de `JSON.parse()` sur 512 MiB.
- `mw-hourly-report.js` lit seulement les segments susceptibles de couvrir la fenêtre demandée via `readNdjsonSince()`.
- Les anciennes données restent récupérables dans l'archive et ne sont pas mélangées au nouveau flux causal.

## Fichiers de code modifiés

- `modules/trade-simulator-v3lab.js` : paths NDJSON, plafonds de rotation, append rotatif, état atomique.
- `modules/v3lab/storage/rotating-ndjson.js` : nouveau module de rotation/lecture.
- `modules/config-server.js` : lecteur décisions segmentées.
- `modules/v3lab/monitoring/mw-hourly-report.js` : lecture fenêtre segmentée.
- `tests/v3lab/rotating-ndjson.test.js` : nouveau test de rotation/intégrité.
- `tests/v3lab/mw-hourly-report.test.js` : test rendu compatible avec les fenêtres historiques explicitement archivées.

## Redémarrage et sécurité des positions

- V3 avant intervention : `scalp=null`, `day=null`, `swing=null`.
- Une position legacy SHORT était ouverte avant intervention : entrée 85 950,7 à 2026-09-23T08:48:35.997Z, 75 % restant.
- `moteur-boono` n'a pas été redémarré ; son compteur PM2 est resté à 0 et la même position/entryTimestamp a été conservée.
- Seuls `cerveau-central` et `config-server` ont été redémarrés.
- Aucun trade V3 n'a été créé au redémarrage.

## Validation prospective

- Fenêtre contrôlée : 09:13:37.951Z -> 09:24:25Z (10,79 min).
- Évaluations : 22 lignes ; shadow : 22 ; décisions : 15.
- Toutes les lignes : JSON valides, timestamps monotones, aucun timestamp dupliqué.
- Tailles à ~09:24Z : décisions 638 030 octets ; évaluations 929 255 ; shadow 767 833 ; état 71 439.
- PM2 après ~11 min : `cerveau-central`, `config-server`, `moteur-boono` online ; 0 restart / 0 unstable restart.
- Log erreur : 2 occurrences historiques de `RangeError: Invalid string length`, compteur inchangé et mtime du log inchangé depuis 07:23:16Z.
- Mémoire host après validation : 1 743 MiB utilisés, 2 172 MiB disponibles, swap 573 MiB ; pas de croissance explosive liée au journal.
- Audit général continue : mtime 09:24:07Z.
- État V3 continue : mtime 09:24:10Z.
- Le MW a relu 21 évaluations post-reprise et produit prix, top-down, refus ELIGIBILITY et états sans charger les archives géantes.

## Champs V3 prospectivement vérifiés

- `wave.structural` présent et lisible.
- WHERE présent et évolutif ; dernier état contrôlé `RELEVANT`.
- turning présent lorsque formé ; dernier contrôle `CREUX_EN_FORMATION`.
- dominance présente ; dernier contrôle `DOMINATION_PERSISTANTE long`, proof ~0,666.
- R:R et ELIGIBILITY présents et lisibles.
- `STRUCTURAL_REASSERTION` n'a pas été observé live pendant cette fenêtre : le marché est resté en `THESIS_FALSIFIED_WAIT`. Sa capacité reste couverte par les tests de cohérence existants ; aucune donnée n'a été fabriquée pour le forcer.

## Tests

- `rotating-ndjson.test.js` : OK.
- V3 coherence regression : OK.
- MA200 shadow : OK.
- divergence-lineage shadow : OK.
- MW hourly report : OK.
- V2 core-contract : OK.
- V2 simulator-v02 regression : exit 0.

## Rollback

- Code : restaurer depuis `archives/v3lab-pre-storage-repair-20260923T090753Z`.
- Données historiques : archives intactes dans `archives/v3lab-storage-archive-20260923T091118Z`.
- En rollback, ne jamais fusionner automatiquement la période de panne avec le nouveau journal causal.

## Confirmation de périmètre

[DÉCISION MÉTHODOLOGIQUE] Aucune règle E15, LBW, WHERE, turning, dominance, R:R, admission, sortie, protection ou seuil de trading n'a été modifiée. Seuls stockage, sérialisation, lecteurs et tests d'infrastructure ont changé.