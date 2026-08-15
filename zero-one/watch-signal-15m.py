#!/usr/bin/env python3
"""
watch-signal-15m.py — Mesure la LATENCE reelle du signal MCB sur le 15m.

Question (15/08/2026) : le signal MCB apparait-il dans le flux intra-bougie
avant la cloture de la bougie 15m, et si oui, combien de temps avant ?

Enjeu : le pilotage MCB15 a ete valide le meme jour (+5.96% brut, 64% de
reussite, R/R 2.98 sur 100h). Son point faible mesure est la latence de
confirmation -- le signal n'est ecrit qu'a la cloture, soit jusqu'a 15 min
apres son apparition a l'ecran. Un test sur le 3m a montre le signal present
des T+4s dans le flux live. Si le comportement se confirme sur le 15m, on
gagne une bougie entiere sur une latence totale de 3 a 5 bougies.

Methode : lit baton-state.json toutes les 30s (le fichier est reecrit a
chaque cycle du baton) et journalise l'etat des champs live15SignalUp /
live15SignalDn, avec l'age de la bougie en cours.

CE QU'IL FAUT CHERCHER DANS LE JOURNAL :
  - "SIGNAL 15m DETECTE ... a T+XXXs" : le signal est apparu en cours de
    bougie. XXX est l'avance gagnee sur la cloture.
  - "REPAINT" : le signal etait la puis a disparu. C'est le risque a
    quantifier -- s'y fier exposerait a de faux departs.
  - "BILAN bougie" : recapitulatif a chaque changement de bougie.
  - "valeur revisee" : le type est stable mais la magnitude a bouge. Mesure
    sur le 3m : 56.55 -> 52.60. Important car le filtre de magnitude (>=45)
    pourrait accepter puis rejeter un signal.

REMARQUE : tab2-collector alterne entre ses cinq timeframes. Quand il n'est
pas sur le 15m, live15BarTs fige -- le script le signale comme "fige" plutot
que de compter ces cycles comme des mesures valides.

Usage (sur le VPS) :
    cd /root/agents-ia-zero-one/zero-one
    nohup python3 watch-signal-15m.py > /dev/null 2>&1 &

Consultation :
    grep -E "DETECTE|REPAINT|BILAN|revisee" watch-signal-15m.log
"""

import json
import os
import time
from datetime import datetime, timezone, timedelta

TZ = timezone(timedelta(hours=2))
STATE_PATH = '/root/agents-ia-zero-one/zero-one/data/baton-state.json'
LOG_PATH = '/root/agents-ia-zero-one/zero-one/watch-signal-15m.log'
INTERVAL_S = 30


def log(msg):
    line = f"[{datetime.now(tz=TZ).strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_PATH, 'a') as f:
            f.write(line + '\n')
    except Exception:
        pass


def main():
    log("=== Demarrage surveillance signal MCB 15m (Ctrl+C ou kill pour arreter) ===")

    last_bar = None
    last_bar_seen_at = None
    signal_in_bar = None      # ('VERT'|'ROUGE', valeur, T+secondes)
    frozen_since = None

    while True:
        try:
            with open(STATE_PATH) as f:
                st = json.load(f)
        except Exception as e:
            log(f"lecture impossible: {e}")
            time.sleep(INTERVAL_S)
            continue

        bar = st.get('live15BarTs')
        up = st.get('live15SignalUp')
        dn = st.get('live15SignalDn')
        bw = st.get('live15Bw')

        if not bar:
            log("live15BarTs absent -- tab2-collector tourne-t-il ?")
            time.sleep(INTERVAL_S)
            continue

        now = time.time()

        # Changement de bougie : bilan de la precedente
        if last_bar is not None and bar != last_bar:
            if signal_in_bar:
                kind, val, at_sec = signal_in_bar
                log(f"  >>> BILAN bougie {last_bar[11:16]} : {kind} vu a T+{at_sec}s "
                    f"(valeur {val}) -- avance sur la cloture")
            signal_in_bar = None
            frozen_since = None

        # Detection de fige (collecteur parti sur un autre TF)
        if last_bar is not None and bar == last_bar:
            bar_open = datetime.fromisoformat(bar.replace('Z', '+00:00')).timestamp()
            age = now - bar_open
            if age > 15 * 60 + 60:   # bougie 15m + 1 min de marge
                if frozen_since is None:
                    frozen_since = now
                    log(f"bougie {bar[11:16]} figee depuis {int(age)}s "
                        f"-- collecteur probablement sur un autre timeframe")
                last_bar = bar
                time.sleep(INTERVAL_S)
                continue

        bar_open = datetime.fromisoformat(bar.replace('Z', '+00:00')).timestamp()
        age_sec = int(now - bar_open)

        has_up = up is not None
        has_dn = dn is not None

        if has_up or has_dn:
            kind = 'VERT(creux)' if has_up else 'ROUGE(pic)'
            val = up if has_up else dn
            if signal_in_bar is None:
                signal_in_bar = (kind, val, age_sec)
                mag = abs(val) if isinstance(val, (int, float)) else 0
                seuil = "AU-DESSUS du seuil 45" if mag >= 45 else "sous le seuil 45"
                log(f"SIGNAL 15m DETECTE bougie {bar[11:16]} a T+{age_sec}s : "
                    f"{kind} valeur={val} ({seuil})  [BW={bw}]")
            else:
                prev_kind, prev_val, prev_at = signal_in_bar
                if prev_kind != kind:
                    log(f"  !!! CHANGEMENT DE TYPE : {prev_kind} -> {kind} "
                        f"(bougie {bar[11:16]}, T+{age_sec}s)")
                    signal_in_bar = (kind, val, age_sec)
                elif prev_val != val:
                    log(f"  valeur revisee : {prev_val} -> {val} "
                        f"(bougie {bar[11:16]}, T+{age_sec}s)")
                    signal_in_bar = (kind, val, prev_at)
        elif signal_in_bar is not None:
            kind, val, at_sec = signal_in_bar
            log(f"  !!! REPAINT : {kind} valeur={val} a DISPARU "
                f"(bougie {bar[11:16]}, T+{age_sec}s)")
            signal_in_bar = None

        last_bar = bar
        time.sleep(INTERVAL_S)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        log("=== Arret demande ===")
