# OD-20261101-003 — Cinq sprites découpés pour le chat de BOONO-TV

## Source de la décision

Le propriétaire a déjà validé l'apparence du chat noir mince, joueur et rusé représenté en cinq postures dans le loft. Il demande ensuite expressément « à partir du bureau » cinq graphismes individuels **découpés avec masques de transparence**, afin de les disposer dans la partie supérieure gauche de l'établi canonique.

## Résultats constatés

Dans la conversation, une nouvelle planche PNG RGBA a été générée, puis cinq silhouettes distinctes ont été séparées. Cinq sprites normalisés **640×512 RGBA**, cinq masques **640×512 L**, cinq découpes natives haute définition et cinq simulations d'implantation au coin arrière gauche du bureau sont créés. Une planche de contrôle sur damier et un ZIP avec les sources et le script de découpe accompagnent la livraison.

Le contrôle automatisé indique que chaque masque est **strictement égal au canal alpha** du PNG correspondant (zéro différence pour chacun), que le fond est transparent et que l'archive ZIP est intègre. Le point d'ancrage de composition commun est (320,470), et l'aperçu non autoritaire utilise approximativement le point (472,325) dans l'image 1536×1024 du bureau.

## Statuts et limites

- **Décision d'identité déjà validée :** chat noir, fin, yeux jaunes, esprit joueur et rusé ; référence au personnage initial.
- **Intervention réalisée :** cinq dessins et leurs fichiers/masks produits et contrôlés **dans le runtime ChatGPT**, avec copies accessibles dans la conversation.
- **À valider :** les cinq nouveaux détails de pose et leur taille/position exacte sur l'établi avant une mise en scène durable.
- **Aucune intégration effective :** fichiers non transférés sur OVH ni commités en binaire dans GitHub ; aucune modification du studio live, des homographies, du TradingView réel, de BOONOTRADE ou des runners PAPER.

## Éléments de provenance

La demande utilisateur verbatim est conservée en 01 ; l'invocation image n'a pas reçu de texte `prompt` explicite, aussi le fichier 02 **documente honnêtement cette limite** et la postproduction effectivement faite plutôt que d'inventer un prompt intégral. Les sprites, masques, source générée, script Python et manifeste sont dans le kit ZIP joint au chat ; rapport et SHA256 de chaque PNG dans la KB.

Voir les décisions préalables [OD-20261101-001](../OD-20261101-001/03-origine-et-justification.md) (bureau canonique) et [OD-20261101-002](../OD-20261101-002/03-origine-et-justification.md) (loft canonique).
