import { useEffect } from "react";
import { isNativeApp } from "@/lib/platform";
import { useTheme } from "@/lib/theme";

/**
 * What the phone apps need that a browser does by itself: taking back a sign-in from the system
 * browser, the Android back button, and status-bar text that stays readable in both themes.
 * Renders nothing, and does nothing on the web.
 */
export function NativeShell() {
  const { theme } = useTheme();

  useEffect(() => {
    if (!isNativeApp()) return;
    let canceled = false;
    const removers: Array<() => Promise<void>> = [];
    void (async () => {
      const { App } = await import("@capacitor/app");
      // Loaded here, in the app only, so the website's first download doesn't carry the sign-in client.
      const { completeNativeSignIn } = await import("@/lib/oauth");
      const opened = await App.addListener("appUrlOpen", ({ url }) => {
        void completeNativeSignIn(url);
      });
      const back = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else void App.exitApp();
      });
      removers.push(opened.remove, back.remove);
      if (canceled) removers.forEach((remove) => void remove());
      // A sign-in can also be what launched the app, if the system closed it meanwhile.
      const launch = await App.getLaunchUrl();
      if (!canceled && launch?.url) void completeNativeSignIn(launch.url);
    })();
    return () => {
      canceled = true;
      removers.forEach((remove) => void remove());
    };
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return;
    void import("@capacitor/core").then(({ SystemBars, SystemBarsStyle }) =>
      SystemBars.setStyle({
        style: theme === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
      }),
    );
  }, [theme]);

  return null;
}
