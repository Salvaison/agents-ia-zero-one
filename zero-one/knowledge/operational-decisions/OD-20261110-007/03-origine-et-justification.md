# OD-20261110-007 — Réécriture de la passation du socle BOONO Watch

**Origine :** demande explicite du propriétaire, 10 novembre 2026, ciblant précisément la pièce jointe `BOONO_interface_Amsterdam_socle_Watch_2026-10-19(2).md`.

**Constat :** l'audit historique du 19 octobre décrivait principalement V4.10.7, la navigation « État V4 », un prototype Watch et des constats visuels datés. Depuis, le VPS a développé V5.4.3 PAPER et ses cinq modules, un mini Conversion couplé au ticker 4×15, le lieu/range/POC, des invalidations distinctes, une page Vagues épurée et de nouvelles sources de volumes OKX. L'original reste un témoin historique valide et n'est pas effacé.

**Décision documentaire :** publier un **successeur daté au 10 novembre** nommé `knowledge/BOONO_interface_Amsterdam_socle_Watch_2026-11-10.md`, avec architecture de sources, contrats read-only, déploiement, risques, incidents, changements et travaux ouverts. Cette publication ne constitue ni validation visuelle mobile exhaustive ni changement de moteur PAPER.

**Vérifications :** lecture de l'original (224 lignes), comparaison aux sources présentes sur Amsterdam et aux KB OD-20261110-001 à 006, tests de forme et de références, vérification de l'état PM2. Un commit GitHub ciblé trace la publication, sans ajouter les modifications préexistantes hors périmètre.
