const PREFERENCES_KEY = "medassist.preferences";

export const defaultPreferences = {
  language: "english",
  notifications: true,
  emailReports: true,
  emailSecurity: true,
};

export function loadPreferences() {
  if (typeof window === "undefined") return defaultPreferences;

  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return defaultPreferences;
    return { ...defaultPreferences, ...JSON.parse(raw) };
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(preferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}
