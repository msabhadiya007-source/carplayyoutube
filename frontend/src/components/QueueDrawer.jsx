import React, { useRef, useState } from "react";
import { X, Play, Trash2, ListMusic, ChevronUp, ChevronDown, GripVertical } from "lucide-react";

export default function QueueDrawer({
  open,
  queue,
  currentIndex,
  onClose,
  onPlayIndex,
  onRemove,
  onReorder,
  onClear,
}) {
  const dragIndex = useRef(null);
  const [overIndex, setOverIndex] = useState(null);
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
        data-testid="queue-drawer"
        className={`absolute top-0 right-0 bottom-0 z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          width: "min(440px, 90vw)",
          background: "var(--bg-surface-1)",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2">
            <ListMusic size={22} style={{ color: "var(--accent)" }} />
            <h2 className="font-display text-xl font-semibold">Queue</h2>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              ({queue.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                data-testid="queue-clear-btn"
                aria-label="Clear queue"
                onClick={onClear}
                className="flex items-center gap-1 px-3 h-11 rounded-full text-sm transition-transform active:scale-95"
                style={{ border: "1px solid rgba(255,255,255,0.12)", color: "var(--danger)" }}
              >
                <Trash2 size={18} /> Clear
              </button>
            )}
            <button
              data-testid="queue-close-btn"
              aria-label="Close queue"
              onClick={onClose}
              className="flex items-center justify-center rounded-full transition-transform active:scale-90"
              style={{ width: 44, height: 44, background: "rgba(255,255,255,0.06)" }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {queue.length === 0 ? (
            <div data-testid="queue-empty" className="flex flex-col items-center justify-center h-full px-6 text-center gap-2">
              <ListMusic size={44} style={{ color: "var(--text-secondary)" }} />
              <p style={{ color: "var(--text-secondary)" }}>
                Your queue is empty. Search and add videos to build a playlist.
              </p>
            </div>
          ) : (
            <ul>
              {queue.map((v, i) => {
                const active = i === currentIndex;
                return (
                  <li
                    key={`${v.videoId}-${i}`}
                    data-testid={`queue-item-${i}`}
                    draggable
                    onDragStart={() => {
                      dragIndex.current = i;
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (overIndex !== i) setOverIndex(i);
                    }}
                    onDragLeave={() => setOverIndex((p) => (p === i ? null : p))}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = dragIndex.current;
                      if (from !== null && from !== i) onReorder(from, i);
                      dragIndex.current = null;
                      setOverIndex(null);
                    }}
                    onDragEnd={() => {
                      dragIndex.current = null;
                      setOverIndex(null);
                    }}
                    className="flex items-center gap-2 px-3 py-3 border-b transition-colors"
                    style={{
                      borderColor: "rgba(255,255,255,0.06)",
                      background: active
                        ? "rgba(0,240,255,0.08)"
                        : overIndex === i
                        ? "rgba(255,255,255,0.05)"
                        : "transparent",
                      boxShadow: overIndex === i ? "inset 0 2px 0 var(--accent)" : "none",
                    }}
                  >
                    <span
                      data-testid={`queue-drag-${i}`}
                      className="shrink-0 cursor-grab active:cursor-grabbing touch-none"
                      style={{ color: "var(--text-secondary)" }}
                      aria-hidden="true"
                    >
                      <GripVertical size={20} />
                    </span>
                    <button
                      aria-label={`Play ${v.title}`}
                      onClick={() => onPlayIndex(i)}
                      className="relative shrink-0 rounded-lg overflow-hidden"
                      style={{ width: 84, height: 48 }}
                    >
                      <img src={v.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <span className="absolute inset-0 flex items-center justify-center" style={{ background: active ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.0)" }}>
                        {active && <Play size={20} fill="var(--accent)" color="var(--accent)" />}
                      </span>
                    </button>
                    <button
                      onClick={() => onPlayIndex(i)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p
                        className="text-[15px] font-medium leading-snug line-clamp-2"
                        style={{ color: active ? "var(--accent)" : "#fff" }}
                      >
                        {v.title}
                      </p>
                      <p className="text-sm truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {v.channelTitle}
                      </p>
                    </button>
                    <div className="shrink-0 flex flex-col">
                      <button
                        data-testid={`queue-up-${i}`}
                        aria-label={`Move ${v.title} up`}
                        disabled={i === 0}
                        onClick={() => onReorder(i, i - 1)}
                        className="flex items-center justify-center rounded-md transition-transform active:scale-90 disabled:opacity-30"
                        style={{ width: 36, height: 24 }}
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button
                        data-testid={`queue-down-${i}`}
                        aria-label={`Move ${v.title} down`}
                        disabled={i === queue.length - 1}
                        onClick={() => onReorder(i, i + 1)}
                        className="flex items-center justify-center rounded-md transition-transform active:scale-90 disabled:opacity-30"
                        style={{ width: 36, height: 24 }}
                      >
                        <ChevronDown size={18} />
                      </button>
                    </div>
                    <button
                      data-testid={`queue-remove-${i}`}
                      aria-label={`Remove ${v.title} from queue`}
                      onClick={() => onRemove(i)}
                      className="shrink-0 flex items-center justify-center rounded-full transition-transform active:scale-90"
                      style={{ width: 40, height: 40, background: "rgba(255,255,255,0.06)" }}
                    >
                      <Trash2 size={18} style={{ color: "var(--text-secondary)" }} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
