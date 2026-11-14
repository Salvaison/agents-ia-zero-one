# OD-20261114-001 — LIEU STRUCTUREL E4/E1 : événement Live et confirmation

**Autorisation et intention :** proposition explicite du propriétaire du 14 novembre 2026 d'améliorer uniquement LIEU STRUCTUREL, avec une mémoire confirmée qui éteint Live puis n'attend qu'un nouvel événement opposé. Les prix de son exemple servent d'illustration, jamais de constantes.

**Origine technique :** l'adaptateur BOONO-TV disposait déjà des séries confirmées MCB1h et MCB4h mais la ligne E1 Live restait toujours indisponible. Une vérification d'Amsterdam a retrouvé les vrais fichiers mcb_1h_live.csv et mcb_4h_live.csv, séparés des bougies CSV closes, avec signaux TradingView natifs aux colonnes 13/14. Leur date de modification permet d'évaluer la fraîcheur intrabar et le calendrier des confirmations.

**Contrat de lecture :** confirmé = dernier marqueur natif UP/DN d'une bougie close; Live = marqueur opposé de la bougie ouverte observé depuis moins de 120 secondes et après le dernier confirmé; Live identique au confirmé supprimé. Le fait qu'un niveau natif soit négatif ne le transforme pas en signal DN. Les valeurs E4/E1 affichées sont les niveaux LBW au croisement, et l'infobulle conserve la vraie valeur native BW, son sens et les horodatages.

**Délimitation :** seul rendu BOONO-TV et lecture read-only de ses sources existantes. Aucune modification du collecteur, des règles V5/V494, des ordres, du risque, des ranges enregistrés, de la scène OVH, des assets du loft ou de la rotation.

**Tests :** neuf tests nouveaux spécialisés plus les tests régressifs existants, simulation des transitions Live/confirme/Live opposé, vraie sortie via proxy OVH, mesure Chrome de cinq fois 180px sans overflow et calcul CSS vert alors que la valeur E4 est négative. Validation du propriétaire dans la scène complète toujours ouverte.
