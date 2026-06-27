"""
Parse Pokemon Showdown team export format into individual Pokemon objects.

Showdown export format (one Pokemon):

    PENATRATOR (Excadrill) (M) @ No Item
    Ability: Sand Rush
    Level: 50
    Shiny: Yes
    Tera Type: Ground
    EVs: 4 HP / 252 Atk / 252 Spe
    Adamant Nature
    - Rock Slide
    - Protect
    - High Horsepower
    - Iron Head

Multiple Pokemon are separated by one or more blank lines.
"""

from __future__ import annotations
import re
from dataclasses import dataclass


# Twitch chat limit for most accounts (single PRIVMSG must stay under this).
TWITCH_MAX_CHAT_LENGTH = 500


@dataclass
class Pokemon:
    nickname: str       # Custom nickname if set, otherwise species name
    species: str        # Species name extracted from parentheses (or same as nickname)
    lines: list[str]    # Individual non-empty lines of the block
    raw_block: str      # Original text of the block

    @property
    def chat_message(self) -> str:
        """Single-line Showdown set for one Twitch chat message (Berichan format)."""
        return " ".join(self.lines)


def _parse_header(first_line: str) -> tuple[str, str]:
    """
    Return (nickname, species) from the first line of a Showdown block.

    Possible formats:
      - "Excadrill @ Item"                 → ("Excadrill", "Excadrill")
      - "PENATRATOR (Excadrill) (M) @ ..." → ("PENATRATOR", "Excadrill")
      - "Grimmsnarl (M) @ Item"            → ("Grimmsnarl", "Grimmsnarl")
    """
    # Strip held item portion ("@ Something")
    base = re.split(r'\s*@\s*', first_line)[0].strip()

    # Remove gender markers — single-letter parentheticals like (M) or (F)
    base = re.sub(r'\s*\([MF]\)\s*', ' ', base).strip()

    # Look for "(Species)" — remaining parentheticals are species names
    paren_matches = re.findall(r'\(([^)]+)\)', base)

    if paren_matches:
        species = paren_matches[0]
        nickname = base.split('(')[0].strip() or species
    else:
        species = base
        nickname = base

    return nickname, species


def parse_team(text: str) -> list[Pokemon]:
    """
    Parse a full Pokemon Showdown team export into a list of Pokemon.
    Returns an empty list if no valid blocks are found.
    """
    # Split on one or more consecutive blank lines
    blocks = re.split(r'\n(?:\s*\n)+', text.strip())

    pokemon_list: list[Pokemon] = []
    for block in blocks:
        block = block.strip()
        if not block:
            continue

        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines:
            continue

        nickname, species = _parse_header(lines[0])
        pokemon_list.append(Pokemon(
            nickname=nickname,
            species=species,
            lines=lines,
            raw_block=block,
        ))

    return pokemon_list
