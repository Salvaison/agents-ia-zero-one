# BOONO Systems — Fraîcheur des divergences par régime MA et multidivergences persistantes

**27 octobre 2026 · amélioration technique du lecteur existant, sans nouvelle version de BOONO et sans modification d'admission/sortie.**

## Décision validée

Une divergence n'expire pas parce qu'un nombre arbitraire de minutes a passé, ni parce qu'une mèche ou une tentative de prix intermédiaire s'écarte momentanément d'une droite idéale.

**Sa famille d'ancres de prix appartient à la polarité du prix vis-à-vis de la MA200 de la même timeframe.** Tant que cette polarité n'a pas changé de façon confirmée, les extrema successifs peuvent appartenir à la même histoire de divergence/multidivergence. Un **changement de polarité confirmé** clôt l'utilisation des anciennes ancres pour les nouvelles divergences de la timeframe. Les anciens événements restent auditables ; ils ne sont pas réemployés dans le régime suivant.

La politique de confirmation reprend la mémoire MA déjà codée : **deux clôtures successives** nettement de l'autre côté de MA200 (tolérance de contact `max(5 USD, 0,03 % MA)`). Une mèche, un simple test, une seule clôture adverse ou une respiration E3/E15 ne ferment pas le régime.

Le régime suivant ne peut construire de nouvelles divergences qu'à partir des bougies **postérieures à la clôture de confirmation**, afin de ne pas réutiliser rétrospectivement la mèche de la bougie de transition. L'heure du pivot LBW et son heure de confirmation restent distinctes.

La logique MCB15 directrice, le contrat de MA, le risque, les exits et l'admission de V4.9.4/V5.4.2 **restent identiques**. Le compteur de retests reste uniquement descriptif.

## Multidivergence : géométrie non monotone admise

Le lecteur peut prolonger un même ancrage avec plusieurs pivots LBW causaux de même type et du même régime, si les points qualifies ont un plus-bas de prix sous l'ancre (ou plus-haut côté SHORT) et une évolution LBW opposée à ce déplacement de prix.

Chaque point est comparé à **l'ancre fondatrice**, et non forcément au précédent point. La suite des extrema n'a donc pas à se ranger sur une droite parfaitement monotone. Les extrema dérogatoires et mèches hors de la ligne sont conservés comme `irregular` sans invalider la famille. Le graphe trace une polyligne reliant les extrema admissibles plutôt qu'une droite unique.

L'exigence existante d'amplitude LBW (5 points pour la divergence 15m « confirmée forte ») n'est pas supprimée. Une amélioration LBW réelle mais plus faible reste qualifiée « en maturation / faible amplitude ». Aucune divergence n'est un ordre.

## Exemple réel, 26–27 octobre 2026 (CET)

Les bougies 15m du 26 octobre à partir de ~20h30 jusqu'au 27 octobre à 13h45 appartiennent au régime inférieur MA15 documenté (la continuité antérieure n'est pas postulée en présence de trous MA dans la collecte).

Sur ces bougies le lecteur retrouve une **MULTIDIV haussière** issue du 26 octobre vers 21h45, avec plusieurs creux intermédiaires, notamment 27 octobre à 05h30 (prix 79 607,2 $, LBW15 −53,85), 08h15 et 11h15 (prix 79 477,9 $, LBW15 −51,07). Un point intermédiaire peut avoir un LBW moins favorable que le point immédiatement précédent, tout en restant meilleur que l'ancre principale. Ce n'est pas une raison de supprimer la famille.

À **13h30 le 27 octobre**, une première clôture 15m supérieure à MA15 est enregistrée (BTC 80 228,9 $, MA20015 80 137,4 $). À **13h45**, la seconde clôture confirme ce passage (BTC 80 314,6 $, MA20015 80 139,1 $). La famille de creux du régime inférieur cesse **à cet instant** d'être admissible comme ancre de divergence actuelle sur le 15m. Le nouveau régime est `ABOVE`, avec identifiant de régime distinct, et ne recycle aucun creux antérieur à 13h45.

## Implémentation / surfaces

- `modules/v4/experiments/divergence-polarity-scope.js` : reconstructeur pur des régimes MA200 par timeframe, horodatage de confirmation, identifiants immuables, transitions et trous d'observation. Le présent branchement est actif sur **3m et 15m**. Les TF 1h et supérieures ne reçoivent pas d'autorité de régime sans collecte MA continue vérifiée ; l'état `TF_SOURCE_NOT_YET_VERIFIED` est explicite.
- `modules/v4/experiments/divergence-causal-shadow.js` : le catalogue VAGUES 3m/15m n'expose que les lignes du régime courant, et le 15m conserve des chaînes `MULTIDIV` multi-pivots non monotones. Version historique du module conservée, **pas de création d'une nouvelle stratégie**.
- `modules/config-server.js` : lecture MA200 dans les sources MCB, diagnostic `polarityRegime` dans le catalogue, polylignes pour les multidivs et rubrique de fraîcheur dans **État vivant → MCB15**. Les anciennes ancres sont documentées dans les transitions de régime, pas proposées comme ligne active du nouveau régime.
- `modules/attention/evidence-adapters.js` : MF/prix et LBW15/prix n'emploient que les ancres du régime courant. L'horizon antérieur de 24 bougies pour les divergences MF est levé lorsque la polarité est effectivement connue, avec scan en O(n). Les trous de MA n'impliquent jamais un flip inventé.
- `modules/attention/attention-memory.js` : les familles MF et LBW peuvent persister dans la mémoire du régime sans échéance arbitraire des 150 minutes et sans être évincées par les événements tactiques. Lors du flip, les anciennes divergences de ce régime sont exclues. Les ordres restent sans autorité (`entryAllowed:null`, `exitRequested:null`).
- Adaptateurs V4.9.4 et V5.4.2 : exposent l'identifiant de régime à la mémoire **sans changer** le moteur de trading et sans réactiver d'ancien simulateur.

## Intégrité / tests

Fixture 15m confirmée et figée `tests/v4/fixtures/ma15_polarity_and_multidiv_2026-10-26_27.json` (source Amsterdam).

Tests `tests/v4/divergence-polarity-multidiv.test.js` : mèche seule, clôture isolée, deux clôtures réellement confirmées, aucune fuite du futur, multi-divergence irrégulière, trou MA inconnu, éviction mémoire tactique, isolation des admissions/exits, **bascule réelle à 13h45** excluant les creux 05h30/11h15.

Suite complète V4/V5/attention et contrôle du moteur actif avant/après redémarrage requis. Les historiques de trading et les versions des positions ne doivent pas être réécrits.

**Ne pas assimiler cette amélioration de fraîcheur à une promesse de meilleur P&L.** La divergence seule ne donne ni direction de position automatique, ni ordre, ni veto. La preuve exploitable résulte toujours de la combinaison MCB, MF et prix.

## Déploiement effectif — contrôle Amsterdam du 27 octobre 2026

- Copies horodatées avant rechargement des deux ledgers et des fichiers de trades, avec SHA256, dans `/root/boono-divergence-polarity-before-20261027/`.
- Les services existants `boono-v542-paper`, `boono-v494-paper`, `config-server` ont été rechargés **sans créer de version ni de nouveau service** ; PM2 a sauvegardé la liste courante. Aucune migration de ledger ni sortie/entrée synthétique liée au déploiement.
- À la sauvegarde : V5.4.2 comptait 75 clôtures, equity PAPER 901,705 $, position FLAT ; V4.9.4 comptait 25 clôtures, equity 972,0419 $, LONG PAPER hérité à 80 020,1 $. À l'après contrôle, les mêmes versions sont conservées avec `brokerOrdersEnabled=false` et `DATA_OK`.
- La position V5 #75 avait été clôturée **avant** ce rechargement, selon son contrat d'origine V5.4.1 (`GAIN_FLOOR_120_90_OR_220_180`, résultat net +0,0794 $). Cette sortie n'a aucune relation causale avec la correction du lecteur.
- Tests complets après modifications : **267 cas, 255 réussis, zéro échec, 12 anciens cas sautés pour couverture historique incomplète**. Test de parité courant : V5.4.1 et V5.4.2 aboutissent au même `WAIT_MCB3_INSIDE_MCB15_CAMPAIGN` ; le rapport d'attention est purement descriptif.
- Performance mesurée pour le catalogue 15m sur 9 931 bougies confirmées : ~79 ms par reconstruction (mesure ponctuelle, non garantie constante).
- Régression historique supplémentaire : flip `ABOVE→BELOW` du 26 octobre à 17h15 CET ; flip `BELOW→ABOVE` du 27 octobre à 13h45 CET. Les deux sont reconnus à la deuxième clôture, pas une milliseconde avant.
- Les textes d'interface exigent encore une vérification visuelle dans la session navigateur authentifiée ; les routes non authentifiées redirigent, ce qui est attendu.

La MA200 délimite ici la **mémoire des ancres de divergence de sa propre timeframe**, pas une frontière à conquérir, un ordre de sortie, un prérequis d'admission, ni un veto d'emplacement.
