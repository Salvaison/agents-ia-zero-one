#!/usr/bin/env bash
# archive-audit.sh — Conserve une copie quotidienne de l'audit, compressee.
#
# MOTIF (05/09/2026). audit-history.json ne garde que 2880 releves, soit
# vingt-quatre heures glissantes. C'est suffisant pour l'affichage mais pas
# pour mesurer : le simulateur a 135 positions depuis le 30/08, dont dix-sept
# seulement tombent dans la fenetre d'audit disponible.
#
# Toute analyse reliant les trades a l'etat du marche bute donc sur des
# echantillons de dix a vingt cas -- assez pour voir une tendance, jamais
# assez pour conclure. La mesure du veto de vague, tentee le 05/09, s'est
# arretee la : trois trades dans le groupe decisif.
#
# Une archive quotidienne resout cela. Dans une semaine, les memes mesures
# porteront sur une centaine de positions.
#
# VOLUME : environ 3 Mo par jour en clair, 300 Ko compresse -- le JSON se
# comprime tres bien. Soit une centaine de Mo par an sur un disque de 76 Go
# utilise a 6%.
#
# Lance chaque nuit a 00h05 par PM2.

set -euo pipefail

SRC="/root/agents-ia-zero-one/zero-one/data/audit-history.json"
DIR="/root/agents-ia-zero-one/zero-one/data/archives"
JOUR=$(date -u -d "yesterday" '+%Y-%m-%d')

mkdir -p "${DIR}"

if [ ! -f "${SRC}" ]; then
  echo "[$(date '+%F %T')] audit-history.json introuvable, rien a archiver"
  exit 0
fi

DEST="${DIR}/audit-${JOUR}.json.gz"
if [ -f "${DEST}" ]; then
  echo "[$(date '+%F %T')] ${DEST} existe deja, rien a faire"
  exit 0
fi

gzip -c "${SRC}" > "${DEST}"
TAILLE=$(du -h "${DEST}" | cut -f1)
echo "[$(date '+%F %T')] archive ${DEST} (${TAILLE})"

# Menage : au-dela de 90 jours, on ne garde plus. A ajuster si les analyses
# demandent davantage de recul.
find "${DIR}" -name 'audit-*.json.gz' -mtime +90 -delete 2>/dev/null || true
NB=$(find "${DIR}" -name 'audit-*.json.gz' | wc -l)
echo "[$(date '+%F %T')] ${NB} archive(s) conservee(s), $(du -sh ${DIR} | cut -f1) au total"
