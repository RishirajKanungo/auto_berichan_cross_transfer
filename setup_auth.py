"""
One-time setup: obtain a Twitch OAuth token and write it to .env.

Steps this script performs:
  1. Ask for your Twitch Client ID (from dev.twitch.tv/console).
  2. Open a browser to the Twitch authorization page.
  3. Start a local HTTP server that captures the token from the redirect.
  4. Write TWITCH_OAUTH_TOKEN and TWITCH_CLIENT_ID to .env.

Required scopes:
  chat:read        — read channel chat
  chat:edit        — send chat messages
  user:manage:whispers — send whispers via Helix API

Run once:
    python setup_auth.py
"""

from __future__ import annotations

import os
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from dotenv import load_dotenv
load_dotenv()

REDIRECT_PORT = 3000
REDIRECT_URI = f"http://localhost:{REDIRECT_PORT}"
SCOPES = "chat:read chat:edit user:manage:whispers"

# Minimal HTML page that pulls the token from the URL fragment (#access_token=...)
# and GETs /callback?token=<value> so our server can capture it.
_CAPTURE_PAGE = """\
<!DOCTYPE html>
<html>
<head><title>Twitch Auth</title></head>
<body>
<p>Capturing token…</p>
<script>
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get("access_token");
  if (token) {
    fetch("/callback?token=" + encodeURIComponent(token))
      .then(() => {
        document.body.innerHTML =
          "<h2>✅ Token captured!</h2><p>You can close this tab.</p>";
      });
  } else {
    document.body.innerHTML = "<h2>❌ No token found.</h2>";
  }
</script>
</body>
</html>
"""

_captured_token: str | None = None
_server_ready = threading.Event()


class _Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        global _captured_token
        parsed = urlparse(self.path)

        if parsed.path == "/":
            # Serve the capture page
            body = _CAPTURE_PAGE.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        elif parsed.path == "/callback":
            qs = parse_qs(parsed.query)
            token = qs.get("token", [None])[0]
            if token:
                _captured_token = token
            body = b"OK"
            self.send_response(200)
            self.send_header("Content-Length", "2")
            self.end_headers()
            self.wfile.write(body)
            # Signal the main thread that we're done
            threading.Thread(target=self.server.shutdown, daemon=True).start()

    def log_message(self, *_):
        pass  # silence default access log


def _run_server() -> None:
    server = HTTPServer(("localhost", REDIRECT_PORT), _Handler)
    _server_ready.set()
    server.serve_forever()


def _find_or_prompt_env(key: str, prompt: str) -> str:
    existing = os.getenv(key, "")
    if existing:
        print(f"  {key} already set in environment — using existing value.")
        return existing
    return input(prompt).strip()


def _write_env(path: Path, updates: dict[str, str]) -> None:
    lines: list[str] = []
    existing_keys: set[str] = set()

    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if stripped and not stripped.startswith("#"):
                k = stripped.split("=", 1)[0]
                if k in updates:
                    lines.append(f"{k}={updates[k]}")
                    existing_keys.add(k)
                    continue
            lines.append(line)

    for k, v in updates.items():
        if k not in existing_keys:
            lines.append(f"{k}={v}")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    env_path = Path(".env")

    print("=== Berichan Auto Cross-Transfer — Auth Setup ===\n")
    print("You need a Twitch Developer App. If you don't have one:")
    print("  1. Go to https://dev.twitch.tv/console")
    print("  2. Click 'Register Your Application'")
    print("  3. Set OAuth Redirect URL to: http://localhost:3000")
    print("  4. Copy the Client ID\n")

    client_id = _find_or_prompt_env("TWITCH_CLIENT_ID", "Paste your Client ID: ")
    username = _find_or_prompt_env("TWITCH_USERNAME", "Your Twitch username (lowercase): ").lower()

    # Start local capture server in a background thread
    server_thread = threading.Thread(target=_run_server, daemon=True)
    server_thread.start()
    _server_ready.wait()

    auth_url = (
        "https://id.twitch.tv/oauth2/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={REDIRECT_URI}"
        "&response_type=token"
        f"&scope={SCOPES.replace(' ', '+')}"
    )

    print(f"\nOpening browser for Twitch authorization…")
    print(f"If it doesn't open, visit:\n  {auth_url}\n")
    webbrowser.open(auth_url)

    print("Waiting for authorization (complete in your browser)…")
    server_thread.join(timeout=120)

    if not _captured_token:
        print("\n[ERROR] No token received within 2 minutes. Exiting.")
        return

    print("\n[OK] Token received!")

    updates = {
        "TWITCH_USERNAME": username,
        "TWITCH_CLIENT_ID": client_id,
        "TWITCH_OAUTH_TOKEN": f"oauth:{_captured_token}",
    }
    _write_env(env_path, updates)
    print(f"Written to {env_path.resolve()}")
    print("\nNext steps:")
    print("  1. Edit .env to set TRADE_CODE, BOT_USERNAME, etc.")
    print("  2. Run: python -m src.main")


if __name__ == "__main__":
    main()
