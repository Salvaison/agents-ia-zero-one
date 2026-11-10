# OD-20261110-004 — Volume 15m normalisé par les pastilles du graphe

**Origine :** trois messages successifs de l'utilisateur, dont le dernier rectifie explicitement la proposition de l'assistant concernant une référence moyenne des 24h. Cette référence **n'est pas retenue**.

**Référence de la demande :** la ligne du ticker doit présenter « Vol moy: 70% · 62,1BTC/min » avec des valeurs calculées ; le pourcentage doit être le même *type d'intensité* que celui des dix pastilles du graphe Conversion, lissé sur les 15 minutes concernées.

**Sémantique adoptée :**
- Le graphe compte de 0 à 10 seuils de volume exécuté BTC sur 3m, niveaux logarithmiques fixes : `[1,2,5,10,20,50,100,200,500,1000] BTC`. Le score du graphe est `n/10 × 100%`.
- Pour un historique de 15 minutes, prendre, après chaque clôture de minute, le total BTC des trois dernières bougies OKX 1m confirmées et uniques ; appliquer la même échelle des dix seuils ; faire la **moyenne arithmétique temporelle** de ces pourcentages sur 15 échantillons (ou sur les minutes closes du créneau en formation). Ce lissage 1m du même indicateur ne doit pas être présenté comme une reconstitution exacte des ticks intraminute du graph live.
- La quantité en BTC/min demeure la moyenne réelle du volume `volCcy` des minutes confirmées du créneau. En cas de minute manquante pour le lissage, pourcentage indisponible au lieu d'extrapolation.
- Qualités de conversion Elastic V494 et parts en pourcentage **inchangées**. Le recalibrage de `SILENT/INEFFICIENT` avec des fenêtres économiques concordantes est un chantier distinct et ouvert.

**Frontière technique :** BOONO Watch Amsterdam, le provider de données OKX publiques du ticker et le rendu client associé. Aucune autorité de trading, aucun broker, aucun moteur PAPER, aucune modification de BOONO-TV sur OVH. Statuts implémenté/testé/en service vérifiés en lecture seule, rendu esthétique sur téléphone à apprécier par l'utilisateur.
