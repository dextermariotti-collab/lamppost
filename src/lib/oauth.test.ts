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

const { completeNativeSignIn, startOAuth } = await import("./oauth");

beforeEach(() => {
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

  it("ignores other links and a cancelled sign-in", async () => {
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
