# OD-20261112-004 — Bandeaux plus clairs et noms d'indicateurs blancs

**Autorisation :** demande explicite de l'utilisateur de rehausser les bandeaux des cinq rubriques et de mettre en blanc les dénominations bleu ciel.

**Contexte :** la maquette TV02 avait bien cinq rubriques sur fond noir, mais les titres et les libellés BW/LBW/MF/PM/MA restaient cyan. La retouche actuelle ne touche ni à la nomenclature CREUX/CRÊTE, ni aux ranges, ni aux calculs.

**Cible :** uniquement la CSS du panneau gauche, plus un cache-bust du lien CSS dans l'index OVH. La continuité du contenu V5 PAPER, du ticker, des écrans, masques, éditeurs et moteurs est garantie par l'absence de modification de leurs fichiers.

**Risques contrôlés :** une règle générique de blanc avait préséance sur la classe de couleur de certaines deuxièmes valeurs BW/LBW. Une priorité CSS ciblée rétablit le rouge/vert sur ces valeurs, tout en conservant les étiquettes blanches.

**Preuve :** tests Node de la nomenclature, des couleurs et du DOM ; capture Chrome headless locale du panneau reconstitué à 1920x1080 avec les données V5 actuelles, cinq en-têtes visibles et sans coupure. Le navigateur complet du propriétaire reste le dernier contrôle esthétique.
