import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Plus, Play, Loader2, AlertCircle } from "lucide-react";
import { searchYoutube, humanizeApiError } from "../lib/youtube";

const SUGGESTIONS = ["Arijit Singh", "Blinding Lights", "Punjabi songs", "Lofi beats", "Coldplay"];

export default function SearchOverlay({ open, shortScreen, onClose, onPlay, onAddToQueue }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextToken, setNextToken] = useState(null);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const queryRef = useRef("");

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      setNextToken(null);
      return;
    }
    queryRef.current = q.trim();
    setLoading(true);
    setError(null);
    try {
      const data = await searchYoutube(q.trim());
      setResults(data.items || []);
      setNextToken(data.nextPageToken || null);
      setSearched(true);
    } catch (err) {
      setError(humanizeApiError(err));
      setResults([]);
      setNextToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await searchYoutube(queryRef.current, nextToken);
      setResults((prev) => {
        const seen = new Set(prev.map((v) => v.videoId));
        const fresh = (data.items || []).filter((v) => !seen.has(v.videoId));
        return [...prev, ...fresh];
      });
      setNextToken(data.nextPageToken || null);
    } catch {
      /* keep existing results on load-more failure */
    } finally {
      setLoadingMore(false);
    }
  }, [nextToken, loadingMore]);

  // Debounced auto-search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      setError(null);
      setNextToken(null);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(query), 550);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  if (!open) return null;

  return (
    <div
      data-testid="search-overlay"
      className="absolute inset-0 z-50 flex flex-col"
      style={{ background: "rgba(5,5,7,0.97)", backdropFilter: "blur(16px)" }}
    >
      {/* Search header */}
      <div
        className="flex items-center gap-3 px-4 sm:px-6 border-b"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          paddingTop: shortScreen ? 10 : 16,
          paddingBottom: shortScreen ? 10 : 16,
        }}
      >
        <div
          className="flex items-center flex-1 gap-3 rounded-2xl px-4"
          style={{
            background: "var(--bg-surface-2)",
            border: "1px solid rgba(255,255,255,0.1)",
            height: shortScreen ? 52 : 64,
          }}
        >
          <Search size={shortScreen ? 22 : 26} style={{ color: "var(--text-secondary)" }} />
          <input
            ref={inputRef}
            data-testid="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch(query);
              if (e.key === "Escape") onClose();
            }}
            placeholder="Type song, artist or video..."
            className={`flex-1 bg-transparent outline-none text-white placeholder:text-[#52525A] ${
              shortScreen ? "text-lg" : "text-xl sm:text-2xl"
            } font-display`}
            autoComplete="off"
          />
          {query && (
            <button
              data-testid="search-clear-btn"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="flex items-center justify-center rounded-full transition-transform active:scale-90"
              style={{ width: 36, height: 36, background: "rgba(255,255,255,0.08)" }}
            >
              <X size={20} />
            </button>
          )}
        </div>
        <button
          data-testid="search-close-btn"
          aria-label="Close search"
          onClick={onClose}
          className="flex items-center justify-center rounded-full transition-transform active:scale-90"
          style={{
            width: shortScreen ? 52 : 64,
            height: shortScreen ? 52 : 64,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <X size={shortScreen ? 24 : 28} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 sm:px-6 py-4">
        {!query && (
          <div className="flex flex-wrap gap-3">
            <p className="w-full text-xs uppercase tracking-[0.2em] mb-1" style={{ color: "var(--text-secondary)" }}>
              Try searching
            </p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                data-testid={`suggestion-${s.replace(/\s+/g, "-").toLowerCase()}`}
                onClick={() => setQuery(s)}
                className="px-5 py-3 rounded-full text-base transition-transform active:scale-95"
                style={{ background: "var(--bg-surface-2)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div data-testid="search-loading" className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={40} className="animate-spin" style={{ color: "var(--accent)" }} />
            <p style={{ color: "var(--text-secondary)" }}>Searching YouTube...</p>
          </div>
        )}

        {error && !loading && (
          <div
            data-testid="search-error"
            className="flex flex-col items-center justify-center py-16 gap-3 text-center"
          >
            <AlertCircle size={40} style={{ color: "var(--danger)" }} />
            <p className="max-w-md text-lg">{error}</p>
          </div>
        )}

        {!loading && !error && searched && results.length === 0 && (
          <div data-testid="search-empty" className="flex flex-col items-center justify-center py-16">
            <p style={{ color: "var(--text-secondary)" }}>No videos found. Try another search.</p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <>
            <div
              data-testid="search-results"
              className="grid gap-4"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
            >
              {results.map((v) => (
                <ResultCard
                  key={v.videoId}
                  video={v}
                  onPlay={() => onPlay(v)}
                  onAdd={() => onAddToQueue(v)}
                />
              ))}
            </div>
            {nextToken && (
              <div className="flex justify-center mt-6">
                <button
                  data-testid="load-more-btn"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-8 h-14 rounded-2xl font-display font-medium transition-transform active:scale-95 disabled:opacity-60"
                  style={{ background: "var(--bg-surface-2)", border: "1px solid rgba(255,255,255,0.14)" }}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> Loading...
                    </>
                  ) : (
                    "Load more results"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResultCard({ video, onPlay, onAdd }) {
  return (
    <div
      data-testid={`search-result-${video.videoId}`}
      className="rounded-2xl overflow-hidden group"
      style={{ background: "var(--bg-surface-1)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <button
        onClick={onPlay}
        aria-label={`Play ${video.title}`}
        className="relative block w-full aspect-video overflow-hidden"
      >
        <img
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {video.duration && (
          <span
            className="absolute bottom-2 right-2 px-2 py-0.5 rounded font-mono-nums text-xs"
            style={{ background: "rgba(0,0,0,0.8)" }}
          >
            {video.duration}
          </span>
        )}
        <span
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.35)" }}
        >
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 56, height: 56, background: "var(--accent)", color: "#050507" }}
          >
            <Play size={26} fill="currentColor" />
          </span>
        </span>
      </button>
      <div className="p-3 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium leading-snug line-clamp-2">{video.title}</p>
          <p className="text-sm mt-1 truncate" style={{ color: "var(--text-secondary)" }}>
            {video.channelTitle}
            {video.publishedAt && (
              <span> · {new Date(video.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
            )}
          </p>
        </div>
        <button
          data-testid={`add-queue-${video.videoId}`}
          aria-label={`Add ${video.title} to queue`}
          onClick={onAdd}
          className="shrink-0 flex items-center justify-center rounded-full transition-transform active:scale-90"
          style={{ width: 44, height: 44, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <Plus size={22} />
        </button>
      </div>
    </div>
  );
}
