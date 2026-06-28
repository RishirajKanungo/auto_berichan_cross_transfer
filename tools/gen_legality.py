"""
Generate assets/data/legality.json — per-Pokémon, per-game legal move sets, from
Serebii's pokedex pages. Each /pokedex-sv/<slug>/ page contains both the
Scarlet/Violet and the Legends: Z-A learnsets, so one fetch covers both games.

This powers accurate per-game legality: Berichan injects into the selected game,
where a Pokémon can only have moves it can learn in THAT game (e.g. Mawile can't
learn Sucker Punch in Legends Z-A). Champions movepools are broader, so we must
validate against the target game's actual learnset.

Run once (needs internet; ~200 polite requests); output is committed:
    python tools/gen_legality.py
"""

from __future__ import annotations

import json
import re
import time
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHAMPIONS = ROOT / "assets" / "data" / "champions.json"
OUT = ROOT / "assets" / "data" / "legality.json"
PAGE = "https://www.serebii.net/pokedex-sv/{slug}/"
_HEADERS = {"User-Agent": "Mozilla/5.0 (BerichanCrossTransfer legality gen)"}


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _fetch(url: str, retries: int = 3) -> str | None:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=_HEADERS)
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "ignore")
        except Exception:  # noqa: BLE001
            time.sleep(1.5 * (attempt + 1))
    return None


def parse_games(html: str) -> dict[str, list[str]]:
    """Return {'sv': [moveids], 'za': [moveids]} from a pokedex-sv page."""
    atk = [m.start() for m in re.finditer(r"<h2[^>]*>\s*Attacks\s*</h2>", html)]
    sts = [m.start() for m in re.finditer(r"<h2[^>]*>\s*Stats\s*</h2>", html)]
    games: dict[str, set[str]] = {}
    for a in atk:
        end = min([s for s in sts if s > a] + [len(html)])
        blk = html[a:end]
        moves = {_norm(m) for m in re.findall(r"/attackdex-sv/([a-z0-9\-]+)\.shtml", blk)}
        if not moves:
            continue
        key = "za" if ("Legends: Z-A" in blk or "Alpha Guaranteed" in blk) else "sv"
        games.setdefault(key, set()).update(moves)
    return {k: sorted(v) for k, v in games.items()}


def main() -> None:
    roster = json.loads(CHAMPIONS.read_text(encoding="utf-8"))["species"]
    out: dict[str, dict[str, list[str]]] = {}
    for i, sp in enumerate(roster, 1):
        slug = sp["id"]
        html = _fetch(PAGE.format(slug=slug))
        if html:
            games = parse_games(html)
            if games:
                out[slug] = games
        flags = "+".join(f"{k}:{len(v)}" for k, v in out.get(slug, {}).items()) or "NONE"
        if i % 20 == 0 or not out.get(slug):
            print(f"  [{i}/{len(roster)}] {sp['name']}: {flags}")
        time.sleep(0.25)

    OUT.write_text(
        json.dumps(
            {"source": "serebii pokedex-sv (SV + Legends Z-A learnsets)",
             "generated": date.today().isoformat(), "species": out},
            separators=(",", ":"), ensure_ascii=False),
        encoding="utf-8",
    )
    kb = OUT.stat().st_size / 1024
    print(f"Wrote {OUT} ({len(out)} species, {kb:.0f} KB)")


if __name__ == "__main__":
    main()
