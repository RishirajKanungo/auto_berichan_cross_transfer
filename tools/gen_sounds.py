"""
Generate the bundled "ready" alert sounds as soft, non-harsh WAV files.

These replace the original winsound.Beep(1000, 250) triple beep, which is
loud and abrupt. Each sound here uses gentle attack/decay envelopes and
musical intervals so it reads as a pleasant chime rather than an alarm.

Run from the repo root:
    python tools/gen_sounds.py
"""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 44100
AMP = 0.32  # keep headroom; the app has its own volume control

OUT_DIR = Path(__file__).resolve().parent.parent / "assets" / "sounds"


def _envelope(i: int, n: int, attack: float, release: float) -> float:
    """Linear attack, exponential release — avoids clicks at start/end."""
    t = i / SAMPLE_RATE
    dur = n / SAMPLE_RATE
    if t < attack:
        a = t / attack
    else:
        a = 1.0
    # exponential decay over the whole tail
    rel = math.exp(-(t) / release)
    return a * rel


def _tone(freqs: list[float], duration: float, attack: float, release: float,
          delay: float = 0.0) -> list[float]:
    n = int(duration * SAMPLE_RATE)
    start = int(delay * SAMPLE_RATE)
    out = [0.0] * (start + n)
    for i in range(n):
        env = _envelope(i, n, attack, release)
        s = sum(math.sin(2 * math.pi * f * (i / SAMPLE_RATE)) for f in freqs)
        out[start + i] += (s / len(freqs)) * env
    return out


def _mix(*layers: list[float]) -> list[float]:
    length = max(len(l) for l in layers)
    out = [0.0] * length
    for layer in layers:
        for i, v in enumerate(layer):
            out[i] += v
    return out


def _write(name: str, samples: list[float]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    peak = max((abs(s) for s in samples), default=1.0) or 1.0
    norm = AMP / peak
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        frames = b"".join(
            struct.pack("<h", int(max(-1.0, min(1.0, s * norm)) * 32767))
            for s in samples
        )
        w.writeframes(frames)
    print(f"wrote {path} ({len(samples)/SAMPLE_RATE:.2f}s)")


def soft_chime() -> list[float]:
    # Rising perfect-fourth two-note chime (C6 -> F6), warm and short.
    return _mix(
        _tone([1046.5], 0.45, 0.012, 0.22, delay=0.0),
        _tone([1396.9], 0.55, 0.012, 0.28, delay=0.16),
    )


def gentle_bell() -> list[float]:
    # Single bell-like tone with a quiet octave + fifth overtone, long tail.
    return _tone([880.0, 1320.0, 1760.0], 1.1, 0.006, 0.45)


def marimba_pop() -> list[float]:
    # Three quick woody notes (major triad), very short release = "pop pop pop".
    return _mix(
        _tone([659.3], 0.30, 0.004, 0.10, delay=0.00),
        _tone([784.0], 0.30, 0.004, 0.10, delay=0.12),
        _tone([987.8], 0.34, 0.004, 0.12, delay=0.24),
    )


def main() -> None:
    _write("soft_chime.wav", soft_chime())
    _write("gentle_bell.wav", gentle_bell())
    _write("marimba_pop.wav", marimba_pop())


if __name__ == "__main__":
    main()
