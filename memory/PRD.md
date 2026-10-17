# CarPlayYouTube — PRD

## Original Problem Statement
Production-ready responsive web app "CarPlayYouTube": a YouTube player interface optimized for wide/short automotive displays and car browsers. Core flow: Search → Select → Play → Control → Next/Previous → Queue.
Latest request: secure user accounts **in the existing MongoDB** (no Firebase), per-user queue & preferences, protected search, autoplay of similar videos, "Add to queue?" prompt, quality preference. Do NOT deploy or push without approval. Preserve existing UI and Screen Size Mode.

## Architecture
- Frontend: React (CRA+CRACO), Tailwind, lucide-react, YouTube IFrame Player API.
- Backend: FastAPI + Motor (MONGO_URL/DB_NAME). YouTube Data API v3 proxy.
- Auth: `backend/auth.py` — bcrypt hashing, PyJWT access (15m) + refresh (7d) in httpOnly Secure SameSite=Lax cookies, Bearer fallback, lockout (5 fails per IP+email, 20 per email → 15 min). Routes `/api/auth/register|login|refresh|logout|me`.
- User data: `backend/user_data.py` — `/api/me/data`, `/api/me/queue` (GET/PUT), `/api/me/queue/merge`, `/api/me/settings` (GET/PUT). user_id always from token.
- Collections: `users`, `login_attempts`, `user_queues {user_id, items}`, `user_settings {user_id, autoplayNext, autoplayRelated, promptAddToQueue, quality}`.
- Frontend: `AuthContext`, `lib/api.js` (axios withCredentials + 401 refresh), `useAccountData` (LocalStorage when signed out, Mongo when signed in, one-time local→account merge per device), `AuthDialog`, `AddToQueuePrompt`.
- CORS_ORIGINS set to explicit frontend origin (update for production domain before deploy).

## Implemented
- 2026-10 (earlier): player, search, queue (reorder, load more, share, back), car mode, fit modes, /screen-size mode.
- 2026-10-17: Mongo-backed auth + per-user queue/settings, protected YouTube search/video, search gated in UI, logged-out deep-link playback + local queue, local queue merge on first login, Add-to-queue prompt (toggle), Autoplay Similar (title/channel search, skips played), quality preference (hint-only disclaimer), per-account recently played, HTML-entity fix in titles. Tested: iteration_4 backend 19/19, frontend all flows pass.

## Backlog
- P1: Password reset flow (needs email provider), "remember me"/longer sessions for car use.
- P1: Set CORS_ORIGINS to production domain at deploy time.
- P2: Sync recently played to account; PWA shell; split CarPlayer.jsx.
