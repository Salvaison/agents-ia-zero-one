# BOONO-TV Assets Channel

Dedicated binary channel for BOONO-TV visual assets.

## Release contract
Each release lives under `releases/<release-id>/` and must contain:
- `manifest.json`
- `room_backplate.webp`
- `desk_foreground.webp`
- `boono/working.webp`
- `boono/thinking.webp`
- `boono/worried.webp`
- `boono/concentrated.webp`
- `boono/confident.webp`
- `boono/observe.webp`
- `boono/execute.webp`

`control/current.json` selects the active release. Amsterdam validates hashes and dimensions, then activates it atomically.

Only visual assets belong here. No live trading data, API keys, credentials, or private logs.
