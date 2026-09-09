import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// After a new version ships, an old tab may request a page chunk that no
// longer exists. Reload once instead of showing a blank screen.
if (typeof window !== "undefined") {
  let reloaded = false;
  const recover = () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  };
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    recover();
  });
  window.addEventListener("unhandledrejection", (event) => {
    const message = String((event.reason as Error | undefined)?.message ?? "");
    if (/Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(message)) {
      recover();
    }
  });
}


export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
