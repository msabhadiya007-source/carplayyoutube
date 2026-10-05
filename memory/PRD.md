# CarPlayYouTube — PRD

## Original Problem Statement
Build a production-ready, responsive web app "CarPlayYouTube": a YouTube player interface optimized for wide/short automotive displays and car browsers (NOT a native CarPlay app). Must work on desktop, mobile, and car browsers. Core flow: Search → Select video → Play → Control → Next/Previous → Queue.

## Architecture
- **Frontend**: React (CRA + CRACO), Tailwind CSS, lucide-react icons, YouTube IFrame Player API. Fonts: Outfit (display) + Chivo (body) + JetBrains Mono (numbers).
- **Backend**: FastAPI proxy for the YouTube Data API v3 (keeps API key server-side). Endpoints under `/api/youtube/*`.
- **Storage**: Browser LocalStorage (prefix `cpyt:`) for queue, recently played, car mode, fit mode, autoplay, volume, muted, visited. No auth, no DB persistence of user data.
- **Key**: `YOUTUBE_API_KEY` in `backend/.env` (configured).

## User Personas
- Driver/passenger using a car's built-in browser on a wide, short touchscreen.
- Mobile user in landscape.
- Desktop user wanting a minimal large-screen YouTube player.

## Core Requirements (static)
- Real YouTube search + IFrame playback (official APIs, no downloading/proxying).
- Large car-friendly controls (48–72px), ultra-wide/short layout, Fit/Fill/Crop, auto-hide controls, queue with autoplay-next, Car Mode, fullscreen, settings, dark automotive theme, accessibility, no login.

## Implemented (2026-10-05)
- Backend YouTube proxy: `/api/youtube/status`, `/api/youtube/search?q=`, `/api/youtube/video/{id}` with graceful human-readable errors (no 500s / no raw errors). Durations parsed from ISO8601.
- Frontend: Home screen, compact auto-sizing Header, VideoPlayer with Fit/Fill/Crop (ResizeObserver-based stage sizing), large ControlBar (play/pause, prev/next with 5s rule, seek, volume, mute, fullscreen, progress), SearchOverlay (debounced, suggestions, loading/error/empty states), QueueDrawer (play/remove/clear), SettingsPanel (car mode, fit, autoplay, volume, clear queue/recent), recently played, auto-hide controls, Car Mode (fullscreen + compact), portrait notice (non-blocking), keyboard shortcuts, deep link `/watch/:videoId`.
- Verified: backend 100% (testing agent), frontend ~95% all flows functional; live search + play confirmed end-to-end in browser.

## Backlog / Remaining
- **P1**: Drag-to-reorder queue; share current video URL button; search result pagination / "load more".
- **P2**: PWA/offline shell + installable app; richer Car Mode (even bigger controls, now-playing-only view); theme accent customization.
- **P2**: Split CarPlayer.jsx into smaller modules if it grows further.

## Next Tasks
- Gather user feedback on layout at real car-display resolutions; iterate on control sizing per feedback.
