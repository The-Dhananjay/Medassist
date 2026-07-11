import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.medassist.app",
  appName: "MedAssist",
  webDir: "build",
  bundledWebRuntime: false,
  server: {
    hostname: "app.medassist.local",
    androidScheme: "https",
    iosScheme: "https",
    cleartext: false,
  },
  plugins: {
    App: {
      disableBackButtonHandler: true,
    },
    SplashScreen: {
      launchAutoHide: false,
      showSpinner: false,
      backgroundColor: "#f7f8f2",
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      overlaysWebView: true,
      style: "DARK",
      backgroundColor: "#f7f8f2",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
      autoBackdropColor: "auto",
    },
  },
};

export default config;
