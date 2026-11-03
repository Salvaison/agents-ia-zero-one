# BOONO-TV — Rétrospective des difficultés et réparations (2–3 novembre 2026)

**Statut : rapport de retour d'expérience documenté ; aucun correctif graphique final réputé validé.**

**Référence de décision documentaire :** [OD-20261103-001](operational-decisions/OD-20261103-001/03-origine-et-justification.md).

**Périmètre :** images BOONO et bureau, sprites RGBA/masques, GIMP 3 sur Chromebook, Linux/Crostini, npm/Node.js, Desktop Commander, tunnel noVNC, transfert d'asset vers OVH.

**Provenance :** faits de la conversation des 2–3/11 ; contrôles ciblés Amsterdam/OVH du 3/11. Aucune reconstitution de capture, de masque parfait ou de test non effectué.

## 1. Synthèse d'incident

Une retouche en apparence locale du bureau canonique s'est transformée en une longue suite d'essais insatisfaisants. L'utilisateur voulait **préserver strictement les pixels existants** et intervenir seulement sur (a) le coin de bois gauche et quelques câbles, (b) la suppression de la zone de plateau vide signalée, (c) un détourage transparent permettant l'intégration devant le loft, en laissant **inchangés** écrans, ferrures, commandes et rack sous l'établi. Un graphique devait être repositionné à l'avant droit dans la composition, mais cette dernière action **n'est pas réalisée ni attestée**.

Les premières générations ont réinventé le bureau. Les tentatives Python/masque alpha ont ensuite conservé davantage de pixels mais produit des raccords artificiels, des coupes de contour et des fragments de décor. Ces itérations ont été présentées trop tôt, parfois accompagnées d'une assurance excessive sur leur état. **Aucun de ces essais ne doit devenir la référence canonique.**

L'utilisateur a repris les finitions dans **GIMP 3**, installé sur son Chromebook, et a produit un XCF modifié. Une exportation RGBA puis une version scène ont ensuite été **transférées et vérifiées sur OVH**, **sans remplacement de l'asset actif**. Cette réussite de transfert ne constitue ni un détourage artistiquement validé ni une intégration visuelle.

En parallèle, l'installation de GIMP et de l'accès distant a nécessité plusieurs réparations du conteneur Linux, une mise à niveau isolée vers Node 22, puis le rétablissement du tunnel SSH après un redémarrage.

## 2. Chronologie factuelle des difficultés

| Phase | Symptôme / problème | Diagnostic ou limite constatée | Action réellement entreprise | État vérifiable |
|---|---|---|---|---|
| Bureau source | Coin gauche tronqué, espace de bois vide, fond non détouré | Illustration canonique déjà approuvée ; seuls des changements locaux autorisés | Plusieurs images régénérées au lieu d'une retouche fidèle | **ÉCHEC artistique**, nouvelles géométries rejetées |
| Sprites alpha successifs | Franges, triangles de décor, contours amputés, raccords de bois grossiers | Polygones et copies de textures insuffisants pour une silhouette complexe ; absence de validation visuelle à fort zoom | Essais PNG alpha / aperçus damier / OpenRaster | **NON VALIDÉS** |
| Projet GIMP initial | Difficulté à corriger la « sélection » ; masque non directement éditable | Certains pointillés = limites du calque, pas sélection ; fichier .ora précédent contenait du RGBA et parfois un calque gris **non associé à un masque GIMP natif** | Ouverture dans GIMP, interventions manuelles | Besoin confirmé de **vrai masque de calque non destructif** |
| Outil Clonage | Ctrl+clic source effectué, mais la peinture n'agissait pas comme attendu | Cause exacte **non démontrée**. Différence canevas / limites du calque, mauvais calque actif, mode outil ou masque sont des pistes, pas un diagnostic prouvé | Conseils de sélection, calque aux dimensions de l'image et options Clone ; utilisateur a travaillé directement | Finition utilisateur partielle, diagnostic du blocage incomplet |
| Avertissements GIMP | xdg_foreign / Wayland, AT-SPI, ponctuellement « Broken pipe » PNG | Compatibilité ChromeOS/Wayland ; les warnings ne démontrent pas à eux seuls une corruption d'image | GIMP a continué à fonctionner, XCF ouvert et export batch réussi ensuite | **Fonctionnel avec réserves**, pas de correctif Wayland déployé |
| Installation GIMP | Partition Linux initiale de 2,5 Go ; espace réduit | GIMP Debian Trixie avec dépendances : simulation ~332 Mo | Installation GIMP **3.0.4**, puis redimensionnement Linux à 3,5 Go | GIMP installé et lancé |
| Node/npm Debian | Première installation interrompue, ENOSPC, puis système de fichiers temporairement en lecture seule | Paquet node-pify incohérent ; dépendances en cascade ; Btrfs monté « ro » | Arrêt/redémarrage Linux => « rw », récupération du paquet officiel via apt download puis dpkg -i et dpkg --configure -a | Configuration débloquée ; npm 9.2.0 installé |
| Desktop Commander | npx @wonderwhy-er/desktop-commander@0.3.1 refuse de démarrer sur Node 20 | Version exige Node >=22.12.0 et WebSocket natif | Archive officielle Node 22.12.0 décompressée sous ~/.local/opt, PATH temporaire ; WebSocket testé (« function ») | Agent 0.3.1 connecté à « penguin » après autorisation |
| Disque Linux | ~138 Mo libres / 96 % au 3/11 avant nettoyage | Cache npm ~363 Mo dont agent _npx 263 Mo, cache réutilisable ~99 Mo ; cache APT ~121 Mo ; Node 22 local ~187 Mo | « npm cache clean --force » : ~+89 Mo ; « sudo apt-get clean » : ~+116 Mo | 343 Mo libres à 3,5 Go ; utilisateur a ensuite augmenté la partition à **4 Go**. Nouveau solde **non contrôlé à distance** après redémarrage |
| Après redémarrage Penguin | Site noVNC Amsterdam inaccessible ; Desktop Commander Penguin offline | Tunnel SSH local tombé, **mais VNC serveur sain** | Vérification Amsterdam : TigerVNC 127.0.0.1:5900 et websockify 127.0.0.1:6080 ; tunnel « ssh -N -L 6080:127.0.0.1:6080 boono-amsterdam » | Utilisateur confirme noVNC et Amsterdam revenus ; Penguin DC à reconnecter après restart |
| Export/OVH | Illustration modifiée localement ; demande de dimensionner et transférer | Le rendu scène attend toile 1200×1080 ; asset bureau dimensionné 920×613 à (140,465) dans la scène du 1/11 | Export XCF en PNG 1700×1024 ; échelle + positionnement transparent avec FFmpeg ; copie versionnée sur OVH | **TRANSFERT ET FORMAT CONFIRMÉS ; NON ACTIVÉ** |

## 3. Chaîne de fichiers graphique — ce qui est effectivement disponible

**Original iconographique :** image canonique du bureau (ex. « Console de trading industriel néon.png » dans les Téléchargements ChromeOS) et [fiche de géométrie validée](BOONO_TV_bureau_ordinateur_reference_canonique_2026-11-01.md). La feuille « BOONO, maestro-industrial.png » montrée par le propriétaire est une **référence de qualité pour les gestes et l'identité du robot** ; les dernières variantes du robot ne la remplacent pas.

**Édition utilisateur sur Chromebook**, dossier partagé :

« /mnt/chromeos/shared/MyFiles/Amsterdam/YT/BOONO_bureau_calques_v5.xcf » — fichier réellement trouvé et ouvert par export batch GIMP ; canevas **1700×1024** ; calque visible « Référence originale (masquée) copy », original masqué en calque séparé. Le fichier porte les retouches de l'utilisateur et constitue l'entrée de travail de cette phase, **pas une validation du masque**.

**Export original** :

« /mnt/chromeos/shared/MyFiles/Amsterdam/YT/BOONO_bureau_CORRIGE_original_1700.png » — GIMP 3 Python batch, « file-png-export », résultat SUCCESS.

**OVH**, réception et versionnement :

- « /home/ubuntu/boono-tv-studio/incoming/boono_desk_gimp_20261102_SOURCE.png » — 1700×1024 RGBA, SHA-256 b17ef71d23d4d0ea8ca5472c274210de9e35401fc719b2772897e26faafce681.
- « /home/ubuntu/boono-tv-studio/incoming/boono_desk_gimp_20261102_1200x1080.png » — version de scène RGBA, 1200×1080.
- « /home/ubuntu/boono-tv-studio/runtime/boono-tv/assets/boonotv-v2-20261101/reframed-20261101/desk_GIMP_user_20261102_1200x1080.png » — **nouveau fichier indépendant** de 920 Ko, SHA-256 ad02307f1afed54842d1b8b9cd04ad189743d245f14051acae668fe6c28c2732.
- Contrôles OVH : PNG, 8 bits, type couleur 6 (RGBA), dimensions 1200×1080, canal alpha comprenant 0 et 255. **Ces tests vérifient l'alpha, pas la propreté des bords.**

La scène active continue de référencer « reframed-20261101/desk_1200x1080.png » dans « scene/boono-v2.css ». L'asset GIMP **n'est pas déployé à sa place** ; les quadrilatères d'écrans et le fichier « desk/projection-config.json » restent à préserver.

## 4. Pourquoi la production des sprites a échoué

**Erreur de méthode déterminante :** une retouche locale sur objet validé a été traitée comme une génération d'image complète. Une formulation de prompt stricte n'impose pas la conservation des pixels dans le moteur génératif. Les résultats ont déplacé/recréé ferrures, moniteurs, table ou style, contrairement au mandat.

**Deuxième erreur :** l'alternative programmée a utilisé des masques géométriques approximatifs sans les étapes incontournables d'inspection zoomée, tracé précis et reprise des raccords. Les câbles fins, la silhouette sous l'établi et les jonctions bois–décor ne se prêtent pas à un simple polygone grossier.

**Troisième erreur :** les brouillons ont été trop souvent annoncés comme des livrables, bien que l'utilisateur signalait des défauts immédiatement visibles. **Un PNG techniquement RGBA, même à la bonne taille, n'est pas un sprite artistiquement acceptable.**

**Quatrième erreur :** confusion entre calque alpha « déjà effacé » et **masque de calque natif modifiable** dans GIMP. L'utilisateur devait pouvoir peindre en noir/blanc sur le masque tout en gardant l'image source inchangée. L'OpenRaster des premiers essais ne garantissait pas cette ergonomie.

## 5. Procédure de production validée comme méthode, non encore testée de bout en bout

1. **Création** : dessiner le personnage ou l'objet sur fond simple/neutre. Confronter à la référence canonique, sans déformer visage, bouche mécanique, yeux/arcades, posture trois-quarts, ferrures ou perspective.
2. **Validation artistique préalable** : aucune segmentation ni intégration tant que le dessin n'a pas été approuvé.
3. **Préparation automatisée** : conserver l'original intact et visible dans un calque de référence ; ajouter un calque de travail avec un **masque de calque GIMP 3 réellement attaché**, noir = caché, blanc = visible, gris = transition. Les zones réellement intactes ne sont pas repeintes.
4. **Contrôle manuel** : ouvrir XCF depuis le stockage ChromeOS partagé ; l'utilisateur affine contours, câbles, mains et raccords, par zoom 100–400 % et comparaison sur fond clair/foncé. Ne pas confondre pointillés de frontière du calque et sélection active (« Ctrl+Maj+A » ne supprime que la sélection).
5. **Reprise technique** : sauvegarde explicite du XCF ; export PNG RGBA ; comparaison sur plusieurs fonds et inspection de la jonction réelle dans la scène.
6. **Staging OVH** : copier sous **nouveau nom**, dimensionner avec respect des proportions et vérifier largeur, hauteur, alpha, SHA-256 ; conserver la version source et le hash.
7. **Gate de mise en service** : aucun remplacement du bureau actif, des ancrages, projections ou du casting sans validation visuelle explicite du propriétaire ; sauvegarder fichiers actifs et configuration de calibration avant tout switch.

**Statut :** ce protocole est désormais le mode de collaboration convenu, **mais n'a pas été entièrement démontré** sur les cinq sprites DJ. Ne pas prétendre que GIMP est piloté comme Photoshop par souris : Desktop Commander gère principalement fichiers et terminal ; les scripts GIMP et les validations visuelles doivent être organisés explicitement.

## 6. Entretien du Chromebook — état et bonnes pratiques

- Linux Crostini (Penguin) : 2,5 Go initialement, 3,5 Go après installation de GIMP/Node, **4 Go déclarés par le propriétaire le 3/11**. Dernière mesure à distance avant redimensionnement : **343 Mo libres** sur 3,5 Go, après nettoyages. Une nouvelle mesure « df -h / » reste à effectuer après reconnexion.
- GIMP **3.0.4** depuis les paquets Debian Trixie.
- Debian Node **20.19.2** + npm **9.2.0** ; Desktop Commander v0.3.1 nécessite **Node >=22.12**.
- Node **22.12.0** installé séparément dans « ~/.local/opt/node-v22.12.0-linux-x64 » (env. 187 Mo), activation par « export PATH="$HOME/.local/opt/node-v22.12.0-linux-x64/bin:$PATH" » dans un terminal neuf ; ne pas écraser arbitrairement /usr/bin/node.
- Agent DC « npx @wonderwhy-er/desktop-commander@latest remote », cache sous « ~/.npm/_npx » (~263 Mo), terminal à garder ouvert ; le reconnecter manuellement après restart. Gestion des appareils : https://mcp.desktopcommander.app/.
- Chemins images partagées : « /mnt/chromeos/shared/MyFiles/… » ; **ne pas copier les grands XCF/PNG dans /home Linux**. Éviter nouveaux packages lourds sur partition restreinte.
- Nettoyages déjà effectués : « npm cache clean --force » (~89 Mo), « sudo apt-get clean » (~116 Mo). Ne pas effacer « ~/.npm/_npx » pendant l'utilisation de Desktop Commander ; cela forcerait des retéléchargements et potentiellement une interruption de connexion.
- Incident apt : « node-pify » en état très incohérent ; réparation concrète : arrêt/redémarrage Linux pour retrouver « rw », puis « cd /tmp; apt download node-pify; sudo dpkg -i ./node-pify_*.deb; sudo dpkg --configure -a », puis installation npm. « dpkg --audit » a ensuite été vide. **Ces commandes sont une trace historique, pas une recette à rejouer si Linux est sain.**

## 7. Rétablissement de l'accès distant

**Symptôme :** après redémarrage de Penguin, URL noVNC injoignable.

**Diagnostic confirmé côté Amsterdam :** TigerVNC écoute sur 127.0.0.1:5900, websockify/noVNC sur 127.0.0.1:6080, pont TV sur 127.0.0.1:3090. La cause probable était le tunnel local non relancé, pas un arrêt du service serveur. L'utilisateur confirme le retour après la commande :

~~~bash
ssh -N -L 6080:127.0.0.1:6080 boono-amsterdam
~~~

La page est ensuite accessible dans le Chrome du Chromebook : « http://localhost:6080/vnc.html ». Conserver le terminal du tunnel ouvert. Le tunnel de scène « 8310 » et celui du noVNC « 6080 » sont distincts. Ne pas ouvrir 6080/5900 publiquement pour contourner un tunnel manquant.

## 8. Liste d'acceptation pour les futurs assets

- [ ] Original et références précisément identifiés ; source canonique non écrasée.
- [ ] Les régions non autorisées sont inchangées ; changement géométrique local explicitement approuvé.
- [ ] Masque **natif, éditable et non destructif** ; pas seulement transparence baked-in.
- [ ] Sur fond blanc, noir et dans le loft, pas de frange, trou, fragment de décor ni raccord dur.
- [ ] Les mains/personnage passent correctement devant les écrans ; table et rack derrière, selon le plan d'occlusion validé.
- [ ] PNG RGBA, dimensions et ancrage corrects ; hash et chemin versionnés.
- [ ] Validation visuelle du propriétaire après rendu OVH ; activation et retour arrière documentés.

## 9. Travaux encore ouverts

1. Produire un premier **XCF avec un véritable masque de calque attaché**, à partir d'un **dessin déjà accepté** ; cette étape doit être démontrée et contrôlée avant de répéter les cinq postures.
2. Terminer et faire valider le détourage du bureau et/ou de BOONO DJ à la main. Le bureau source de GIMP reste un asset **candidat**, pas un asset actif.
3. Vérifier espace libre après passage à 4 Go, reconnecter l'agent « penguin » après restart, et tester un cycle de sauvegarde/export sans copier de fichiers volumineux dans Linux.
4. Vérifier avec le propriétaire la **position du graphique dans le coin avant droit** et les occlusions : la demande graphique n'a pas été implémentée dans ce chantier.
5. Après validation, mettre à jour uniquement les assets et références nécessaires du studio OVH, avec sauvegarde de « projection-config.json », sans toucher au trading PAPER.

**Conclusion factuelle :** nous avons réparé l'environnement Linux, rendu possible GIMP et l'accès distant, et réalisé un transfert OVH contrôlé. **Nous n'avons pas démontré un détourage artistique professionnel automatique.** La méthode hybride assistant/préparation + utilisateur/finition + assistant/export est la nouvelle discipline, à éprouver avant de la déclarer industrialisée.
