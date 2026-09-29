// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_COMPANION } from "@/lib/companions";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal-config";

const h = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  google: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signUp: h.signUp, signInWithPassword: h.signInWithPassword } },
}));
vi.mock("@/integrations/lovable/index", () => ({
  lovable: { auth: { signInWithOAuth: h.google } },
}));
vi.mock("@/lib/companion-store", () => ({
  readDraft: () => null,
  syncDraftAfterSignIn: async () => undefined,
  useSessionUser: () => ({ userId: null, ready: true }),
}));
vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const load = async () => {
  vi.resetModules();
  const { Route } = await import("./auth");
  const Screen = Route.options.component as () => ReactNode;
  render(<Screen />);
};

const yearsAgo = (years: number) => String(new Date().getFullYear() - years);
const fillBirth = (year: string) => {
  fireEvent.change(screen.getByLabelText("Month"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("Day"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("Year"), { target: { value: year } });
};
const agree = () => fireEvent.click(screen.getByRole("checkbox", { name: /I agree to the/ }));
const fillCredentials = () => {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@example.test" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret1" } });
};
const create = () => screen.getByRole("button", { name: "Create account" }) as HTMLButtonElement;
const googleButton = () =>
  screen.getByRole("button", { name: /Continue with Google/ }) as HTMLButtonElement;
const pending = () => {
  const raw = window.localStorage.getItem("lamppost-pending-consent");
  return raw ? JSON.parse(raw) : null;
};

beforeEach(() => {
  window.localStorage.clear();
  h.signUp.mockResolvedValue({ data: { session: null }, error: null });
  h.signInWithPassword.mockResolvedValue({ error: null });
  h.google.mockResolvedValue({ redirected: true });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("creating an account", () => {
  it("can't be started until there is an age and a ticked agreement, by email or Google", async () => {
    await load();
    fillCredentials();
    expect(create().disabled).toBe(true);
    expect(googleButton().disabled).toBe(true);
    expect(screen.getByText(/date of birth and tick the box/i)).toBeTruthy();

    fillBirth(yearsAgo(30));
    expect(create().disabled).toBe(true);
    agree();
    expect(create().disabled).toBe(false);
    expect(googleButton().disabled).toBe(false);
  });

  it("creates the account and keeps the agreement (not the date of birth) for after sign-in", async () => {
    await load();
    fillCredentials();
    const year = yearsAgo(30);
    fillBirth(year);
    agree();
    await act(async () => fireEvent.click(create()));

    expect(h.signUp).toHaveBeenCalledTimes(1);
    expect(h.signUp.mock.calls[0]![0]).toMatchObject({
      email: "a@example.test",
      password: "secret1",
    });
    expect(pending()).toMatchObject({
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      ageBand: "18+",
      guardianConfirmed: false,
    });
    expect(JSON.stringify(pending())).not.toContain(year);
    expect(screen.getByText(/check your inbox/i)).toBeTruthy();
  });

  it("carries the guardian's permission for a teen", async () => {
    await load();
    fillCredentials();
    fillBirth(yearsAgo(15));
    agree();
    expect(create().disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /parent or guardian/i }));
    await act(async () => fireEvent.click(create()));
    expect(pending()).toMatchObject({ ageBand: "13-17", guardianConfirmed: true });
  });

  it("forgets the agreement if sign-up fails", async () => {
    h.signUp.mockResolvedValue({ data: {}, error: new Error("User already registered") });
    await load();
    fillCredentials();
    fillBirth(yearsAgo(30));
    agree();
    await act(async () => fireEvent.click(create()));
    expect(pending()).toBeNull();
    expect(screen.getByText(/already registered/i)).toBeTruthy();
  });

  it("keeps the agreement across the Google redirect", async () => {
    await load();
    fillBirth(yearsAgo(30));
    agree();
    await act(async () => fireEvent.click(googleButton()));
    expect(h.google).toHaveBeenCalledTimes(1);
    expect(pending()).toMatchObject({ ageBand: "18+" });
  });

  it("never reaches the server for someone under the minimum age", async () => {
    await load();
    fillCredentials();
    fillBirth(yearsAgo(9));
    expect(screen.getByRole("alert").textContent).toMatch(/can't make an account/i);
    expect(screen.queryByRole("button", { name: "Create account" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Continue with Google/ })).toBeNull();
    expect(h.signUp).not.toHaveBeenCalled();
    expect(h.google).not.toHaveBeenCalled();
    expect(pending()).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });
});

describe("signing in to an existing account", () => {
  it("doesn't ask for an age or an agreement", async () => {
    await load();
    fireEvent.click(screen.getByRole("button", { name: /already have an account/i }));
    expect(screen.queryByLabelText("Year")).toBeNull();
    fillCredentials();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Sign in" })));
    expect(h.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(pending()).toBeNull();
  });
});
