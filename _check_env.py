from dotenv import load_dotenv
import os
load_dotenv()

token = os.getenv("TWITCH_OAUTH_TOKEN", "")
username = os.getenv("TWITCH_USERNAME", "")
client_id = os.getenv("TWITCH_CLIENT_ID", "")

token_status = "NOT SET / still placeholder"
if token and token != "oauth:your_token_here":
    token_status = f"SET ({len(token)} chars, starts with 'oauth:'={token.startswith('oauth:')})"

print(f"TWITCH_USERNAME    = {username}")
print(f"TWITCH_CLIENT_ID   = {client_id[:6]}... (rest redacted)")
print(f"TWITCH_OAUTH_TOKEN = {token_status}")
print(f"TRADE_CODE         = {os.getenv('TRADE_CODE', 'NOT SET')}")
print(f"BOT_USERNAME       = {os.getenv('BOT_USERNAME', 'NOT SET')}")
