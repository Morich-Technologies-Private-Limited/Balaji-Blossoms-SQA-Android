// hooks/useAuthCheck.js
import { useEffect, useState } from "react";
import { isLoggedIn } from "../utility/secureStorage";

export default function useAuthCheck() {
  const [status, setStatus] = useState("checking"); // checking | in | out

  useEffect(() => {
    let alive = true;
    isLoggedIn().then((ok) => {
      if (alive) setStatus(ok ? "in" : "out");
    });
    return () => {
      alive = false;
    };
  }, []);

  return status;
}
