// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ID, AUTH_CALLBACK } from "./native-config";

const h = vi.hoisted(() => ({
  native: true,
  signInWithOAuth: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  open: vi.fn(),
  close: vi.fn(),
}));
vi.mock("./platform", () => ({ isNativeApp: () => h.native }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOAuth: h.signInWithOAuth,
      exchangeCodeForSession: h.exchangeCodeForSession,
    },
  },
}));
vi.mock("@capacitor/browser", () => ({ Browser: { open: h.open, close: h.close } }));

const { REDIRECT_MAX_AGE_MS, completeNativeSignIn, safeRedirect, startOAuth, takeHeldRedirect } =
  await import("./oauth");

const HELD = "lamppost-auth-redirect";
const LESSON = "/course/critical-thinking/lesson/4?part=explain";
const held = () => {
  const raw = window.sessionStorage.getItem(HELD);
  return raw ? (JSON.parse(raw) as { path: string; at: number }) : null;
};

beforeEach(() => {
  window.sessionStorage.clear();
  vi.clearAllMocks();
  h.native = true;
  h.signInWithOAuth.mockResolvedValue({
    data: { url: "https://project.supabase.co/auth/v1/authorize?provider=google" },
    error: null,
  });
  h.exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
  h.close.mockResolvedValue(undefined);
});

describe("signing in from the app", () => {
  it("opens the provider in the system browser, to come back through the app's own link", async () => {
    expect(await startOAuth("google")).toEqual({ error: null });
    expect(h.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: AUTH_CALLBACK, skipBrowserRedirect: true },
    });
    expect(h.open).toHaveBeenCalledWith({
      url: "https://project.supabase.co/auth/v1/authorize?provider=google",
      presentationStyle: "popover",
    });
  });

  it("exchanges the code the browser hands back, and closes the browser", async () => {
    expect(await completeNativeSignIn(`${AUTH_CALLBACK}?code=abc123`)).toBe(true);
    expect(h.exchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(h.close).toHaveBeenCalled();
  });

  it("ignores other links and a canceled sign-in", async () => {
    expect(await completeNativeSignIn("https://lamppost.example/invite/abc")).toBe(false);
    expect(await completeNativeSignIn(`${AUTH_CALLBACK}?error=access_denied`)).toBe(false);
    expect(h.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("reports a failed exchange", async () => {
    h.exchangeCodeForSession.mockResolvedValue({ data: {}, error: new Error("expired") });
    expect(await completeNativeSignIn(`${AUTH_CALLBACK}?code=old`)).toBe(false);
  });
});

describe("signing in on the web", () => {
  it("goes to the provider and back to /auth, without the system browser", async () => {
    h.native = false;
    h.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
    await startOAuth("apple");
    expect(h.signInWithOAuth).toHaveBeenCalledWith({
      provider: "apple",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    expect(h.open).not.toHaveBeenCalled();
  });
});

describe("where to go after the provider sends them back", () => {
  it("is held, with the time, only on the web, where the page really leaves", async () => {
    h.native = false;
    h.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
    const before = Date.now();
    await startOAuth("google", LESSON);
    expect(held()?.path).toBe(LESSON);
    expect(held()!.at).toBeGreaterThanOrEqual(before);

    // In the app /auth stays on screen, so its own query is used and a canceled sheet leaves
    // nothing behind.
    window.sessionStorage.clear();
    h.native = true;
    await startOAuth("apple", LESSON);
    expect(window.sessionStorage.getItem(HELD)).toBeNull();
  });

  it("isn't held when it isn't a path on this site, or when the provider can't be reached", async () => {
    h.native = false;
    h.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
    await startOAuth("google", "//evil.example");
    expect(window.sessionStorage.getItem(HELD)).toBeNull();

    h.signInWithOAuth.mockResolvedValue({ data: {}, error: new Error("offline") });
    expect((await startOAuth("google", LESSON)).error).toBeTruthy();
    expect(window.sessionStorage.getItem(HELD)).toBeNull();
  });

  it("is used for ten minutes, read once", () => {
    const now = Date.UTC(2026, 9, 24, 12);
    window.sessionStorage.setItem(HELD, JSON.stringify({ path: LESSON, at: now }));
    expect(takeHeldRedirect(now + REDIRECT_MAX_AGE_MS)).toBe(LESSON);
    expect(takeHeldRedirect(now)).toBeNull();
    expect(window.sessionStorage.getItem(HELD)).toBeNull();
  });

  it("is forgotten, unused, once it's older than that, or from an older build without a time", () => {
    const now = Date.UTC(2026, 9, 24, 12);
    for (const raw of [
      JSON.stringify({ path: LESSON, at: now - REDIRECT_MAX_AGE_MS - 1 }),
      JSON.stringify({ path: LESSON, at: now + 5 * 60 * 1000 }),
      JSON.stringify({ path: LESSON }),
      JSON.stringify({ path: LESSON, at: String(now) }),
      LESSON,
      "null",
      "{not json",
    ]) {
      window.sessionStorage.setItem(HELD, raw);
      expect(takeHeldRedirect(now), raw).toBeNull();
      expect(window.sessionStorage.getItem(HELD)).toBeNull();
    }
  });

  it("never leaves the site, even when the held value says to", () => {
    const now = Date.now();
    for (const path of ["//evil.example", "/\\evil.example", "https://evil.example", "/\t/x", 5]) {
      window.sessionStorage.setItem(HELD, JSON.stringify({ path, at: now }));
      expect(takeHeldRedirect(now), String(path)).toBeNull();
    }
    expect(safeRedirect("/progress")).toBe("/progress");
  });
});

describe("the app's identity", () => {
  it("is the same in the Capacitor config and in the sign-in link", () => {
    const config = readFileSync(join(process.cwd(), "capacitor.config.ts"), "utf8");
    expect(config).toContain(`appId: "${APP_ID}"`);
    const plist = readFileSync(join(process.cwd(), "ios/App/App/Info.plist"), "utf8");
    expect(plist).toContain(`<string>${APP_ID}</string>`);
    const manifest = readFileSync(
      join(process.cwd(), "android/app/src/main/AndroidManifest.xml"),
      "utf8",
    );
    expect(manifest).toContain(`android:scheme="${APP_ID}"`);
    const xcode = readFileSync(
      join(process.cwd(), "ios/App/App.xcodeproj/project.pbxproj"),
      "utf8",
    );
    expect(xcode).toContain(`PRODUCT_BUNDLE_IDENTIFIER = ${APP_ID};`);
    const gradle = readFileSync(join(process.cwd(), "android/app/build.gradle"), "utf8");
    expect(gradle).toContain(`applicationId "${APP_ID}"`);
  });
});
