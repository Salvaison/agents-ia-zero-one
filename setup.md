# Infrastructure Setup

## Host Machine

- **OS**: Windows 11 — Acer
- **WSL2**: Ubuntu
- **Username**: boono
- **Home directory**: `/home/weibel`
- **Public IP**: 109.222.226.243

## Chrome Remote Debugging

- **Debug port**: 9222
- **CDP host**: `CDP_HOST=172.31.80.1` (WSL2 → Windows bridge IP)
- **Windows portproxy**: configured to forward port 9222 from WSL2 to Windows Chrome

## TradingView MCP

- **Path**: `/home/weibel/tradingview-mcp`
- **Connection**: Chrome CDP via port 9222
- **Active chart**: BYBIT:BTCUSD.P — 4H timeframe
- **Status**: connected

## Repository

- **GitHub**: github.com/Salvaison/agents-ia-zero-one
- **Local path**: `/home/weibel/agents-ia-zero-one`
- **Branch**: main

## MEXC Exchange

- **API keys**: to be created
- **IP whitelist**: 109.222.226.243
- **Mode**: paper trading first, then live

## Trading Bot Goal

Automated BTC/USDT perpetual bot using **Market Cipher B** signals read from TradingView via MCP.

### Signal source

Market Cipher B on BYBIT:BTCUSD.P 4H chart — primary signals:
- Money Flow (blue/red waves)
- Momentum (blue/yellow dots)
- Divergences

### Execution flow

```
TradingView chart (Chrome)
  └─ CDP (port 9222)
      └─ tradingview-mcp
          └─ Claude agent reads signals
              └─ MEXC API → order execution
```

### Phases

1. **Paper trading** — validate signal reading and order logic without real funds
2. **Live trading** — switch to real MEXC account once strategy is validated
