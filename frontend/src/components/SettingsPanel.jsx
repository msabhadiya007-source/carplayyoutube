import React from "react";
import { X, Car, Crop, Scan, Square, Maximize2, Trash2, History } from "lucide-react";

const FIT_MODES = [
  { id: "fit", label: "Fit", icon: Square, hint: "Whole video" },
  { id: "fill", label: "Fill", icon: Maximize2, hint: "Fill area" },
  { id: "crop", label: "Crop", icon: Crop, hint: "Max screen" },
];

export default function SettingsPanel({
  open,
  carMode,
  fitMode,
  autoplayNext,
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

function ToggleSwitch({ checked, onChange, testId }) {
  return (
    <button
      data-testid={testId}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative rounded-full transition-colors duration-200 shrink-0"
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
