# BOONO — pont snapshot partagé Market Watch — 24/09/2026

## Objet

Rendre les données causales récentes de BOONO lisibles par le Market Watch même lorsqu'une exécution ChatGPT ne dispose pas d'une route SSH directe vers Amsterdam.

## Accès vérifié

[FAIT OBSERVÉ] Cette discussion dispose d'un accès opérationnel réel au device Remote Desktop Commander `BOONOTRADE-VPS`. Une commande a été exécutée sur le VPS et a confirmé le répertoire `/root/agents-ia-zero-one/zero-one`.

Ce pont ne dépend pas de `164.92.233.228:22`, d'une clé SSH embarquée ou d'un identifiant stocké dans le snapshot.

## Documents relus avant intervention

- `knowledge/BOONO_passation_discussion_laterale_2026-09-21.md`
- `knowledge/deep-review-24h-2026-09-23.md`
- `data/v3lab-causal-gaps.json`
- `knowledge/v3-storage-recovery-2026-09-23.md`
- `knowledge/version-log.md`

## État avant intervention

- ancien `data/BOONO-live-snapshot.json` : 7 126 307 octets, généré le 21/09.
- évaluations actives : ~1,5 Mo au relevé initial ;
- décisions actives : ~5,9 Mo ;
- shadow actif : ~22 Mo ;
- stockage V3 rotatif opérationnel ;
- processus BOONO en ligne.

Backup :
`archives/pre-mw-shared-bridge-20260923T225404Z`

Rollback principal :
- restaurer l'ancien snapshot depuis ce backup ;
- supprimer `modules/v3lab/monitoring/generate-live-snapshot.js` et `read-live-snapshot.js` si nécessaire ;
- restaurer `knowledge/version-log.md` depuis le backup ;
- remettre l'ancien prompt MW si le transport Remote Desktop s'avère indisponible.

Aucun moteur n'est dépendant du snapshot.

## Architecture retenue

### Snapshot canonique

`/root/agents-ia-zero-one/zero-one/data/BOONO-live-snapshot.json`

Précédent unique :

`/root/agents-ia-zero-one/zero-one/data/BOONO-live-snapshot.previous.json`

Schéma :
`boono-live-snapshot-v2.0`

Fenêtre :
120 minutes roulantes.

Plafond :
5 MiB non compressés.

Générateur :
`modules/v3lab/monitoring/generate-live-snapshot.js`

Lecteur compact pour ChatGPT/MW :
`modules/v3lab/monitoring/read-live-snapshot.js`

## Sources et causalité

Le générateur utilise uniquement les fichiers NDJSON rotatifs actifs et leurs segments récents :
- `trade-sim-v3lab-evaluations.ndjson`
- `trade-sim-v3lab-decisions.ndjson`
- `trade-sim-v3lab-shadow.ndjson`

Il utilise le helper segmenté `listSegments()` et ne lit jamais les archives géantes historiques.

Les gaps causaux connus de `data/v3lab-causal-gaps.json` sont inclus sans backfill.

Aucun tick brut OKX, secret, fichier d'environnement ou identifiant d'authentification n'est inclus.

## Contenu du snapshot

- generatedAt, fenêtre, fraîcheur, version ;
- contrôles de continuité/invalidité/doublons/régressions pour évaluations/décisions/shadow ;
- causal gaps ;
- contexte courant DATA→CONTEXT→WHERE→STATE→SEQUENCE→CONVERSION→DOMINANCE ;
- wave.structural, origine, end E15, direction, statut ;
- fullyRetraced et priceRetracementStatus séparés du statut structurel ;
- phase LBW/BW/MF, nested3m et turning ;
- priceVsMa200Stack avec semantic POSITION_ONLY_NOT_DIRECTIONAL_BIAS ;
- WHERE, dominance, régime ;
- protection, cible, R:R, ELIGIBILITY, entryAllowed et ACTION ;
- position V3 ;
- prévision figée la plus récente et son assessment éventuel ;
- fenêtre compacte de 120 min pour analyses causales.

## Contrat structurel préservé

- dernier leg E15→E15 confirmé reste ACTIVE jusqu'à nouveau leg opposé confirmé ;
- fullyRetraced est descriptif ;
- FALSIFIED_PRICE_LEG / THESIS_FALSIFIED_WAIT absents du chemin actif ;
- EXIT_STRUCTURE exige un nouveau leg E15 opposé ;
- LBW et MA200 stack ne sont pas permissions directionnelles ;
- protection prix distincte de la thèse ;
- aucun backfill.

## Écriture et intégrité

- écriture dans un fichier temporaire ;
- fsync ;
- validation JSON ;
- checksum SHA-256 du payload ;
- copie atomique du snapshot actif vers previous ;
- rename du temporaire vers l'actif ;
- relecture + vérification du checksum après publication.

## Tests réalisés

Génération 1 :
- taille 2 933 610 octets ;
- 240 évaluations ;
- 240 shadows ;
- 131 décisions ;
- 0 ligne invalide ;
- 0 doublon ;
- 0 régression ;
- continuité évaluations/shadow vraie.

Génération 2 :
- taille 2 931 525 octets ;
- fenêtre 119,9 min ;
- exactement 2 fichiers snapshot ;
- checksum vérifié ;
- aucun token obsolète/sensible détecté : FALSIFIED_PRICE_LEG, THESIS_FALSIFIED_WAIT, invalidationPrice, mots de passe/session/private key absents.

Le lecteur compact produit une sortie d'environ 22 Ko pour une passe MW, au lieu de charger le snapshot complet.

## Transport partagé retenu

Transport : connecteur ChatGPT Remote Desktop Commander, device logique `BOONOTRADE-VPS`.

Le snapshot reste persistant sur Amsterdam mais il n'est plus dépendant de SSH : ChatGPT le génère/lit via le connecteur Remote Desktop autorisé.

Commandes utilisées par le MW :
1. `node modules/v3lab/monitoring/generate-live-snapshot.js`
2. `node modules/v3lab/monitoring/read-live-snapshot.js`

Le dépôt GitHub déjà configuré sur le VPS a été explicitement rejeté comme transport car il est public. Aucune donnée BOONO live n'y a été publiée.

## Automatisation MW existante

Aucune nouvelle automation n'a été créée.
L'horaire et l'identifiant de `BOONO Overnight MW` sont inchangés.

Son prompt a été modifié pour :
- utiliser Remote Desktop Commander en priorité ;
- ne plus utiliser SSH brut/IP ;
- régénérer puis lire le snapshot ;
- échouer en [DONNÉES INSUFFISANTES] si le connecteur n'est pas disponible ;
- interdire tout backfill de substitution.

## Limite restante à vérifier prospectivement

Le transport est démontré bout-en-bout dans une discussion ChatGPT disposant du connecteur.
La première passe planifiée post-changement doit encore confirmer prospectivement que l'environnement automation reçoit bien le même connecteur ; ce point ne doit pas être déclaré démontré avant observation de cette passe.

## Prompt de passation court

Lis `knowledge/mw-shared-snapshot-bridge-2026-09-24.md`. Pour chaque MW, n'utilise pas SSH brut. Utilise Remote Desktop Commander, device `BOONOTRADE-VPS`, exécute `node modules/v3lab/monitoring/generate-live-snapshot.js`, puis `node modules/v3lab/monitoring/read-live-snapshot.js`. Vérifie schéma/fraîcheur/qualité/gaps avant l'analyse. Si le connecteur est indisponible, classe la fenêtre [DONNÉES INSUFFISANTES] sans backfill. Respecte le contrat E15 actif : structural ACTIVE jusqu'à nouveau leg opposé confirmé ; fullyRetraced descriptif seulement.
