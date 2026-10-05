import { useEffect, useRef, useState, useCallback } from "react";

// Loads the YouTube IFrame API exactly once.
let apiPromise = null;
function loadYouTubeApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve(window.YT);
    };
    document.head.appendChild(tag);
  });
  return apiPromise;
}

/**
 * Manages a single YT.Player instance mounted into `containerId`.
 */
export function useYouTubePlayer({ containerId, onStateChange, onError, onReady }) {
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const cbs = useRef({ onStateChange, onError, onReady });
  cbs.current = { onStateChange, onError, onReady };

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      if (playerRef.current) return;
      playerRef.current = new YT.Player(containerId, {
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          fs: 0,
        },
        events: {
          onReady: () => {
            setReady(true);
            cbs.current.onReady && cbs.current.onReady(playerRef.current);
          },
          onStateChange: (e) => cbs.current.onStateChange && cbs.current.onStateChange(e),
          onError: (e) => cbs.current.onError && cbs.current.onError(e),
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        if (playerRef.current && playerRef.current.destroy) {
          playerRef.current.destroy();
          playerRef.current = null;
        }
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  const api = {
    load: useCallback((videoId) => {
      if (playerRef.current && playerRef.current.loadVideoById) {
        playerRef.current.loadVideoById(videoId);
      }
    }, []),
    play: useCallback(() => playerRef.current?.playVideo?.(), []),
    pause: useCallback(() => playerRef.current?.pauseVideo?.(), []),
    seekTo: useCallback((s) => playerRef.current?.seekTo?.(s, true), []),
    setVolume: useCallback((v) => playerRef.current?.setVolume?.(v), []),
    mute: useCallback(() => playerRef.current?.mute?.(), []),
    unmute: useCallback(() => playerRef.current?.unMute?.(), []),
    getCurrentTime: useCallback(() => playerRef.current?.getCurrentTime?.() ?? 0, []),
    getDuration: useCallback(() => playerRef.current?.getDuration?.() ?? 0, []),
    getPlayerState: useCallback(() => playerRef.current?.getPlayerState?.() ?? -1, []),
    player: playerRef,
  };

  return { ready, ...api };
}
