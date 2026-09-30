import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The winding trail is gone: My Path is the one map. Old links to a course land there.
 */
export const Route = createFileRoute("/course/$slug/")({
  beforeLoad: () => {
    throw redirect({ to: "/courses", replace: true });
  },
});
