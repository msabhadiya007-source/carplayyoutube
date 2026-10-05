import React, { useEffect, useRef, useState, useLayoutEffect } from "react";

const RATIO = 16 / 9;

// Compute the stage (iframe wrapper) dimensions for a given fit mode.
function computeStage(cw, ch, mode) {
  if (!cw || !ch) return { w: cw, h: ch };
  const containerRatio = cw / ch;
  let w, h;
  if (mode === "fit") {
    // contain: whole video visible (letterbox)
    if (containerRatio > RATIO) {
      h = ch;
      w = ch * RATIO;
    } else {
      w = cw;
      h = cw / RATIO;
    }
  } else {
    // cover: fill area, crop overflow
    if (containerRatio > RATIO) {
      w = cw;
      h = cw / RATIO;
    } else {
      h = ch;
      w = ch * RATIO;
    }
    if (mode === "crop") {
      w *= 1.12;
      h *= 1.12;
    }
  }
  return { w: Math.round(w), h: Math.round(h) };
}

export default function VideoPlayer({ containerId, fitMode, hasVideo }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [stage, setStage] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setStage(computeStage(size.w, size.h, fitMode));
  }, [size, fitMode]);

  return (
    <div
      ref={containerRef}
      data-testid="video-player-container"
      className="absolute inset-0 overflow-hidden flex items-center justify-center bg-black"
    >
      <div
        className="relative"
        style={{
          width: stage.w || "100%",
          height: stage.h || "100%",
          pointerEvents: "none",
        }}
      >
        {/* YT API replaces this node with an iframe filling the stage */}
        <div id={containerId} style={{ width: "100%", height: "100%" }} />
      </div>

      {!hasVideo && (
        <div
          className="absolute inset-0"
          style={{ background: "var(--bg-base)" }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
