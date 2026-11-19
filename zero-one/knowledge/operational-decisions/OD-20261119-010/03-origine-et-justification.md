# Origine et justification — OD-20261119-010

Le propriétaire demande dans BOONO-TV, le 19 novembre 2026, une décision par posture concernant la présence de la bulle de dialogue et un agrandissement visible du bandeau comprenant le titre musical et son histogramme de fréquences.

L'atelier de scénarios stocke déjà texte, type, position, temps d'apparition de chaque bulle, mais pas de booléen d'activation. Le moteur d'aperçu pilote la visibilité selon les curseurs début/fin. Le nouveau champ bubbleEnabled est donc ajouté dans la même source de vérité, avec fallback true sur les scénarios historiques, sans effacer leurs textes. Le bandeau musical existant mesure en CSS 400×27 avec canvas 160×20, et son analyse réelle comporte 16 bandes ; l'agrandissement reste purement visuel avec redessin dans le nouveau canvas.

Aucun de ces changements ne touche au trading PAPER ni aux droits de diffusion des œuvres musicales de la régie privée. Le rapport associé est knowledge/BOONO_TV_bulles_activation_par_posture_bandeau_musical_agrandi_2026-11-19.md.