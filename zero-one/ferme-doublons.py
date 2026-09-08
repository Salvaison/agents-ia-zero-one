#!/usr/bin/env python3
"""Ferme les onglets TradingView en double (08/09/2026).

Le watchdog comptait avec grep -c, qui compte les LIGNES : trois onglets
identiques comptaient pour un, et il se declarait satisfait avec cinq onglets
ouverts. Les doublons viennent du dialogue de restauration que Chrome affiche
apres un pkill -9 -- celui du recyclage de 3h et 15h.

Deux collecteurs qui se disputent le meme onglet produisent des refus
d'ecriture : on ne garde que le premier de chaque couple (mise en page,
intervalle).
"""
import json, re, urllib.request

CDP = "http://localhost:9222"
d = json.load(urllib.request.urlopen(CDP + "/json/list", timeout=5))
vus, fermes = set(), 0
for t in d:
    u = t.get("url", "")
    if "tradingview.com/chart" not in u:
        continue
    m = re.search(r"chart/(\w+).*interval=(\d+)", u)
    cle = m.groups() if m else ("?", "?")
    if cle in vus:
        try:
            urllib.request.urlopen(CDP + "/json/close/" + t["id"], timeout=5)
            print(f"  ferme {cle[0]} interval={cle[1]} ({t['id'][:8]})")
            fermes += 1
        except Exception as e:
            print(f"  echec {t['id'][:8]} : {e}")
    else:
        vus.add(cle)
print(f"{len(vus)} onglet(s) conserve(s), {fermes} doublon(s) ferme(s)")
