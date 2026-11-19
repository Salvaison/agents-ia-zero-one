# BOONO-TV — Agrandissement Like/Subscribe et symbole Bitcoin transparent
**Date :** 19 novembre 2026 · **Décision :** OD-20261119-006 · **Suite :** OD-20261119-003.

## Demande et autorisation
L'utilisateur demande explicitement : « Super, est-ce que tu peux rendre les 2 like & subscribe plus grand? Et j'ai ouvert l'image du logo btc pour y faire un layermask, rendre le tour transparent. L'image est ouverte dans gimp, peut tu la sauvegarder dans le bon format et la transférer sur OVH et l'installer dans le composer? »

Travail limité au studio **BOONO-TV privé sur OVH**, sans intervention sur les runners PAPER, les collecteurs, les écrans MCB ni les fichiers de calibration du bureau.

## Original GIMP et export alpha sur Penguin
- Projet : `/mnt/chromeos/shared/MyFiles/Amsterdam/YT/boono_import_btc-symbol.xcf`, enregistré vers **21 h 11 Europe/Stockholm**, 423 663 octets.
- Inspection de l'image effectivement ouverte dans GIMP 3.0.4 par batch connecté à la session : 1920 × 1920, **un calque visible et un masque de calque actif** ; image non marquée modifiée (`DIRTY=False`).
- Export par la procédure native GIMP 3 `file-png-export`, **depuis cette image ouverte**, sans aplatir/modifier le XCF.
- PNG : `/mnt/chromeos/shared/MyFiles/Amsterdam/YT/boono_import_btc-symbol_ALPHA_20261119.png`, **190 961 octets**, format RGBA 1920 × 1920. Les quatre pixels de coin ont alpha=0 ; le symbole intérieur reste alpha=255. Échantillon sur 57 600 pixels : 35 219 transparents, 22 373 opaques, 8 semi-transparents ; aperçu sur fond sombre inspecté, disque orange et signe BTC blanc sans carré autour.
- SHA-256 PNG : `544a2403905008566f46784b9a18649dfe794197f44d8f1225847851a675e914`. L'original JPG, l'archive Vecteezy et le XCF source restent intacts.

## Transfert et raccordement à OVH
- Tunnel privé temporaire Penguin local `19431` → Amsterdam `8310` → OVH studio `3091`. L'import conditionnel du serveur `BOONO_PRIVATE_MEDIA_IMPORT=1` a été activé uniquement pour cette copie, puis désactivé avec redémarrage du seul `boono-studio`. Tunnel 19431 fermé ; POST d'import retourne ensuite HTTP 404.
- Nouveau fichier privé : `/home/ubuntu/boono-tv-studio/private-media/accessories/processed/btc-symbol-alpha-20261119.png`, mode 0600, empreinte SHA-256 strictement identique.
- `private-media-extensions.js` : nouvel identifiant strictement autorisé `btcSymbolAlpha`, type `image/png`, taille exacte 190 961 octets.
- `scene/accessory-sprites.js` : source de l'accessoire **BTC · Symbole** substituée du JPG opaque vers `/api/private/boono-asset/btcSymbolAlpha` sans changer son identifiant `btcSymbol` dans le Composer, sa taille à l'écran ou ses scénarios.
- Pas de dépôt public des images : accès réservé à l'aperçu privé. Les droits d'exploitation publique de l'illustration Vecteezy restent à vérifier.

## Deux animations Like/Subscribe plus grandes
- Ancienne boîte vidéo par animation : **164 × 93 px**. Nouvelle boîte : **256 × 144 px** (environ **+56 %** en dimensions linéaires), dans `scene/styles.css`.
- L'échelle per-posture existante reste indépendante et plafonnée à 2,5. En **Surpris** : Like actif x=150, y=82, scale=2,5 → boîte de **640 × 360** entièrement dans les 1200 × 1080 du loft. En **Confident** : Subscribe actif x=25, y=708, scale=2,5 → boîte **640 × 360**, tout entière visible. La seule correction sur une posture déjà active est **Subscribe y=787 → 708**, nécessaire pour éviter de couper la partie basse après agrandissement.
- Les 22 positions *inactives* conservant les valeurs par défaut historiques ont été décalées à **x=900** afin qu'une activation ultérieure n'apparaisse pas partiellement hors du cadre (12 scénarios : 11 Like et 11 Subscribe inactifs). Toutes les durées, fenêtres temporelles, tailles personnalisées, autres accessoires, textes, postures et états enabled ont été préservés.
- Références de positions par défaut mises en cohérence dans `studio-server.js`, `dialogue-editor.js` et `storyboard-timeline.js`. Scripts et CSS chargés avec URLs de version depuis `index.html`.

## Sauvegardes / intégrité
- Avant modification : copies ciblées dans `/home/ubuntu/boono-tv-studio/backups/20261119-btc-symbol-likes/` : `private-media-extensions.js`, `scene/accessory-sprites.js`, `scene/styles.css`, `scene/index.html`, `desk/dialogue-script.json`.
- `studio-server.js` : copie de l'état antérieur *reconstituée après patch* en inversant l'unique changement observé sur `DEFAULT_ITEM_POS` ; elle ne doit pas être qualifiée de snapshot pré-modification natif.
- Le fichier `desk/projection-config.json` **n'a pas été modifié** ; les assets originaux restent accessibles et ne sont pas versionnés dans Git.

## Vérifications effectuées
- GIMP : projet ouvert enregistré, masque présent, PNG RGBA et coins alpha=0 vérifiés. Recomposition de l'image sur fond sombre inspectée.
- Hashes Penguin/OVH **identiques** ; API privée `GET /api/private/boono-asset/btcSymbolAlpha` retourne HTTP 200, `image/png`, 190 961 octets exacts et PNG valide.
- Syntaxe : `node --check` valide pour serveur, extension média, composant accessoires, storyboard et éditeur.
- Script de comparaison de `desk/dialogue-script.json` avec la sauvegarde : **12 scénarios identiques hors 23 ajustements de coordonnées Like/Subscribe**, `btcSymbol` inchangé.
- Studio : après redémarrage ciblé, HTTP 200 ; API Composer lit 12 scénarios ; catalogue Video Viewer garde ses **4 pistes ready** ; route import temporaire POST **404** ; `boono-studio` **active**.
- **Ouvert :** aucune validation finale de la scène dans le navigateur graphique utilisateur ; contrôle manuel visuel conseillé après rafraîchissement, notamment transparence BTC, déroulement des deux animations, effet de la taille en positions Surpris/Confident, et sauvegarde depuis le Composer.

## Réversibilité et limites
Restaurer les seules modifications concernées depuis la sauvegarde avant d'effectuer un retour arrière, vérifier les données de postures potentiellement rééditées depuis, et ne jamais écraser automatiquement la calibration. Les nouveaux objets restent réservés au studio privé ; aucune licence de diffusion publique n'est démontrée par cette intervention.
