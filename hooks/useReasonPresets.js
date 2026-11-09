import { useEffect, useState } from "react";

import { getReasonsFor } from "../api/reasonApi";

/**
 * The backend-managed reason presets for one picker (see REASON_TYPES).
 * Starts empty and fills in once the day's cache (or the network) answers.
 */
export default function useReasonPresets(type) {
  const [reasons, setReasons] = useState([]);

  useEffect(() => {
    let alive = true;
    getReasonsFor(type).then((list) => {
      if (alive) setReasons(list);
    });
    return () => {
      alive = false;
    };
  }, [type]);

  return reasons;
}
