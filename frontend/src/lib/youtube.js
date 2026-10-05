import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export async function getYoutubeStatus() {
  const { data } = await axios.get(`${API}/youtube/status`);
  return data; // { configured: bool }
}

export async function searchYoutube(query) {
  const { data } = await axios.get(`${API}/youtube/search`, {
    params: { q: query },
  });
  return data; // VideoItem[]
}

export async function getVideo(videoId) {
  const { data } = await axios.get(`${API}/youtube/video/${videoId}`);
  return data;
}

// Translate backend error detail into human-readable message
export function humanizeApiError(err) {
  const detail = err?.response?.data?.detail;
  const status = err?.response?.status;
  switch (detail) {
    case "API_KEY_MISSING":
      return "Search isn't configured yet. A YouTube API key needs to be added.";
    case "QUOTA_OR_KEY_ERROR":
      return "YouTube search is temporarily unavailable (quota or key issue). Please try again later.";
    case "NETWORK_ERROR":
      return "Network problem reaching YouTube. Check your connection and try again.";
    case "VIDEO_NOT_FOUND":
      return "Sorry, this video could not be found.";
    default:
      if (status === 503) return "Search isn't configured yet. A YouTube API key needs to be added.";
      return "Something went wrong with YouTube. Please try again.";
  }
}
