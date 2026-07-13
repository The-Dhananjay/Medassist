import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import { Capacitor } from "@capacitor/core";

const AUTH_TOKEN_KEY = "medassist.auth.token";

let authTokenCache = null;
let hydrated = false;
let hydrationPromise = null;
let authTokenVersion = 0;

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
  return legacyToken;
}

async function readNativeToken() {
  const migratedToken = await migrateLegacyNativeToken();
  if (migratedToken) return migratedToken;
  return await SecureStorage.getItem(AUTH_TOKEN_KEY);
}

export async function hydrateAuthToken() {
  if (hydrated) return authTokenCache ?? null;

  if (!hydrationPromise) {
    const versionAtStart = authTokenVersion;

    hydrationPromise = (async () => {
      let storedToken;
      try {
        storedToken = isNativeApp() ? await readNativeToken() : readWebToken();
      } catch {
        storedToken = readWebToken();
      }

      // A completed login wins over an older asynchronous storage read.
      if (versionAtStart === authTokenVersion) {
        authTokenCache = storedToken ?? null;
        hydrated = true;
      }
      return authTokenCache ?? null;
    })().finally(() => {
      hydrationPromise = null;
    });
  }

  return hydrationPromise;
}

export async function getAuthToken() {
  return await hydrateAuthToken();
}

export async function setAuthToken(token) {
  authTokenVersion += 1;
  authTokenCache = token || null;
  hydrated = true;

  if (isNativeApp()) {
    if (token) {
      await SecureStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      await SecureStorage.remove(AUTH_TOKEN_KEY);
    }

    if (hasWindow()) {
      if (token) {
        window.localStorage.setItem("token", token);
      } else {
        window.localStorage.removeItem("token");
      }
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

export async function clearAuthTokenIfCurrent(expectedToken) {
  const currentToken = await getAuthToken();
  if (currentToken !== (expectedToken ?? null)) return false;

  await clearAuthToken();
  return true;
}
