#!/usr/bin/env bash
# BOONO Systems — provide ChromeOS access to the private OVH studio.
# The existing 127.0.0.1:8310 tunnel is deliberately preserved.
# Bind ONLY to Penguin's private eth0 address, never 0.0.0.0.
set -euo pipefail
ip=$(/usr/bin/ip -4 -o addr show dev eth0 | /usr/bin/awk 'NR==1 {split($4, parts, "/"); print parts[1]}')
if [[ -z "$ip" ]]; then
  echo "BOONO-TV: Penguin eth0 is not ready" >&2
  exit 1
fi
echo "BOONO-TV: private ChromeOS bridge listening on ${ip}:8310" >&2
exec /usr/bin/autossh -M 0 -N -T -F /home/boono70/.ssh/config \
  -o ExitOnForwardFailure=yes \
  -L "${ip}:8310:127.0.0.1:8310" \
  boono-amsterdam
