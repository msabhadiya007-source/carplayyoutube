import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RotateCw, AlertTriangle, X } from "lucide-react";

import Header from "./Header";
import VideoPlayer from "./VideoPlayer";
import ControlBar from "./ControlBar";
import SearchOverlay from "./SearchOverlay";
import QueueDrawer from "./QueueDrawer";
import SettingsPanel from "./SettingsPanel";
import HomeScreen from "./HomeScreen";

import { useYouTubePlayer } from "../hooks/useYouTubePlayer";
import { useAutoHide } from "../hooks/useAutoHide";
import { storage } from "../lib/storage";
import { getYoutubeStatus, getVideo, humanizeApiError } from "../lib/youtube";

const PLAYER_ID = "yt-player";

function requestFs(el) {
  const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (fn) return fn.call(el);
  return null;
}
function exitFs() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if (fn) return fn.call(document);
  return null;
}

export default function CarPlayer() {
  const { videoId: routeVideoId } = useParams();
  const navigate = useNavigate();

  // Persisted state
  const [queue, setQueue] = useState(() => storage.getQueue());
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [recent, setRecent] = useState(() => storage.getRecent());
  const [carMode, setCarMode] = useState(() => storage.getCarMode());
  const [fitMode, setFitMode] = useState(() => storage.getFitMode());
  const [autoplayNext, setAutoplayNext] = useState(() => storage.getAutoplayNext());
  const [volume, setVolumeState] = useState(() => storage.getVolume());
  const [muted, setMuted] = useState(() => storage.getMuted());

  // Transient state
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerError, setPlayerError] = useState(null);

  // Overlays
  const [searchOpen, setSearchOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Env / meta
  const [keyConfigured, setKeyConfigured] = useState(true);
  const [showKeyBanner, setShowKeyBanner] = useState(false);
  const [firstTime] = useState(() => !storage.getVisited());

  // Viewport
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [portraitDismissed, setPortraitDismissed] = useState(false);

  const rootRef = useRef(null);
  const progressTimer = useRef(null);
  const seekingRef = useRef(false);

  const currentVideo = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;
  const hasVideo = !!currentVideo;
  const anyOverlay = searchOpen || queueOpen || settingsOpen;
  const shortScreen = vp.h < 500 || carMode;
  const isPortrait = vp.w < vp.h && vp.w < 768;

  const { visible, show } = useAutoHide({
    delay: carMode ? 3500 : 4500,
    active: isPlaying && hasVideo,
    locked: anyOverlay || !hasVideo,
  });

  // ---- Persist effects ----
  useEffect(() => storage.setQueue(queue), [queue]);
  useEffect(() => storage.setRecent(recent), [recent]);
  useEffect(() => storage.setCarMode(carMode), [carMode]);
  useEffect(() => storage.setFitMode(fitMode), [fitMode]);
  useEffect(() => storage.setAutoplayNext(autoplayNext), [autoplayNext]);
  useEffect(() => storage.setVolume(volume), [volume]);
  useEffect(() => storage.setMuted(muted), [muted]);

  useEffect(() => {
    storage.setVisited(true);
  }, []);

  // ---- Viewport tracking ----
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // ---- Fullscreen tracking ----
  useEffect(() => {
    const onFs = () =>
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, []);

  // ---- YouTube API status ----
  useEffect(() => {
    getYoutubeStatus()
      .then((s) => {
        setKeyConfigured(s.configured);
        if (!s.configured) setShowKeyBanner(true);
      })
      .catch(() => {});
  }, []);

  // ---- Player ----
  const onReady = useCallback(
    (player) => {
      player.setVolume(volume);
      if (muted) player.mute();
      else player.unMute();
    },
    [volume, muted]
  );

  const addRecent = useCallback((video) => {
    setRecent((prev) => {
      const next = [video, ...prev.filter((v) => v.videoId !== video.videoId)].slice(0, 20);
      return next;
    });
  }, []);

  const onStateChange = useCallback(
    (e) => {
      const state = e.data; // -1,0,1,2,3,5
      if (state === 1) {
        setIsPlaying(true);
        setLoading(false);
        const d = e.target.getDuration?.() || 0;
        if (d) setDuration(d);
      } else if (state === 2) {
        setIsPlaying(false);
        setLoading(false);
      } else if (state === 3) {
        setLoading(true);
      } else if (state === 0) {
        setIsPlaying(false);
        handleVideoEnded();
      } else if (state === 5) {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [autoplayNext, queue, currentIndex]
  );

  const onPlayerError = useCallback(() => {
    setLoading(false);
    setIsPlaying(false);
    setPlayerError("This video cannot be played. Please choose another video.");
  }, []);

  const yt = useYouTubePlayer({
    containerId: PLAYER_ID,
    onReady,
    onStateChange,
    onError: onPlayerError,
  });

  // ---- Load current video when it changes ----
  useEffect(() => {
    if (!yt.ready || !currentVideo) return;
    setPlayerError(null);
    setLoading(true);
    setCurrentTime(0);
    setDuration(currentVideo.durationSeconds || 0);
    yt.load(currentVideo.videoId);
    addRecent(currentVideo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo?.videoId, yt.ready]);

  // ---- Progress polling ----
  useEffect(() => {
    progressTimer.current = setInterval(() => {
      if (!yt.ready || !hasVideo || seekingRef.current) return;
      const t = yt.getCurrentTime();
      const d = yt.getDuration();
      if (d) setDuration(d);
      setCurrentTime(t);
    }, 500);
    return () => clearInterval(progressTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yt.ready, hasVideo]);

  // ---- Route video ----
  useEffect(() => {
    if (!routeVideoId) return;
    getVideo(routeVideoId)
      .then((video) => playNow(video))
      .catch((err) => toast.error(humanizeApiError(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeVideoId]);

  // ---- Playback actions ----
  const playNow = useCallback(
    (video) => {
      setQueue((prev) => {
        const existing = prev.findIndex((v) => v.videoId === video.videoId);
        if (existing >= 0) {
          setCurrentIndex(existing);
          return prev;
        }
        const next = [...prev, video];
        setCurrentIndex(next.length - 1);
        return next;
      });
      setSearchOpen(false);
      setQueueOpen(false);
    },
    []
  );

  const addToQueue = useCallback((video) => {
    setQueue((prev) => {
      if (prev.some((v) => v.videoId === video.videoId)) {
        toast("Already in queue");
        return prev;
      }
      toast.success("Added to queue");
      return [...prev, video];
    });
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!hasVideo) {
      setSearchOpen(true);
      return;
    }
    if (isPlaying) yt.pause();
    else yt.play();
    show();
  }, [hasVideo, isPlaying, yt, show]);

  const handleNext = useCallback(() => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      toast("End of queue");
    }
    show();
  }, [currentIndex, queue.length, show]);

  const handlePrev = useCallback(() => {
    const t = yt.getCurrentTime();
    if (t > 5) {
      yt.seekTo(0);
      setCurrentTime(0);
    } else if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    } else {
      yt.seekTo(0);
      setCurrentTime(0);
    }
    show();
  }, [yt, currentIndex, show]);

  const handleVideoEnded = useCallback(() => {
    if (autoplayNext && currentIndex < queue.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [autoplayNext, currentIndex, queue.length]);

  const handleSeek = useCallback(
    (sec) => {
      seekingRef.current = true;
      setCurrentTime(sec);
      yt.seekTo(sec);
      show();
      setTimeout(() => {
        seekingRef.current = false;
      }, 600);
    },
    [yt, show]
  );

  const handleVolume = useCallback(
    (v) => {
      setVolumeState(v);
      yt.setVolume(v);
      if (v === 0) {
        setMuted(true);
        yt.mute();
      } else if (muted) {
        setMuted(false);
        yt.unmute();
      }
    },
    [yt, muted]
  );

  const handleToggleMute = useCallback(() => {
    if (muted) {
      setMuted(false);
      yt.unmute();
      if (volume === 0) {
        setVolumeState(50);
        yt.setVolume(50);
      }
    } else {
      setMuted(true);
      yt.mute();
    }
    show();
  }, [muted, volume, yt, show]);

  const handleToggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFs();
    } else {
      const el = rootRef.current;
      const res = requestFs(el);
      if (!res) toast("Fullscreen isn't supported in this browser.");
    }
    show();
  }, [isFullscreen, show]);

  // Queue drawer actions
  const removeFromQueue = useCallback(
    (index) => {
      setQueue((prev) => {
        const next = prev.filter((_, i) => i !== index);
        return next;
      });
      setCurrentIndex((cur) => {
        if (index < cur) return cur - 1;
        if (index === cur) return -1; // removed current -> stop
        return cur;
      });
    },
    []
  );

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
    toast("Queue cleared");
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    toast("Recently played cleared");
  }, []);

  const reorderQueue = useCallback((from, to) => {
    setQueue((prev) => {
      if (from < 0 || from >= prev.length || to < 0 || to >= prev.length || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setCurrentIndex((cur) => {
      if (cur === from) return to;
      if (from < cur && to >= cur) return cur - 1;
      if (from > cur && to <= cur) return cur + 1;
      return cur;
    });
  }, []);

  const shareCurrent = useCallback(async () => {
    if (!currentVideo) return;
    const url = `${window.location.origin}/watch/${currentVideo.videoId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: currentVideo.title, url });
        return;
      } catch {
        return; // user cancelled
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast(url);
    }
  }, [currentVideo]);

  const closeCurrentVideo = useCallback(() => {
    yt.pause();
    setIsPlaying(false);
    setCurrentIndex(-1);
    setPlayerError(null);
    if (routeVideoId) navigate("/");
  }, [yt, navigate, routeVideoId]);

  const enterCarMode = useCallback(() => {
    setCarMode(true);
    const el = rootRef.current;
    requestFs(el);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " ") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === "ArrowRight") {
        handleSeek(Math.min(currentTime + 10, duration));
      } else if (e.key === "ArrowLeft") {
        handleSeek(Math.max(currentTime - 10, 0));
      } else if (e.key.toLowerCase() === "f") {
        handleToggleFullscreen();
      } else if (e.key.toLowerCase() === "n") {
        handleNext();
      } else if (e.key.toLowerCase() === "p") {
        handlePrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePlayPause, handleSeek, currentTime, duration, handleToggleFullscreen, handleNext, handlePrev]);

  const cursorHidden = hasVideo && isPlaying && !visible && !anyOverlay;

  return (
    <div
      ref={rootRef}
      data-testid="car-player-root"
      className="relative w-full h-full overflow-hidden select-none"
      style={{ background: "var(--bg-base)", cursor: cursorHidden ? "none" : "auto" }}
      onMouseMove={() => hasVideo && show()}
    >
      {/* Player interaction layer (tap to toggle controls / play) */}
      {hasVideo && (
        <div
          data-testid="player-tap-layer"
          className="absolute inset-0 z-20"
          onClick={() => {
            if (visible) {
              handlePlayPause();
            } else {
              show();
            }
          }}
        />
      )}

      <VideoPlayer containerId={PLAYER_ID} fitMode={fitMode} hasVideo={hasVideo} />

      {/* Player error */}
      {playerError && hasVideo && (
        <div
          data-testid="player-error"
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 text-center px-6"
          style={{ background: "rgba(5,5,7,0.92)" }}
        >
          <AlertTriangle size={48} style={{ color: "var(--danger)" }} />
          <p className="text-lg max-w-md">{playerError}</p>
          <div className="flex gap-3">
            <button
              onClick={handleNext}
              className="px-6 h-12 rounded-xl font-medium"
              style={{ background: "var(--accent)", color: "#050507" }}
            >
              Skip to next
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="px-6 h-12 rounded-xl font-medium"
              style={{ border: "1px solid rgba(255,255,255,0.14)" }}
            >
              Search
            </button>
          </div>
        </div>
      )}

      {/* Home screen when nothing playing */}
      {!hasVideo && (
        <HomeScreen
          firstTime={firstTime}
          shortScreen={shortScreen}
          recent={recent}
          onOpenSearch={() => setSearchOpen(true)}
          onEnterCarMode={enterCarMode}
          onPlayRecent={playNow}
        />
      )}

      {/* Header */}
      <Header
        visible={!hasVideo ? true : visible}
        shortScreen={shortScreen}
        carMode={carMode}
        hasVideo={hasVideo}
        queueCount={queue.length}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenQueue={() => setQueueOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onCloseVideo={closeCurrentVideo}
        onToggleCarMode={() => {
          const next = !carMode;
          setCarMode(next);
          if (next) requestFs(rootRef.current);
          else if (isFullscreen) exitFs();
        }}
      />

      {/* Controls (only when a video is loaded) */}
      {hasVideo && (
        <ControlBar
          visible={visible}
          shortScreen={shortScreen}
          isPlaying={isPlaying}
          loading={loading}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          muted={muted}
          isFullscreen={isFullscreen}
          currentTitle={currentVideo?.title}
          onPlayPause={handlePlayPause}
          onPrev={handlePrev}
          onNext={handleNext}
          onSeek={handleSeek}
          onVolume={handleVolume}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={handleToggleFullscreen}
          onShare={shareCurrent}
        />
      )}

      {/* Overlays */}
      <SearchOverlay
        open={searchOpen}
        shortScreen={shortScreen}
        onClose={() => setSearchOpen(false)}
        onPlay={playNow}
        onAddToQueue={addToQueue}
      />
      <QueueDrawer
        open={queueOpen}
        queue={queue}
        currentIndex={currentIndex}
        onClose={() => setQueueOpen(false)}
        onPlayIndex={(i) => {
          setCurrentIndex(i);
          setQueueOpen(false);
        }}
        onRemove={removeFromQueue}
        onReorder={reorderQueue}
        onClear={clearQueue}
      />
      <SettingsPanel
        open={settingsOpen}
        carMode={carMode}
        fitMode={fitMode}
        autoplayNext={autoplayNext}
        volume={volume}
        onClose={() => setSettingsOpen(false)}
        onToggleCarMode={(v) => {
          setCarMode(v);
          if (v) requestFs(rootRef.current);
          else if (isFullscreen) exitFs();
        }}
        onSetFitMode={setFitMode}
        onToggleAutoplay={setAutoplayNext}
        onVolume={handleVolume}
        onClearQueue={clearQueue}
        onClearRecent={clearRecent}
      />

      {/* Portrait notice (non-blocking) */}
      {isPortrait && !portraitDismissed && (
        <div
          data-testid="portrait-notice"
          className="absolute inset-0 z-[60] flex flex-col items-center justify-center text-center px-8 gap-5"
          style={{ background: "rgba(5,5,7,0.96)" }}
        >
          <RotateCw size={56} style={{ color: "var(--accent)" }} />
          <p className="font-display text-2xl font-semibold">Rotate your device</p>
          <p className="max-w-xs" style={{ color: "var(--text-secondary)" }}>
            CarPlayYouTube is designed for landscape. Turn your device for the best experience.
          </p>
          <button
            data-testid="portrait-dismiss-btn"
            onClick={() => setPortraitDismissed(true)}
            className="px-6 h-12 rounded-xl font-medium"
            style={{ border: "1px solid rgba(255,255,255,0.14)" }}
          >
            Continue anyway
          </button>
        </div>
      )}

      {/* API key banner (home only, so it never overlaps the control bar) */}
      {showKeyBanner && !keyConfigured && !hasVideo && (
        <div
          data-testid="key-banner"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[55] flex items-center gap-3 px-4 py-3 rounded-xl max-w-[92vw]"
          style={{ background: "var(--bg-surface-2)", border: "1px solid rgba(255,159,10,0.4)" }}
        >
          <AlertTriangle size={20} style={{ color: "var(--warning, #FF9F0A)" }} />
          <p className="text-sm">
            Live search is off. Add a YouTube Data API key as <code className="font-mono-nums">YOUTUBE_API_KEY</code> in backend/.env.
          </p>
          <button
            data-testid="key-banner-dismiss"
            aria-label="Dismiss"
            onClick={() => setShowKeyBanner(false)}
            className="flex items-center justify-center rounded-full"
            style={{ width: 32, height: 32, background: "rgba(255,255,255,0.08)" }}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
