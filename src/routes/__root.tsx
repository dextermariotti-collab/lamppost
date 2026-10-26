import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  ScriptOnce,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useSyncExternalStore, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AnswerFeedbackHost } from "../components/AnswerFeedback";
import { ConsentGate } from "../components/ConsentGate";
import { NativeShell } from "../components/NativeShell";
import { PhoneFrame } from "../components/PhoneFrame";
import { RewardHost } from "../components/RewardHost";
import { DeviceOwnerGuard } from "../components/DeviceOwnerGuard";
import { LearningSyncWatcher } from "../components/LearningSyncWatcher";
import { UpkeepWatcher } from "../components/UpkeepWatcher";
import { Button } from "../components/ui/button";
import { THEME_SCRIPT, ThemeProvider } from "../lib/theme";

function NotFoundComponent() {
  return (
    <PhoneFrame>
      <div className="px-5 pt-12 pb-10">
        <p className="legend text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl leading-tight">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild className="mt-6 h-11 w-full rounded-sm font-semibold">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </PhoneFrame>
  );
}

const subscribeOnline = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

/** False only when the device says it has no connection; the server render assumes one. */
function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const online = useOnline();

  return (
    <PhoneFrame>
      <div className="px-5 pt-12 pb-10">
        <h1 className="text-3xl leading-tight">
          {online ? "This page didn't load" : "You're offline"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {online
            ? "Something went wrong on our end. You can try again or head back home."
            : "This page needs a connection. Check your Wi-Fi or mobile data, then try again."}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="h-11 w-full rounded-sm font-semibold"
          >
            Try again
          </Button>
          <Button asChild variant="outline" className="h-11 w-full rounded-sm font-semibold">
            <a href="/">Go home</a>
          </Button>
        </div>
      </div>
    </PhoneFrame>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Lamppost — Practice critical thinking" },
      {
        name: "description",
        content:
          "Lamppost is a critical-thinking trainer: short interactive lessons on claims, evidence, fallacies, biases, arguments, probability and media, with a written argument and an explain-it-back chat at the end of each.",
      },
      { name: "author", content: "Lamppost" },
      { property: "og:site_name", content: "Lamppost" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "256x256" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    // The head script below sets the theme class on <html> before React hydrates it.
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <ScriptOnce>{THEME_SCRIPT}</ScriptOnce>
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <AnswerFeedbackHost />
        <RewardHost />
        <DeviceOwnerGuard />
        <UpkeepWatcher />
        <LearningSyncWatcher />
        <ConsentGate />
        <NativeShell />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
