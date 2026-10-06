import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { storage } from "../../lib/storage";
import "./ScreenSizeMode.css";

// A safe, reliably-embeddable public test video (used only if nothing else is available).
const TEST_VIDEO_ID = "dQw4w9WgXcQ";
const PLAYER_ID = "ss-yt-player";
const RATIO = 16 / 9;

const MODES = [
  { id: "fit", label: "Fit" },
  { id: "fill", label: "Fill" },
  { id: "crop", label: "Crop" },
  { id: "wide", label: "Wide" },
  { id: "ultrawide", label: "Ultra Wide" },
  { id: "fullscreen", label: "Fullscreen" },
];

// Self-contained IFrame API loader. Native YouTube controls are retained
// (we do NOT pass controls:0 and never overlay the player).
let ssApiPromise = null;
function loadApi() {
  if (ssApiPromise) return ssApiPromise;
  ssApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve(window.YT);
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return ssApiPromise;
}

function contain(aw, ah, ratio) {
  if (aw / ah > ratio) return { w: ah * ratio, h: ah };
  return { w: aw, h: aw / ratio };
}
function cover(bw, bh, ratio) {
  if (bw / bh > ratio) return { w: bw, h: bw / ratio };
  return { w: bh * ratio, h: bh };
}

// All modes change ONLY the player container/box + the sizing of the iframe
// (box = visible area, frame = the iframe; cover modes crop via box overflow:hidden).
function computeLayout(aw, ah, mode) {
  if (!aw || !ah) return { box: { w: 0, h: 0 }, frame: { w: 0, h: 0 } };
  switch (mode) {
    case "fill": {
      return { box: { w: aw, h: ah }, frame: cover(aw, ah, RATIO) };
    }
    case "crop": {
      const f = cover(aw, ah, RATIO);
      return { box: { w: aw, h: ah }, frame: { w: f.w * 1.12, h: f.h * 1.12 } };
    }
    case "wide": {
      const box = contain(aw, ah, 21 / 9);
      return { box, frame: cover(box.w, box.h, RATIO) };
    }
    case "ultrawide": {
      const box = contain(aw, ah, 32 / 9);
      return { box, frame: cover(box.w, box.h, RATIO) };
    }
    case "fullscreen": {
      return { box: { w: aw, h: ah }, frame: contain(aw, ah, RATIO) };
    }
    case "fit":
    default: {
      const box = contain(aw, ah, RATIO);
      return { box, frame: box };
    }
  }
}

export default function ScreenSizeMode() {
  const initialVid = storage.getRecent()[0]?.videoId || TEST_VIDEO_ID;
  const [mode, setMode] = useState("fit");
  const [videoId, setVideoId] = useState(initialVid);
  const [inputId, setInputId] = useState(initialVid);
  const [area, setArea] = useState({ w: 0, h: 0 });

  const areaRef = useRef(null);
  const rootRef = useRef(null);
  const playerRef = useRef(null);

  // Initialise an isolated player instance (native controls on).
  useEffect(() => {
    let cancelled = false;
    loadApi().then((YT) => {
      if (cancelled || playerRef.current) return;
      playerRef.current = new YT.Player(PLAYER_ID, {
        width: "100%",
        height: "100%",
        videoId: initialVid,
        playerVars: { playsinline: 1, rel: 0 },
      });
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
        playerRef.current = null;
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setArea({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const loadVideo = useCallback((id) => {
    const clean = (id || "").trim();
    if (!clean) return;
    setVideoId(clean);
    playerRef.current?.loadVideoById?.(clean);
  }, []);

  // Enter browser fullscreen when the Fullscreen mode is selected.
  useEffect(() => {
    if (mode !== "fullscreen") return;
    const el = rootRef.current;
    const fn = el?.requestFullscreen || el?.webkitRequestFullscreen;
    if (fn) {
      try {
        fn.call(el);
      } catch {
        /* fullscreen not supported */
      }
    }
  }, [mode]);

  useEffect(() => {
    const onFs = () => {
      const active = document.fullscreenElement || document.webkitFullscreenElement;
      if (!active && mode === "fullscreen") setMode("fit");
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, [mode]);

  const { box, frame } = computeLayout(area.w, area.h, mode);

  return (
    <div ref={rootRef} className="ss-root" data-testid="screen-size-mode">
      {/* Controls live entirely OUTSIDE the player area — never over the iframe */}
      <header className="ss-header">
        <div className="ss-left">
          <Link to="/" className="ss-back" data-testid="ss-back-link" aria-label="Back to player">
            <ChevronLeft size={20} />
            <span>Back</span>
          </Link>
          <h1 className="ss-title">Screen Size Mode</h1>
          <span className="ss-badge">Experimental</span>
        </div>

        <div className="ss-controls">
          <div className="ss-video-input">
            <input
              data-testid="ss-video-id-input"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadVideo(inputId);
              }}
              placeholder="YouTube video ID"
              aria-label="YouTube video ID"
            />
            <button data-testid="ss-load-btn" onClick={() => loadVideo(inputId)}>
              Load
            </button>
          </div>

          <label className="ss-select-wrap">
            <span className="ss-select-label">Screen Size</span>
            <select
              data-testid="ss-mode-select"
              className="ss-select"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              aria-label="Screen size mode"
            >
              {MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div ref={areaRef} className="ss-area" data-testid="ss-player-area">
        <div
          className={`ss-box screen-${mode}`}
          data-testid="ss-player-box"
          style={{ width: box.w || "100%", height: box.h || "100%" }}
        >
          <div className="ss-frame" style={{ width: frame.w || "100%", height: frame.h || "100%" }}>
            <div id={PLAYER_ID} className="ss-iframe-host" />
          </div>
        </div>
      </div>

      <p className="ss-note" data-testid="ss-current-mode">
        Current: <strong>{MODES.find((m) => m.id === mode)?.label}</strong> · Video ID:{" "}
        <code>{videoId}</code> — YouTube's own controls stay fully usable.
      </p>
    </div>
  );
}
