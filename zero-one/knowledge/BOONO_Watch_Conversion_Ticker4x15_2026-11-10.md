# BOONO Watch — Conversion à deux colonnes et Ticker Elastic 4×15 min

**Date :** 10 novembre 2026  
**Périmètre :** état vivant privé d'Amsterdam, rendu uniquement. Source du dessin : croquis manuscrit fourni par l'utilisateur dans la discussion du 10/11.  
**Statuts :** DEMANDÉ / AUTORISÉ → IMPLÉMENTÉ → TESTÉ TECHNIQUEMENT → MIS EN SERVICE sur Watch. **Validation visuelle du propriétaire encore ouverte.**  
**Registre :** OD-20261110-001.

## Cahier des charges reçu
- Graphique Conversion BTC sur la gauche, légèrement plus large que haut et largeur tenant compte de la colonne de dix pastilles de volume.
- À droite quatre modules superposés Ticker Elastic sur 4 périodes de 15 minutes, avec horodatage, deux qualités dominantes et pourcentages, parts LONG/SHORT/CONTESTED, deux régimes marché dominants.
- Deux bandeaux blancs : prix BTC + MA3 et distance au-dessus, Δ BTC 3m en dessous.
- Dix pastilles étroites (10–12 px), coins arrondis et bordure noire ; actives remplies gris clair, inactives blanches.
- Montants achat/vente OKX à l'intérieur du graphe, de part et d'autre de la ligne de référence bleue ; grille des heures plus marquée.
- Conserver **toutes** les données historiques sous le graphe : MF3 Δ3m, MF15 Δ10m, cohérence, rôle MF15, âge après Bâton, Bâton et mouvement depuis Bâton, PM3/PM5/Live, eff3/yield/effort, vitesse 3m, qualité/direction. Ne pas raccourcir ce bloc pour faire place au ticker.

## Implémentation exacte
1. `modules/config-server.js`, carte `4. CONVERSION` du seul `v52-main` : nouvelle grille CSS à deux colonnes dans `v52-mini-conversion-layout`. À gauche, tous les anciens identifiants du graphique et le bloc de relevés sous le graphique, **sans suppression des lignes demandées**. À droite, conteneur `v52-mini-ticker` découpé en quatre cartes.
2. L'en-tête au-dessus des bougies montre `BTC` et `MA3 <MA200 3m> · dist <prix−MA> $` issus de l'analyse V543, avec un affichage indisponible si la source V5 est périmée. Le bandeau `Δ BTC 3m` reste au-dessous du SVG, séparé et sur fond blanc.
3. Ticker issu **uniquement** du résumé Elastic autonome V494 existant `/api/shadows/v494-elastic`, authentifié et validé `mode=SHADOW_ONLY`, `decisionImpact=false`, `brokerOrdersEnabled=false`. Les quatre fenêtres sont triées de la plus récente vers la plus ancienne (heure locale Europe/Stockholm). Chaque fenêtre indique deux qualités dominantes, LONG/SHORT/CONTESTED, deux catégories dominantes du régime marché, état complet / EN FORMATION, nombre de relevés. En absence de catégorie directionnelle dans une fenêtre pourtant renseignée, affichage de 0 % ; sans mesures, « — ».
4. Source ticker relue au plus toutes les **35 secondes**, uniquement lorsque l'État vivant est affiché. Cache local réinjecté après reconstitution des cartes toutes les 10 secondes ; données trop anciennes explicitement qualifiées `SOURCE ANCIENNE`. Aucune deuxième connexion de marché ni nouvelle écriture moteur.
5. `modules/elastic-mini-conversion-v542.js` : axe des heures plus contrasté ; graphe avec dimensions dynamiques `hauteur≈84 % largeur` (176–268px), prix 3m sur fenêtre conservée de 150 min avec span maximal 1 600 $ ; dix pastilles `10,5×10,5` px, arrondies, bord noir, gris clair quand actives ; montants ACHAT/VENTE dans le SVG sur les côtés de l'axe bleu. La rangée de volume externe, devenue redondante, est supprimée du DOM ; les volumes restent tracés dans les carrés et en bas du graphique.
6. **Ne pas fusionner les quatre fenêtres 15m avec les calculs PM3/PM5/Live** : le ticker est une classification historique shadow, la Conversion est alimentée par ses propres observations du prix/effort OKX.

## Vérifications réellement effectuées
- `node --check` : serveur, script Conversion et `/app.js` client rendu à partir du template du serveur OK ; `git diff --check` OK.
- Test Node du renderer ticker avec `v494ElasticUiSummary.build` sur le résumé serveur existant : **exactement quatre cartes**, affichages temps, qualités, directions et marché ; fenêtre partielle `EN FORMATION`, source ancienne identifiée.
- Test SVG isolé avec bougies et volumes fictifs identifiés comme **fixture technique** : 10 pastilles arrondies dont remplissage gris actif ; repères horaires marqués ; ligne bleue conservée ; valeurs ACHAT/VENTE à l'intérieur ; contrat fenêtre 150 min / span max 1600 $ intact.
- Test du template État vivant avec la dernière analyse V5 : en-tête MA3 présent, structure gauche→droite ; présence de tous les identifiants MF, Bâton, PM, eff, vitesse, qualité et heures sous le graphe.
- Activation ciblée `pm2 restart config-server --update-env`, service `online`, HTTP `302` normal vers l'authentification. `boono-v494-paper`, `boono-v543-paper` et `boono-v494-elastic-shadow` restent `online`.

## Frontières et travaux ouverts
- **Aucune modification de trading**, aucune autorité introduite pour les classements du ticker, aucune modification de données ou de registre des niveaux.
- BOONO-TV sur OVH et sa calibration des écrans sont **inchangés** ; la présente livraison est pour la carte Conversion de BOONO Watch sur Amsterdam.
- Le test ne remplace pas une inspection visuelle dans le navigateur authentifié : confirmer la largeur/hauteur réelle, la lisibilité des quatre cartes sur téléphone et sur ordinateur, les mises à jour dans le temps, et l'absence de chevauchement avec les relevés sous le graphe.


## Ajustement 10/11 — compactage ticker et auto-échelle du prix

**Demande :** retirer la ligne « 15 MIN CLOSES · 30 relevés », adapter verticalement les bougies à l'amplitude du cours, donner le tracé entier aux bougies derrière l'ancienne bande des prix maintenant transparente, enlever les mots visibles « ACHAT » / « VENTE » pour agrandir les nombres BTC.

**Réalisé (BOONO Watch / Amsterdam uniquement) :**
- Dans les cartes 4×15, suppression de la dernière ligne de statut « 15 MIN CLOSES · 30 relevés ». L'heure contient `EN FORMATION` seulement pour la fenêtre partielle et `SOURCE ANCIENNE` si nécessaire. Les compteurs de relevés et la couverture restent accessibles via `title`, non comme ligne visible.
- Dans `elastic-mini-conversion-v542.js`, le calcul de l'échelle du prix utilise maintenant l'excursion effective sur les 150 dernières minutes de bougies 3m, y compris les mèches, et la cotation fraîche si connue : `min(low)` / `max(high)`, avec marge de `max(1 $, 5,5 % de l'excursion)` de chaque côté et minimum purement numérique de 6 $ si le prix est plat. **Ancien floor 500 $ et cap 1 600 $ supprimés** : plus d'aplatissement dans un marché calme ni de prix coupés en forte amplitude. Cette nouvelle échelle est un réglage visuel, sans lien avec un seuil de trading.
- Graduations horizontales à pas adaptatif (« nice steps » en fonction de l'amplitude et de la hauteur du SVG) ; prix inscrits sur un calque SVG **transparent placé au-dessus des bougies**. Le graphe commence à `x=15` plutôt que `39/43`, en laissant la colonne des dix pastilles de volume de 10,5 px sur le bord extérieur. La série de bougies passe désormais sous les graduations.
- Montants d'acheteurs et vendeurs dans le SVG : suppression des mots visibles ACHAT/VENTE en pied de graphe ; seuls restent les montants `nnn.nnn BTC` en vert/rouge avec taille de police automatique jusqu'à 12,8 px. Labels sémantiques/infobulles conservés pour leur signification.
- Hauteur SVG mobile : `0,84 × largeur` bornée à 145–268 px au lieu du plancher 176 px ; le graphique reste légèrement plus large que haut sur les petits écrans.
- **Inchangés :** le bleu de l'axe, les dix pastilles à bord noir et remplissage gris actif, les bougies et MA200, l'horodatage, les quatre classifications des fenêtres, le bandeau BTC+MA3 et Δ BTC 3m, et toutes les données MF/Bâton/PM/effort/qualité sous le graphe.

**Tests techniques :**
- `node --check` du serveur et du SVG renderer, extraction du `/app.js` généré puis `node --check`, `git diff --check` OK.
- Ticker alimenté par le résumé `v494-elastic-ui-summary` réel : quatre cartes, aucune ligne « 15 MIN CLOSES », signalisation EN FORMATION et SOURCE ANCIENNE, compteurs toujours en attribut `title`.
- SVG vérifié par VM Node sur trois régimes synthétiques : mouvement calme ≈20,3 $ → span ≈22,5 $ ; habituel ≈263 $ → span ≈291,9 $ ; volatil ≈2 716 $ → span ≈3 015 $ (donc non plafonné). Dans tous : 10 pastilles, axe bleu, volumes BTC sans mots, calque des prix transparent au-dessus des bougies.
- Vérification sur bougies 3m réellement archivées à Amsterdam : excursion de prix ≈2 014,4 $ → span auto ≈2 236 $ ; marques horaires, chandeliers et conversion conservés.
- `pm2 restart config-server --update-env` ciblé, réponse HTTP locale 302 attendue vers l'authentification ; `config-server`, `boono-v494-elastic-shadow`, et runners PAPER `boono-v494-paper` / `boono-v543-paper` online. Aucun redémarrage des deux moteurs de simulation.
- **Rendu authentifié sur le téléphone et sur desktop à apprécier par l'utilisateur** ; ces tests ne démontrent pas à eux seuls la qualité des dimensions réelles en navigateur.

**Traçabilité :** OD-20261110-002, demande intégrale et étapes de réalisation. Ne pas assimiler une restitution graphique d'Elastic à une autorité PAPER. Studio BOONO-TV sur OVH non modifié.

