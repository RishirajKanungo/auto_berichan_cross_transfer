"""
Settings dialog: Twitch credentials (with one-click re-authentication),
channel/bot/trade-code, timing, and the customizable ready sound.

Editing happens on a copy; values are written back to the live Config and
persisted only when the user clicks Save.
"""

from __future__ import annotations

import asyncio

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QDialog,
    QDialogButtonBox,
    QDoubleSpinBox,
    QFileDialog,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QSlider,
    QVBoxLayout,
    QWidget,
)

from ..config import Config
from ..twitch_auth import SCOPES, obtain_token
from .sound import BUILTIN_SOUNDS, builtin_token

_CUSTOM_LABEL = "Custom file…"


class SettingsDialog(QDialog):
    def __init__(self, cfg: Config, sound_manager, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._cfg = cfg
        self._sound = sound_manager
        self.setWindowTitle("Settings")
        self.setMinimumWidth(460)

        layout = QVBoxLayout(self)
        layout.addWidget(self._build_twitch_group())
        layout.addWidget(self._build_trade_group())
        layout.addWidget(self._build_timing_group())
        layout.addWidget(self._build_sound_group())

        buttons = QDialogButtonBox(
            QDialogButtonBox.Save | QDialogButtonBox.Cancel
        )
        buttons.accepted.connect(self._on_save)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)

        self._load_from_config()

    # ------------------------------------------------------------------
    # UI construction
    # ------------------------------------------------------------------

    def _build_twitch_group(self) -> QGroupBox:
        box = QGroupBox("Twitch Account")
        form = QFormLayout(box)

        self.username_edit = QLineEdit()
        self.client_id_edit = QLineEdit()
        self.token_edit = QLineEdit()
        self.token_edit.setEchoMode(QLineEdit.Password)

        token_row = QHBoxLayout()
        token_row.addWidget(self.token_edit)
        self.reauth_btn = QPushButton("Re-authenticate…")
        self.reauth_btn.setToolTip(
            "Open Twitch in your browser to grant chat + whisper permissions "
            "and capture a fresh token automatically."
        )
        self.reauth_btn.clicked.connect(self._on_reauth_clicked)
        token_row.addWidget(self.reauth_btn)
        token_widget = QWidget()
        token_widget.setLayout(token_row)

        self.auth_status = QLabel("")
        self.auth_status.setStyleSheet("color: gray;")

        form.addRow("Username", self.username_edit)
        form.addRow("Client ID", self.client_id_edit)
        form.addRow("OAuth token", token_widget)
        form.addRow("", self.auth_status)
        form.addRow("", QLabel(f"Scopes requested: {SCOPES}"))
        return box

    def _build_trade_group(self) -> QGroupBox:
        box = QGroupBox("Channel & Trade")
        form = QFormLayout(box)
        self.channel_edit = QLineEdit()
        self.bot_edit = QLineEdit()
        self.code_edit = QLineEdit()
        form.addRow("Channel", self.channel_edit)
        form.addRow("Bot username", self.bot_edit)
        form.addRow("Trade code", self.code_edit)
        return box

    def _build_timing_group(self) -> QGroupBox:
        box = QGroupBox("Timing (seconds)")
        form = QFormLayout(box)
        self.line_delay = self._spin(0.0, 10.0, 0.1)
        self.whisper_delay = self._spin(0.0, 30.0, 0.1)
        self.inter_delay = self._spin(0.0, 600.0, 1.0)
        self.timeout = self._spin(10.0, 3600.0, 5.0)
        form.addRow("Line send delay", self.line_delay)
        form.addRow("Post-whisper delay", self.whisper_delay)
        form.addRow("Cooldown between trades", self.inter_delay)
        form.addRow("Trade start timeout", self.timeout)
        return box

    def _build_sound_group(self) -> QGroupBox:
        box = QGroupBox("Ready Sound")
        outer = QVBoxLayout(box)

        self.sound_enabled = QCheckBox("Play a sound when a trade is ready")
        outer.addWidget(self.sound_enabled)

        form = QFormLayout()
        self.sound_combo = QComboBox()
        for name in BUILTIN_SOUNDS:
            self.sound_combo.addItem(name)
        self.sound_combo.addItem(_CUSTOM_LABEL)
        self.sound_combo.currentTextChanged.connect(self._on_sound_choice_changed)
        form.addRow("Sound", self.sound_combo)

        custom_row = QHBoxLayout()
        self.custom_path = QLineEdit()
        self.custom_path.setPlaceholderText("Path to a .wav or .mp3 file")
        self.browse_btn = QPushButton("Browse…")
        self.browse_btn.clicked.connect(self._on_browse)
        custom_row.addWidget(self.custom_path)
        custom_row.addWidget(self.browse_btn)
        self.custom_widget = QWidget()
        self.custom_widget.setLayout(custom_row)
        form.addRow("File", self.custom_widget)

        vol_row = QHBoxLayout()
        self.volume_slider = QSlider(Qt.Horizontal)
        self.volume_slider.setRange(0, 100)
        self.volume_label = QLabel("50%")
        self.volume_slider.valueChanged.connect(
            lambda v: self.volume_label.setText(f"{v}%")
        )
        self.test_btn = QPushButton("Test ▶")
        self.test_btn.clicked.connect(self._on_test_sound)
        vol_row.addWidget(self.volume_slider)
        vol_row.addWidget(self.volume_label)
        vol_row.addWidget(self.test_btn)
        vol_widget = QWidget()
        vol_widget.setLayout(vol_row)
        form.addRow("Volume", vol_widget)

        outer.addLayout(form)
        return box

    @staticmethod
    def _spin(lo: float, hi: float, step: float) -> QDoubleSpinBox:
        s = QDoubleSpinBox()
        s.setRange(lo, hi)
        s.setSingleStep(step)
        s.setDecimals(1)
        return s

    # ------------------------------------------------------------------
    # Load / save
    # ------------------------------------------------------------------

    def _load_from_config(self) -> None:
        c = self._cfg
        self.username_edit.setText(c.username)
        self.client_id_edit.setText(c.client_id)
        self.token_edit.setText(c.oauth_token)
        self.channel_edit.setText(c.channel)
        self.bot_edit.setText(c.bot_username)
        self.code_edit.setText(c.trade_code)
        self.line_delay.setValue(c.line_send_delay)
        self.whisper_delay.setValue(c.post_whisper_delay)
        self.inter_delay.setValue(c.inter_trade_delay)
        self.timeout.setValue(c.trade_timeout)

        self.sound_enabled.setChecked(c.sound_enabled)
        self.volume_slider.setValue(int(round(c.sound_volume * 100)))
        self._select_sound(c.sound_path)

    def _select_sound(self, stored: str) -> None:
        """Set the combo/custom field from a stored sound preference."""
        builtin_name = None
        if not stored:
            builtin_name = next(iter(BUILTIN_SOUNDS))  # default = first
        elif stored.startswith("builtin:"):
            filename = stored[len("builtin:"):]
            for name, fn in BUILTIN_SOUNDS.items():
                if fn == filename:
                    builtin_name = name
                    break

        if builtin_name:
            self.sound_combo.setCurrentText(builtin_name)
        else:
            self.sound_combo.setCurrentText(_CUSTOM_LABEL)
            self.custom_path.setText(stored)
        self._on_sound_choice_changed(self.sound_combo.currentText())

    def _current_sound_pref(self) -> str:
        choice = self.sound_combo.currentText()
        if choice == _CUSTOM_LABEL:
            return self.custom_path.text().strip()
        return builtin_token(BUILTIN_SOUNDS[choice])

    def _on_save(self) -> None:
        c = self._cfg
        c.username = self.username_edit.text().strip().lower()
        c.client_id = self.client_id_edit.text().strip()
        c.set_token(self.token_edit.text().strip())
        c.channel = self.channel_edit.text().strip().lower()
        c.bot_username = self.bot_edit.text().strip()
        c.trade_code = self.code_edit.text().strip()
        c.line_send_delay = self.line_delay.value()
        c.post_whisper_delay = self.whisper_delay.value()
        c.inter_trade_delay = self.inter_delay.value()
        c.trade_timeout = self.timeout.value()
        c.sound_enabled = self.sound_enabled.isChecked()
        c.sound_volume = self.volume_slider.value() / 100.0
        c.sound_path = self._current_sound_pref()
        c.save()
        self.accept()

    # ------------------------------------------------------------------
    # Slots
    # ------------------------------------------------------------------

    def _on_sound_choice_changed(self, text: str) -> None:
        self.custom_widget.setEnabled(text == _CUSTOM_LABEL)

    def _on_browse(self) -> None:
        path, _ = QFileDialog.getOpenFileName(
            self, "Choose a sound", "", "Audio files (*.wav *.mp3 *.ogg)"
        )
        if path:
            self.custom_path.setText(path)

    def _on_test_sound(self) -> None:
        self._sound.play(
            self._current_sound_pref(),
            self.volume_slider.value() / 100.0,
            enabled=True,
        )

    def _on_reauth_clicked(self) -> None:
        client_id = self.client_id_edit.text().strip()
        if not client_id:
            self.auth_status.setText("Enter a Client ID first.")
            self.auth_status.setStyleSheet("color: #c0392b;")
            return
        asyncio.ensure_future(self._reauthenticate(client_id))

    async def _reauthenticate(self, client_id: str) -> None:
        self.reauth_btn.setEnabled(False)
        self.auth_status.setText("Waiting for browser authorization…")
        self.auth_status.setStyleSheet("color: gray;")
        loop = asyncio.get_event_loop()
        try:
            token = await loop.run_in_executor(None, obtain_token, client_id)
        except Exception as exc:  # noqa: BLE001 - surface any auth failure
            self.auth_status.setText(f"Auth error: {exc}")
            self.auth_status.setStyleSheet("color: #c0392b;")
            self.reauth_btn.setEnabled(True)
            return

        if token:
            self.token_edit.setText(f"oauth:{token}")
            self.auth_status.setText("✓ Token captured. Click Save to keep it.")
            self.auth_status.setStyleSheet("color: #27ae60;")
        else:
            self.auth_status.setText("No token received (timed out).")
            self.auth_status.setStyleSheet("color: #c0392b;")
        self.reauth_btn.setEnabled(True)
