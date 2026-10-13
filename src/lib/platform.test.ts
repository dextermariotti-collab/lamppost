import { afterEach, describe, expect, it, vi } from "vitest";

const load = async (env: Record<string, string>) => {
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  return import("./platform");
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("where the app's server calls go", () => {
  it("sends server functions to the backend in the app build", async () => {
    const fetch = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetch);
    const { apiFetch } = await load({ MODE: "app", VITE_API_URL: "https://lamppost.example/" });
    await apiFetch("/_serverFn/abc", { method: "POST" });
    expect(fetch).toHaveBeenCalledWith("https://lamppost.example/_serverFn/abc", {
      method: "POST",
    });
  });

  it("leaves the web build calling its own origin", async () => {
    const fetch = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetch);
    const { apiFetch } = await load({
      MODE: "production",
      VITE_API_URL: "https://elsewhere.example",
    });
    await apiFetch("/_serverFn/abc");
    expect(fetch).toHaveBeenCalledWith("/_serverFn/abc", undefined);
  });

  it("points shared links at the public site in the app", async () => {
    const { publicUrl } = await load({
      MODE: "app",
      VITE_API_URL: "https://api.lamppost.example",
      VITE_PUBLIC_URL: "https://lamppost.example/",
    });
    expect(publicUrl()).toBe("https://lamppost.example");
  });
});
