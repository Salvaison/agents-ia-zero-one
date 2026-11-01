# OD-20261101-007 — Établi compact et retrait de la bande arrière vide

## Déclencheur

Le propriétaire compare la première scène V2 reconstruite à son bureau canonique puis juge le meuble « beaucoup trop grand ». La capture ChromeOS communiquée montre effectivement l'établi couvrant presque tout le premier plan, BOONO semblant assis **sur** la surface de bois vide derrière les deux écrans et non **à son bord**.

Le propriétaire suggère explicitement de retirer cette bande de bois et de diminuer l'échelle du meuble, tout en conservant le caractère et les objets fixés. Il ne demande pas la reconstruction complète des moteurs de trading.

## Validation, portée

**Décision autorisée :** correction uniquement **géométrique** et alpha du décor V2, sans redessiner ferrures, vis ni écrans, avec conservation des sources et d'un rollback.

**Exécuté sur OVH :** nouveau PNG alpha du bureau, affichage désormais 920×613.333 en (140,465), robot 374×486 en (440,230), chat 230×184 en (190,460), matrices 3D des deux écrans mises à jour. Aucun fichier originel écrasé ; aucune modification aux moteurs PAPER.

**Tests faits :** source et nouveau PNG accessibles, zone vide recoupée transparente, zone des écrans et du rack conservée, syntaxe CSS structurelle, endpoints HTTP OK et `sourceOnline=true` ; démonstration du nouveau cadrage par composite hors-ligne. Le contrôle final dans le navigateur ChromeOS après rechargement reste à faire.

**Risques ouverts :** les traits de jonction entre BOONO et l'établi peuvent demander un calage manuel plus fin ; certains sprites validés conservent une ombre de fond à détourage imparfait. L'écran droit garde le vrai flux MarketCipher, ses erreurs de TF source ne sont pas traitées ici.

## Sources

- Capture utilisateur du 1er novembre 2026 vers 19:14, intitulée `Screenshot 2026-11-01 19.14.10.png`.
- Charte du bureau : `BOONO_TV_bureau_ordinateur_reference_canonique_2026-11-01.md`.
- Reconstruction OVH V2 : `BOONO_TV_reconstruction_scene_V2_OVH_2026-11-01.md` (OD-20261101-006).
- Nouveau rapport : `BOONO_TV_etabli_compact_2026-11-01.md`.

L'archive Git versionne le script reproductible et la nouvelle configuration, pas le PNG lourd conservé sur OVH.
