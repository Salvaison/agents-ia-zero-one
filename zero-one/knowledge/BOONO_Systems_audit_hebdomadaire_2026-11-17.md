# BOONO SYSTEMS — Audit hebdomadaire de maintenance

**Contrôle : 17 novembre 2026, 14:28–14:40 UTC / 15:28–15:40 Europe-Stockholm.**  
**Base de comparaison :** contrôle initial du 5 novembre 2026 effectué sur les trois machines.  
**Périmètre :** VPS Amsterdam (DigitalOcean), studio OVH, Chromebook/Penguin (accès distant), santé PM2/systemd, réseau, mémoire, stockage, fraîcheur de données, rotations graphiques, Git/Knowledge Base et reprise.  
**Type :** enquête en lecture seule sur les services. Aucun redémarrage, purge de logs, changement de scène ou de trading. **Publication du rapport documentaire uniquement**, sans opération de production.

## Synthèse et statut de preuve

- **Amsterdam : surveillance renforcée** — fonctionnement continu et flux marché frais, mais mémoire disponible descendue à environ 543 Mo, swap utilisée 1,10 Go et un collecteur TradingView utilisant à lui seul environ 866 MiB de tas JavaScript. La charge moyenne de 1 minute (2,48) dépasse ponctuellement 2 vCPU ; cela ne prouve pas une saturation continue.
- **OVH : sain lors des contrôles** — studio et radio systemd utilisateur actifs, 10,6 Go de mémoire disponibles et 88 Go libres. Le transfert média/HTTP fonctionne ; pas de saturation serveur. Trois vidéos privées expliquent une grande partie de la croissance du disque.
- **Penguin : contrôle direct impossible** — agent Remote Desktop Commander **offline**, dernier contact annoncé il y a ~151 h. La dernière mesure directe historique date du 05/11 : Linux 4,0 Go, 77 % occupés, 853 Mo libres. L'utilisateur observe actuellement une alerte de stockage Linux, à vérifier par une nouvelle mesure. Ne pas citer le 77 % comme valeur actuelle.
- **BOONO-TV rotations :** tests navigateur headless réussis pour les durées 25 / 15 / 5 secondes, mais coût de rendu non négligeable et re-dessin de panneaux masqués observé dans le code. Les ralentissements sur le vrai Chromebook ne sont pas reproduits ni exclus.
- **Knowledge Base :** répertoire Amsterdam accessible en écriture, disque non saturé, `git ls-remote origin HEAD` et `git push --dry-run origin main` réussis. L'échec signalé dans une autre discussion concernait les permissions de la connexion GitHub utilisée à cet endroit ; ne pas confondre avec une panne globale du dépôt ou du disque. Le document `BOONO_TV_VISION_OPEN_STAGE_2026-11-17.md` n'était pas présent dans la KB sous ce nom lors du contrôle.

## 1. Infrastructure : charge, RAM et swap

| Observation | Amsterdam | OVH |
|---|---:|---:|
| vCPU | 2 | 6 |
| Load 1/5/15 min | 2,48 / 1,45 / 1,13 | 0,08 / 0,09 / 0,09 |
| RAM disponible (MemAvailable) | 543 Mo / 3915 Mo | 10611 Mo / 11671 Mo |
| Swap utilisée | 1099 Mo / 4095 Mo | 0 (pas de swap) |
| Disque racine | 22 Go / 77 Go, 29 % | 8,5 Go / 96 Go, 9 % |
| Espace libre | 56 Go | 88 Go |
| Inodes utilisés | 12 % | 3 % |
| Uptime | 83 jours | 34 jours |
| PSI CPU some avg60 | 15,39 % | 0 % |
| PSI mémoire/IO avg60 | 0 % / 0 % | 0 % / 0 % |

Les 3 intervalles instantanés `vmstat` sur Amsterdam montrent jusqu'à 70 % de temps CPU utilisateur et de petits épisodes de lecture depuis la swap (1,5–2,6 Mo/s) ; aucune pression mémoire/IO soutenue selon PSI à cet instant. La mémoire disponible a baissé depuis environ 1,2 Go au 05/11 à 543 Mo ; swap 648 Mo → 1099 Mo. **Aucune attribution causale à un seul processus sans profilage longitudinal.**

### Chrome Amsterdam / TradingView

- 14 processus Chrome ; somme des mémoires résidentes RSS ~2481 Mo (double-comptabilisation possible des pages partagées). Un processus renderer occupe ~1230 Mo RSS.
- Mesure **réelle CDP du tas JavaScript utilisé** (ce n'est pas RSS physique) :
  - TA `qljTf3vu` : 145 MiB.
  - Deux onglets `2AqpEMfD` collecteurs : 111 MiB et **866 MiB**.
  - BOONO-TV ouvert dans Chrome Amsterdam : 2 MiB.
- Un onglet collecteur est anormalement plus gourmand que l'autre. La cause (historique trop long, croissance mémoire, données TradingView) reste non établie. **Ne pas recycler ou fermer ce collecteur sans préparation**, car il alimente des sources utilisées par le trading.

## 2. Services et fraîcheur des données

- PM2 **online** : collecteurs `collecteur-3m` et `collecteur-tab2` (redémarrages cumulés respectifs 8 et 9), `boono-v543-paper`, `boono-v55-paper`, `boono-tv`, `boono-desk-capture`, `config-server`, shadows, Audit14D, trendline et watchdog de données.
- `boono-v494-paper` et ses deux shadows sont **stopped** conformément au retrait et remplacement documentés le 16/11. `chrome-recycle` et `chrome-watchdog` sont toujours `stopped` ; leur mode de maintenance mérite un contrôle ciblé avant toute réactivation.
- V5.5 state : version `v5.5-paper-ledger-v1.0`, `brokerOrdersEnabled=false` confirmé dans l'état. Aucun ordre financé démontré ; moteur PAPER.
- Fichiers `mcb_3m_live.csv`, `mcb_15m_live.csv`, 1h et 4h réactualisés pendant l'audit. Les fichiers confirmés 3m/15m possèdent également des dates de modification récentes.
- Snapshot bridge BOONO-TV Amsterdam : source `V543_PAPER_STATE_READ_ONLY`, prix frais (`ageMs=558`), analyse fraîche (`ageMs=14675`) à 14:31 UTC ; version émise V543. Il n'y a pas de preuve que BOONO-TV présente directement la nouvelle décision V5.5 — à vérifier comme question d'étiquetage, sans en déduire une panne.
- Capture MarketCipher réelle validée avec `ok=true`, JPEG environ 22,7 Ko, `nextMs=60000`, et état source réactualisé. Les données affichées doivent toujours être datées par source et disponibilité.

## 3. Latence et débit réseau

Échantillon de compteurs kernel sur environ 12 secondes, débit **total des interfaces**, pas consommation facturée ni bande passante maximale :

| Flux | Amsterdam eth0 | OVH ens3 |
|---|---:|---:|
| Réception | ~99 Ko/s | ~67 Ko/s |
| Émission | ~107 Ko/s | ~65 Ko/s |
| Compteurs d'erreurs et de pertes | 0 | 0 |

HTTP local mesuré : bridge Amsterdam 200 en ~82–137 ms (3 requêtes), snapshot OVH via tunnel 200 en ~342 ms, accueil studio OVH 200 en ~2,7 ms, capture JPEG OVH disponible. Ce contrôle ne mesure pas le débit final depuis Chromebook ou Android. Les nouvelles vidéos privées nécessitent de suivre la consommation par session spectateur à l'avenir, compte tenu de l'incident de consommation Internet du 22/10.

## 4. Stockage, archives et journaux

| Usage | 05/11 | 17/11 |
|---|---:|---:|
| Amsterdam `zero-one/data/` | 3,0 Go | 3,1 Go |
| Amsterdam logs PM2 | 325 Mo | 335 Mo |
| Amsterdam journald | ~1,1 Go | ~1,2 Go |
| OVH occupation du disque | 6,5 Go | 8,5 Go |

Amsterdam : 142 fichiers segmentés ~2813 Mo (contre 117, ~2677 Mo le 05/11). `/var/log` ~1,4 Go ; ancien `cerveau-central-out.log` ~281 Mo (fichier historique, non effacé). Pas de menace immédiate de capacité, mais politique de rotation et croissance à surveiller. OVH : `private-media` ~1,6 Go (Clemens Costa, House Party, Bioluminescent Forest et audios) ; `backups` locaux ~8,4 Mo, studio runtime ~104 Mo.

**Pas de purge ou compression entreprise.** Les sauvegardes locales existent sur OVH, mais l'intégrité et une sauvegarde **hors VPS** restaurable ne sont pas prouvées par cet audit. Les flags `reboot-required` sont présents sur les deux VPS : les traiter dans une fenêtre dédiée, après vérification d'une procédure de reprise et des sauvegardes, jamais pendant un simple audit.

## 5. Rotation BOONO-TV : code et test navigateur

Code actif OVH `scene/chart-views.js` : `PANEL_DURATIONS_MS={state:25000,charts:15000,trades:5000}`, cycle de 45 s, minuterie unique. `onSnapshot(s)` dessine inconditionnellement `drawTrio(s)` et `drawCompletedTrades(s)`, même si les panneaux ne sont pas visibles.

Test headless Puppeteer sur OVH, navigateur à 1600×900 et GPU désactivé ; **deux sessions de 49 secondes** :

| Métrique | Normal | Vidéo privée Canvas 8 ips |
|---|---:|---:|
| Premier passage state→charts | 24,807 s | 24,762 s |
| charts→trades | 15,005 s | 15,005 s |
| trades→state | 5,001 s | 5,000 s |
| Appels snapshot | 12 | 12 |
| Appels tracé prix (toute la scène) | 89 | 88 |
| Appels tracé vagues (toute la scène) | 178 | 176 |
| TaskDuration cumulée, 49 s | 2,123 s | 4,715 s |
| Erreurs JS | 0 | 0 |
| Erreurs de dessin vidéo Canvas | — | 0 |

La vidéo double approximativement le coût de tâches Javascript mesuré dans ce test, mais **les minuteries respectent bien leur cadence dans le navigateur de contrôle**. La lenteur du Chromebook réel n'est pas établie par le test. La répétition des dessins de graphiques invisibles est une **inefficacité vérifiée dans le code**, candidate à une correction distincte après validation, sans toucher aux données ni à la stratégie.

**Proposition non autorisée/implémentée :** différer le rendu des panneaux masqués, conserver uniquement les snapshots frais en mémoire et dessiner à l'activation du panneau ; mesurer le résultat sur Chromebook et avec vidéo, contrôler les régressions des données Live/confirmées. Aucun code de scène modifié aujourd'hui.

## 6. Chromebook Penguin : anomalie prioritaire non mesurée

- Agent Desktop Commander Penguin offline au moment du contrôle ; dernier contact signalé il y a environ 151 heures.
- Dernière donnée directement vérifiée au 05/11 : partition Linux `/dev/vdb` Btrfs agrandie à 4,0 Go, 2,8 Go utilisés, 853 Mo libres, 77 %. **Ceci n'est pas l'état du 17/11.**
- L'utilisateur signale aujourd'hui une alerte de partition Linux pleine et a récemment redémarré ChromeOS pour surcharge. Aucun relevé `df` ou mémoire ChromeOS actuel possible sans rétablir l'agent Penguin ou recevoir le texte local.
- Mesure demandée lors du prochain accès Penguin : `df -h /`, `df -i /`, puis taille `~/.npm`, `~/.cache`, `~/.local` et journaux via `du -sh` en lecture seule. Ne pas vider les caches npx, GIMP ou Desktop Commander avant d'avoir identifié les dépendances et les scripts de démarrage.
- Si la partition dépasse 90 % et que ChromeOS a lui-même assez d'espace libre, envisager une extension Crostini au-delà de 4 Go après sauvegarde ; la décision requiert une mesure actuelle du disque hôte.

## 7. GitHub et Knowledge Base

- Sur Amsterdam : 56 Go libres ; `zero-one/knowledge/` et `.git` sont accessibles en écriture par le compte de maintenance ; `git ls-remote origin HEAD` et `git push --dry-run origin main` ont réussi.
- 125 chemins du dépôt modifiés ou non suivis, dont un fichier de recherche d'une autre discussion déjà staged. **Ne jamais exécuter `git add .`, `git clean`, `git reset --hard` ni faire un commit global.**
- Le refus d'écriture de la note Open Stage signalé par l'utilisateur était un problème d'accès de **l'outil/de la session GitHub employé dans l'autre discussion**, pas de place disque côté VPS. Il faut vérifier les permissions du connecteur et utiliser la session de maintenance autorisée lorsqu'une publication Git est voulue.
- Le document `BOONO_TV_VISION_OPEN_STAGE_2026-11-17.md` n'a pas été trouvé dans la KB lors de ce contrôle. Il ne faut pas en inventer le contenu ; sa demande et son texte original résident dans l'autre discussion.
- La présente publication est une **documentation d'audit** et non une modification du runtime ou un nouveau mécanisme de trading.

## 8. Recommandations et contrôles de la prochaine revue

| Priorité | Statut | Suite |
|---|---|---|
| P0 | Penguin inaccessible et alerte disque | Reconnecter l'agent, relever `df -h /` et les consommateurs d'espace ; ne rien supprimer à l'aveugle |
| P1 | 866 MiB de heap JS sur un collecteur TradingView | Tracer la croissance sur 24–48 h, comparer par onglet, préparer un recyclage contrôlé uniquement après sauvegarde et validation |
| P1 | Redessins de panneaux cachés BOONO-TV | Proposer une optimisation conditionnelle + tests de rotations et de fraîcheur, puis validation utilisateur avant déploiement |
| P1 | Reboot requis des deux VPS | Contrôler sauvegardes et supervision puis planifier un redémarrage séparé avec reprise contrôlée |
| P2 | Archives/logs et backup hors VPS | Vérifier rotation, rétention, coût et restauration réelle ; aucune purge immédiate |
| P2 | GitHub de l'autre discussion | Diagnostiquer la permission du connecteur et publier la note Open Stage uniquement à partir du texte original |
| P2 | Observabilité réseau client | Mesurer transfert et latence depuis Chromebook/Android, par scène avec/sans vidéo |

**Cadence retenue pour l'audit BOONO Systems :** contrôle hebdomadaire daté, comparaison aux mesures antérieures, séparation constat/document/hypothèse/décision/implémentation/tests/service, collecte compacte des preuves, aucune action sur les runners ni sur la scène pendant un simple contrôle. Les seuils d'alerte automatiques ne sont pas nouveaux paramètres validés par ce document.

**Reproductibilité :** mesures obtenues via `date`, `uptime`, `free -m`, `df -hT`, `df -i`, PSI (`/proc/pressure`), `vmstat`, `ps`, compteurs réseau (`/sys/class/net`), `du`, `journalctl --disk-usage`, `pm2 list` et `pm2 jlist`, `curl`, `jq`, CDP Chrome et test Puppeteer en mémoire. Script temporaire de test : `/tmp/boono_audit_rotation_20261117.js` sur OVH, JSON temporaire `/tmp/boono_audit_rotation_20261117.result.json`. Aucun instrument de performance installé à long terme.

**Limites explicites :** aucune mesure directe GPU/RAM/disque ChromeOS, aucun compte rendu indépendant des sauvegardes DigitalOcean/OVH, aucun audit d'authentification complète Watch, aucune mesure de bande passante facturée et aucune preuve que les optimisations proposées amélioreraient effectivement le Chromebook avant tests A/B.
