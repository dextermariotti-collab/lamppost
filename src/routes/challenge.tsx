import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The one-drill daily challenge became the daily case: one real-world text and three questions
 * from three different units. Old links land on today's case.
 */
export const Route = createFileRoute("/challenge")({
  beforeLoad: () => {
    throw redirect({ to: "/case", replace: true });
  },
});
