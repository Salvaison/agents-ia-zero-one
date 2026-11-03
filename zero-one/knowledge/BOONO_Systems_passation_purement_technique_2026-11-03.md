# BOONO Systems — Passation strictement technique

**Date du contrôle : 3 novembre 2026 (UTC / Europe-Stockholm).**

**Périmètre :** architecture, processus, fichiers, dataflows, interfaces, studio, accès, opérations, sécurité technique et reprise. **Pas d'orientation commerciale ni d'appréciation artistique.**

**Décision documentaire :** [OD-20261103-001](operational-decisions/OD-20261103-001/03-origine-et-justification.md).

**Statuts :** VÉRIFIÉ LE 03/11 = constat d'un contrôle ponctuel ; DOCUMENTÉ = information de la KB antérieure ; OUVERT = information à revérifier ou travail non terminé. Ne jamais promouvoir un DOCUMENTÉ au rang de VÉRIFIÉ LE 03/11.

## 0. Accès rapide / points de vérité

| Composant | Emplacement canonique ou actif | Rôle |
|---|---|---|
| Code source Amsterdam | /root/agents-ia-zero-one/zero-one/ | moteur, collecteurs, BOONO Watch, bridge, scripts, KB |
| Dépôt Git racine | /root/agents-ia-zero-one/ | dépôt distant « Salvaison/agents-ia-zero-one » ; branche main au contrôle |
| Knowledge Base | zero-one/knowledge/ | rapports, décisions, critères, incidents |
| Entrée générale | zero-one/BOONOLAB_START_HERE.md | carte transversale, distinction source live / archives |
| Index thématique | zero-one/knowledge/BOONOLAB_INDEX.md | orientation vers les documents et modules |
| Registre des décisions | zero-one/knowledge/operational-decisions/ | source utilisateur, prompt opérationnel exact, provenance, événements, empreintes |
| Studio OVH | /home/ubuntu/boono-tv-studio/runtime/boono-tv/ | composition média et interfaces locales |
| Calibration écrans | /home/ubuntu/boono-tv-studio/runtime/boono-tv/desk/projection-config.json | coordonnées ajustées en direct ; **ne pas écraser** |
| Chromebook Penguin | /home/boono70/ et /mnt/chromeos/shared/MyFiles/ | GIMP, scripts/exports, fichiers sources partagés |
| Dossier XCF utilisateur | /mnt/chromeos/shared/MyFiles/Amsterdam/YT/ | sources de correction, projets GIMP |

Le dépôt observé comporte **117 entrées modifiées/non suivies** au contrôle du 3/11. **Ne jamais faire « git add . », « git reset --hard », « git clean » ou déployer ce répertoire globalement par facilité.** Limiter tout commit à des chemins explicitement validés. Les snapshots sous « data/ » et les credentials ne sont pas des assets Git.

## 1. Topologie et frontières

~~~text
TradingView/MarketCipher B (MCB 3m / 15m / contexte)
                 + flux prix/transactions OKX BTCUSDT
                         |
                         v
       VPS AMSTERDAM — DigitalOcean — source de vérité
       collecteurs Chromium/CDP, MCB, PM2, états marché
                         |
       modules causalité / thèse / MA / MF / conversion
                         |
         +---------------+------------------+
         |                                  |
       V4.9.4 PAPER                    V5.4.3 PAPER
       (runner V494)                   (runner V543)
         |                                  |
         +----------+-----------------------+
                    |
       Ledgers, décisions, audit, shadow (non autoritaire)
                    |
         +----------+------------------------+
         |                                   |
       BOONO Watch privé              bridge BOONO-TV
       config-server                  read-only 127.0.0.1:3090
                                             |
                                        SSH tunnel
                                             |
                                             v
                       VPS OVH — studio 127.0.0.1:3091
                       / radio 127.0.0.1:3093
                       flux relayé local :3309
                       HTML/CSS/Canvas + images RGBA
                       + projections matrix3d/homographies
                                             |
                                aperçu / rendu BOONO-TV
~~~

**Isolation impérative :** l'interface d'observation et le studio OVH consomment les faits et décisions **en lecture seule**. Ils ne doivent pas ouvrir d'ordres, modifier les contrôles de risque ni prendre une décision dans les runners. Un « shadow » est un comparateur/observateur et ne possède pas l'autorité PAPER.

## 2. Amsterdam — collecte et moteurs PAPER

**Hébergement historique (documentation du 28/10) :** VPS d'environ 2 vCPU / 4 Go RAM / 80 Go ; chiffres à recontrôler sur la machine avant dimensionnement. Processus supervisés par PM2, code principal sous « zero-one/ », stockage non versionné sous « zero-one/data/ » et « /root/agents-ia-zero-one/data/mcb-live/ ».

**Entrées :** Chromium/TradingView, MCB/BW/LBW/MF et événements 3m/15m, éventuels TF supérieurs en contexte ; prix et transactions OKX BTCUSDT. La source MCB peut « repaint », être retardée ou incohérente entre horodatages ; distinguer « sourceAt », « availableAt », « asOf » et état confirmé/live.

**Chaîne de calcul documentée :** MCB hypothèse → niveaux/structure/MA200/lieu → conversion prix/PM3/PM5/PM Live/ticker/cadence et Money Flow → interprétation temporelle de la campagne → admission/maintien/protection/sortie → décision PAPER et journal. Ne pas transformer cette vue d'ensemble en règle d'exécution précise ; **le code de la version effectivement exécutée** prévaut.

**VÉRIFIÉ LE 03/11 par « pm2 list » :**
- ONLINE : « collecteur-3m », « collecteur-tab2 », « config-server », « boono-v494-paper », « boono-v543-paper », « boono-tv » (bridge), « boono-desk-capture », « boono-audit-14d », « boono-v494-elastic-shadow », « boono-v494-entry-exit-shadow », « boono-v543-hold-shadow », « boono-execution-lab », « trendline », « daily-report », « watchdog », « baton-relay », « chrome-autoresize », « novnc », « xtigervnc ».
- STOPPED : « chrome-recycle » et « chrome-watchdog » au point de contrôle. **Un état STOPPED ne prouve pas, seul, un incident sur la collecte**. Les deux collecteurs et le config-server affichent plusieurs redémarrages cumulés ; consulter les journaux et la fraîcheur des sources avant d'en attribuer la cause.
- Les runners PAPER V494 et V543 étaient ONLINE. La KB et les runners documentent « brokerOrdersEnabled=false » et la séparation des ledgers ; **pas de passage d'ordres réels démontré**. Aucune intervention sur la stratégie effectuée pour cette passation.

**Chemins de référence à ouvrir selon le sujet :**
- « zero-one/modules/v5/baseline-v494-runner.js » (V494) ; « zero-one/modules/v5/runner-v543.js » et « decision-v543.js » (V543) ; « zero-one/modules/attention/ ».
- « zero-one/modules/config-server.js » (observabilité) ; « zero-one/shared/boono-chart-renderer.js » (graphes partagés).
- « zero-one/boono-tv/bridge.js » (publication read-only) ; « zero-one/boono-tv/desk/desk-capture-daemon.js » (capture écran réelle).
- « zero-one/data/v494-paper-trades.ndjson », « zero-one/data/v52-paper-trades.ndjson », états/décisions correspondants ; historique Audit14D ; « data/mcb-live/ » hors Git. **Éviter les transferts massifs en conversation et les copies de ledgers dans Git.**
- Baseline historique V4.9.3 figée : « /root/boono-v493-baseline/ », commit documentaire de référence « cdf1936 » (selon KB du 28/10).

**À revérifier avant tout audit/réglage :** PID et chemin de la commande PM2, version exacte chargée, état brokerOrdersEnabled, timestamp du dernier événement MCB/OKX, intégrité horaire UTC/CET, fraîcheur état Watch, qualité du prix, cohérence des ledgers et du runner. Les étiquettes de version ne garantissent pas la politique du processus en mémoire.

## 3. Watch, audit et SHADOWS

- **Watch privé** : service « config-server » sur Amsterdam, pages État vivant, Vagues, Prix/MA, Historique/Audit, Conversion/Flow, SHADOWS et rapports consultables. Les vues et événements ne sont **pas** l'exécution.
- **Rendu partagé** : « zero-one/shared/boono-chart-renderer.js » utilisé par Watch/TV ; toute modification peut affecter deux interfaces.
- **Audit14D** : service « boono-audit-14d » ONLINE au contrôle ; archive conçue sur fenêtre glissante de 14 jours, chargement historique à la demande pour ne pas alourdir la vue live. Qualité et complétude à vérifier, ne pas déduire d'un statut PM2 que toutes les heures sont archivées.
- **V494 Entrée/Sortie et Elastic** : services shadow ONLINE ; ticker 4×15m, mémoire de transitions et comparaisons A/B/C/D documentés dans la KB. Contrastes nets réalisés vs provisoires : ne jamais mélanger ces colonnes. Voir [Elastic V494](BOONOLAB_Elastic_V494_ticker4x15_et_chronologie_2026-10-30.md) et [Shadow Entrée/Sortie](BOONOLAB_Audit14D_V494_Entree_Sortie_Shadow_2026-10-30.md).
- **V543 maintien / gain-floors** : shadow « boono-v543-hold-shadow » ONLINE, politique PAPER et autres forks à distinguer. Voir [V543 sans gain-floor en shadow](BOONOLAB_V543_sans_gainfloor_invalidation_et_transfert_2026-10-30.md) et [Régime V494/V543](BOONOLAB_V494_weekend_regime_V543_floor_MCB_structure_2026-10-31.md).
- Toute modification des seuils/verrous exige une nouvelle enquête, validation et OD distincte ; la présente passation ne propose aucune modification de trading.

## 4. Pont vers OVH, studio et audio

**OVH** : « /home/ubuntu/boono-tv-studio/ » avec « runtime/boono-tv/scene/ », « runtime/boono-tv/assets/ », « runtime/boono-tv/desk/ », « audio/ », « incoming/ », « tests/ », « logs/ ».

**VÉRIFIÉ LE 03/11 :**
- Un processus Node « runtime/boono-tv/studio-server.js » écoute sur **127.0.0.1:3091**.
- Un processus Node « audio/radio-engine.js » écoute sur **127.0.0.1:3093**.
- Port de relais local **127.0.0.1:3309**, lié au bridge Amsterdam ; réponse HTTP 200 sur « /api/snapshot ».
- HTTP 200 sur « http://127.0.0.1:3091/ ».
- Les unités systemd interrogées sous les noms courts « boono-studio » et « boono-radio » étaient **inactive**, alors que les processus Node répondent. **Ne pas redémarrer ces unités au hasard** ; retrouver le véritable mode de supervision avant modification.
- **Aucune diffusion publique YouTube permanente démontrée** par ces seuls contrôles.

**Composition de référence V2 :** toile totale 1920×1080 ; ~720 px pour panneau analytique gauche, 1200×1080 pour loft/BOONO/bureau/chat à droite. Le compositing utilise HTML/CSS/Canvas, couches alpha et transformations « matrix3d » ; le bureau est un calque distinct du loft, des personnages, des bulles et des projections de données.

**Écrans :** deux quadrilatères et leurs homographies. À gauche instruments internes BOONO ; à droite capture MarketCipher/TradingView réelle relayée depuis Amsterdam (cadence historique ~10 s). Ne pas remplacer cette capture par une animation factice ni changer les coordonnées écran en changeant seulement un PNG.

**Fichiers essentiels :**
- « runtime/boono-tv/scene/boono-v2.css » et « boono-v2.js » : composition et assets V2.
- « runtime/boono-tv/scene/build_reframed_scene.py » : fabrication des PNG pleine scène à partir des sources approuvées.
- « runtime/boono-tv/desk/projection-config.json » : calibration vivante, éditable par l'UI et **à sauvegarder avant tout changement**.
- « runtime/boono-tv/assets/boonotv-v2-20261101/reframed-20261101/desk_1200x1080.png » : bureau utilisé dans la référence CSS active (contrôle 03/11).
- « runtime/boono-tv/assets/boonotv-v2-20261101/reframed-20261101/desk_GIMP_user_20261102_1200x1080.png » : **candidat préparé 02/11, non référencé par le CSS actif**.

**Ancres documentées pour le cadrage du 1/11 :**
- Bureau : (x=140, y=465), taille 920×613 ; export plein canevas 1200×1080.
- BOONO : (483,342), taille 288×374 ; chat : (190,460), taille 230×184.
- **Attention** : une variante documentée le 2/11 translate le bureau de (+120,−42) mais **n'a pas été activée**. Ne pas l'utiliser à la place du cadrage actuellement configuré par simple lecture du rapport [Recadrage strict bureau](BOONO_TV_recadrage_strict_bureau_2026-11-02.md).

**Modes de test historiques** (dans le Chrome distant Amsterdam relié au studio) : « ?showcase=1 », « ?v2Pose=1..10 », « ?v2Landscape=mountain », « ?layoutEdit=1&showcase=1&showcaseHold=1&panel=state ». Les URL/paramètres doivent être validés sur le studio en cours ; ne pas diffuser des adresses locales comme des liens Internet publics.

## 5. Accès distant, tunnels, noVNC

**Côté Amsterdam, constat du 03/11 :**
- « xtigervnc » sur 127.0.0.1:5900, « websockify/noVNC » sur 127.0.0.1:6080, bridge TV sur 127.0.0.1:3090.
- Le tunnel de scène est historiquement 127.0.0.1:8310 dans le Chrome distant Amsterdam vers OVH. C'est **une autre route** que noVNC 6080.
- Ne jamais publier directement VNC ou le bridge sur une interface externe.

**Côté Chromebook (Linux Penguin) :** une configuration SSH possède l'alias « boono-amsterdam ». Après redémarrage de Penguin, le tunnel local ne redémarre pas automatiquement ; rétablissement vérifié par l'utilisateur le 03/11 :

~~~bash
ssh -N -L 6080:127.0.0.1:6080 boono-amsterdam
~~~

Ouvrir ensuite « http://localhost:6080/vnc.html » **sur le Chromebook**, terminal du tunnel maintenu ouvert. Ne pas confondre la panne du tunnel local avec une panne des services à Amsterdam.

**Desktop Commander** : trois appareils autorisés et observés dans cette conversation : VPS OVH, VPS Amsterdam, et « penguin » (Chromebook). Au contrôle du 03/11 au moment de la rédaction, « penguin » est **offline après redémarrage**, les deux VPS sont online. Redémarrer explicitement l'agent sur Penguin si nécessaire (terminal distinct du tunnel noVNC) :

~~~bash
export PATH="$HOME/.local/opt/node-v22.12.0-linux-x64/bin:$PATH"
npx @wonderwhy-er/desktop-commander@latest remote
~~~

Pour l'agent DC 0.3.1, Node 22.12 minimum et WebSocket natif. N'exposer ni codes de vérification temporaires, ni clés SSH, ni secrets Git dans la KB.

## 6. Chromebook : environnement graphique et stockage

- GIMP **3.0.4** installé via Debian Trixie, calques XCF, masques, export PNG.
- Node Debian **v20.19.2**, npm Debian **9.2.0** ; version Node **v22.12.0** ajoutée **sans remplacer Debian**, sous « ~/.local/opt/node-v22.12.0-linux-x64/ ». Un PATH spécifique est requis après nouveau terminal.
- Version DC observée « 0.3.1 » (agent npx dans « ~/.npm/_npx/ »).
- Partition Linux : 2,5 puis 3,5 Go ; après nettoyage de caches elle avait **343 Mo libres sur 3,5 Go** ; propriétaire confirme extension à **4 Go le 03/11**. Le nouveau « df -h / » est **à vérifier** car l'agent « penguin » était offline.
- Fichiers volumineux BOONO : utiliser le partage « /mnt/chromeos/shared/MyFiles/Amsterdam/YT/ » ; conserver les XCF et PNG hors de la petite partition Crostini.
- Incidents historiques : saturation en cours d'installation npm, Btrfs temporairement « ro », paquet « node-pify » à réinstaller via archive Debian puis « dpkg --configure -a ». L'incident a été réparé et « dpkg --audit » était vide. Voir [rapport d'incident détaillé](BOONO_TV_incidents_sprites_GIMP_ChromeOS_2026-11-03.md).
- Les avertissements GIMP Wayland/xdg_foreign et AT-SPI sont rencontrés ; ne pas inférer que toutes les opérations PNG échouent. Une exportation batch depuis XCF a réussi.

## 7. Chaîne de fabrication et déploiement des assets RGBA

**Objectif technique : séparer source, découpe, retouche, export, validation et activation.**

~~~text
Dessin original approuvé (stocké sans écrasement)
    -> XCF GIMP : source + duplicata de travail + masque de calque natif
    -> retouche manuelle / contrôle des bordures et occlusions
    -> sauvegarde XCF dans ChromeOS partagé
    -> export PNG RGBA source plein format
    -> script de resize+placement dans toile scène 1200x1080
    -> dossier OVH incoming + hash + dimensions + contrôle alpha
    -> asset OVH sous nom versionné, NON ACTIF
    -> aperçu en situation et validation propriétaire
    -> sauvegarde CSS/projection-config + activation contrôlée
    -> contrôle en navigateur + possibilité de rollback
~~~

**Cas déjà réalisé (2/11, sans activation) :**
- XCF : « /mnt/chromeos/shared/MyFiles/Amsterdam/YT/BOONO_bureau_calques_v5.xcf », dimensions 1700×1024, source éditée sur Chromebook.
- Export GIMP Python batch réussi avec « Gimp.file_load » et « file-png-export » vers « BOONO_bureau_CORRIGE_original_1700.png ».
- OVH source : « incoming/boono_desk_gimp_20261102_SOURCE.png », SHA-256 **b17ef71d23d4d0ea8ca5472c274210de9e35401fc719b2772897e26faafce681**.
- OVH résultat : « assets/boonotv-v2-20261101/reframed-20261101/desk_GIMP_user_20261102_1200x1080.png » : 1200×1080 RGBA, fichier **941 299 octets**, SHA-256 **ad02307f1afed54842d1b8b9cd04ad189743d245f14051acae668fe6c28c2732**.
- Transformation utilisée : GIMP XCF → source 1700×1024 → FFmpeg Lanczos vers 920×613, **pad transparent** sur 1200×1080 au point (140,465). Aucun élément du bureau n'a été généré pendant la phase d'export/placement.
- Contrôle FFmpeg : rgba et alpha non uniforme (min=0, max=255). **Qualité du masque et adéquation aux écrans non prouvées** ; le CSS actif n'a pas été changé.
- Limite : le projet XCF du 2/11 comportait un calque visible et une référence cachée, mais **pas un masque de calque natif testé**. Le prochain projet doit corriger cette faiblesse avant usage comme gabarit pour plusieurs postures.

**Critères de passage en actif :** original/version/sha, opacité-alpha, inspection sur fonds contrastés, correspondance des quatre points de chaque écran, cadrage et mains, test des 10 postures/cat, accès au flux vrai MCB, approbation utilisateur et rollback disponible.

## 8. Procédures de vérification non intrusives

**Amsterdam** :

~~~bash
cd /root/agents-ia-zero-one
git status --short
pm2 list --no-color
ss -lntp | grep -E ':(5900|6080|3090|8310)\b'
# Lire ensuite seulement les fichiers/états ciblés :
# zero-one/modules/v5/, zero-one/data/, zero-one/knowledge/
~~~

**OVH** :

~~~bash
ss -lntp | grep -E ':(3091|3093|3309)\b'
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3091/
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3309/api/snapshot
grep -n 'desk_1200x1080' /home/ubuntu/boono-tv-studio/runtime/boono-tv/scene/boono-v2.css
sha256sum /home/ubuntu/boono-tv-studio/runtime/boono-tv/assets/boonotv-v2-20261101/reframed-20261101/desk_GIMP_user_20261102_1200x1080.png
~~~

**Penguin (après reconnexion)** :

~~~bash
df -h /
findmnt -no OPTIONS /
node --version; npm --version
# Dans le terminal Node 22 : export PATH=... avant npx
# Confirmer /mnt/chromeos/shared/MyFiles/Amsterdam/YT/
~~~

**Ne pas automatiser** un redémarrage PM2, une sauvegarde du fichier de calibration, un déploiement d'asset ou une modification PAPER dans une simple enquête documentaire. Les unités systemd à noms historiques ont montré un écart avec les processus Node réellement lancés : identifier le propriétaire de processus/service avant toute action.

## 9. Gouvernance documentaire / Git et récupération

- **Avant action**, lire « zero-one/BOONOLAB_START_HERE.md » et « zero-one/knowledge/BOONOLAB_INDEX.md » puis 2–4 rapports propres au sujet ; consulter le registre et sa demande originale exacte.
- **Un ordre de modification doit distinguer** validation, implémentation, tests et mise en service. Le statut « HTTP 200 » ou « asset copié » ne suffit pas à prouver que l'utilisateur a validé un rendu ni que les deux runners servent une donnée fraîche.
- **État Git au contrôle du 03/11** : branche « main », remote « git@github.com:Salvaison/agents-ia-zero-one.git », dernier HEAD observé avant cette documentation « 117557027f4af6bd1e26b919486cbc4437828c92 ». Dépôt très sale (**117 entrées**). Toute contribution nouvelle doit utiliser des chemins explicites « git add <fichiers voulus> » et un commit limité, sans englober les assets de test et modifications antérieures.
- **Restauration** : conserver une copie de « projection-config.json », des CSS/JS et du PNG actif ; remplacer une seule couche après tests, puis restaurer ce jeu exact en cas d'anomalie de perspective. Ne pas « corriger » les serveurs de trading pour un défaut de sprite ou de scène.
- **Secret et droit** : ne jamais copier les clés, tokens, cookies Chromium/TradingView, données privées ou identifiants d'échange dans Git ; vérifier les droits de redistribution des captures MarketCipher et des musiques avant diffusion publique.

## 10. État final et points ouverts au 03/11

**Constaté** : deux runners PAPER V494/V543 online ; collecteurs principaux online ; Watch/SHADOWS PM2 online ; noVNC serveur sain ; studio et radio Node OVH écoutent localement ; studio HTTP 200 ; bridge à travers OVH HTTP 200 ; candidat de bureau RGBA présent, **non actif**. Deux services de maintenance Chrome PM2 stopped (à qualifier si incident).

**Non démontré / reste à faire** :
1. Vérifier fraîcheur effective de tous les flux et les versions exactes de décision si le travail bascule vers trading.
2. Réconcilier le mode de supervision OVH (processus Node en marche / unités systemd aux noms courts « inactive »).
3. Reconnecter l'agent Desktop Commander « penguin » après redémarrage et relever « df -h / » sur le disque 4 Go.
4. Créer et tester un **vrai XCF avec masques de calque natifs**, non destructifs, puis permettre à l'utilisateur de finaliser les bords.
5. Contrôler la composition du bureau/cat/BOONO et **faire valider la maquette** avant activation CSS, changements de calibration et overlay des projections.
6. Ne pas reprendre la production de sprites à partir de générations rejetées ; utiliser une illustration validée comme **source fixe**, et non comme simple prompt.
7. Maintenir séparés studio média, moteurs PAPER, shadows et décisions/risk.

**Prompt compact de reprise technique :**

> Reprends BOONO Systems depuis « zero-one/BOONOLAB_START_HERE.md », puis « zero-one/knowledge/BOONOLAB_INDEX.md ». Lis la passation purement technique du 03/11 et le rapport d'incident sprites/GIMP/ChromeOS du même jour. Contrôle le statut live des VPS, du tunnel, de l'agent Penguin et des actifs CSS ; ne suppose ni déploiement artistique ni politique PAPER depuis un document. Respecte les sources originales et la calibration manuelle OVH ; prépare tout asset en masque natif GIMP éditable, staging séparé, vérification, validation visuelle puis activation explicite. Ne modifie pas le trading pour une tâche TV et n'ajoute jamais les autres modifications du dépôt au commit.
