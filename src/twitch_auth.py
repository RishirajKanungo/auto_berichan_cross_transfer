"""
Reusable Twitch OAuth (implicit grant) helper.

Opens the Twitch authorization page in the browser and runs a tiny local
HTTP server to capture the access token from the redirect fragment. Used by
the GUI's "Re-authenticate" button and available to scripts.

obtain_token() is blocking; call it from a worker thread / executor so it
doesn't freeze a UI event loop.
"""

from __future__ import annotations

import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

REDIRECT_PORT = 3000
REDIRECT_URI = f"http://localhost:{REDIRECT_PORT}"
SCOPES = "chat:read chat:edit user:manage:whispers"

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
          "<h2>&#9989; Token captured!</h2><p>You can close this tab and return to the app.</p>";
      });
  } else {
    document.body.innerHTML = "<h2>&#10060; No token found.</h2>";
  }
</script>
</body>
</html>
"""


def authorize_url(client_id: str, scopes: str = SCOPES) -> str:
    return (
        "https://id.twitch.tv/oauth2/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={REDIRECT_URI}"
        "&response_type=token"
        f"&scope={scopes.replace(' ', '+')}"
    )


def obtain_token(
    client_id: str, scopes: str = SCOPES, timeout: float = 180.0
) -> str | None:
    """
    Run the browser OAuth flow and return the raw access token (no 'oauth:'
    prefix), or None on timeout. Blocking.
    """
    captured: dict[str, str] = {}
    done = threading.Event()

    class _Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urlparse(self.path)
            if parsed.path == "/":
                body = _CAPTURE_PAGE.encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            elif parsed.path == "/callback":
                token = parse_qs(parsed.query).get("token", [None])[0]
                if token:
                    captured["token"] = token
                self.send_response(200)
                self.send_header("Content-Length", "2")
                self.end_headers()
                self.wfile.write(b"OK")
                done.set()

        def log_message(self, *_):
            pass

    server = HTTPServer(("localhost", REDIRECT_PORT), _Handler)
    serve_thread = threading.Thread(target=server.serve_forever, daemon=True)
    serve_thread.start()

    try:
        webbrowser.open(authorize_url(client_id, scopes))
        done.wait(timeout=timeout)
    finally:
        server.shutdown()
        server.server_close()

    return captured.get("token")
