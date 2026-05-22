import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    # Twitch credentials
    oauth_token: str = ""       # "oauth:xxxxx" format for IRC
    access_token: str = ""      # raw token (no "oauth:" prefix) for Helix API
    client_id: str = ""
    username: str = ""          # Your Twitch username, lowercase

    # Target channel and bot
    channel: str = "berichandev"
    bot_username: str = "BerichanBot"

    # Trade settings
    trade_code: str = "24932000"

    # Timing (seconds)
    line_send_delay: float = 0.6
    post_whisper_delay: float = 2.0
    inter_trade_delay: float = 120.0
    trade_timeout: float = 600.0

    @classmethod
    def from_env(cls) -> "Config":
        raw = os.getenv("TWITCH_OAUTH_TOKEN", "")
        irc_token = raw if raw.startswith("oauth:") else f"oauth:{raw}"
        access = raw.replace("oauth:", "") if raw.startswith("oauth:") else raw

        return cls(
            oauth_token=irc_token,
            access_token=access,
            client_id=os.getenv("TWITCH_CLIENT_ID", ""),
            username=os.getenv("TWITCH_USERNAME", "").lower(),
            channel=os.getenv("TWITCH_CHANNEL", "berichandev").lower(),
            bot_username=os.getenv("BOT_USERNAME", "BerichanBot"),
            trade_code=os.getenv("TRADE_CODE", "24932000"),
            line_send_delay=float(os.getenv("LINE_SEND_DELAY", "0.6")),
            post_whisper_delay=float(os.getenv("POST_WHISPER_DELAY", "2.0")),
            inter_trade_delay=float(os.getenv("INTER_TRADE_DELAY", "120.0")),
            trade_timeout=float(os.getenv("TRADE_TIMEOUT", "600.0")),
        )

    def validate(self) -> list[str]:
        """Return a list of missing/invalid field names."""
        errors = []
        if not self.access_token:
            errors.append("TWITCH_OAUTH_TOKEN")
        if not self.client_id:
            errors.append("TWITCH_CLIENT_ID")
        if not self.username:
            errors.append("TWITCH_USERNAME")
        return errors
