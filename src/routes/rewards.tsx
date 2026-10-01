import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Gems, reward chests, hint tokens and cosmetics are no longer part of Lamppost. Streak freezes
 * still come free every 7 days and live with the streak on Progress, so old links land there.
 */
export const Route = createFileRoute("/rewards")({
  beforeLoad: () => {
    throw redirect({ to: "/progress", replace: true });
  },
});
