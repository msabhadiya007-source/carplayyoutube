import React, { useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Share2,
  Loader2,
} from "lucide-react";
import { formatTime } from "../lib/format";

export default function ControlBar({
  visible,
  shortScreen,
  isPlaying,
  loading,
  currentTime,
  duration,
  volume,
  muted,
  isFullscreen,
  currentTitle,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  onVolume,
  onToggleMute,
  onToggleFullscreen,
  onShare,
}) {
  const [showVolume, setShowVolume] = useState(false);
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const big = shortScreen ? 52 : 64;
  const mid = shortScreen ? 46 : 56;

  return (
    <div
      data-testid="control-bar"
      className={`absolute bottom-0 left-0 right-0 z-40 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{
        background:
          "linear-gradient(to top, rgba(5,5,7,0.95) 0%, rgba(5,5,7,0.7) 55%, rgba(5,5,7,0) 100%)",
        paddingTop: shortScreen ? 20 : 40,
      }}
    >
      <div
        className="px-4 sm:px-6"
        style={{ paddingBottom: shortScreen ? 10 : 18 }}
      >
        {/* Progress */}
        <div className="flex items-center gap-3 mb-2">
          <span
            data-testid="current-time"
            className="font-mono-nums text-xs sm:text-sm tabular-nums"
            style={{ color: "var(--text-secondary)", minWidth: 44, textAlign: "right" }}
          >
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 flex items-center" style={{ height: 24 }}>
            <div
              className="absolute left-0 right-0 rounded-full"
              style={{ height: 6, background: "rgba(255,255,255,0.18)" }}
            />
            <div
              className="absolute left-0 rounded-full"
              style={{ height: 6, width: `${pct}%`, background: "var(--accent)" }}
            />
            <input
              data-testid="progress-slider"
              className="cp-range absolute left-0 right-0 w-full"
              type="range"
              min={0}
              max={duration || 0}
              step={0.5}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              aria-label="Seek"
              style={{ background: "transparent" }}
            />
          </div>
          <span
            data-testid="duration-time"
            className="font-mono-nums text-xs sm:text-sm tabular-nums"
            style={{ color: "var(--text-secondary)", minWidth: 44 }}
          >
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: title */}
          <div className="flex-1 min-w-0 hidden sm:block">
            {currentTitle && (
              <p
                data-testid="now-playing-title"
                className="truncate text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {currentTitle}
              </p>
            )}
          </div>

          {/* Center: transport */}
          <div className="flex items-center justify-center gap-3 sm:gap-5">
            <CircleBtn testId="prev-btn" label="Previous video" size={mid} onClick={onPrev}>
              <SkipBack size={shortScreen ? 22 : 26} fill="currentColor" />
            </CircleBtn>

            <CircleBtn
              testId="play-pause-btn"
              label={isPlaying ? "Pause" : "Play"}
              size={big}
              onClick={onPlayPause}
              primary
            >
              {loading ? (
                <Loader2 size={shortScreen ? 26 : 30} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={shortScreen ? 26 : 30} fill="currentColor" />
              ) : (
                <Play size={shortScreen ? 26 : 30} fill="currentColor" />
              )}
            </CircleBtn>

            <CircleBtn testId="next-btn" label="Next video" size={mid} onClick={onNext}>
              <SkipForward size={shortScreen ? 22 : 26} fill="currentColor" />
            </CircleBtn>
          </div>

          {/* Right: volume + fullscreen */}
          <div className="flex-1 flex items-center justify-end gap-3">
            <div
              className="relative flex items-center"
              onMouseEnter={() => setShowVolume(true)}
              onMouseLeave={() => setShowVolume(false)}
            >
              <CircleBtn
                testId="mute-btn"
                label={muted ? "Unmute" : "Mute"}
                size={mid}
                onClick={onToggleMute}
              >
                {muted || volume === 0 ? (
                  <VolumeX size={shortScreen ? 20 : 24} />
                ) : (
                  <Volume2 size={shortScreen ? 20 : 24} />
                )}
              </CircleBtn>
              <div
                className={`items-center transition-all duration-200 overflow-hidden ${
                  showVolume ? "w-28 opacity-100 ml-2" : "w-0 opacity-0"
                } hidden md:flex`}
              >
                <input
                  data-testid="volume-slider"
                  className="cp-range w-28"
                  type="range"
                  min={0}
                  max={100}
                  value={muted ? 0 : volume}
                  onChange={(e) => onVolume(parseInt(e.target.value, 10))}
                  aria-label="Volume"
                />
              </div>
            </div>

            <CircleBtn
              testId="share-btn"
              label="Share video link"
              size={mid}
              onClick={onShare}
            >
              <Share2 size={shortScreen ? 20 : 24} />
            </CircleBtn>

            <CircleBtn
              testId="fullscreen-btn"
              label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              size={mid}
              onClick={onToggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize size={shortScreen ? 20 : 24} />
              ) : (
                <Maximize size={shortScreen ? 20 : 24} />
              )}
            </CircleBtn>
          </div>
        </div>

        {/* Mobile volume slider (always available via tap) */}
        <div className="md:hidden mt-2 flex items-center gap-3">
          <Volume2 size={18} style={{ color: "var(--text-secondary)" }} />
          <input
            data-testid="volume-slider-mobile"
            className="cp-range flex-1"
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={(e) => onVolume(parseInt(e.target.value, 10))}
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}

function CircleBtn({ children, testId, label, size, onClick, primary }) {
  return (
    <button
      data-testid={testId}
      aria-label={label}
      onClick={onClick}
      className="flex items-center justify-center rounded-full transition-transform duration-150 active:scale-90"
      style={{
        width: size,
        height: size,
        background: primary ? "var(--accent)" : "rgba(255,255,255,0.08)",
        border: primary ? "none" : "1px solid rgba(255,255,255,0.12)",
        color: primary ? "#050507" : "#fff",
      }}
    >
      {children}
    </button>
  );
}
