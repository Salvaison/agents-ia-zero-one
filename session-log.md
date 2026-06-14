# Session Log — 2026-06-14

## Objective

Get Claude Code + tradingview-mcp running inside a fresh WSL2 Ubuntu environment and establish a live CDP connection to TradingView Desktop on Windows.

---

## Phase 1 — WSL Reinstall & Ubuntu Setup

- Wiped existing WSL installation and performed a clean reinstall
- Installed Ubuntu as the WSL2 distro
- Configured user account and base system packages
- Set up the development environment (Node.js, npm, git, etc.)

---

## Phase 2 — Repo Clone & tradingview-mcp Install

- Cloned the `tradingview-mcp` repository into `/home/weibel/tradingview-mcp`
- Ran `npm install` to install dependencies
- Configured the MCP server in Claude Code settings so it loads on startup

---

## Phase 3 — CDP Connection Fix

TradingView Desktop runs on Windows and exposes CDP on `localhost:9222`. From inside WSL2, `localhost` resolves to the WSL guest, not the Windows host — so the CDP connection failed initially.

### Fix: CDP_HOST set to Windows host IP

WSL2 exposes the Windows host at a static-ish IP via the virtual network adapter. The correct host IP was:

```
CDP_HOST=172.31.80.1
```

This was set as an environment variable so the MCP server connects to `172.31.80.1:9222` instead of `localhost:9222`.

### Fix: Windows port proxy

Port 9222 on the Windows host was not reachable from WSL2 by default. Added a `netsh` portproxy rule on Windows to forward the port:

```powershell
netsh interface portproxy add v4tov4 listenport=9222 listenaddress=172.31.80.1 connectport=9222 connectaddress=127.0.0.1
```

This bridges Windows `127.0.0.1:9222` (where TradingView listens) to the WSL-facing adapter IP `172.31.80.1:9222`.

### Fix: Windows Firewall rule

The portproxy alone wasn't enough — Windows Firewall was blocking inbound traffic on port 9222 from the WSL subnet. Added an inbound allow rule:

```powershell
netsh advfirewall firewall add rule name="CDP WSL2" dir=in action=allow protocol=TCP localport=9222
```

---

## Phase 4 — Verification

Ran `tv_health_check` via Claude Code MCP:

| Field | Value |
|-------|-------|
| CDP Connected | true |
| Symbol | BYBIT:BTCUSD.P |
| Timeframe | 4H (240) |
| Chart Type | Candles (1) |
| Chart URL | https://www.tradingview.com/chart/2AqpEMfD/ |
| Chart Title | BTCUSD.P 63,982.5 ▼ −0.63% Benjamin 09/11/23 |

Connection confirmed. MCP server is live and reading the chart.

---

## Key Config to Preserve

If WSL2 IP changes (it can change on reboot), re-check the host IP with:

```bash
cat /etc/resolv.conf | grep nameserver
# or
ip route | grep default
```

Then update `CDP_HOST` and the portproxy `listenaddress` accordingly. The firewall rule does not need to change.
