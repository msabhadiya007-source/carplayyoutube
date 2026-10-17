import React from "react";
import { Link } from "react-router-dom";
import { X, Car, Crop, Maximize2, Square, Trash2, History, Monitor, LogIn, LogOut, UserCircle2 } from "lucide-react";

const FIT_MODES = [
  { id: "fit", label: "Fit", icon: Square, hint: "Whole video" },
  { id: "fill", label: "Fill", icon: Maximize2, hint: "Fill area" },
  { id: "crop", label: "Crop", icon: Crop, hint: "Max screen" },
];

const QUALITIES = ["auto", "low", "medium", "high"];

export default function SettingsPanel({
  open,
  carMode,
  fitMode,
  autoplayNext,
  prefs,
  onSetPref,
  user,
  onSignIn,
  onSignOut,
  volume,
  onClose,
  onToggleCarMode,
  onSetFitMode,
  onToggleAutoplay,
  onVolume,
  onClearQueue,
  onClearRecent,
}) {
  return (
    <>
      <div
        className={`absolute inset-0 z-40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        data-testid="settings-panel"
        className={`absolute top-0 right-0 bottom-0 z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          width: "min(440px, 92vw)",
          background: "var(--bg-surface-1)",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <h2 className="font-display text-xl font-semibold">Settings</h2>
          <button
            data-testid="settings-close-btn"
            aria-label="Close settings"
            onClick={onClose}
            className="flex items-center justify-center rounded-full transition-transform active:scale-90"
            style={{ width: 44, height: 44, background: "rgba(255,255,255,0.06)" }}
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-6">
          <AccountRow user={user} onSignIn={onSignIn} onSignOut={onSignOut} />

          {/* Car Mode */}
          <Row label="Car Mode" hint="Maximize player & controls">
            <ToggleSwitch testId="setting-carmode" checked={carMode} onChange={onToggleCarMode} />
          </Row>

          {/* Fit mode segmented */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: "var(--text-secondary)" }}>
              Video Fit
            </p>
            <div className="grid grid-cols-3 gap-2">
              {FIT_MODES.map((m) => {
                const Icon = m.icon;
                const active = fitMode === m.id;
                return (
                  <button
                    key={m.id}
                    data-testid={`fit-mode-${m.id}`}
                    onClick={() => onSetFitMode(m.id)}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl transition-transform active:scale-95"
                    style={{
                      background: active ? "var(--accent)" : "var(--bg-surface-2)",
                      color: active ? "#050507" : "#fff",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <Icon size={22} />
                    <span className="text-sm font-medium">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Autoplay next */}
          <Row label="Autoplay Next" hint="Play next queue item when a video ends">
            <ToggleSwitch testId="setting-autoplay" checked={autoplayNext} onChange={onToggleAutoplay} />
          </Row>

          <Row
            label="Autoplay Similar"
            hint={user ? "When the queue ends, play a similar video" : "Sign in to use (needs search)"}
          >
            <ToggleSwitch
              testId="setting-autoplay-related"
              checked={!!user && prefs.autoplayRelated}
              disabled={!user}
              onChange={(v) => onSetPref("autoplayRelated", v)}
            />
          </Row>

          <Row label="Ask to Add to Queue" hint="Prompt when playing a video not in your queue">
            <ToggleSwitch
              testId="setting-prompt-add"
              checked={prefs.promptAddToQueue}
              onChange={(v) => onSetPref("promptAddToQueue", v)}
            />
          </Row>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: "var(--text-secondary)" }}>
              Preferred Quality
            </p>
            <div className="grid grid-cols-4 gap-2">
              {QUALITIES.map((q) => {
                const active = prefs.quality === q;
                return (
                  <button
                    key={q}
                    data-testid={`quality-${q}`}
                    onClick={() => onSetPref("quality", q)}
                    className="h-12 rounded-xl text-sm font-medium capitalize transition-transform active:scale-95"
                    style={{
                      background: active ? "var(--accent)" : "var(--bg-surface-2)",
                      color: active ? "#050507" : "#fff",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {q}
                  </button>
                );
              })}
            </div>
            <p data-testid="quality-disclaimer" className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
              Sent to YouTube as a preference only. YouTube may pick a different quality based on your connection and screen size.
            </p>
          </div>

          {/* Volume */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-medium">Volume</p>
              <span className="font-mono-nums text-sm" style={{ color: "var(--text-secondary)" }}>
                {volume}%
              </span>
            </div>
            <input
              data-testid="setting-volume"
              className="cp-range w-full"
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => onVolume(parseInt(e.target.value, 10))}
              aria-label="Default volume"
            />
          </div>

          {/* Theme (dark only, informational) */}
          <Row label="Theme" hint="Dark automotive (fixed)">
            <span className="text-sm px-3 py-1 rounded-full" style={{ background: "var(--bg-surface-2)", color: "var(--text-secondary)" }}>
              Dark
            </span>
          </Row>

          {/* Experimental: isolated Screen Size Mode (additive, does not change existing behavior) */}
          <Link
            to="/screen-size"
            data-testid="open-screen-size-mode"
            onClick={onClose}
            className="w-full flex items-center justify-between gap-2 h-14 rounded-xl px-4 text-base transition-transform active:scale-95"
            style={{ border: "1px solid rgba(0,240,255,0.35)", color: "var(--accent)" }}
          >
            <span className="flex items-center gap-2">
              <Monitor size={20} /> Screen Size Mode
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--text-secondary)" }}>
              Experimental
            </span>
          </Link>

          {/* Danger actions */}
          <div className="pt-2 space-y-3">
            <button
              data-testid="setting-clear-queue"
              onClick={onClearQueue}
              className="w-full flex items-center justify-center gap-2 h-14 rounded-xl text-base transition-transform active:scale-95"
              style={{ border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-primary)" }}
            >
              <Trash2 size={20} /> Clear Queue
            </button>
            <button
              data-testid="setting-clear-recent"
              onClick={onClearRecent}
              className="w-full flex items-center justify-center gap-2 h-14 rounded-xl text-base transition-transform active:scale-95"
              style={{ border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-primary)" }}
            >
              <History size={20} /> Clear Recently Played
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-4" style={{ minHeight: 56 }}>
      <div>
        <p className="text-base font-medium">{label}</p>
        {hint && <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function AccountRow({ user, onSignIn, onSignOut }) {
  const btn = "flex items-center gap-2 h-12 px-4 rounded-xl text-sm font-medium shrink-0 transition-transform active:scale-95";
  return (
    <div
      data-testid="settings-account"
      className="flex items-center justify-between gap-3 p-4 rounded-xl"
      style={{ background: "var(--bg-surface-2)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <UserCircle2 size={28} style={{ color: "var(--accent)" }} />
        <div className="min-w-0">
          <p data-testid="settings-account-email" className="text-base font-medium truncate">
            {user ? user.email : "Not signed in"}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {user ? "Queue & settings synced to your account" : "Queue is saved on this device only"}
          </p>
        </div>
      </div>
      {user ? (
        <button data-testid="logout-button" onClick={onSignOut} className={btn} style={{ border: "1px solid rgba(255,255,255,0.14)" }}>
          <LogOut size={18} /> Sign out
        </button>
      ) : (
        <button data-testid="settings-signin-btn" onClick={onSignIn} className={btn} style={{ background: "var(--accent)", color: "#050507" }}>
          <LogIn size={18} /> Sign in
        </button>
      )}
    </div>
  );
}

function ToggleSwitch({ checked, onChange, testId, disabled }) {
  return (
    <button
      data-testid={testId}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative rounded-full transition-colors duration-200 shrink-0 disabled:opacity-40"
      style={{
        width: 60,
        height: 34,
        background: checked ? "var(--accent)" : "rgba(255,255,255,0.14)",
      }}
    >
      <span
        className="absolute top-1 rounded-full bg-white transition-all duration-200"
        style={{ width: 26, height: 26, left: checked ? 30 : 4 }}
      />
    </button>
  );
}
