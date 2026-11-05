# OD-20261105-009 — Nouveau loft GIMP et deux masques indépendants

**Origine :** demande explicite de BOONO-TV le 5 novembre 2026, copie complète sous 01. Le propriétaire a préparé lui-même un nouveau canal alpha de fenêtres et un second layer mask distinct pour les affiches. Il demande la sauvegarde du fichier maître GIMP sans perdre les masques et le remplacement de l'asset sur OVH.

**Constats réalisés dans GIMP :** image 1200×1080 enregistrée à 20:08 dans /mnt/chromeos/shared/MyFiles/Amsterdam/YT/BOONO_TV_LOFT_EDIT_GIMP/BOONO_loft_nord_TRAVAIL_1200x1080.xcf ; GIMP 3.0.4 indique trois calques, deux avec un masque éditable distinct et un calque de base à 33 % d'opacité. Le masque haut (x72–584, y28–392) couvre les fenêtres ; le second (x700–1163, y56–349) couvre les deux affiches. Le fichier d'origine est enregistré et propre selon la session GIMP. Le nouveau XCF de travail a été renommé avec les calques FENÊTRES, AFFICHES et BASE et sauvegardé sous un nouveau nom, sans appliquer les masques ni modifier l'original.

**Export et présentation :** les quatre variantes RGBA sont issues des pixels des calques GIMP, sans génération d'image ; chaque masque possède également son PNG grayscale brut. Les quatre états permettent de rendre les ouvertures indépendamment transparentes. Le loft des fenêtres transparentes devient le défaut OVH, avec les variantes alternables en temps réel par une API et via URL. Il n'y a aucune alternance automatique imposée.

**Frontière :** les projections validées des écrans, personnages, moteur V494/V543 et radio ne sont pas concernés. La source maître XCF est conservée hors site public. Le transfert OVH est temporairement autorisé par le tunnel existant et un endpoint one-shot protégé, immédiatement supprimé après son utilisation.

**Convention de vérité :** ce dossier est **rédigé après les premières opérations de sauvegarde et de transfert**, et non pré-créé avant l'exécution. L'archive distingue cette chronologie et ne présente pas le prompt opérationnel comme un enregistrement antérieur.
