import React, { useEffect } from "react";
import { ListPlus, X } from "lucide-react";

export default function AddToQueuePrompt({ video, onAdd, onDismiss }) {
  useEffect(() => {
    if (!video) return;
    const t = setTimeout(onDismiss, 12000);
    return () => clearTimeout(t);
  }, [video, onDismiss]);

  if (!video) return null;
  return (
    <div
      data-testid="add-to-queue-prompt"
      className="absolute top-20 right-4 z-[45] flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl max-w-[min(460px,92vw)]"
      style={{ background: "rgba(26,26,32,0.92)", border: "1px solid rgba(0,240,255,0.35)", backdropFilter: "blur(16px)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">Add to your queue?</p>
        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
          {video.title}
        </p>
      </div>
      <button
        data-testid="add-to-queue-prompt-add"
        onClick={onAdd}
        className="flex items-center gap-1 h-12 px-4 rounded-xl font-semibold shrink-0 active:scale-95 transition-transform"
        style={{ background: "var(--accent)", color: "#050507" }}
      >
        <ListPlus size={18} /> Add
      </button>
      <button
        data-testid="add-to-queue-prompt-dismiss"
        aria-label="Not now"
        onClick={onDismiss}
        className="flex items-center justify-center rounded-xl shrink-0 active:scale-95 transition-transform"
        style={{ width: 48, height: 48, background: "rgba(255,255,255,0.06)" }}
      >
        <X size={20} />
      </button>
    </div>
  );
}
