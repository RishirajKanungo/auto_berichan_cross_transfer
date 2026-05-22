import sys
sys.path.insert(0, ".")
from src.team_parser import parse_team

with open("team.txt", encoding="utf-8") as f:
    team_text = f.read()

team = parse_team(team_text)
print(f"Parsed {len(team)} Pokemon:\n")
for i, mon in enumerate(team, 1):
    label = mon.nickname if mon.nickname == mon.species else f"{mon.nickname} ({mon.species})"
    print(f"  [{i}] {label}  --  {len(mon.lines)} lines to send to chat")
    for line in mon.lines:
        print(f"        {repr(line.strip())}")
    print()
