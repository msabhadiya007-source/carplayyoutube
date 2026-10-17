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

  getPrefs: () => ({
    autoplayNext: read("autoplayNext", true),
    autoplayRelated: false,
    promptAddToQueue: read("promptAddToQueue", true),
    quality: read("quality", "auto"),
  }),
  setPrefs: (p) => {
    write("autoplayNext", p.autoplayNext);
    write("promptAddToQueue", p.promptAddToQueue);
    write("quality", p.quality);
  },

  hasMerged: (uid) => read("mergedUsers", []).includes(uid),
  markMerged: (uid) => {
    const list = read("mergedUsers", []);
    if (!list.includes(uid)) write("mergedUsers", [...list, uid]);
  },

  getQueue: () => read("queue", []),
  setQueue: (v) => write("queue", v),

  getRecent: (owner = "local") => read(owner === "local" ? "recent" : `recent:${owner}`, []),
  setRecent: (owner, v) => write(owner === "local" ? "recent" : `recent:${owner}`, v),

  getVisited: () => read("visited", false),
  setVisited: (v) => write("visited", v),
};
