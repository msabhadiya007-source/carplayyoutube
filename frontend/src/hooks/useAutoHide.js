import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Auto-hide UI after `delay` ms of inactivity, but only while `active` (video playing)
 * and no overlay is open (`locked`).
 */
export function useAutoHide({ delay = 4000, active = true, locked = false }) {
  const [visible, setVisible] = useState(true);
  const timer = useRef(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const schedule = useCallback(() => {
    clear();
    if (!active || locked) return;
    timer.current = setTimeout(() => setVisible(false), delay);
  }, [active, locked, delay, clear]);

  const show = useCallback(() => {
    setVisible(true);
    schedule();
  }, [schedule]);

  useEffect(() => {
    // When locked (overlay open) or not active (paused/no video), always show.
    if (locked || !active) {
      clear();
      setVisible(true);
    } else {
      schedule();
    }
    return clear;
  }, [locked, active, schedule, clear]);

  return { visible, show, setVisible };
}
