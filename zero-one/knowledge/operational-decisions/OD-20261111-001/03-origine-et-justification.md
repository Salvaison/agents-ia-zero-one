# OD-20261111-001 — État vivant TV en quatre chapitres

**Origine.** Proposition graphique du propriétaire matérialisée dans le PDF EV-boonoTv.pdf joint dans la conversation du 11/11, puis approbation explicite : « Ok, realise cette disposition des infos pour BoonoTv ». Le PDF source et sa disposition restent attachés au chat ; le dépôt n'en invente pas de copie ni de sandbox path.

**Intention.** Faire évoluer uniquement la surface « État vivant » de BOONO-TV, qui présentait quatre blocs hérités du vocabulaire V4. La nouvelle grammaire : trajectoire MCB15, tactique MCB3, lieu MCB4h, puis chaîne causale/position et maturité. Les valeurs PDF sont des exemples historiques de présentation.

**Frontières d'autorité.** Le V5.4.3 PAPER sur Amsterdam demeure l'unique source des états décisionnels. Les événements Elastic/AUDIT et CSV 3m/15m/4h sont des observations descriptives. Le pont n'ajoute aucune règle d'entrée/sortie, aucun ordre financé, aucun signal à BOONO, aucun serveur distant supplémentaire. Le studio OVH relaie le snapshot existant sur ses canaux privés.

**Précautions techniques.** L'interface TV en exploitation sur OVH a un runtime riche distinct de la copie boono-tv/scene/app.js du dépôt. Ne **pas** remplacer ce runtime par l'ancienne version Git : seules deux petites insertions dans scene/app.js et scene/index.html sont autorisées, conservées comme patch exact. Les nouveaux modules autonomes peuvent être suivis dans Git. Loft, calques alpha, quads desk, sprites, surfaces de projection, BOONO-TV audio/vidéo et éditeurs ne sont pas modifiés.

**Antécédent non historisé.** Le pont Amsterdam diffusait déjà V5.4.3 et les trades PAPER, avec des changements installés antérieurement mais non committés. Le commit préparatoire 722fb29 versionne séparément ce socle **préexistant** ; le commit de cette décision ne lui attribue que l'adaptateur 4-blocs ajouté.

**Limite de validation.** Le panneau gauche a été rendu dans Chrome headless à la bonne résolution avec CSS OVH réel et snapshot V5 réel ; ce test ne reproduit pas la totalité du studio interactif. La relecture dans le navigateur de l'utilisateur reste à effectuer.
