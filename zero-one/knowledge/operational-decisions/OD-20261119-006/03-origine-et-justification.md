# Origine et justification — OD-20261119-006

Mandat explicite du propriétaire le 19/11/2026 : agrandir les deux animations Like/Subscribe déjà intégrées au Composer et exporter la nouvelle édition du symbole Bitcoin qu'il a ouverte dans GIMP afin d'obtenir un tour transparent, puis l'installer sur OVH dans le Composer.

Contexte validé : le 19/11, le studio possède déjà une bibliothèque privée d'accessoires avec animations sur fond vert converties en VP9 alpha, un logo BTC JPEG 1920×1920 encore opaque et une API limitée au tunnel SSH. Les scénarios stockent des réglages personnalisés, dont Like activé pour 'surpris' et Subscribe pour 'confident' à scale=2.5 ; toutes les autres données doivent rester intactes.

Stratégie : s'appuyer sur le projet XCF GIMP enregistré sur le Chromebook ; réaliser un export PNG RGBA sans re-génération du graphisme, vérifier le masque et les zones transparentes, transférer en conservant les sources. Remplacer la seule source de l'élément btcSymbol par sa variante PNG privée et agrandir les deux animations par CSS avec correction ciblée de leur cadrage en évitant tout effet sur les couches bureau/MCB. Tous les changements restent limités à BOONO-TV et à sa documentation.
