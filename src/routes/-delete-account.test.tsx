// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONTACT_EMAIL, contactHref } from "@/lib/legal-config";

vi.mock("@/components/PhoneFrame", () => ({
  PhoneFrame: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { Route } from "./delete-account";
import { Route as SupportRoute } from "./support";

const Screen = Route.options.component as () => ReactNode;
const Support = SupportRoute.options.component as () => ReactNode;
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const text = () => (document.body.textContent ?? "").replace(/\s+/g, " ");

afterEach(cleanup);

describe("the /delete-account page", () => {
  it("has a title, a description and its own canonical address", () => {
    const head = (
      Route.options.head as () => {
        meta: { title?: string; name?: string; content?: string }[];
        links: { rel: string; href: string }[];
      }
    )();
    expect(head.meta.find((m) => m.title)?.title).toBe("Delete your account — Lamppost");
    expect(head.meta.find((m) => m.name === "description")?.content).toMatch(/delete/i);
    expect(head.links).toContainEqual({ rel: "canonical", href: "/delete-account" });
  });

  it("gives the steps in the app or on the website, in order, with a way to Settings", () => {
    render(<Screen />);
    const steps = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    const order = ["Sign in", "Profile, then Settings", "Your data", "Delete my account", "DELETE"];
    const where = order.map((phrase) => steps.findIndex((step) => step.includes(phrase)));
    expect(where.every((i) => i >= 0)).toBe(true);
    expect([...where].sort((a, b) => a - b)).toEqual(where);
    expect(text()).toMatch(/app or on the website/);
    expect(screen.getByRole("link", { name: "Go to Settings" }).getAttribute("href")).toBe(
      "/settings",
    );
  });

  it("names the buttons the app really shows", () => {
    const section = read("src/components/YourDataSection.tsx");
    for (const label of [
      "Your data",
      "Delete my account",
      "Type DELETE to confirm",
      "Delete forever",
    ])
      expect(section).toContain(label);
    expect(read("src/routes/settings.tsx")).toContain("<YourDataSection");
    expect(read("src/routes/profile.tsx")).toContain('to="/settings"');
    expect(read("src/routes/settings.tsx")).toContain("<DeviceDataSection");
    expect(section).toContain("Clear progress on this device");
  });

  it("says what deleting removes and what is kept, without promising more", () => {
    render(<Screen />);
    const page = text();
    expect(page).toMatch(/everything linked to it are deleted at once/);
    expect(page).toMatch(/can't be undone/);
    for (const thing of ["sign-in", "profile", "progress", "friends", "written arguments"])
      expect(page.toLowerCase()).toContain(thing);
    expect(page).toMatch(/phone or browser you delete from is cleared/);
    expect(page).toMatch(/Reports you made .* kept for safety, but no longer linked to you/);
  });

  it("tells someone who can't sign in to email the support address", () => {
    render(<Screen />);
    expect(screen.getByRole("heading", { name: "If you can't sign in" })).toBeTruthy();
    expect(text()).toContain(CONTACT_EMAIL);
    const mail = screen.queryByRole("link", { name: CONTACT_EMAIL });
    if (contactHref("x")) expect(mail?.getAttribute("href")).toMatch(/^mailto:/);
    else expect(mail).toBeNull();
  });

  it("works without an account: no server calls, and no invented address", () => {
    const source = read("src/routes/delete-account.tsx");
    expect(source).not.toMatch(/\.functions|supabase|useServerFn|useAccount/);
    expect(source).not.toMatch(/[\w.-]+@[\w-]+\.\w+/);
    render(<Screen />);
    expect(screen.getByRole("navigation", { name: "Legal and support" })).toBeTruthy();
  });

  it("is linked from Help and support", () => {
    render(<Support />);
    const link = screen.getByRole("link", { name: "how to delete your account" });
    expect(link.getAttribute("href")).toBe("/delete-account");
  });
});
