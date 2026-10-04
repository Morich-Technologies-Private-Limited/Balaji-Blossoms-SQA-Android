// hooks/useAuthCheck.js
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { isLoggedIn, logout, msUntilLogout } from "../utility/secureStorage";

/**
 * Longest single timer we arm. JS timers are throttled or frozen while the app
 * sits in the background, so we re-arm in short hops and re-check on resume
 * instead of trusting one multi-hour timeout to fire.
 */
const MAX_TIMER_MS = 5 * 60 * 1000;

export default function useAuthCheck() {
  const [status, setStatus] = useState("checking"); // checking | in | out

  useEffect(() => {
    let alive = true;
    let timer;

    const check = async () => {
      const ok = await isLoggedIn();
      if (!alive) return;

      clearTimeout(timer);

      if (!ok) {
        // isLoggedIn already wiped an expired session; this covers a manual
        // logout racing with the timer.
        await logout();
        if (alive) setStatus("out");
        return;
      }

      setStatus("in");

      const remaining = await msUntilLogout();
      if (!alive || remaining === null) return;

      timer = setTimeout(check, Math.max(0, Math.min(remaining, MAX_TIMER_MS)));
    };

    check();

    // Backgrounding the app pauses the timer, so re-check the moment it
    // returns to the foreground.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });

    return () => {
      alive = false;
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return status;
}
