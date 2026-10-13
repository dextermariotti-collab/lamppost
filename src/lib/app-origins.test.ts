import { describe, expect, it } from "vitest";
import { allowedAppOrigin, preflightResponse, sameSiteOrApp, withCors } from "./app-origins";

const call = (origin: string | null, url = "https://lamppost.example/_serverFn/abc") =>
  new Request(url, { method: "POST", headers: origin ? { Origin: origin } : {} });

describe("which origins the phone apps call from", () => {
  it("allows the iOS and Android app origins, and nothing else by default", () => {
    expect(allowedAppOrigin("capacitor://localhost")).toBe("capacitor://localhost");
    expect(allowedAppOrigin("https://localhost")).toBe("https://localhost");
    expect(allowedAppOrigin("https://evil.example")).toBeNull();
    expect(allowedAppOrigin("http://localhost")).toBeNull();
    expect(allowedAppOrigin(null)).toBeNull();
  });

  it("takes extra origins from the server's setting, for local testing", () => {
    expect(allowedAppOrigin("http://localhost:5173", " http://localhost:5173 , ")).toBe(
      "http://localhost:5173",
    );
    expect(allowedAppOrigin("http://localhost:5174", "http://localhost:5173")).toBeNull();
  });
});

describe("CORS for the apps", () => {
  it("answers a preflight with the origin, the methods and the headers asked for", () => {
    const request = new Request("https://lamppost.example/_serverFn/abc", {
      method: "OPTIONS",
      headers: { "Access-Control-Request-Headers": "authorization, content-type, x-tsr-serverfn" },
    });
    const response = preflightResponse(request, "capacitor://localhost");
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("capacitor://localhost");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("x-tsr-serverfn");
  });

  it("lets the app read a server function's reply, including the headers its client checks", async () => {
    const reply = new Response("{}", { headers: { "x-tss-serialized": "true" } });
    const response = withCors(reply, "https://localhost");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://localhost");
    expect(response.headers.get("Access-Control-Expose-Headers")).toContain("x-tss-serialized");
    expect(response.headers.get("x-tss-serialized")).toBe("true");
    expect(await response.text()).toBe("{}");
  });
});

describe("the cross-site check on server functions", () => {
  it("passes the site's own pages and the apps, and stops other sites", () => {
    expect(sameSiteOrApp(call("https://lamppost.example"), "same-origin")).toBe(true);
    expect(sameSiteOrApp(call("capacitor://localhost"), "cross-site")).toBe(true);
    expect(sameSiteOrApp(call("https://evil.example"), "cross-site")).toBe(false);
    expect(sameSiteOrApp(call("https://evil.example"), "same-site")).toBe(false);
  });

  it("falls back to comparing the Origin when the browser sends no Sec-Fetch-Site", () => {
    expect(sameSiteOrApp(call("https://lamppost.example"), null)).toBe(true);
    expect(sameSiteOrApp(call("https://localhost"), null)).toBe(true);
    expect(sameSiteOrApp(call("https://evil.example"), null)).toBe(false);
  });
});
