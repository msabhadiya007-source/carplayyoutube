import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { storage } from "../lib/storage";

const localData = () => ({ owner: "local", queue: storage.getQueue(), prefs: storage.getPrefs() });

// Queue + preferences: LocalStorage when signed out, MongoDB (per account) when signed in.
export function useAccountData(user) {
  const [data, setData] = useState(localData);
  const ownerKey = user ? user.id : user === false ? "local" : null;
  const saved = useRef({ queue: "", prefs: "" });

  useEffect(() => {
    if (ownerKey === null) return;
    if (ownerKey === "local") {
      setData(localData());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const local = storage.getQueue();
        let res;
        if (local.length && !storage.hasMerged(ownerKey)) {
          res = (await api.post("/me/queue/merge", { items: local })).data;
          storage.markMerged(ownerKey);
        } else {
          res = (await api.get("/me/data")).data;
          storage.markMerged(ownerKey);
        }
        if (cancelled) return;
        saved.current = { queue: JSON.stringify(res.queue), prefs: JSON.stringify(res.settings) };
        setData({ owner: ownerKey, queue: res.queue, prefs: res.settings });
      } catch {
        if (!cancelled) toast.error("Couldn't load your account queue. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerKey]);

  const ready = data.owner === ownerKey;

  useEffect(() => {
    if (!ready) return;
    if (ownerKey === "local") return storage.setQueue(data.queue);
    const json = JSON.stringify(data.queue);
    if (json === saved.current.queue) return;
    const t = setTimeout(() => {
      api
        .put("/me/queue", { items: data.queue })
        .then(() => (saved.current.queue = json))
        .catch(() => toast.error("Couldn't save your queue."));
    }, 500);
    return () => clearTimeout(t);
  }, [data.queue, ready, ownerKey]);

  useEffect(() => {
    if (!ready) return;
    if (ownerKey === "local") return storage.setPrefs(data.prefs);
    const json = JSON.stringify(data.prefs);
    if (json === saved.current.prefs) return;
    api
      .put("/me/settings", data.prefs)
      .then(() => (saved.current.prefs = json))
      .catch(() => toast.error("Couldn't save your settings."));
  }, [data.prefs, ready, ownerKey]);

  const setQueue = useCallback(
    (fn) => setData((d) => ({ ...d, queue: typeof fn === "function" ? fn(d.queue) : fn })),
    []
  );
  const setPref = useCallback(
    (key, value) => setData((d) => ({ ...d, prefs: { ...d.prefs, [key]: value } })),
    []
  );

  return { queue: data.queue, prefs: data.prefs, owner: data.owner, setQueue, setPref };
}
