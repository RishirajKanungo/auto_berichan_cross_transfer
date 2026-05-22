"""
Quick connection test:
- Connects to Twitch IRC and joins #berichandev
- Resolves user IDs (required for whispers)
- Reads chat for 10 seconds so we can see bot usernames in action
- Exits cleanly
"""
import asyncio
import sys
sys.path.insert(0, ".")
from src.config import Config
from src.twitch_client import TwitchClient


async def main():
    cfg = Config.from_env()
    client = TwitchClient(cfg)

    seen_senders = set()

    async def on_message(sender, channel, text):
        if sender not in seen_senders:
            seen_senders.add(sender)
            print(f"  [new sender] @{sender}: {text[:80]}")
        else:
            print(f"  @{sender}: {text[:80]}")

    client.add_message_handler(on_message)
    await client.connect()

    print("\nListening to chat for 15 seconds...")
    print("(Watch for bot usernames sending queue/trade messages)\n")
    listen_task = asyncio.create_task(client.listen())
    await asyncio.sleep(15)
    listen_task.cancel()
    await asyncio.gather(listen_task, return_exceptions=True)
    await client.disconnect()
    print(f"\nDone. Unique senders seen: {sorted(seen_senders)}")

asyncio.run(main())
