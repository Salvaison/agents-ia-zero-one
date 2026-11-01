#!/usr/bin/env bash
# BOONO-TV 2026-11-01 compact desk — reproducible, non-destructive alpha trim.
# Usage: bash generate_compact_desk.sh ORIGINAL_DESK_RGBA.png COMPACT_DESK_RGBA.png
set -euo pipefail
src="${1:?source PNG required}"
dst="${2:?output PNG required}"
if [[ "${src}" == "${dst}" ]]; then echo 'ERROR: refusing to overwrite the canonical source' >&2; exit 2; fi
[[ -f "${src}" ]] || { echo 'ERROR: source not found' >&2; exit 3; }
command -v ffmpeg >/dev/null || { echo 'ERROR: ffmpeg required' >&2; exit 4; }

# Preserve RGB original, change ONLY alpha:
# - left patch rack at X<=370 kept intact,
# - feather alpha across X=370..425,
# - remove the broad empty rear wood strip with a curved threshold Y(X),
# - preserve screen faces, brass rims, control wheel, lower rack and cables.
ffmpeg -hide_banner -loglevel error -y -i "${src}" \
  -vf "format=gbrap,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*(1-max(0,min(1,(X-370)/55))*(1-max(0,min(1,(Y-300-0.14*(X-550)-0.00008*(X-550)*(X-550)+4)/8))))'" \
  -frames:v 1 -pix_fmt rgba "${dst}"
file "${dst}"
sha256sum "${dst}"
