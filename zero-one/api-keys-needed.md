API Keys Needed
Agent Summary
L'agent est un bot de trading crypto autonome qui surveille les marchés 24/7, analyse les charts BTC/USDT et autres tickers via TradingView et Market Cipher B, identifie les setups selon la stratégie Casper (S&R, Fibonacci, divergences, confluence multi-timeframe), exécute les trades sur MEXC avec la structure Shlong (25/50/25), gère le risk management automatiquement, et produit un rapport quotidien pour Benjamin en 30-60 minutes de supervision.
Services Required
ServiceWhat it's used forFree tierMEXC APIExécution des trades, lecture du portfolio, paper tradingOuiTradingView MCPLecture des charts, indicateurs Market Cipher B, signauxVia MCP (gratuit)CoinGeckoPrix en temps réel BTC, ETH, SOL, XRP, ADA, LINK, ONDO, AAVEOuiAlpha VantageGold, Silver, Brent, S&P500OuiNewsAPI ou GNewsActualité crypto filtrée, sentiment macroOui (limité)Claude API (Anthropic)Cerveau de l'agent — analyse, décisions, rapportsNon (payant)YouTube Data APISurveillance traders de référence (Jayson Casper et autres)Oui
Keys Already In Hand

✅ MEXC API Key + Secret — configurés dans .env sur le VPS
✅ Claude API — accessible via Claude Pro (boono@live.se)
✅ TradingView MCP — connecté via Chrome debug port, pas de clé API requise

Acquisition Priority

CoinGecko — données de prix en temps réel, indispensable dès le début
Alpha Vantage — Gold, Silver, S&P500, Brent pour le contexte macro
NewsAPI ou GNews — actualité crypto filtrée comme signal périphérique
YouTube Data API — module surveillance traders, utile mais non critique au démarrage
Claude API (clé programmatique) — nécessaire quand le bot tournera en autonome sur le VPS sans interface chat

Notes

CoinGecko : free tier limité à 30 calls/minute — suffisant pour commencer
Alpha Vantage : free tier 25 requests/jour — attention pour les tickers multiples, envisager un cache local
NewsAPI : 100 requests/jour en free tier — suffisant pour une veille quotidienne
YouTube Data API : quota de 10,000 units/jour — largement suffisant pour surveiller quelques chaînes
Claude API : facturation à l'usage — prévoir un budget mensuel, commencer petit et monitorer
MEXC : les clés existantes couvrent Spot et Futures — vérifier que les permissions Futures sont actives avant le paper trading
