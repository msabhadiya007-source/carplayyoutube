const PREFIX = "cpyt:";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

export const storage = {
  getCarMode: () => read("carMode", false),
  setCarMode: (v) => write("carMode", v),

  getFitMode: () => read("fitMode", "fit"),
  setFitMode: (v) => write("fitMode", v),

  getVolume: () => read("volume", 80),
  setVolume: (v) => write("volume", v),

  getMuted: () => read("muted", false),
  setMuted: (v) => write("muted", v),

  getAutoplayNext: () => read("autoplayNext", true),
  setAutoplayNext: (v) => write("autoplayNext", v),

  getQueue: () => read("queue", []),
  setQueue: (v) => write("queue", v),

  getRecent: () => read("recent", []),
  setRecent: (v) => write("recent", v),

  getVisited: () => read("visited", false),
  setVisited: (v) => write("visited", v),
};
