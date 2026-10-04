import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN = "ACCESS_TOKEN";
const REFRESH_TOKEN = "REFRESH_TOKEN";
const USER = "USER";
const EXPIRES_AT = "EXPIRES_AT";

const SESSION_KEYS = [ACCESS_TOKEN, REFRESH_TOKEN, USER, EXPIRES_AT];

/**
 * Backend issues access tokens with a fixed 24h lifetime
 * (ACCESS_TOKEN_EXPIRATION = 1000L * 60 * 60 * 24). Used only as a fallback
 * when the token carries no readable `exp` claim.
 */
const ACCESS_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

/**
 * Sign the user out this long before the token actually dies, so no request
 * ever goes out on a token the server is about to reject.
 */
export const LOGOUT_LEAD_MS = 30 * 60 * 1000;

const isWeb = Platform.OS === "web";

/* ---------------- storage primitives ---------------- */

const setItem = async (key, value) => {
  if (value === null || value === undefined) {
    await removeItem(key);
    return;
  }

  const stringValue = String(value);

  if (isWeb) {
    localStorage.setItem(key, stringValue);
    return;
  }

  await SecureStore.setItemAsync(key, stringValue);
};

const getItem = async (key) => {
  try {
    if (isWeb) {
      return localStorage.getItem(key);
    }

    return await SecureStore.getItemAsync(key);
  } catch {
    // A locked or corrupted keystore reads as "no session" rather than
    // crashing the auth check.
    return null;
  }
};

const removeItem = async (key) => {
  try {
    if (isWeb) {
      localStorage.removeItem(key);
      return;
    }

    await SecureStore.deleteItemAsync(key);
  } catch {
    // A key that was never written must not abort the rest of the wipe.
  }
};

/* ---------------- expiry ---------------- */

/**
 * Reads `exp` straight off the JWT so the client and server agree on when the
 * session dies. Returns null for an opaque or unreadable token — the caller
 * then falls back to ACCESS_TOKEN_LIFETIME_MS.
 */
const decodeJwtExpiry = (token) => {
  try {
    const segment = typeof token === "string" ? token.split(".")[1] : null;
    if (!segment || typeof atob !== "function") return null;

    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const exp = JSON.parse(atob(padded))?.exp;

    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
};

/** Epoch ms at which the stored token expires, or null when nothing is stored. */
export const getSessionExpiry = async () => {
  const raw = await getItem(EXPIRES_AT);
  const expiresAt = Number(raw);

  return raw && Number.isFinite(expiresAt) ? expiresAt : null;
};

/**
 * Milliseconds left before the session must be torn down — already discounted
 * by LOGOUT_LEAD_MS. Null when there is no session to time.
 */
export const msUntilLogout = async () => {
  const expiresAt = await getSessionExpiry();
  if (expiresAt === null) return null;

  return expiresAt - LOGOUT_LEAD_MS - Date.now();
};

/* ---------------- session ---------------- */

export const saveLoginData = async (user) => {
  const expiresAt =
    decodeJwtExpiry(user.accessToken) ?? Date.now() + ACCESS_TOKEN_LIFETIME_MS;

  await setItem(ACCESS_TOKEN, user.accessToken);
  await setItem(REFRESH_TOKEN, user.refreshToken);
  await setItem(USER, JSON.stringify(user));
  await setItem(EXPIRES_AT, expiresAt);
};

export const logout = async () => {
  await Promise.all(SESSION_KEYS.map(removeItem));
};

export const getAccessToken = async () => {
  const token = await getItem(ACCESS_TOKEN);
  if (!token) return null;

  const remaining = await msUntilLogout();

  // A session stored before expiry tracking existed has no EXPIRES_AT — treat
  // it as dead so those stale tokens get cleared on first launch after upgrade.
  if (remaining === null || remaining <= 0) {
    await logout();
    return null;
  }

  return token;
};

export const getCurrentUser = async () => {
  const user = await getItem(USER);

  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const getCurrentRole = async () => {
  const user = await getCurrentUser();
  return user?.role;
};

export const isLoggedIn = async () => {
  const token = await getAccessToken();
  return !!token;
};
