# BOONO — protocole sécurisé de transfert visuel vers Amsterdam

Version : 1.0 — 12/10/2026

## Principe

Un fichier transféré n'est **jamais** une release.

Chaîne obligatoire :

```
Chromebook / poste de création
        ↓ SFTP / SSH
incoming/staging
        ↓ rename atomique
incoming/ready
        ↓ claim root-only
processing
        ↓ préflight complet + SHA-256
archive brute immuable
        ↓ importeur spécialisé
release candidate
        ↓ validation complète
Git LFS commit + fsck + push
        ↓ re-fetch depuis Git
validation serveur n°2
        ↓ bascule atomique
current
        ↓
BOONO-TV
```

À tout instant, une erreur avant la dernière étape laisse la release active inchangée.

## 1. Canal SFTP

Compte dédié : `boonoassets`

Restrictions effectives :
- authentification **clé publique uniquement** ;
- mot de passe et keyboard-interactive désactivés ;
- chroot : `/srv/boono-upload` ;
- `internal-sftp` uniquement ;
- aucun shell ;
- aucun port forwarding ;
- aucun agent forwarding ;
- aucun X11 ;
- aucun tunnel ;
- aucun TTY ;
- aucun user RC ;
- umask SFTP `0077`.

Le compte d'upload n'a aucun droit d'écriture dans les runtimes, Git, les archives root-only ou le code de trading.

## 2. Répertoires

Côté SFTP :

```
/incoming/staging   ← zone d'écriture
/incoming/ready     ← uniquement après upload terminé
/status             ← informations lisibles, non modifiables
```

Côté VPS, inaccessible en écriture au compte SFTP :

```
/srv/boono-upload/processing
/srv/boono-upload/archive
/srv/boono-upload/failed
/srv/boono-upload/status/receipts
```

## 3. Upload obligatoire : staging → rename → marqueur SHA-256

Ne jamais faire un `put` directement dans `ready`.

Le client recommandé est `boono-send`, qui exécute automatiquement le protocole complet :

```bash
boono-send /mnt/shared/MyFiles/Downloads/BOONOTV01.png
```

Séquence réellement exécutée :

```text
1. calcul SHA-256 local
2. put FILE → /incoming/staging/NAME.part
3. rename staging/NAME.part → ready/NAME
4. put NAME.sha256 → /incoming/ready/NAME.sha256
```

Le serveur ne traite **jamais** un fichier `ready/NAME` sans son marqueur `ready/NAME.sha256`.

Procédure manuelle équivalente :

```bash
sha256sum /mnt/shared/MyFiles/Downloads/BOONOTV01.png > /tmp/BOONOTV01.png.sha256
sftp -F /home/boono70/.ssh/config boonoassets@boono-amsterdam
```

Puis :

```text
put /mnt/shared/MyFiles/Downloads/BOONOTV01.png /incoming/staging/BOONOTV01.png.part
rename /incoming/staging/BOONOTV01.png.part /incoming/ready/BOONOTV01.png
put /tmp/BOONOTV01.png.sha256 /incoming/ready/BOONOTV01.png.sha256
bye
```

Le `rename` termine le transfert des données ; le marqueur SHA-256 constitue le **commit explicite**. Le serveur compare ensuite le SHA client au SHA recalculé sur Amsterdam avant tout traitement.

Pour des centaines d'images, préférer des ZIP de lot plutôt que des centaines de transferts unitaires.

## 4. Claim serveur

Dès que le couple `ready/NAME` + `ready/NAME.sha256` existe :

1. le serveur déplace atomiquement le fichier vers `processing` ;
2. propriétaire → `root:root` ;
3. permissions → lecture root uniquement ;
4. l'uploader ne peut plus modifier le fichier ;
5. le marqueur SHA est claimé lui aussi ;
6. le SHA-256 client est vérifié contre le SHA-256 recalculé ;
7. une transaction unique est créée.

Un fichier sans marqueur reste inerte. Un hash différent provoque un rejet et aucune activation.

Format transaction :

```
YYYYMMDDTHHMMSSZ-<8 hex>
```

## 5. Préflight — aucune écriture runtime

`boono-transfer-validate.py` contrôle avant tout import :

- fichier régulier, pas de symlink ;
- taille > 0 ;
- maximum 2 GiB par upload ;
- images statiques seulement ;
- PNG / WebP / JPEG ;
- dimensions max 8192 × 8192 ;
- limite pixels anti-décompression ;
- lecture complète Pillow ;
- SHA-256 ;
- ZIP non chiffré ;
- maximum 5000 membres ;
- maximum 8 GiB décompressés ;
- maximum 256 MiB par membre ;
- refus absolu des chemins `..` ou absolus ;
- refus des symlinks ZIP ;
- refus des types de fichiers non autorisés ;
- contrôle CRC ZIP.

Un préflight refusé part dans `failed/` et ne touche jamais Git ni BOONO-TV.

## 6. Classification

Contrats actuels :

- `BOONOTV01*.png` → `scene-board-v1` → importeur des 7 scènes ;
- bundle contenant les 9 assets layered attendus → `layered-runtime-v1` ;
- autre image valide → `visual-source-v1` → **archive seulement** ;
- autre ZIP valide → `visual-bundle-v1` → **archive seulement**.

Donc un fichier visuel générique ne peut pas devenir automatiquement du runtime.

## 7. Source brute

Après préflight réussi, le fichier original est figé sous :

```
/srv/boono-upload/archive/YYYY-MM-DD/
```

Permissions : root-only.

Les **sources brutes ne sont plus poussées automatiquement sur GitHub**.

Seuls les assets dérivés explicitement destinés au runtime et leurs manifests peuvent aller dans Git LFS.

Note historique : une ancienne version de `BOONOTV01.png` a déjà été poussée dans l'historique de la branche avant ce protocole. Cette version 1 empêche toute nouvelle publication brute ; elle ne réécrit pas l'historique Git existant.

## 8. Importeur spécialisé = transaction

Avant toute modification Git :
- toutes les sorties sont générées hors du dépôt ;
- toutes les sorties sont rouvertes et validées ;
- le set exact de fichiers est vérifié ;
- le SHA-256 source est écrit dans le manifest ;
- pour les 7 scènes, les 7 hashes doivent être distincts.

Ensuite seulement :
1. fetch de la branche `boono-tv-assets` ;
2. reset sur `origin/boono-tv-assets` ;
3. assertion worktree propre ;
4. copie de **la seule release candidate** ;
5. mise à jour du seul fichier control concerné ;
6. `git diff --cached --name-only` doit correspondre exactement au scope prévu ;
7. commit ;
8. `git lfs fsck` ;
9. push ;
10. sync/re-fetch ;
11. deuxième validation côté déploiement ;
12. activation atomique.

Échec Git/LFS/push : reset du worktree, runtime inchangé.

## 9. Activation atomique

Deux pointeurs existent :

```
current
previous
```

Avant chaque changement réussi, l'ancienne release devient `previous`.

Runtimes :

```
boono-tv/assets/runtime
boono-tv/assets/scenes-runtime
```

Ce sont uniquement des symlinks vers une release déjà validée.

## 10. Rollback

Scènes :

```bash
boono-visual-rollback scenes previous
```

Assets layered :

```bash
boono-visual-rollback assets previous
```

On peut aussi sélectionner explicitement une release :

```bash
boono-visual-rollback scenes boono-scenes-YYYYMMDDTHHMMSSZ-xxxxxxxx
```

Le rollback passe lui aussi par le control Git puis le sync ; le timer ne peut donc pas réactiver accidentellement la mauvaise version.

## 11. Reçus et audit

Chaque transaction produit :

```
/srv/boono-upload/status/receipts/<transaction>.json
```

Dernier reçu :

```
/srv/boono-upload/status/last.json
```

Journal :

```
/srv/boono-tv-assets/logs/transfer.log
```

États possibles :

```
claimed
validated
stored
rejected
import-failed
activated
```

Le reçu contient notamment le nom original, SHA-256, taille, type détecté, résultat du préflight et résultat d'import.

## 12. Invariants

1. **Pas de ready = pas de traitement.**
2. **Pas de marqueur SHA-256 = pas de traitement.**
3. **SHA client ≠ SHA Amsterdam = rejet.**
4. **Pas de préflight = pas d'import.**
5. **Pas de validation complète = pas d'écriture Git.**
6. **Pas de Git push réussi = pas d'activation.**
7. **Pas de re-fetch + revalidation = pas de bascule runtime.**
8. **Une release invalide ne remplace jamais la précédente.**
9. **Le moteur de trading n'est jamais écrit ni redémarré par cette passerelle.**
10. **Les sources brutes restent hors Git public.**
11. **Toute activation est traçable et rollbackable.**

## 13. Services

```
boono-assets-inbox.path
boono-assets-inbox.timer
boono-assets-sync.timer
boono-scenes-sync.timer
```

Le path unit réagit aux nouveaux fichiers dans `ready`. Le timer inbox sert uniquement de filet de sécurité en cas d'événement manqué.

---

Ce protocole est l'équivalent visuel du principe historique BOONO :

> vérifier toutes les préconditions avant d'écrire ; si une assertion échoue, rien d'actif ne doit être modifié.
