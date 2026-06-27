"""
Main application window.

Left/top: pick the game, paste or load a team, Start / Stop.
Right/bottom: live status, progress, a big "Trade Done" button that lights up
when a trade is ready (and plays the configurable sound), and a running log.

The trade flow runs as an asyncio task on the qasync loop, so the UI stays
responsive throughout the (variable) wait for each trade.
"""

from __future__ import annotations

import asyncio
import html

from PySide6.QtCore import Qt
from PySide6.QtGui import QFont
from PySide6.QtWidgets import (
    QComboBox,
    QHBoxLayout,
    QLabel,
    QMessageBox,
    QPlainTextEdit,
    QProgressBar,
    QPushButton,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from ..config import Config
from ..games import GAME_OPTIONS
from ..team_parser import parse_team
from ..trade_manager import TradeManager
from ..twitch_client import TwitchClient
from .qt_reporter import QtReporter
from .settings_dialog import SettingsDialog
from .sound import SoundManager

_LOG_COLORS = {
    "info": "#dddddd",
    "success": "#2ecc71",
    "warn": "#f1c40f",
    "error": "#e74c3c",
}


class MainWindow(QWidget):
    def __init__(self) -> None:
        super().__init__()
        self._cfg = Config.load()
        self._sound = SoundManager()
        self._reporter = QtReporter(self)
        self._trade_task: asyncio.Task | None = None

        self.setWindowTitle("Berichan Auto Cross-Transfer")
        self.resize(820, 640)
        self._build_ui()
        self._connect_reporter()
        self._set_running(False)
        self._refresh_parse_count()

    # ------------------------------------------------------------------
    # UI
    # ------------------------------------------------------------------

    def _build_ui(self) -> None:
        root = QVBoxLayout(self)

        # --- header ---
        header = QHBoxLayout()
        title = QLabel("Berichan Auto Cross-Transfer")
        title.setFont(QFont("Segoe UI", 14, QFont.Bold))
        header.addWidget(title)
        header.addStretch()
        self.settings_btn = QPushButton("⚙ Settings")
        self.settings_btn.clicked.connect(self._open_settings)
        header.addWidget(self.settings_btn)
        root.addLayout(header)

        # --- game + controls row ---
        controls = QHBoxLayout()
        controls.addWidget(QLabel("Game:"))
        self.game_combo = QComboBox()
        for opt in GAME_OPTIONS:
            self.game_combo.addItem(f"{opt.label}  ({opt.command})", opt.command)
        controls.addWidget(self.game_combo)
        controls.addStretch()
        self.load_btn = QPushButton("Load file…")
        self.load_btn.clicked.connect(self._load_team_file)
        controls.addWidget(self.load_btn)
        self.start_btn = QPushButton("▶ Start Trading")
        self.start_btn.clicked.connect(self._on_start)
        controls.addWidget(self.start_btn)
        self.stop_btn = QPushButton("■ Stop")
        self.stop_btn.clicked.connect(self._on_stop)
        controls.addWidget(self.stop_btn)
        root.addLayout(controls)

        # --- team input ---
        root.addWidget(QLabel("Paste your Pokémon Showdown team:"))
        self.team_input = QPlainTextEdit()
        self.team_input.setPlaceholderText(
            "Paste an exported Showdown team here, or use “Load file…”."
        )
        self.team_input.setFont(QFont("Consolas", 10))
        self.team_input.textChanged.connect(self._refresh_parse_count)
        root.addWidget(self.team_input, stretch=2)
        self.parse_label = QLabel("")
        root.addWidget(self.parse_label)

        # --- status panel ---
        self.status_label = QLabel("Idle")
        self.status_label.setFont(QFont("Segoe UI", 12, QFont.Bold))
        root.addWidget(self.status_label)

        self.progress = QProgressBar()
        self.progress.setTextVisible(True)
        self.progress.setFormat("%v / %m Pokémon")
        root.addWidget(self.progress)

        self.done_btn = QPushButton("✓ Trade Done — next Pokémon")
        self.done_btn.setMinimumHeight(48)
        self.done_btn.setStyleSheet(
            "QPushButton:enabled { background-color: #27ae60; color: white;"
            " font-size: 15px; font-weight: bold; border-radius: 6px; }"
        )
        self.done_btn.clicked.connect(self._on_trade_done)
        root.addWidget(self.done_btn)

        # --- log ---
        root.addWidget(QLabel("Log:"))
        self.log_view = QTextEdit()
        self.log_view.setReadOnly(True)
        self.log_view.setFont(QFont("Consolas", 9))
        self.log_view.setStyleSheet("background-color: #1e1e1e;")
        root.addWidget(self.log_view, stretch=2)

    def _connect_reporter(self) -> None:
        r = self._reporter
        r.log_message.connect(self._append_log)
        r.status_changed.connect(self.status_label.setText)
        r.pokemon_started.connect(self._on_pokemon_started)
        r.queue_joined_sig.connect(
            lambda qid, pos: self._append_log(
                f"[BOT] Queue joined — ID={qid}, Position={pos}", "success"
            )
        )
        r.trade_ready_sig.connect(self._on_trade_ready)
        r.pokemon_finished.connect(self._on_pokemon_finished)
        r.cooldown_sig.connect(self._on_cooldown)
        r.team_finished.connect(self._on_team_finished)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _append_log(self, message: str, level: str = "info") -> None:
        color = _LOG_COLORS.get(level, _LOG_COLORS["info"])
        safe = html.escape(message)
        self.log_view.append(f'<span style="color:{color};">{safe}</span>')

    def _refresh_parse_count(self) -> None:
        count = len(parse_team(self.team_input.toPlainText()))
        self.parse_label.setText(
            f"Parsed: {count} Pokémon" if count else "No Pokémon parsed yet."
        )

    def _set_running(self, running: bool) -> None:
        self.start_btn.setEnabled(not running)
        self.stop_btn.setEnabled(running)
        self.team_input.setReadOnly(running)
        self.load_btn.setEnabled(not running)
        self.game_combo.setEnabled(not running)
        self.settings_btn.setEnabled(not running)
        if not running:
            self.done_btn.setEnabled(False)

    # ------------------------------------------------------------------
    # Reporter slots
    # ------------------------------------------------------------------

    def _on_pokemon_started(self, index: int, total: int, nick: str, species: str) -> None:
        self.progress.setMaximum(total)
        self.progress.setValue(index - 1)
        label = nick if nick == species else f"{nick} ({species})"
        self._append_log(f"[{index}/{total}] Submitting: {label}", "info")

    def _on_trade_ready(self, pokemon: str, trade_code: str) -> None:
        self._append_log(
            f"TRADE READY: {pokemon} — use code {trade_code} on your Switch, "
            f"then click “Trade Done”.",
            "warn",
        )
        self.done_btn.setEnabled(True)
        self._sound.play(self._cfg.sound_path, self._cfg.sound_volume, self._cfg.sound_enabled)

    def _on_pokemon_finished(self, index: int, total: int) -> None:
        self.progress.setValue(index)
        self.done_btn.setEnabled(False)
        self._append_log("[DONE] Trade confirmed.", "success")

    def _on_cooldown(self, remaining: float, total: float) -> None:
        if remaining > 0:
            self.status_label.setText(f"Cooldown: {remaining:.0f}s until next Pokémon…")
        else:
            self.status_label.setText("Cooldown complete.")

    def _on_team_finished(self, total: int) -> None:
        self._append_log(f"All {total} Pokémon submitted successfully!", "success")
        self.status_label.setText("Done 🎉")

    # ------------------------------------------------------------------
    # Actions
    # ------------------------------------------------------------------

    def _open_settings(self) -> None:
        dlg = SettingsDialog(self._cfg, self._sound, self)
        dlg.exec()
        # Config is edited in place and saved by the dialog; nothing else needed.

    def _load_team_file(self) -> None:
        from PySide6.QtWidgets import QFileDialog

        path, _ = QFileDialog.getOpenFileName(
            self, "Load team", "", "Text files (*.txt);;All files (*)"
        )
        if path:
            try:
                with open(path, "r", encoding="utf-8") as fh:
                    self.team_input.setPlainText(fh.read())
            except OSError as exc:
                QMessageBox.warning(self, "Load failed", str(exc))

    def _on_trade_done(self) -> None:
        self.done_btn.setEnabled(False)
        self._reporter.confirm_done()

    def _on_start(self) -> None:
        errors = self._cfg.validate()
        if errors:
            QMessageBox.warning(
                self,
                "Missing settings",
                "Please set the following in Settings first:\n  - "
                + "\n  - ".join(errors),
            )
            self._open_settings()
            return

        pokemon_list = parse_team(self.team_input.toPlainText())
        if not pokemon_list:
            QMessageBox.warning(
                self, "No Pokémon", "No Pokémon were parsed from the team text."
            )
            return

        self._cfg.trade_command = self.game_combo.currentData()
        self._set_running(True)
        self.log_view.clear()
        self._append_log(
            f"Starting: {len(pokemon_list)} Pokémon → #{self._cfg.channel} "
            f"(game {self._cfg.trade_command})",
            "info",
        )
        self._trade_task = asyncio.ensure_future(self._run_trades(pokemon_list))

    def _on_stop(self) -> None:
        if self._trade_task and not self._trade_task.done():
            self._append_log("Stopping…", "warn")
            self._trade_task.cancel()

    async def _run_trades(self, pokemon_list) -> None:
        client = TwitchClient(self._cfg)
        manager = TradeManager(self._cfg, client, self._reporter)
        manager.register()
        listen_task: asyncio.Task | None = None
        try:
            self.status_label.setText("Connecting to Twitch…")
            await client.connect()
            listen_task = asyncio.ensure_future(client.listen())
            await manager.run_team(pokemon_list)
        except asyncio.CancelledError:
            self.status_label.setText("Stopped.")
            self._append_log("Trading stopped.", "warn")
        except Exception as exc:  # noqa: BLE001 - surface any runtime failure
            self.status_label.setText("Error.")
            self._append_log(f"[ERROR] {exc}", "error")
            QMessageBox.critical(self, "Trade error", str(exc))
        finally:
            if listen_task:
                listen_task.cancel()
                await asyncio.gather(listen_task, return_exceptions=True)
            await client.disconnect()
            self._set_running(False)
            self._trade_task = None
