# BOONO — Première maquette replay vagues 3m / 15m — 02/10/2026

## Statut

Chantier **diagnostic uniquement**. Aucune loi de trading, seuil, admission, sortie, sizing, collecteur ou simulateur n'a été modifié.

Version de maquette : `wave-replay-mock-0.1`.

Période de replay choisie :
- 02/10/2026 08:45Z → 14:30Z ;
- soit 10:45 → 16:30 Paris ;
- contient les trades #10 à #15 (six pertes consécutives) puis l'entrée du short #16 ;
- 690 relevés synchronisés à ~30 s.

## A. Données réellement disponibles sur Amsterdam

### 1. Audit glissant live

Fichier :
`data/audit-history.json`

État inspecté le 02/10/2026 :
- 2880 lignes ;
- profondeur : ~24 h ;
- cadence médiane : 30 s ;
- période alors disponible : 01/10 18:47Z → 02/10 18:47Z.

Séries 3m exploitables à chaque relevé :
- `liveBw` : BW 3m intra-bougie ;
- `liveLbw` : LBW 3m intra-bougie ;
- `liveMoneyFlow` : MF 3m intra-bougie ;
- `vwapLive` : VWAP 3m intra-bougie ;
- `liveSignalUp` / `liveSignalDn` : événements UP/DN 3m ;
- plus microstructure : `priceMove`, `cadence`, `volumeFenetreBtc`, `winSec`, etc.

Séries 15m exploitables :
- **LIVE intra-bougie** :
  - `live15BwRaw`
  - `live15LbwRaw`
  - `live15MfRaw`
  - `live15Vwap`
  - `live15SignalUp`
  - `live15SignalDn`
- **confirmées** :
  - `live15Bw`
  - `live15Lbw`
  - `live15MoneyFlow`

Important : malgré leur préfixe historique `live15*`, les trois champs sans suffixe `Raw` ci-dessus sont explicitement alimentés depuis la dernière ligne **confirmée** de `mcb_15m.csv` depuis le 04/09/2026.

### 2. Archives audit journalières

Répertoire :
`data/archives/`

Archives réellement présentes :
- `audit-2026-09-04.json.gz`
- …
- `audit-2026-09-22.json.gz`

Chaque archive inspectée contient 2880 relevés avec une cadence médiane de 30 s.

Couverture des séries :
- 3m BW/LBW/MF/VWAP : 100 % sur toutes les archives inspectées ;
- 15m BW/LBW/MF confirmés : 100 % ;
- 15m LIVE Raw : partiel les 04–05/09, puis 100 % à partir du 06/09 ;
- UP/DN sont par nature événementiels : champs non nuls seulement lors des signaux.

### 3. Anomalie d'archivage à documenter

[DONNÉES INSUFFISANTES / ARCHIVAGE]
Le serveur ne contient actuellement **aucun fichier archive audit journalier après `audit-2026-09-22.json.gz`**, alors que le glissant 24 h actuel fonctionne toujours.

Donc :
- 04/09 → 23/09 environ : replay audit haute fréquence conservé ;
- 23/09 → 01/10 : pas d'archive audit journalière trouvée sur le VPS ;
- 01/10 → 02/10 : disponible actuellement dans le glissant 24 h, et la fenêtre utile des six pertes a été figée dans le snapshot de cette maquette.

Aucune collecte n'a été modifiée dans ce chantier. Cette lacune devra être traitée séparément.

### 4. Historique MCB confirmé longue profondeur

Fichiers :
- `/root/agents-ia-zero-one/data/mcb-live/mcb_3m.csv`
- `/root/agents-ia-zero-one/data/mcb-live/mcb_15m.csv`

3m :
- 37 960 lignes ;
- 05/07/2026 12:36Z → 02/10/2026 ;
- cadence médiane : 3 min ;
- BW/LBW/MF : 100 %.

15m :
- 7 555 lignes ;
- 03/07/2026 08:30Z → 02/10/2026 ;
- cadence médiane : 15 min ;
- BW/LBW/MF : 100 %.

Ces CSV donnent une bonne profondeur structurelle confirmée, mais ne contiennent pas toute la géométrie intra-bougie à 30 s de l'audit.

## B. Contrat de données utilisé par la maquette

### Vague 3m dessinée

Source audit intra-bougie :
- BW = `liveBw`
- LBW = `liveLbw`
- MF = `liveMoneyFlow`
- VWAP = `vwapLive`
- UP = `liveSignalUp`
- DN = `liveSignalDn`

### Vague 15m dessinée

Source audit intra-bougie :
- BW = `live15BwRaw`
- LBW = `live15LbwRaw`
- MF = `live15MfRaw`
- VWAP = `live15Vwap`
- UP = `live15SignalUp`
- DN = `live15SignalDn`

Les valeurs confirmées 15m sont conservées dans chaque frame et affichées dans l'État vivant sous la forme **LIVE / CONF**.

### État vivant synchronisé

Source :
`trade-sim-v4-evaluations*.ndjson`

Pour chaque relevé audit, la maquette associe l'évaluation V4 la plus proche dans une tolérance maximale de 45 s.

Éléments affichés :
- position ;
- MCB_THESIS ;
- mode ;
- lobe 15m, maturité, recovery, classe E15 ;
- état 3m ;
- PM : statut, net3m, gross3m, efficiency3m ;
- ticker : statut, yield/P75, effort/P75 ;
- ACTION ;
- microstructure audit.

### Événements

Les entrées/sorties du simulateur V4 sont projetées dans les deux bandes comme repères temporels gris.

## C. Première maquette replay

Fichiers créés :
- `scripts/build-wave-replay.js`
- `data/replays/wave-replay-2026-10-02-six-losses.json`

Interface :
- nouveau sous-onglet **Trades → Vagues** ;
- fond blanc ;
- État vivant en haut ;
- vague 15m ;
- vague 3m ;
- curseur synchronisé ;
- boutons ±30 s ;
- lecture automatique ;
- événements de trade ;
- aucun chandelier prix.

Style :
- BW : ligne noire ;
- LBW : seconde ligne noire fine ;
- MF : zone gris clair ;
- VWAP : ligne jaune ;
- UP : points verts ;
- DN : points rouges.

## D. Vérifications

- `modules/config-server.js` : syntaxe Node OK.
- `/app.js` extrait depuis le serveur : syntaxe JS OK.
- API `/api/wave-replay` : OK.
- snapshot : 690 frames, 14 événements.
- rendu navigateur headless : OK.
- 10 cellules d'État vivant rendues.
- période affichée correctement en Europe/Paris.
- `config-server` online après redémarrage.
- aucun module V4 de décision, collecteur ou simulateur modifié.

## Prochaine étape — volontairement non exécutée

Après validation visuelle de cette maquette :
1. corriger/affiner la représentation si nécessaire ;
2. ajouter E3/E15 et divergences ;
3. seulement ensuite brancher le même renderer au live Amsterdam.

Le live n'est donc pas encore branché dans cette première version, conformément à l'ordre demandé.
