import sys
sys.path.insert(0, ".")
from src.games import format_trade_message
from src.team_parser import TWITCH_MAX_CHAT_LENGTH, parse_team

COMMAND = "!tradeSV"  # change to preview another game's prefix

with open("team.txt", encoding="utf-8") as f:
    team_text = f.read()

team = parse_team(team_text)
print(f"Parsed {len(team)} Pokemon:\n")
for i, mon in enumerate(team, 1):
    label = mon.nickname if mon.nickname == mon.species else f"{mon.nickname} ({mon.species})"
    msg = format_trade_message(COMMAND, mon.chat_message)
    over = "  *** OVER TWITCH LIMIT ***" if len(msg) > TWITCH_MAX_CHAT_LENGTH else ""
    print(f"  [{i}] {label}  --  1 chat message ({len(msg)} chars){over}")
    print(f"        {msg}")
    print()
