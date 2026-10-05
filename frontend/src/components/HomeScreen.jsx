import React from "react";
import { Search, Car, Play, History } from "lucide-react";

export default function HomeScreen({
  firstTime,
  shortScreen,
  recent,
  onOpenSearch,
  onEnterCarMode,
  onPlayRecent,
}) {
  return (
    <div
      data-testid="home-screen"
      className="absolute inset-0 z-30 flex flex-col overflow-y-auto no-scrollbar"
      style={{
        background:
          "radial-gradient(1200px 600px at 20% -10%, rgba(0,240,255,0.08), transparent 60%), var(--bg-base)",
      }}
    >
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-16">
        <div className="max-w-2xl">
          <p
            className="text-xs uppercase tracking-[0.3em] mb-4"
            style={{ color: "var(--accent)" }}
          >
            {firstTime ? "Welcome" : "CarPlayYouTube"}
          </p>
          <h1
            className={`font-display font-semibold tracking-tight leading-[1.05] ${
              shortScreen ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl lg:text-6xl"
            }`}
          >
            Your wide-screen
            <br />
            <span style={{ color: "var(--accent)" }}>YouTube</span> player.
          </h1>
          <p
            className={`mt-4 ${shortScreen ? "text-base" : "text-lg sm:text-xl"}`}
            style={{ color: "var(--text-secondary)" }}
          >
            Search YouTube and start listening. Built for cars, wide displays and
            touch — no account needed.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              data-testid="home-search-btn"
              onClick={onOpenSearch}
              className="flex items-center gap-3 rounded-2xl px-7 font-display font-medium transition-transform active:scale-95"
              style={{
                height: shortScreen ? 56 : 68,
                background: "var(--accent)",
                color: "#050507",
                fontSize: shortScreen ? 18 : 20,
              }}
            >
              <Search size={shortScreen ? 22 : 26} strokeWidth={2.4} />
              Search YouTube
            </button>
            <button
              data-testid="home-carmode-btn"
              onClick={onEnterCarMode}
              className="flex items-center gap-3 rounded-2xl px-7 font-display font-medium transition-transform active:scale-95"
              style={{
                height: shortScreen ? 56 : 68,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "#fff",
                fontSize: shortScreen ? 18 : 20,
              }}
            >
              <Car size={shortScreen ? 22 : 26} />
              Enter Car Mode
            </button>
          </div>

          {recent && recent.length > 0 && (
            <div className="mt-12">
              <div className="flex items-center gap-2 mb-4">
                <History size={18} style={{ color: "var(--text-secondary)" }} />
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--text-secondary)" }}>
                  Recently played
                </p>
              </div>
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
              >
                {recent.slice(0, 8).map((v) => (
                  <button
                    key={v.videoId}
                    data-testid={`recent-${v.videoId}`}
                    onClick={() => onPlayRecent(v)}
                    className="group text-left rounded-xl overflow-hidden transition-transform active:scale-95"
                    style={{ background: "var(--bg-surface-1)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img src={v.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <span
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.35)" }}
                      >
                        <Play size={28} fill="var(--accent)" color="var(--accent)" />
                      </span>
                    </div>
                    <p className="p-2 text-sm font-medium line-clamp-2">{v.title}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
