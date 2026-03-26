import { useState, useEffect, useCallback, useRef } from "react";

const PING_INTERVAL = 15_000; // 15s
const PING_TIMEOUT = 5_000; // 5s

async function pingBackend(): Promise<boolean> {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url) return navigator.onLine;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT);
    const res = await fetch(`${url}/rest/v1/`, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      },
    });
    clearTimeout(timer);
    return res.ok || res.status === 401 || res.status === 406; // any response means reachable
  } catch {
    return false;
  }
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isReachable, setIsReachable] = useState(navigator.onLine);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkReachability = useCallback(async () => {
    if (!navigator.onLine) {
      setIsReachable(false);
      return;
    }
    const reachable = await pingBackend();
    setIsReachable(reachable);
  }, []);

  useEffect(() => {
    const on = () => {
      setIsOnline(true);
      checkReachability();
    };
    const off = () => {
      setIsOnline(false);
      setIsReachable(false);
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    // Initial check
    checkReachability();

    // Periodic ping when browser says online
    intervalRef.current = setInterval(() => {
      if (navigator.onLine) checkReachability();
    }, PING_INTERVAL);

    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkReachability]);

  return { isOnline, isReachable };
}
