# CarPlayYouTube

A wide-screen, car-friendly YouTube player built for automotive displays, car browsers,
desktop and mobile landscape. **Not** a native Apple CarPlay app — it's a responsive website
you can open in any modern browser on a compatible car display.

> Search → Select video → Play → Control → Next / Previous → Queue.
> YouTube, redesigned for a wide automotive browser display.

## Features

- **Real YouTube search** via the official YouTube Data API v3 (proxied through the backend so the API key stays secret).
- **YouTube IFrame Player** with custom, oversized, touch-friendly controls (play/pause, prev, next, seek, volume, mute, fullscreen).
- **Ultra-wide / short display support** — adapts to 1920×720, 1920×600, 1280×480, 1024×400, mobile landscape, etc. (not locked to 16:9).
- **Video fit modes**: Fit / Fill / Crop.
- **Auto-hiding controls** after a few seconds of inactivity; tap the video to bring them back.
- **Local queue / playlist** with autoplay-next, plus recently played — stored in LocalStorage (no account needed).
- **Car Display Mode** for a maximised, high-contrast, low-chrome layout.
- **Dark premium automotive theme**, full keyboard + ARIA accessibility.
- Deep links: `/watch/:videoId` loads a specific video.

## Tech stack

- **Frontend**: React (CRA + CRACO), Tailwind CSS, lucide-react icons, YouTube IFrame Player API.
- **Backend**: FastAPI (proxies YouTube Data API search/details), MongoDB (template default).
- **Storage**: Browser LocalStorage for queue, recently played and preferences.

## Setup

### 1. Add your YouTube Data API key (required for search)

Search needs a **YouTube Data API v3** key. Playback uses the IFrame player and does **not**
require a key. The key is stored **only** on the FastAPI backend and is never exposed to the
browser, JS bundle, HTML, LocalStorage or any frontend request.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project → **APIs & Services → Library → enable "YouTube Data API v3"**.
3. **APIs & Services → Credentials → Create credentials → API key**. (Recommended: restrict the key to the YouTube Data API v3.)
4. Add the key to `backend/.env` (server-side only):

```
YOUTUBE_API_KEY="YOUR_API_KEY_HERE"
```

5. Restart the backend: `sudo supervisorctl restart backend`.

`.env` files are git-ignored (only `.env.example` is committed) — never commit the real key.

### 2. Environment variables

- `backend/.env` — `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `YOUTUBE_API_KEY` (see `backend/.env.example`).
- `frontend/.env` — `REACT_APP_BACKEND_URL` (pre-configured; the frontend only ever calls this backend, never googleapis.com directly).

**CORS (production):** `CORS_ORIGINS` is read from the environment (comma-separated). For
production, set it to your real frontend origin instead of `*`, e.g.
`CORS_ORIGINS="https://carplayyoutube.com"` (add your dev origin too if needed).

### 3. Test the search endpoint

```bash
# Is the key configured? (never returns the key itself)
curl "$BACKEND/api/youtube/status"          # -> {"configured": true}

# Real search (goes server-side; browser never sees the key)
curl "$BACKEND/api/youtube/search?q=Arijit%20Singh"
```

## API (backend, all prefixed with `/api`)

- `GET /api/youtube/status` → `{ configured: boolean }` (no secrets ever returned)
- `GET /api/youtube/search?q=<query>&maxResults=<=20&pageToken=<token>` → `{ items: [...], nextPageToken }`.
  Query is validated (1–100 chars), results capped at 20, and identical searches are cached
  server-side for ~2 minutes to protect the YouTube quota.
- `GET /api/youtube/video/:videoId` → single video details

## Quota protection

- Searches run on explicit Enter / debounced input (not per keystroke), capped at 20 results.
- Short-lived caches on both the backend (~2 min) and the frontend (~2 min) avoid repeat
  identical requests.

## YouTube compliance

This app uses only the official YouTube Data API and IFrame Player API. It does not download,
proxy, scrape or re-host YouTube videos, and it does not remove YouTube branding or bypass any
restrictions.

## Deployment

The frontend is a standard React build deployable to Vercel, Netlify, Cloudflare Pages, etc.
The backend is a FastAPI service. Set `YOUTUBE_API_KEY` as an environment variable on the host.
