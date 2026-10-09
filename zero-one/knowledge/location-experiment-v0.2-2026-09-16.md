# LOCATION v0.2 — plan expérimental LGI

Date: 2026-09-16

## Constat sur le détecteur actuel

Le détecteur de production travaille exclusivement sur `mcb_15m.csv`, fenêtre 48h.
Paramètres actuels principaux:
- activation: 0,015% du prix;
- recherche d'alignement: 0,096%;
- pivot local: 4 bougies de chaque côté;
- amplitude locale minimale: 0,06%;
- fusion de pivots: 90 min / 40 USD;
- span minimum: 3h;
- jeu d'ancre: 0,015%;
- dédoublonnage de projection: 5 USD;
- trois contacts minimum à la création.

Ces valeurs sont des paramètres historiques issus d'itérations; elles ne deviennent pas des vérités de la constitution v0.2.

## Hypothèse H-LGI-01

Les zones structurelles destinées à LOCATION pourraient être plus robustes si leurs ancres principales sont construites à partir du 1h (ou multi-TF 1h+), tandis que le 15m/3m servent à observer l'approche et l'interaction.

Cette hypothèse reste à falsifier.

## Contrôle négatif obligatoire: 3–4 septembre

Pendant la forte expansion et l'extirpation vers un nouveau range, le détecteur a perdu ses repères et produit des LGI trompeuses.
Ce régime doit être utilisé comme test de régression négatif.

Une LOCATION v0.2 réussie doit pouvoir dire `UNRELIABLE` ou `NO_VALID_LOCATION` quand:
- les ancres historiques sont massivement invalidées;
- le prix migre hors du domaine géométrique récent;
- la densité de candidates augmente sans stabilité de projection;
- les lignes sont continuellement remplacées avant reconfirmation;
- la dispersion/résiduel se dégrade fortement par rapport au régime précédent.

## Comparaison à construire

Replay causal 15m vs 1h vs multi-TF, sans utiliser de données futures pour construire une ligne.
Mesurer au minimum:
- couverture (% du temps en zone);
- densité de LGI concurrentes;
- stabilité de projection dans le temps;
- taux d'invalidation des ancres;
- comportement du prix après contact, normalisé par volatilité;
- faux signaux pendant 3–4 septembre;
- conservation de la pertinence sur les journées 11–16 septembre.

La cible n'est pas de donner support/résistance; elle est de localiser une zone où STATE+DOMINANCE apportent ensuite le sens.

## Premier replay causal simplifié — 16/09

Un premier test a été exécuté sur les CSV réels, en reconstruisant les pivots uniquement avec les données déjà disponibles à chaque instant et en comparant une géométrie 15m à une géométrie 1h.
Attention: ce prototype est volontairement simplifié et ne reproduit pas encore toutes les règles V5 du détecteur de production. Il sert à orienter l'expérience, pas à conclure.

### 3–4 septembre
- 15m: zone active ~9,9% des observations; ~34,6 lignes candidates en moyenne.
- 1h: zone active ~4,2%; ~28,5 lignes candidates en moyenne.
- L'échantillon actif 1h n'est que de 2 observations: insuffisant pour conclure sur la précision.

### 11–16 septembre
- 15m: zone active ~32,5%; ~35,4 lignes candidates en moyenne.
- 1h: zone active ~18,6%; ~23,1 lignes candidates en moyenne.

Premier signal: le 1h réduit nettement la densité et la fréquence d'activation, ce qui va dans le sens d'un WHERE plus structurel.
Mais la métrique simple « mouvement futur 1h après contact » n'est pas meilleure que le baseline sur 11–16 septembre, en 15m comme en 1h.

`[AMBIGU]`: 1h semble réduire le bruit, mais rien ne démontre encore qu'il améliore la pertinence des zones.
`[DONNÉES INSUFFISANTES]`: le contrôle 3–4 septembre contient trop peu de contacts 1h dans ce prototype pour statuer.

Prochaine étape: rejouer fidèlement les règles de chaîne V5 et mesurer une notion de « changement de comportement » plutôt qu'un simple déplacement futur.
