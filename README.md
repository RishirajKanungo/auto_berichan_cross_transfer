# Berichan Auto Cross-Transfer

Automates trading a full Pokemon Showdown team through the [BerichanDev Twitch channel](https://www.twitch.tv/berichandev).

**What it does:**
1. You paste your Showdown team export.
2. The script posts each Pokemon's block to the Twitch chat and whispers the trade code to BerichanBot automatically.
3. It monitors the chat and beeps + prints a banner when it's your turn.
4. You do the actual trade on your Switch. Press ENTER when done.
5. It waits the cooldown and moves to the next Pokemon.

---

## Setup

### 1. Install Python 3.11+
Download from [python.org](https://www.python.org/downloads/). During install, check **"Add Python to PATH"**.

### 2. Install dependencies
```
pip install -r requirements.txt
```

### 3. Create a Twitch Developer App
1. Go to [dev.twitch.tv/console](https://dev.twitch.tv/console) → **Register Your Application**
2. Set **OAuth Redirect URL** to `http://localhost:3000`
3. Copy the **Client ID**

### 4. Run the auth setup (one time)
```
python setup_auth.py
```
This opens your browser to authorize the app and writes your token to `.env`.

### 5. Edit `.env`
```
cp .env.example .env
```
Key settings to verify:
| Variable | Default | Notes |
|---|---|---|
| `TRADE_CODE` | `24932000` | Your 8-digit Link Trade code in Scarlet/Violet |
| `BOT_USERNAME` | `BerichanBot` | Verify on the live stream — may be `Bot_RocketGrunt` |
| `INTER_TRADE_DELAY` | `120` | Seconds between Pokemon (2 min is safe) |

---

## Usage

### Desktop app (recommended)

A Windows GUI wraps the whole flow so you're not tied to the terminal:

```
python -m src.gui
```
or double-run `run_gui.ps1`.

From the app you can:
- Pick the game, paste or **Load file…** a team (it shows the live parsed count).
- **Start / Stop** trading at any time — the window stays responsive while it waits.
- Click the big **Trade Done** button (instead of pressing ENTER) when each trade finishes.
- Open **⚙ Settings** to edit Twitch username/Client ID/token (with a one-click
  **Re-authenticate…** button), channel, bot, trade code, and all timing values —
  no more editing `.env` by hand.
- Choose the **ready sound** (three soft built-in chimes or your own `.wav`/`.mp3`),
  set its **volume**, and **Test** it. This replaces the old harsh triple beep.

Settings are saved to `%APPDATA%\BerichanCrossTransfer\settings.json` (migrated
automatically from your existing `.env` on first launch).

### Terminal (CLI)

**Interactive (paste team):**
```
python -m src.main
```

**From a file:**
```
python -m src.main team.txt
```

**Override trade code for this run:**
```
python -m src.main --code 87654321
```

When it's your turn you'll hear 3 beeps and see:
```
══════════════════════════════════════════════════════════════
  TRADE READY: PENATRATOR
  Use code   : 24932000  on your Switch
  Search for the trade NOW, then press ENTER when done.
══════════════════════════════════════════════════════════════
```

---

## Showdown format example

Paste the export exactly as Pokemon Showdown generates it:

```
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

Grimmsnarl (M) @ Light Clay
Ability: Prankster
...
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Whisper not sending | Ensure your Twitch account has phone verification enabled |
| Bot username wrong | Check the live stream — the bot may be `Bot_RocketGrunt` instead of `BerichanBot`. Update `BOT_USERNAME` in `.env` |
| No queue confirmation | The bot may be offline. The script will still wait for "Initializing trade" |
| Token expired | Re-run `python setup_auth.py` |

---

## Phase 2 — Controller automation (planned)

The long-term goal is to automate the Switch button presses for the Link Trade itself so you're fully hands-off. The best approach on Windows is a **Raspberry Pi Zero running [nxbt](https://github.com/Brikwerk/nxbt)** (emulates a Pro Controller over Bluetooth), controlled over the local network by this script. Arduino/Teensy USB controller emulators are an alternative. This is not yet implemented.
