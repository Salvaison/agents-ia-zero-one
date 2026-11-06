# BOONO-TV — Incident audiovisuel ChromeOS : disparition des sprites et positions du chat

**6 novembre 2026 — BOONO Systems / maintenance initiale, OD-20261106-002.**
**Portée :** prévisualisation privée OVH uniquement ; pas de modification des moteurs PAPER V494/V543, collecteurs MCB, TradingView, réglages GIMP ou calibration.
**Statuts :** DIAGNOSTIQUÉ et CORRIGÉ EN CODE ; TESTÉ SUR CHROMIUM ; ACTIF DANS LE STUDIO PRIVÉ ; **VALIDATION EFFECTIVE CHROMEOS ENCORE OUVERTE**.

## Incident rapporté
Sur Chromebook, au lancement du MP4 Clemens Costa dans les fenêtres du loft, les sprites BOONO disparaissent mais reviennent à la pause. Les cinq chat(s) apparaissent, mais semblent déplacés par rapport aux positions sauvegardées ; bulles et État vivant restent fonctionnels. Le signalement est cohérent avec une difficulté de rendu/décodage/composition dans ChromeOS ou un conflit de ressources, mais n'en prouve pas la cause GPU précise.

## État antérieur et mesures réelles
- OD-20261105-015 avait ajouté un PNG de premier plan rendu dans un élément DOM distinct ; l'utilisateur avait signalé que cela ne suffisait pas sous ChromeOS.
- OD-20261106-001 avait ajouté le mode de rendu du MP4 via Canvas 2D à 12 images/s, avec comparaison native (`&videoRender=native`) et option 8 images/s. Le code était déjà actif au début de cette intervention, mais son effet sur Chromebook restait inconnu.
- Ce matin : OVH load 1 min 0,32 sur 6 vCPU, 10 Go de RAM disponibles, studio et radio `systemctl --user` actifs. Amsterdam load 1 min 1,08 sur 2 vCPU, environ 641 Mo de RAM disponibles, swap utilisée 789 Mo. Bridge OVH HTTP 200 en ~0,21 s. Pas de preuve d'une surcharge des VPS à cet instant.
- Chromebook Penguin : agent distant **offline** ; impossibilité de mesurer la RAM GPU, les tâches Chrome ou les pertes d'images sur l'appareil lui-même.
- Vidéo privée : 136 905 428 octets, H.264 640×360 / 30 ips, 3047,386848 s, audio AAC. Elle est hors des assets publics. Les droits de diffusion publique ne sont pas établis.

## Défauts et risques de programmation mis en évidence
1. Le code vidéo appelait `decode()` sur une instance `new Image()` détachée du DOM, avant de fournir l'image au vrai calque `#boonoLocalVideoPoseArt`. Dans un onglet Chromium de contrôle ouvert en arrière-plan, `foregroundStatus=loading` persistait >10 s, `foregroundReady=false` et `videoInitialized=false`. Cette reproduction révèle une dépendance fragile au décodage différé ; elle ne reproduit pas, à elle seule, la disparition pendant lecture active dans ChromeOS.
2. `studio-server.js` servait une requête vidéo Range ouverte `bytes=0-` sur toute la longueur restante du fichier (jusqu'à 137 Mo). Le navigateur pouvait donc télécharger en rafale de grandes quantités sur le chemin SSH à double relais. Ce **risque de pic réseau** est confirmé dans le code ; son rôle exact dans le défaut du Chromebook n'est pas démontré.
3. La scène sépare correctement vidéo à z0, BOONO à z12 et chat à z13. Aucun PNG des postures n'était absent dans les tests précédents. La composition native vidéo peut cependant interagir avec le compositeur graphique du Chromebook de manière différente de Chromium headless.
4. `desk/projection-config.json` conserve bien les positions individuelles des cinq chats. Les cinq transformations CSS en mode vidéo Canvas correspondent **exactement** aux transformations sans vidéo dans Chromium (0 différence, 0 erreur). Exemple : posture chat n°4 a une échelle globale 1,27 × spécifique 1,80 = 2,286. Un décalage visible dans ChromeOS n'a pas encore pu être reproduit, donc **aucune géométrie du chat n'a été corrigée ni réinitialisée**.

## Changements réalisés sur OVH (ciblés et réversibles)
- `runtime/boono-tv/scene/window-local-video.js` : remplace la promesse de décodage d'une image hors DOM par `onload/onerror` sur le véritable `<img>` de premier plan. L'image CSS validée demeure le fallback pendant le chargement ; la vidéo ne démarre qu'après le premier sprite prêt. Nouveau SHA-256 `d9de7997d31dd15b779f08b2c809c10da3bb4a222a9201d7481c48992728abec`.
- `runtime/boono-tv/scene/index.html` : query versionnée `av-sprite-load-fix-20261106` pour forcer un nouveau chargement du JS. SHA `fb55c5a79cdc5f9d38abf4a74630dce4593fa5d1aa5e4fe9fdd7efafa9de9bab`.
- `runtime/boono-tv/studio-server.js` : réponses vidéo HTTP Range **ouvertes** limitées à 2 MiB par requête, avec réponse HTTP 206 et Content-Range cohérente ; les plages explicites sont respectées. SHA `ba16804846ad774fdb2d422cfe24e424395947340ca9d7110f352529bb9a2de2`.
- `systemctl --user restart boono-studio.service` effectué après `node --check` ; service `active`, HTTP studio 200 en 2 ms, bridge 200 en 227 ms à la dernière vérification. Radio séparée, non redémarrée.
- Tous les originaux sauvegardés : `/home/ubuntu/boono-tv-studio/backups/BOONO_AV_SPRITES_20261106/`. On y trouve `window-local-video.js.before`, `studio-server.js.before`, `index.html.before`, `boono-v2.css.before` (référence inchangée), `projection-config.json.reference` (référence inchangée).
- **Calibration** `desk/projection-config.json` SHA-256 avant/après `39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f`. Aucune modification d'assets, de CSS visuel, de placement, de trading ou des deux masques alpha GIMP.

## Tests post-intervention
- Réponse Range ouverte locale : HTTP 206, `Content-Range: bytes 0-2097151/136905428`, exactement 2 097 152 octets. Même réponse depuis Amsterdam via son tunnel vers OVH en ~0,21 s. Requête explicite 2097152–2100000 : HTTP 206, 2849 octets, conforme.
- Test Chrome via CDP dans un onglet temporaire : avant, premier PNG restait `loading` plus de 10 s en arrière-plan ; après, le PNG DOM est `ready`, naturalWidth 1200, et `videoInitialized=true` au contrôle. Le tab a été fermé après vérification.
- Test Puppeteer Chromium headless **après les modifications** : `tests/verify-BOONO-AV-20261106-after-fix.js` et `tests/BOONO-AV-20261106-afterfix-result.json` ; **12/12** postures visibles et chargées pendant lecture, frames Canvas 12→37, changement réel d'image, 0 erreur JS/dessin ; lecture/pause/reprise/son fonctionnent ; mode `native` demeure disponible.
- Test position chat : `tests/verify-BOONO-AV-20261106-cat-positions.js` et résultat associé ; **5/5** chats ont des URLs PNG, transformations et bounding rectangles identiques en mode normal et vidéo Canvas, avec vidéo en lecture.
- Test CPU simulé : `tests/verify-BOONO-AV-20261106-canvas-cpu-after-fix.js` ; environ 10,47 images/s sans ralentissement et 9,27 images/s avec CPU ×4, sprites visibles, 0 erreur de dessin. Simulation Chromium seulement, **pas un benchmark du Chromebook**.
- Le nouveau chargement de l'image et la limitation de la plage sont testés séparément et ensemble ; la fluidité vidéo 50 min et la stabilité ChromeOS demandent encore vérification sur le matériel du propriétaire.

## Suite et critères de clôture
1. Sur Chromebook, ouvrir dans le navigateur relié au tunnel `http://127.0.0.1:8310/?showcase=1&windowVideo=clemens`, puis **Ctrl+Maj+R**. Laisser jouer et faire défiler les poses. Le test privé reste sans diffusion publique.
2. Vérifier que BOONO reste visible 2 minutes et que le chat se place selon ses cinq positions sauvegardées. Si le robot disparaît, comparer `&videoFps=8` puis `&videoRender=native`, sans modifier les coordonnées.
3. Si ChromeOS échoue encore : relever captures avant/après, état du gestionnaire de tâches Chrome (Maj+Échap), erreurs de décodage et charge GPU ; ne pas conclure à un simple débit réseau ou redessiner des sprites sans preuve.
4. Ne déclarer `RÉSOLU SUR CHROMEOS` qu'après validation explicite de l'utilisateur. Sinon conserver le mode Canvas comme contournement expérimental et étudier l'accélération matérielle / les limites GPU.
5. Rollback uniquement si nécessaire : restaurer les trois fichiers OVH depuis `backups/BOONO_AV_SPRITES_20261106/*.before`, puis redémarrer **seulement** le service systemd utilisateur `boono-studio`, et refaire tests HTTP. Ne jamais toucher à `projection-config.json` ni aux moteurs PAPER.

**Provenance :** OD-20261106-002, dossier créé rétrospectivement après l'exécution ; cet écart à la procédure préalable est documenté explicitement dans son fichier d'origine, sans prétention d'horodatage antérieur.
