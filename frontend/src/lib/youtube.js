import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Short-lived client cache to avoid repeat identical search requests (quota protection).
const _cache = new Map();
const CACHE_TTL = 120_000; // 2 minutes

export async function getYoutubeStatus() {
  const { data } = await axios.get(`${API}/youtube/status`);
  return data; // { configured: bool }
}

export async function searchYoutube(query, pageToken) {
  const key = `${query.trim().toLowerCase()}|${pageToken || ""}`;
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.t < CACHE_TTL) {
    return hit.data;
  }
  const { data } = await axios.get(`${API}/youtube/search`, {
    params: { q: query, ...(pageToken ? { pageToken } : {}) },
  });
  _cache.set(key, { t: Date.now(), data });
  return data; // { items: VideoItem[], nextPageToken?: string }
}

export async function getVideo(videoId) {
  const { data } = await axios.get(`${API}/youtube/video/${videoId}`);
  return data;
}

// Translate backend error detail into the exact human-readable messages per spec.
export function humanizeApiError(err) {
  const detail = err?.response?.data?.detail;
  switch (detail) {
    case "NETWORK_ERROR":
      return "Unable to connect. Please check your connection and try again.";
    case "VIDEO_NOT_FOUND":
      return "This video cannot be played. Please choose another video.";
    case "API_KEY_MISSING":
    case "QUOTA_OR_KEY_ERROR":
    case "YOUTUBE_API_ERROR":
    default:
      return "YouTube search is temporarily unavailable. Please try again later.";
  }
}
