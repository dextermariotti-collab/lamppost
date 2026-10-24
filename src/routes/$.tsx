import { createFileRoute, notFound } from "@tanstack/react-router";

/**
 * Every address no other route matches. It throws the root's 404 from here instead of leaving the
 * root to match nothing: the phone app's prerendered shell holds the root and an empty place for
 * its child, and a root that is itself "not found" would draw the 404 into that place while the
 * page is still hydrating (React error #418). As a child, the 404 arrives the way every other page
 * does, after hydration. On the web the server still answers 404.
 */
export const Route = createFileRoute("/$")({
  beforeLoad: () => {
    throw notFound();
  },
});
