import React from "react";
import { Search, ListMusic, Settings, Car, ChevronLeft } from "lucide-react";

export default function Header({
  visible,
  shortScreen,
  carMode,
  hasVideo,
  queueCount,
  onOpenSearch,
  onOpenQueue,
  onOpenSettings,
  onToggleCarMode,
  onCloseVideo,
}) {
  return (
    <header
      data-testid="app-header"
      className={`absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 sm:px-6 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{
        height: shortScreen ? 56 : 72,
        background:
          "linear-gradient(to bottom, rgba(5,5,7,0.92) 0%, rgba(5,5,7,0.55) 60%, rgba(5,5,7,0) 100%)",
      }}
    >
      <div className="flex items-center gap-2 select-none">
        {hasVideo && (
          <button
            data-testid="close-video-btn"
            aria-label="Close video and go back"
            onClick={onCloseVideo}
            className="flex items-center justify-center rounded-full text-white transition-transform duration-150 active:scale-90 mr-1"
            style={{
              width: shortScreen ? 42 : 48,
              height: shortScreen ? 42 : 48,
              background: "rgba(26,26,32,0.7)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <ChevronLeft size={shortScreen ? 22 : 26} />
          </button>
        )}
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: shortScreen ? 30 : 36,
            height: shortScreen ? 30 : 36,
            background: "var(--accent)",
          }}
        >
          <Car size={shortScreen ? 18 : 22} color="#050507" strokeWidth={2.4} />
        </div>
        <span
          className={`font-display font-semibold tracking-tight ${
            shortScreen ? "text-base" : "text-lg sm:text-xl"
          }`}
        >
          CarPlay<span style={{ color: "var(--accent)" }}>YouTube</span>
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <HeaderButton
          testId="header-search-btn"
          label="Search"
          short={shortScreen}
          onClick={onOpenSearch}
          primary
        >
          <Search size={shortScreen ? 20 : 22} />
          {!shortScreen && <span className="hidden md:inline text-sm font-medium">Search</span>}
        </HeaderButton>

        <HeaderButton
          testId="header-queue-btn"
          label="Queue"
          short={shortScreen}
          onClick={onOpenQueue}
        >
          <ListMusic size={shortScreen ? 20 : 22} />
          {queueCount > 0 && (
            <span
              data-testid="queue-count-badge"
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold flex items-center justify-center"
              style={{ background: "var(--accent)", color: "#050507" }}
            >
              {queueCount}
            </span>
          )}
        </HeaderButton>

        <HeaderButton
          testId="header-carmode-btn"
          label={carMode ? "Exit Car Mode" : "Car Mode"}
          short={shortScreen}
          onClick={onToggleCarMode}
          active={carMode}
        >
          <Car size={shortScreen ? 20 : 22} />
        </HeaderButton>

        <HeaderButton
          testId="header-settings-btn"
          label="Settings"
          short={shortScreen}
          onClick={onOpenSettings}
        >
          <Settings size={shortScreen ? 20 : 22} />
        </HeaderButton>
      </div>
    </header>
  );
}

function HeaderButton({ children, testId, label, short, onClick, primary, active }) {
  const size = short ? 42 : 48;
  return (
    <button
      data-testid={testId}
      aria-label={label}
      onClick={onClick}
      className="relative flex items-center gap-2 px-3 rounded-full text-white transition-transform duration-150 active:scale-95"
      style={{
        height: size,
        minWidth: size,
        border: "1px solid rgba(255,255,255,0.1)",
        background: active
          ? "var(--accent)"
          : primary
          ? "rgba(255,255,255,0.06)"
          : "rgba(26,26,32,0.7)",
        color: active ? "#050507" : "#fff",
      }}
    >
      {children}
    </button>
  );
}
