import { REASON_LIST_URL } from "../constants/apiConstants";
import { getCacheItem, setCacheItem } from "../utility/secureStorage";
import axiosClient from "./axiosClient";

/** The reason pickers the backend serves presets for. */
export const REASON_TYPES = {
  QUANTITY_UPDATE: "QUANTITY_UPDATE",
  ITEM_DELETE: "ITEM_DELETE",
  CANCELLATION: "CANCELLATION",
};

const CACHE_KEY = "REASON_PRESETS_CACHE";

/* Local calendar day, e.g. "2026-11-09". The cache is good for the day it was
   fetched on and is refetched on the first use after midnight. */
const today = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

/* { day, byType: { QUANTITY_UPDATE: ["..."], ... } } — kept in memory so
   every modal after the first reads it synchronously-fast, and mirrored to
   storage so a relaunch on the same day doesn't hit the network. */
let memoryCache = null;
let inFlight = null;

/** Turn the /info/reasons payload into { TYPE: [reason, ...] }. */
const groupByType = (rows) => {
  const byType = {};
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const type = String(row?.reasonType || "").toUpperCase();
    const text = String(row?.reason || "").trim();
    if (!type || !text) return;
    if (!byType[type]) byType[type] = [];
    if (!byType[type].includes(text)) byType[type].push(text);
  });
  return byType;
};

const readStored = async () => {
  try {
    const raw = await getCacheItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed.byType === "object" ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * GET /info/reasons — every active reason, in one call.
 * Returns { TYPE: [reason, ...] }, or null when the call failed.
 */
const fetchAllReasons = async () => {
  try {
    const response = await axiosClient.get(REASON_LIST_URL);
    const body = response?.data;
    if (String(body?.status).toUpperCase() !== "SUCCESS") return null;
    return groupByType(body?.payload);
  } catch {
    return null;
  }
};

/**
 * All reason presets grouped by type, cached for the current day.
 *
 * Order: today's memory cache → today's stored cache → network. If the network
 * fails, an older cache (any day) is still better than nothing, so it is
 * returned without being marked fresh — the next call retries. With no cache
 * at all the result is {} and the modals simply show no presets (the reason
 * text box still works).
 */
export const getReasonPresets = async () => {
  const day = today();
  if (memoryCache?.day === day) return memoryCache.byType;

  if (!inFlight) {
    inFlight = (async () => {
      const stored = await readStored();
      if (stored?.day === day) {
        memoryCache = stored;
        return stored.byType;
      }

      const fresh = await fetchAllReasons();
      if (fresh) {
        memoryCache = { day, byType: fresh };
        await setCacheItem(CACHE_KEY, JSON.stringify(memoryCache));
        return fresh;
      }

      const stale = memoryCache || stored;
      return stale?.byType || {};
    })().finally(() => {
      inFlight = null;
    });
  }

  return inFlight;
};

/** Presets for one picker, e.g. getReasonsFor(REASON_TYPES.ITEM_DELETE). */
export const getReasonsFor = async (type) => {
  const byType = await getReasonPresets();
  return byType[type] || [];
};
