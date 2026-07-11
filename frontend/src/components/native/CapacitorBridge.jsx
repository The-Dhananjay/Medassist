import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Keyboard, KeyboardStyle } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

const TOP_LEVEL_ROUTES = new Set([
  "/",
  "/dashboard",
  "/reports",
  "/diagnose",
  "/profile",
  "/settings",
  "/sessions",
]);

function normalizeAppUrl(rawUrl) {
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    const isCustomScheme = parsed.protocol === "medassist:";
    const pathname = isCustomScheme ? `/${parsed.host}${parsed.pathname}` : parsed.pathname;
    const normalizedPath = pathname.replace(/\/{2,}/g, "/");
    return `${normalizedPath}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export default function CapacitorBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  const locationRef = useRef(location.pathname);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const statusBarStyle = resolvedTheme === "dark" ? Style.Light : Style.Dark;
    const keyboardStyle =
      resolvedTheme === "dark" ? KeyboardStyle.Dark : KeyboardStyle.Light;

    void StatusBar.show().catch(() => {});
    void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    void StatusBar.setStyle({ style: statusBarStyle }).catch(() => {});

    if (Capacitor.getPlatform() === "ios") {
      void Keyboard.setStyle({ style: keyboardStyle }).catch(() => {});
    }
  }, [resolvedTheme]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const openUrl = (url) => {
      const nextRoute = normalizeAppUrl(url);
      if (!nextRoute) return;

      const currentRoute = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextRoute !== currentRoute) {
        navigate(nextRoute);
      }
    };

    let appUrlListener;
    let backButtonListener;

    const setupNativeBridge = async () => {
      await SplashScreen.hide().catch(() => {});

      const launchUrl = await CapacitorApp.getLaunchUrl().catch(() => undefined);
      if (launchUrl?.url) {
        openUrl(launchUrl.url);
      }

      appUrlListener = await CapacitorApp.addListener("appUrlOpen", ({ url }) => {
        openUrl(url);
      });

      backButtonListener = await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        const currentPath = locationRef.current;
        const isTopLevelRoute = TOP_LEVEL_ROUTES.has(currentPath);

        if (!isTopLevelRoute && canGoBack) {
          window.history.back();
          return;
        }

        if (Capacitor.getPlatform() === "android") {
          void CapacitorApp.minimizeApp().catch(() => {});
        }
      });
    };

    void setupNativeBridge();

    return () => {
      void appUrlListener?.remove();
      void backButtonListener?.remove();
    };
  }, [navigate]);

  return null;
}
