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

