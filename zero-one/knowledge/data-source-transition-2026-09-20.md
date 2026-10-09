# Transition de source TradingView MCB — 20/09/2026

## Objet
Aligner la source TradingView/MarketCipher sur la source opérationnelle du moteur et de la microstructure : OKX.

## État avant transition
- Prix opérationnel / Ticker / microstructure / Vol / cadence / flow : OKX `BTC-USDT-SWAP` depuis le 15/08/2026.
- TradingView / MCB / LBW / BW / MF / MA200 : Bybit `BTCUSDT.P` jusqu'au 20/09/2026.

## Transition observée
- Premier rattachement collecteur 3m à `OKX:BTCUSDT.P` : 20/09/2026 09:41:59 UTC (11:41:59 Paris).
- Premier rattachement collecteur multi-TF à `OKX:BTCUSDT.P` : 20/09/2026 09:41:59 UTC.
- Un recyclage Chrome de validation a brièvement restauré un onglet Bybit entre ~09:52:24 et 09:53:41 UTC ; aucun close 15m n'a été enregistré pendant cette brève fenêtre d'essai.
- État stabilisé après validation : trois onglets seulement, tous sur `OKX:BTCUSDT.P` (3m, multi-TF/15m, TA).

## Règle d'interprétation
Les CSV MCB existants conservent leur historique Bybit avant la transition et reçoivent désormais les nouvelles observations OKX. Ils sont donc historiquement multi-source.

Aucune reconstruction historique générale n'est planifiée. Les analyses antérieures restent valables dans leur contexte de source. La microstructure BOONO n'est pas concernée par cette transition car elle était déjà issue d'OKX.

Précaution unique : ne pas interpréter comme signal de marché un saut de valeur, pivot ou divergence dont la géométrie dépend directement du passage de source autour de la fenêtre de transition du 20/09/2026. Pour les cas de référence importants ou les TF élevés (4h/D/W), une vérification ponctuelle Bybit vs OKX peut être faite si nécessaire, sans backfill systématique.

## État cible
TradingView : `OKX:BTCUSDT.P`
Flux moteur : OKX `BTC-USDT-SWAP`
Exécution : OKX
