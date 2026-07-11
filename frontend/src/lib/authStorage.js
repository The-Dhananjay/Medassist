import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import { Capacitor } from "@capacitor/core";

const AUTH_TOKEN_KEY = "medassist.auth.token";

let authTokenCache;
let hydrated = false;

function hasWindow() {
  return typeof window !== "undefined";
}

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

function readWebToken() {
  if (!hasWindow()) return null;
  return window.localStorage.getItem("token");
}

async function migrateLegacyNativeToken() {
  if (!isNativeApp() || !hasWindow()) return null;

  const legacyToken = window.localStorage.getItem("token");
  if (!legacyToken) return null;

  await SecureStorage.setItem(AUTH_TOKEN_KEY, legacyToken);
  window.localStorage.removeItem("token");
  return legacyToken;
}

async function readNativeToken() {
  const migratedToken = await migrateLegacyNativeToken();
  if (migratedToken) return migratedToken;
  return await SecureStorage.getItem(AUTH_TOKEN_KEY);
}

export async function hydrateAuthToken() {
  if (hydrated) return authTokenCache ?? null;

  hydrated = true;

  try {
    authTokenCache = isNativeApp() ? await readNativeToken() : readWebToken();
  } catch {
    authTokenCache = readWebToken();
  }

  return authTokenCache ?? null;
}

export async function getAuthToken() {
  return await hydrateAuthToken();
}

export async function setAuthToken(token) {
  authTokenCache = token || null;
  hydrated = true;

  if (isNativeApp()) {
    if (token) {
      await SecureStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      await SecureStorage.remove(AUTH_TOKEN_KEY);
    }

    if (hasWindow()) {
      window.localStorage.removeItem("token");
    }
    return;
  }

  if (!hasWindow()) return;

  if (token) {
    window.localStorage.setItem("token", token);
  } else {
    window.localStorage.removeItem("token");
  }
}

export async function clearAuthToken() {
  await setAuthToken(null);
}
