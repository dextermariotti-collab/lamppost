/**
 * Which other origins may call this server, and the CORS headers they get.
 *
 * The web app calls its own origin. The iOS and Android apps load their screens from inside the
 * app (Capacitor serves them as capacitor://localhost and https://localhost) and call the deployed
 * backend across origins, so the backend answers their preflight requests, lets their server-
 * function calls past the cross-site check (src/start.ts), and exposes the headers TanStack
 * Start's client reads. Sign-in is a bearer token, never a cookie, so allowing these origins
 * can't let another site act as a signed-in learner.
 */
export const APP_ORIGINS = ["capacitor://localhost", "https://localhost"] as const;

/** Headers the server-function client reads from a response (start-client-core constants). */
const EXPOSED = "x-tss-serialized, x-tss-raw, x-tss-context";

/**
 * The origin to allow, or null. `extra` is the server's APP_ORIGINS setting, a comma-separated
 * list for local testing (a simulator against `npm run dev`, say).
 */
export function allowedAppOrigin(origin: string | null, extra = ""): string | null {
  if (!origin) return null;
  const allowed = [
    ...APP_ORIGINS,
    ...extra
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ];
  return allowed.includes(origin) ? origin : null;
}

/** The answer to a CORS preflight from an allowed origin. */
export function preflightResponse(request: Request, origin: string): Response {
  const headers = new Headers({
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      request.headers.get("Access-Control-Request-Headers") ?? "authorization, content-type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  });
  return new Response(null, { status: 204, headers });
}

/** `response` with the CORS headers an allowed origin needs to read it. */
export function withCors(response: Response, origin: string): Response {
  const result = new Response(response.body, response);
  result.headers.set("Access-Control-Allow-Origin", origin);
  result.headers.set("Access-Control-Expose-Headers", EXPOSED);
  result.headers.append("Vary", "Origin");
  return result;
}

/**
 * The cross-site check for server-function calls: the page's own origin, or an allowed app.
 * `fetchSite` is the Sec-Fetch-Site header when the browser sends one.
 */
export function sameSiteOrApp(request: Request, fetchSite: string | null, extra = ""): boolean {
  const origin = request.headers.get("Origin");
  if (allowedAppOrigin(origin, extra)) return true;
  if (fetchSite !== null) return fetchSite === "same-origin";
  return origin === new URL(request.url).origin;
}
