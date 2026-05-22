"""
Orchestrates the full trade flow for each Pokemon in the team:

  1. Send each line of the Showdown block to chat (one PRIVMSG per line).
  2. Wait briefly, then whisper the trade code to BerichanBot.
  3. Wait for chat confirmation: "Added to the LinkTrade queue, unique ID: …"
  4. Wait for trade start: "Initializing trade (POKEMON) with you."
  5. Alert the user to begin trading on the Switch (audio + console banner).
  6. Wait for the user to press ENTER confirming the trade is done.
  7. Observe the configured cooldown before submitting the next Pokemon.

Bot message patterns (from berichandev Twitch chat, based on observed behavior):
  Queue join  → contains username + "Added to the LinkTrade queue"
  Trade start → contains username + "Initializing trade"
"""

from __future__ import annotations

import asyncio
import re
import sys
from typing import TYPE_CHECKING

from colorama import Fore, Style, init as _colorama_init
_colorama_init()

if TYPE_CHECKING:
    from .team_parser import Pokemon
    from .twitch_client import TwitchClient
    from .config import Config

_SEP = "=" * 62


def _alert_sound() -> None:
    """Play 3 short beeps on Windows to signal it's trade time."""
    try:
        import winsound
        for _ in range(3):
            winsound.Beep(1000, 250)
    except Exception:
        pass  # Non-Windows or no audio device — silent fallback


def _trade_ready_banner(pokemon_name: str, trade_code: str) -> None:
    print(f"\n{Fore.YELLOW}{_SEP}")
    print(f"  TRADE READY: {pokemon_name}")
    print(f"  Use code   : {trade_code}  on your Switch")
    print(f"  Search for the trade NOW, then press ENTER when done.")
    print(f"{_SEP}{Style.RESET_ALL}\n")


class TradeManager:
    def __init__(self, cfg: "Config", client: "TwitchClient") -> None:
        self._cfg = cfg
        self._client = client
        self._queue_event = asyncio.Event()
        self._trade_event = asyncio.Event()
        self._queue_id: str = "?"
        self._trade_pokemon: str = "?"

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------

    def register(self) -> None:
        """Register the IRC message handler. Call once after connect."""
        self._client.add_message_handler(self._on_message)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def run_team(self, pokemon_list: list["Pokemon"]) -> None:
        """Trade every Pokemon in the list sequentially."""
        total = len(pokemon_list)
        for idx, mon in enumerate(pokemon_list, start=1):
            print(
                f"\n{Fore.BLUE}[{idx}/{total}] Submitting: "
                f"{mon.nickname} ({mon.species}){Style.RESET_ALL}"
            )
            await self._trade_one(mon)

            if idx < total:
                delay = self._cfg.inter_trade_delay
                print(
                    f"\n{Fore.CYAN}[COOLDOWN] Waiting {delay:.0f}s "
                    f"before next Pokemon…{Style.RESET_ALL}"
                )
                await asyncio.sleep(delay)

        print(f"\n{Fore.GREEN}All {total} Pokemon submitted successfully!{Style.RESET_ALL}")

    # ------------------------------------------------------------------
    # Per-Pokemon trade flow
    # ------------------------------------------------------------------

    async def _trade_one(self, mon: "Pokemon") -> None:
        self._queue_event.clear()
        self._trade_event.clear()

        # Step 1 — post Showdown block to chat (one line per message)
        print(f"{Fore.CYAN}Posting to chat…{Style.RESET_ALL}")
        for line in mon.lines:
            await self._client.send_chat(line)
            await asyncio.sleep(self._cfg.line_send_delay)

        # Step 2 — whisper trade code
        await asyncio.sleep(self._cfg.post_whisper_delay)
        await self._client.send_whisper(self._cfg.trade_code)

        # Step 3 — wait for queue join confirmation
        print(f"{Fore.CYAN}Waiting for queue confirmation…{Style.RESET_ALL}")
        try:
            await asyncio.wait_for(self._queue_event.wait(), timeout=30.0)
            print(
                f"{Fore.GREEN}[QUEUE] Joined! ID={self._queue_id}{Style.RESET_ALL}"
            )
        except asyncio.TimeoutError:
            print(
                f"{Fore.RED}[TIMEOUT] No queue confirmation in 30s. "
                f"Is the bot active? Continuing to wait for trade start anyway…{Style.RESET_ALL}"
            )

        # Step 4 — wait for "Initializing trade"
        print(f"{Fore.CYAN}Waiting for trade to be initialized (may take a while)…{Style.RESET_ALL}")
        try:
            await asyncio.wait_for(
                self._trade_event.wait(), timeout=self._cfg.trade_timeout
            )
        except asyncio.TimeoutError:
            print(
                f"{Fore.RED}[TIMEOUT] Trade never started after "
                f"{self._cfg.trade_timeout:.0f}s. Skipping this Pokemon.{Style.RESET_ALL}"
            )
            return

        # Step 5 — alert user
        _alert_sound()
        _trade_ready_banner(self._trade_pokemon, self._cfg.trade_code)

        # Step 6 — wait for user to complete the trade on the Switch
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, sys.stdin.readline)
        print(f"{Fore.GREEN}[DONE] Trade confirmed.{Style.RESET_ALL}")

    # ------------------------------------------------------------------
    # IRC message handler
    # ------------------------------------------------------------------

    async def _on_message(self, sender: str, channel: str, text: str) -> None:
        username = self._cfg.username.lower()
        lower = text.lower()

        # Queue join: "@kaastre: Added to the LinkTrade queue, unique ID: 1245. Current Position: 3"
        if username in lower and "added to the linktrade queue" in lower:
            m = re.search(r"unique id[:\s]+(\d+)", text, re.IGNORECASE)
            self._queue_id = m.group(1) if m else "?"
            pos_m = re.search(r"current position[:\s]+(\d+)", text, re.IGNORECASE)
            position = pos_m.group(1) if pos_m else "?"
            print(
                f"\n{Fore.GREEN}[BOT] Queue joined — "
                f"ID={self._queue_id}, Position={position}{Style.RESET_ALL}"
            )
            self._queue_event.set()

        # Trade start: "@kaastre (ID: 1245): Initializing trade (PENATRATOR) with you."
        if username in lower and "initializing trade" in lower:
            m = re.search(r"initializing trade\s*\(([^)]+)\)", text, re.IGNORECASE)
            self._trade_pokemon = m.group(1) if m else "?"
            self._trade_event.set()
