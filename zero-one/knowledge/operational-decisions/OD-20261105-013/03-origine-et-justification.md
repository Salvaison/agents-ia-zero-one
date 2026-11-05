# OD-20261105-013 — Atelier unifié des scénarios et fenêtres temporelles

**Origine :** demande explicite de l'utilisateur le 5 novembre 2026, texte intégral sous 01.

**État avant intervention :** l'éditeur de bulles était autonome à gauche (`dialogueEdit=1`), tandis que la durée et la géométrie des postures étaient réglées dans le grand éditeur de calibration (`layoutEdit=1`), où résident également les quadrilatères du bureau. Le fichier `desk/dialogue-script.json` conserve déjà 12 bulles avec type, texte, placement, mais sans chronométrage en pourcentage ni accessoires par posture. Les sprites Like/Subscribe internes existent ; les marques officielles sont non activées dans `assets/accessories/manifest.json` ; pas d'asset de mug validé.

**Choix de préservation :** définir la durée et la géométrie additionnelles de chaque posture dans le **fichier scénario** séparé, utilisées comme surcouches des réglages de calibration existants ; cette dernière ne doit pas changer de hash. Les fenêtres d'apparition sont des pourcentages de la posture, pas une horloge indépendante. Rien d'édité dans les moteurs PAPER ou les flux.

**Sécurité :** URL de prévisualisation limitée à `?dialogueEdit=1` avec API en écriture sous localhost et origine contrôlée. Logos en attente de droits non activables. Mug uniquement comme élément provisoire de travail en attendant un véritable sprite approuvé.

**Méthode :** création OD avant changements, sauvegardes des sources OVH, puis implémentation, tests et archive.

