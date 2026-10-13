import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The iOS and Android apps. They bundle the screens built by `npm run build:app` (dist-app/) and
 * call the deployed backend for everything that needs a server (VITE_API_URL at build time).
 *
 * `appId` is the bundle identifier on both stores. It can't change once the app is published, so
 * settle it before the first upload, and change it in src/lib/native-config.ts too: it doubles as
 * the URL scheme that sign-in returns through.
 */
const config: CapacitorConfig = {
  appId: "com.lamppost.app",
  appName: "Lamppost",
  webDir: "dist-app",
  // Night blue, so the moment before the first screen paints matches the splash and the icon.
  backgroundColor: "#0e1621",
  ios: { contentInset: "never" },
  android: { allowMixedContent: false },
  plugins: {
    // Screens draw edge to edge and pad themselves (--inset-top/--inset-bottom in styles.css).
    // "css" also hands Android's real insets to the page, which older Android web views report as 0.
    SystemBars: { insetsHandling: "css", initialViewportFitValueHint: "cover" },
  },
};

export default config;
